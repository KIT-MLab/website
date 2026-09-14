/**
 * 登録とログインの画面（20-platform.md 第5.6節）と、入った／出たときの進度の始末（第6.2節）。
 *
 * 置き場所は節の右レール。ボタンを押すと本文の上にかぶせる小窓（`<dialog>` の
 * `showModal()`）が開く。**別のページに移らない。**読んでいた場所を失わないため。
 * 通ったあともページを読み込み直さず、右レールのブロックだけ塗り替える。
 *
 * 閉じる道を塞ぐ段が2つある。
 *
 *   段2（控える） … 合言葉の平文が出るのは登録の応答の1回だけで、しまってあるのは
 *                   ハッシュなので、見落として閉じた人は先生が作り直すまで別の端末から
 *                   入れない（第5.2節）
 *   段4（この端末に残っている記録） … 途中で閉じられると、手元の記録が「誰のものか
 *                   決まらないまま」残る。次に入ったときにまた同じことを聞かれ、
 *                   その間ずっとサーバへ行かない（第6.1節）
 *
 * どちらも × を出さず、`Esc`（`cancel`）を止め、背景を押しても閉じない。
 *
 * 島にしていないのは、この画面が右レールの1ブロックの塗り替えしかしないためである。
 * 同じ節の右レール（節の一覧）も素の DOM で塗っている。新しい依存は足さない。
 */
import { getLessonData } from './data';
import { getProgressStore, type RemoteExercise, type RemoteLesson } from './store/progress';

/** `/api/me` `/api/login` `/api/register` が返す利用者の形（src/server/auth.ts の CurrentUser）。 */
type User = {
  id: string;
  displayName: string;
  role: string;
  level: number;
  cohort: { code: string; name: string; kind: string };
};

type Stage = 'register' | 'save' | 'login' | 'carry';

/** 閉じる道を塞ぐ段。 */
const SEALED: Stage[] = ['save', 'carry'];

/**
 * POST には必ず付ける（第7.1節）。付けずに POST すると Astro が「他所からのフォーム送信」
 * とみなして 403 を返す。本文が空の `/api/logout` でも同じ。
 */
const JSON_HEADERS = { 'content-type': 'application/json' };

/** 断りの文。応答の `error` が読めなかったときだけ使う。 */
const FALLBACK_DENY = 'うまくいきませんでした。もう一度お試しください。';

/** 出るときに送りきれなかったときの断り（第6.2節「送りきれなかったら空にしない」）。 */
const KEPT_NOTE = 'まだ送れていない記録があるので、この端末に残しました。';

async function postJson(path: string, body?: unknown): Promise<{ ok: boolean; data: Record<string, unknown> }> {
  try {
    const res = await fetch(path, {
      method: 'POST',
      headers: JSON_HEADERS,
      body: JSON.stringify(body ?? {}),
    });
    const data = (await res.json().catch(() => ({}))) as Record<string, unknown>;
    return { ok: res.ok, data };
  } catch {
    return { ok: false, data: { error: '通信できませんでした。もう一度お試しください。' } };
  }
}

/** 合言葉を3桁ずつ空ける（第5.6節。紙に書き写す前提）。 */
function groupPasscode(code: string): string {
  return code.length === 6 ? `${code.slice(0, 3)} ${code.slice(3)}` : code;
}

