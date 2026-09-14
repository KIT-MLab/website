/**
 * 登録とログインの画面（20-platform.md 第5.6節）。
 *
 * 置き場所は節の右レール。ボタンを押すと本文の上にかぶせる小窓（`<dialog>` の
 * `showModal()`）が開く。**別のページに移らない。**読んでいた場所を失わないため。
 * 通ったあともページを読み込み直さず、右レールのブロックだけ塗り替える。
 *
 * いちばん大事な決まりが1つある。**段2（控える）は閉じる道を全部塞ぐ。**
 * 合言葉の平文が出るのは登録の応答の1回だけで、しまってあるのはハッシュなので、
 * 見落として閉じた人は先生が作り直すまで別の端末から入れない（第5.2節）。
 * だから × を出さず、`Esc`（`cancel`）を止め、背景を押しても閉じない。
 *
 * 島にしていないのは、この画面が右レールの1ブロックの塗り替えしかしないためである。
 * 同じ節の右レール（節の一覧）も素の DOM で塗っている。新しい依存は足さない。
 */

/** `/api/me` `/api/login` `/api/register` が返す利用者の形（src/server/auth.ts の CurrentUser）。 */
type User = {
  id: string;
  displayName: string;
  role: string;
  level: number;
  cohort: { code: string; name: string; kind: string };
};

type Stage = 'register' | 'save' | 'login';

/**
 * POST には必ず付ける（第7.1節）。付けずに POST すると Astro が「他所からのフォーム送信」
 * とみなして 403 を返す。本文が空の `/api/logout` でも同じ。
 */
const JSON_HEADERS = { 'content-type': 'application/json' };

/** 断りの文。応答の `error` が読めなかったときだけ使う。 */
const FALLBACK_DENY = 'うまくいきませんでした。もう一度お試しください。';

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

  /* --- 右レールのブロックを塗る ------------------------------------ */

  function railButton(label: string): HTMLButtonElement {
    const btn = document.createElement('button');
    btn.type = 'button';
    btn.className = 'rail__ask';
    btn.textContent = label;
    return btn;
  }

  function paint(user: User | null): void {
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
      return;
    }

    const name = document.createElement('p');
    name.className = 'rail__acct-name';
    name.textContent = user.displayName;
    const cohort = document.createElement('p');
    cohort.className = 'rail__note';
    cohort.textContent = user.cohort.name;
    const out = railButton('出る');
    out.addEventListener('click', async () => {
      out.disabled = true;
      await postJson('/api/logout');
      paint(null);
    });
    rail!.append(name, cohort, out);
  }

  /* --- 閉じる道（段2だけ塞ぐ。第5.6節） ---------------------------- */

  // Esc。段2では止める
  dialog.addEventListener('cancel', (e) => {
    if (stage === 'save') e.preventDefault();
  });

  // 背景。::backdrop への click は <dialog> 自身に届く。段2では閉じない
  dialog.addEventListener('click', (e) => {
    if (stage === 'save') return;
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
         文面の中身を見て振り分けると、文面を1文字直しただけで行き先がずれる。
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
    dialog.close();
    paint(user);
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
    dialog.close();
    paint(data as unknown as User);
  });

  /* --- 節を開いたときに1回だけ引く（第5.6節） ---------------------- */

  void fetch('/api/me')
    .then((res) => res.json())
    .then((data: { user?: User | null }) => paint(data?.user ?? null))
    .catch(() => paint(null));
}
