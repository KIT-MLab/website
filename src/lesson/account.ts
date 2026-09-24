/**
 * 登録とログインの画面（20-platform.md 第5.6節）と、入った／出たときの進度の始末（第6.2節）。
 *
 * 置き場所は全ページの右上（第14.1節。枠は Base.astro の `#kit-acct-head`）。ボタンを押すと
 * 本文の上にかぶせる小窓（`<dialog>` の `showModal()`）が開く。**別のページに移らない。**
 * 読んでいた場所を失わないため。通ったあともページを読み込み直さず、右上だけ塗り替える。
 *
 * 閉じる道を塞ぐ段が1つある。
 *
 *   段2（控える） … パスワードの平文が出るのは登録の応答の1回だけで、しまってあるのは
 *                   ハッシュなので、見落として閉じた人は運営が作り直すまで別の端末から
 *                   入れない（第5.2節）
 *
 * × を出さず、`Esc`（`cancel`）を止め、背景を押しても閉じない。
 *
 * 島にしていないのは、この画面が右上の小さな塗り替えしかしないためである。
 * 節の左の欄（節の一覧）も素の DOM で塗っている。新しい依存は足さない。
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
  /** `/api/me` だけが返す（第13.1節）。ログインと登録の応答には無い */
  member?: boolean;
};

type Stage = 'register' | 'save' | 'login';

/** 閉じる道を塞ぐ段。 */
const SEALED: Stage[] = ['save'];

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

/** パスワードを3桁ずつ空ける（第5.6節。紙に書き写す前提）。 */
function groupPasscode(code: string): string {
  return code.length === 6 ? `${code.slice(0, 3)} ${code.slice(3)}` : code;
}