export function setupAccount(): void {
  const rail = document.getElementById('kit-acct-rail');
  const dialog = document.getElementById('kit-acct') as HTMLDialogElement | null;
  if (!rail || !dialog || typeof dialog.showModal !== 'function') return;

  const stages: Record<Stage, HTMLElement> = {
    register: dialog.querySelector('[data-acct-stage="register"]') as HTMLElement,
    save: dialog.querySelector('[data-acct-stage="save"]') as HTMLElement,
    login: dialog.querySelector('[data-acct-stage="login"]') as HTMLElement,
    carry: dialog.querySelector('[data-acct-stage="carry"]') as HTMLElement,
  };
  if (!stages.register || !stages.save || !stages.login || !stages.carry) return;

  const q = <T extends HTMLElement>(sel: string) => dialog.querySelector(sel) as T;
  const regForm = q<HTMLFormElement>('#kit-acct-reg-form');
  const regCode = q<HTMLInputElement>('#kit-acct-code');
  const regName = q<HTMLInputElement>('#kit-acct-name');
  const regSubmit = q<HTMLButtonElement>('#kit-acct-reg-go');
  const loginForm = q<HTMLFormElement>('#kit-acct-login-form');
  const loginId = q<HTMLInputElement>('#kit-acct-uid');
  const loginPass = q<HTMLInputElement>('#kit-acct-pass');
  const loginSubmit = q<HTMLButtonElement>('#kit-acct-login-go');
  const saveId = q<HTMLElement>('#kit-acct-made-id');
  const savePass = q<HTMLElement>('#kit-acct-made-pass');
  const saveDone = q<HTMLButtonElement>('#kit-acct-saved');
  const carryCount = q<HTMLElement>('#kit-acct-carry-n');
  const carryYes = q<HTMLButtonElement>('#kit-acct-carry-yes');
  const carryNo = q<HTMLButtonElement>('#kit-acct-carry-no');

  const store = getProgressStore();

  /** いま出している段。段2と段4のときだけ閉じる道を塞ぐ。 */
  let stage: Stage = 'register';
  /** 登録が通ったあと「控えました」を押すまで抱えておく利用者。 */
  let pending: User | null = null;
  /** 段4を出している間、どちらかが押されるまで抱えておく利用者。 */
  let carrying: User | null = null;

  function deny(name: string, message: string): void {
    const slot = dialog!.querySelector(`[data-acct-deny="${name}"]`);
    if (slot) slot.textContent = message;
  }

  function clearDeny(): void {
    for (const slot of dialog!.querySelectorAll('[data-acct-deny]')) slot.textContent = '';
  }

  function show(next: Stage): void {
    stage = next;
    for (const key of Object.keys(stages) as Stage[]) stages[key].hidden = key !== next;
    clearDeny();
  }

  function open(next: Stage): void {
    show(next);
    if (!dialog!.open) dialog!.showModal();
    const first =
      next === 'register' ? regCode : next === 'login' ? loginId : next === 'carry' ? carryYes : saveDone;
    first.focus();
  }

  /* --- 右レールのブロックを塗る ------------------------------------ */

  function railButton(label: string): HTMLButtonElement {
    const btn = document.createElement('button');
    btn.type = 'button';
    btn.className = 'rail__ask';
    btn.textContent = label;
    return btn;
  }

  /** `note` は出るときに送りきれなかったことを伝える1行（第6.2節）。ふだんは null。 */
  function paint(user: User | null, note: string | null = null): void {
    rail!.replaceChildren();
    if (!user) {
      const row = document.createElement('div');
      row.className = 'rail__acct-row';
      const register = railButton('登録する');
      register.addEventListener('click', () => open('register'));
      const login = railButton('入る');
      login.addEventListener('click', () => open('login'));
      row.append(register, login);
      rail!.append(row);
      if (note) {
        const kept = document.createElement('p');
        kept.className = 'rail__note';
        kept.textContent = note;
        rail!.append(kept);
      }
      return;
    }

    const name = document.createElement('p');
    name.className = 'rail__acct-name';
    name.textContent = user.displayName;
    const cohort = document.createElement('p');
    cohort.className = 'rail__note';
    cohort.textContent = user.cohort.name;
    const out = railButton('出る');
    out.addEventListener('click', () => void leave(out));
    rail!.append(name, cohort, out);
  }

  /* --- 進度の始末（第6.2節） --------------------------------------- */

  /**
   * サーバの記録を引き写す。
   *
   * 引き写したあとに、いま開いている節をもう一度「開いた」ことにする。手元を空にした道
   * （捨てる・別の人・出る）では、いま読んでいる節の記録まで消えてしまうためである。
   * 読んでいる途中でその節が進度から抜けると、この節だけ滞在も「済」も付かなくなる。
   */
  async function pull(): Promise<void> {
    try {
      const res = await fetch('/api/me');
      const data = (await res.json()) as { progress?: RemoteLesson[]; exercises?: RemoteExercise[] };
      await store.merge({ progress: data?.progress ?? [], exercises: data?.exercises ?? [] });
    } catch {
      /* 引き写せなくても手元の記録はそのまま。学習は止めない */
    }
    const lessonId = getLessonData()?.lessonId;
    if (lessonId) await store.openLesson(lessonId);
    // 右レールの「済 / 未」と、第0章の課題の並びがこれで塗り直される
    window.dispatchEvent(new CustomEvent('kit:progress'));
  }

  /**
   * 入った直後の分岐（第6.2節の表）。
   *
   * | owner        | 手元の進度 | すること                          |
   * | 入った人と同じ | —        | 何も聞かず、未送信を送って引き写す   |
   * | null         | ある      | 段4を出して尋ねる                  |
   * | null         | ない      | owner を立てて引き写す             |
   * | 別の人        | —        | 何も聞かず手元を空にして引き写す     |
   *
   * 別の人の分を黙って捨ててよいのは、その人のぶんは既にサーバに入っているためである
   * （入っている間は送られている）。逆に owner が null のものはどこにも無いので、
   * 捨てる前に必ず尋ねる。
   */
  async function entered(user: User): Promise<void> {
    const owner = await store.owner();
    const kept = await store.countLessons();

    if (owner === null && kept > 0) {
      carrying = user;
      carryCount.textContent = String(kept);
      carryYes.disabled = false;
      carryNo.disabled = false;
      open('carry');
      return;
    }

    if (dialog!.open) dialog!.close();
    if (owner === user.id) await store.flush();
    else await store.reset(user.id);
    await pull();
  }

  /**
   * 出る。
   *
   * 送るのは `/api/logout` の**前**である。あとにすると Cookie が消えていて、
   * 送れるはずのものまで 401 で落ちる。手元を空にするかどうかは、その送信が
   * 通ったかどうかで決める（第6.2節「送りきれなかったら空にしない」）。
   *
   * 空にしたあと、いま読んでいる節を開き直さない。出た人の手元は空のままにしておく
   * （入り直したときに「入る前に進めた記録」を聞き返さないため）。読み続けたぶんは
   * 滞在の秒数が次に足された時点で改めて手元に積まれ、入り直せばそこで尋ねられる。
   */
  async function leave(button: HTMLButtonElement): Promise<void> {
    button.disabled = true;
    const sentAll = await store.flush();
    await postJson('/api/logout');
    if (sentAll) await store.reset(null);
    paint(null, sentAll ? null : KEPT_NOTE);
    window.dispatchEvent(new CustomEvent('kit:progress'));
  }

  /* --- 閉じる道（段2と段4だけ塞ぐ。第5.6節・第6.1節） -------------- */

  // Esc。塞ぐ段では止める
  dialog.addEventListener('cancel', (e) => {
    if (SEALED.includes(stage)) e.preventDefault();
  });

  // 背景。::backdrop への click は <dialog> 自身に届く。塞ぐ段では閉じない
  dialog.addEventListener('click', (e) => {
    if (SEALED.includes(stage)) return;
    if (e.target === dialog) dialog.close();
  });

  for (const btn of dialog.querySelectorAll<HTMLButtonElement>('[data-acct-cancel]')) {
    btn.addEventListener('click', () => dialog.close());
  }

  /* --- 段1: 登録 --------------------------------------------------- */

  regForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    clearDeny();
    const code = regCode.value.trim().toUpperCase();
    const displayName = regName.value.trim();
    if (code === '') return deny('code', '招待コードを入れてください。');
    if (displayName === '') return deny('name', '表示名を入れてください。');

    regSubmit.disabled = true;
    const { ok, data } = await postJson('/api/register', { code, displayName });
    regSubmit.disabled = false;
    if (!ok) {
      const message = typeof data.error === 'string' ? data.error : FALLBACK_DENY;
      /* 断りの文はその欄の下に出す（第5.6節）。どの欄かはサーバが field で言う。
         文面の中身を見て振り分けると、文面を1文字直しただけで断りが別の欄の下に出る。
         field が無い断り（上限・設定不足）は、送るボタンのすぐ上の欄に出す。 */
      return deny(data.field === 'code' ? 'code' : 'name', message);
    }

    pending = {
      id: String(data.id ?? ''),
      displayName: String(data.displayName ?? displayName),
      role: String(data.role ?? 'student'),
      level: Number(data.level ?? 0),
      cohort: (data.cohort as User['cohort']) ?? { code, name: '', kind: '' },
    };
    saveId.textContent = pending.id;
    savePass.textContent = groupPasscode(String(data.passcode ?? ''));
    regCode.value = '';
    regName.value = '';
    open('save');
  });

  /* --- 段2: 控える ------------------------------------------------- */

  saveDone.addEventListener('click', () => {
    const user = pending;
    pending = null;
    saveId.textContent = '';
    savePass.textContent = '';
    if (!user) {
      dialog.close();
      return;
    }
    // 小窓を閉じるかどうかは entered が決める。段4を出すなら開けたままにする
    paint(user);
    void entered(user);
  });

  /* --- 段3: 入る --------------------------------------------------- */

  loginForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    clearDeny();
    // 紙から打ち直すので、空白は落としてから送る
    const id = loginId.value.trim();
    const passcode = loginPass.value.replace(/\s/g, '');
    if (id === '') return deny('uid', '利用者IDを入れてください。');
    if (passcode === '') return deny('pass', '合言葉を入れてください。');

    loginSubmit.disabled = true;
    const { ok, data } = await postJson('/api/login', { id, passcode });
    loginSubmit.disabled = false;
    if (!ok) {
      // ログインの断りは利用者IDと合言葉のどちらが違うかを言わない決まりなので、
      // 送るボタンのすぐ上（合言葉）の下に出す。サーバも field で同じことを言う
      return deny(data.field === 'uid' ? 'uid' : 'pass', typeof data.error === 'string' ? data.error : FALLBACK_DENY);
    }

    loginId.value = '';
    loginPass.value = '';
    const user = data as unknown as User;
    paint(user);
    void entered(user);
  });

  /* --- 段4: この端末に残っている記録（第6.1節） -------------------- */

  carryYes.addEventListener('click', async () => {
    const user = carrying;
    carrying = null;
    if (!user) return dialog.close();
    carryYes.disabled = true;
    carryNo.disabled = true;
    // 手元のものを全部「未送信」に戻してから送る。印の付いたまま引き継ぐと、
    // 入る前に貯めた分が一度もサーバへ行かない
    await store.claim(user.id);
    await store.flush();
    dialog.close();
    await pull();
  });

  carryNo.addEventListener('click', async () => {
    const user = carrying;
    carrying = null;
    if (!user) return dialog.close();
    carryYes.disabled = true;
    carryNo.disabled = true;
    await store.reset(user.id);
    dialog.close();
    await pull();
  });

  /* --- 節を開いたときに1回だけ引く（第5.6節） ---------------------- */

  void fetch('/api/me')
    .then((res) => res.json())
    .then((data: { user?: User | null }) => {
      const user = data?.user ?? null;
      paint(user);
      // Cookie が残っていて入ったままの人も、入った直後と同じ分岐を通す。
      // 手元の控えと突き合わせるのは入るときだけで、突き合わせないと
      // 別の端末で進めた分が戻らない（第6.2節の表）
      if (user) void entered(user);
    })
    .catch(() => paint(null));
}