export function setupAccount(): void {
  const head = document.getElementById('kit-acct-head');
  const dialog = document.getElementById('kit-acct') as HTMLDialogElement | null;
  if (!head || !dialog || typeof dialog.showModal !== 'function') return;

  const stages: Record<Stage, HTMLElement> = {
    register: dialog.querySelector('[data-acct-stage="register"]') as HTMLElement,
    save: dialog.querySelector('[data-acct-stage="save"]') as HTMLElement,
    login: dialog.querySelector('[data-acct-stage="login"]') as HTMLElement,
  };
  if (!stages.register || !stages.save || !stages.login) return;

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

  const store = getProgressStore();

  /** いま出している段。段2のときだけ閉じる道を塞ぐ。 */
  let stage: Stage = 'register';
  /** 登録が通ったあと「控えました」を押すまで抱えておく利用者。 */
  let pending: User | null = null;

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
    const first = next === 'register' ? regCode : next === 'login' ? loginId : saveDone;
    first.focus();
  }

  /* --- 右上のアカウントを塗る（第14.1節） -------------------------- */

  function headButton(label: string): HTMLButtonElement {
    const btn = document.createElement('button');
    btn.type = 'button';
    btn.className = 'site-btn site-btn--small';
    btn.textContent = label;
    return btn;
  }

  function menuLink(label: string, href: string): HTMLAnchorElement {
    const link = document.createElement('a');
    link.className = 'acct__item';
    link.href = href;
    link.textContent = label;
    return link;
  }

  /** 開いているメニュー（またはログアウトのときの1行）。閉じる手は外側を押すか Esc */
  let popup: { panel: HTMLElement; opener: HTMLElement | null } | null = null;

  function closePopup(returnFocus: boolean): void {
    if (!popup) return;
    const { panel, opener } = popup;
    popup = null;
    panel.hidden = true;
    if (opener) {
      opener.setAttribute('aria-expanded', 'false');
      if (returnFocus) opener.focus();
    }
  }

  document.addEventListener('click', (e) => {
    if (popup && !head!.contains(e.target as Node)) closePopup(false);
  });

  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape' && popup) closePopup(true);
  });

  /** `note` は出るときに送りきれなかったことを伝える1行（第6.2節）。ふだんは null。 */
  function paint(user: User | null, note: string | null = null): void {
    // ログイン・ログアウトをほかの部品に知らせる（/learn/ の「マイページへ」の帯など）
    window.dispatchEvent(new CustomEvent('kit:account', { detail: user }));
    /* 質問の欄は入っている人にだけ出す（第10.1節）。
       送り先が自分のアカウントに紐づくので、入っていない人には置き場所がない。 */
    const ask = document.querySelector<HTMLElement>('[data-rail-ask]');
    if (ask) ask.hidden = !user;

    popup = null;
    head!.replaceChildren();
    if (!user) {
      const register = headButton('新規登録');
      register.addEventListener('click', () => open('register'));
      const login = headButton('ログイン');
      login.addEventListener('click', () => open('login'));
      head!.append(register, login);
      if (note) {
        // 右上には1行を置く場所が無いので、メニューと同じ形で下に出し、同じ手で閉じる
        const kept = document.createElement('p');
        kept.className = 'acct__menu acct__kept';
        kept.setAttribute('role', 'status');
        kept.textContent = note;
        head!.append(kept);
        popup = { panel: kept, opener: null };
      }
      return;
    }

    const who = document.createElement('button');
    who.type = 'button';
    who.className = 'acct__who';
    who.setAttribute('aria-expanded', 'false');
    who.setAttribute('aria-controls', 'kit-acct-menu');
    const name = document.createElement('b');
    name.textContent = user.displayName;
    const mark = document.createElement('span');
    mark.setAttribute('aria-hidden', 'true');
    mark.textContent = '▾';
    who.append(name, mark);

    const menu = document.createElement('div');
    menu.className = 'acct__menu';
    menu.id = 'kit-acct-menu';
    menu.hidden = true;
    const cohort = document.createElement('p');
    cohort.className = 'acct__meta';
    cohort.textContent = user.cohort.name;
    menu.append(cohort);
    // マイページへの入口（第13.2節）。メンバーにだけ出す
    if (user.member) menu.append(menuLink('マイページ', '/learn/home/'));
    if (user.role === 'staff' || user.role === 'admin') menu.append(menuLink('管理画面', '/staff/'));
    const out = document.createElement('button');
    out.type = 'button';
    out.className = 'acct__item';
    out.textContent = 'ログアウト';
    out.addEventListener('click', () => {
      closePopup(false);
      void leave(out);
    });
    menu.append(out);

    who.addEventListener('click', () => {
      if (popup) {
        closePopup(false);
        return;
      }
      menu.hidden = false;
      who.setAttribute('aria-expanded', 'true');
      popup = { panel: menu, opener: who };
    });

    head!.append(who, menu);
  }

  /* --- 進度の始末（第6.2節） --------------------------------------- */

  /**
   * サーバの記録を引き写す。
   *
   * 引き写したあとに、いま開いている節をもう一度「開いた」ことにする。手元を空にした道
   * （ログインする前の記録・別の人・出る）では、いま読んでいる節の記録まで消えてしまうためである。
   * 読んでいる途中でその節が進度から抜けると、この節だけ滞在も「済」も付かなくなる。
   */
  async function pull(): Promise<void> {
    try {
      const res = await fetch('/api/me');
      const data = (await res.json()) as { user?: User | null; progress?: RemoteLesson[]; exercises?: RemoteExercise[] };
      await store.merge({ progress: data?.progress ?? [], exercises: data?.exercises ?? [] });
      // 入った直後はログインの応答で塗ってあり、`member` が無い。/api/me の答えで塗り直す（第13.2節）
      if (data?.user) paint(data.user);
    } catch {
      /* 引き写せなくても手元の記録はそのまま。学習は止めない */
    }
    const lessonId = getLessonData()?.lessonId;
    if (lessonId) await store.openLesson(lessonId);
    // 右レールの「済 / 未」と、第0章の課題の並びがこれで塗り直される
    window.dispatchEvent(new CustomEvent('kit:progress'));
  }

  /**
   * 入った直後の分岐（第6.2節の表。owner が null の行は第14.5節で改めた）。
   *
   * | owner        | すること                                  |
   * | 入った人と同じ | 何も聞かず、未送信を送って引き写す           |
   * | null         | 何も聞かず手元を空にして引き写す（第14.5節） |
   * | 別の人        | 何も聞かず手元を空にして引き写す             |
   *
   * 別の人の分を黙って捨ててよいのは、その人のぶんは既にサーバに入っているためである
   * （入っている間は送られている）。owner が null のもの（ログインする前の記録）は
   * 尋ねずに捨てる。1台を複数人で使うことはまず無く、尋ねる段は邪魔になるだけだった。
   */
  async function entered(user: User): Promise<void> {
    const owner = await store.owner();
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
   * 空にしたあと、いま読んでいる節を開き直さない。出た人の手元は空のままにしておく。
   * 読み続けたぶんは滞在の秒数が次に足された時点で改めて手元に積まれ、
   * 入り直すとそこで捨てられる（第14.5節）。
   */
  async function leave(button: HTMLButtonElement): Promise<void> {
    button.disabled = true;
    const sentAll = await store.flush();
    await postJson('/api/logout');
    if (sentAll) await store.reset(null);
    paint(null, sentAll ? null : KEPT_NOTE);
    window.dispatchEvent(new CustomEvent('kit:progress'));
  }

  /* --- 閉じる道（段2だけ塞ぐ。第5.6節） ---------------------------- */

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
    // 控えるのは表示名とパスワード。ログインはこの2つで行う（第14.4節）
    saveId.textContent = pending.displayName;
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
    paint(user);
    void entered(user);
  });

  /* --- 段3: ログイン ---------------------------------------------- */

  loginForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    clearDeny();
    // 紙から打ち直すので、空白は落としてから送る。`id` の中身は表示名（u_ で始まれば
    // 利用者ID）。どちらとして引くかはサーバが決める（第14.4節）
    const id = loginId.value.trim();
    const passcode = loginPass.value.replace(/\s/g, '');
    if (id === '') return deny('uid', '表示名を入れてください。');
    if (passcode === '') return deny('pass', 'パスワードを入れてください。');

    loginSubmit.disabled = true;
    const { ok, data } = await postJson('/api/login', { id, passcode });
    loginSubmit.disabled = false;
    if (!ok) {
      // ログインの断りは利用者IDとパスワードのどちらが違うかを言わない決まりなので、
      // 送るボタンのすぐ上（パスワード）の下に出す。サーバも field で同じことを言う
      return deny(data.field === 'uid' ? 'uid' : 'pass', typeof data.error === 'string' ? data.error : FALLBACK_DENY);
    }

    loginId.value = '';
    loginPass.value = '';
    const user = data as unknown as User;
    paint(user);
    void entered(user);
  });

  /* --- ページを開いたときに1回だけ引く（第5.6節・第14.1節） ------- */

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
