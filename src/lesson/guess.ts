/**
 * みんなの予想ボードの配線（design/spec/53-ml-intro.md 第6節・第7節）。部品は src/components/lesson/Guess.astro。
 *
 * - ページの中のボードを1回の GET /api/guess?ids=… でまとめて読む。**画面が見えている間だけ5秒ごと**に
 *   読み直し、裏に回ったら止める（見えたらすぐ1回読んでから再開）。答え合わせが押されると、5秒以内に
 *   全員の画面に答えと名前が出る
 * - 予想を出す: POST /api/guess。答え合わせまでは何度でも書き換えられる
 * - 運営のボタン（答え合わせ・やり直す・予想を消す）は API の `staff` を見て出す。押すと画面の中で確かめてから
 *   POST /api/guess/reveal（window.confirm は使わない。20-platform.md 第19章・第20.2節と同じ）
 */

type Entry = { name: string; value: number; closest: boolean; mine: boolean };
type StaffAction = 'reveal' | 'undo' | 'reset';

type BoardState =
  | { revealed: false; count: number; values: number[]; mine: number | null }
  | { revealed: true; count: number; answer: number; answerNote: string; entries: Entry[]; mine: number | null };

const POLL_MS = 5000;
const JSON_HEADERS = { 'content-type': 'application/json' };

/** 予想は小数第1位まで（サーバがそろえる）。38 は「38」、38.4 は「38.4」と出す */
function fmt(v: number): string {
  return Number.isInteger(v) ? String(v) : v.toFixed(1);
}

async function postJson(path: string, body: unknown): Promise<{ ok: boolean; data: Record<string, unknown> }> {
  try {
    const res = await fetch(path, { method: 'POST', headers: JSON_HEADERS, body: JSON.stringify(body) });
    const data = (await res.json().catch(() => ({}))) as Record<string, unknown>;
    return { ok: res.ok, data };
  } catch {
    return { ok: false, data: { error: '送れませんでした。もう一度お試しください。' } };
  }
}

type Board = {
  el: HTMLElement;
  id: string;
  unit: string;
  input: HTMLInputElement | null;
  list: HTMLElement | null;
  count: HTMLElement | null;
  reveal: HTMLElement | null;
  msg: HTMLElement | null;
  start: HTMLButtonElement | null;
  undo: HTMLButtonElement | null;
  reset: HTMLButtonElement | null;
  confirm: HTMLElement | null;
  confirmText: HTMLElement | null;
  go: HTMLButtonElement | null;
  cancel: HTMLButtonElement | null;
  /** いま画面に出している様子（同じなら描き直さない） */
  shownKey: string;
  /** 運営が確かめの段で選んだ操作。null なら段は閉じている */
  pending: StaffAction | null;
  lastRevealed: boolean | null;
  /** 前に読んだときの自分の予想（運営が消したら欄も空にするため） */
  lastMine: number | null;
};

let wired = false;

export function setupGuessBoards(): void {
  if (wired) return;
  wired = true;

  const boards: Board[] = Array.from(document.querySelectorAll<HTMLElement>('[data-guess]')).map((el) => ({
    el,
    id: el.dataset.guess ?? '',
    unit: el.dataset.unit ?? '',
    input: el.querySelector<HTMLInputElement>('[data-guess-input]'),
    list: el.querySelector<HTMLElement>('[data-guess-list]'),
    count: el.querySelector<HTMLElement>('[data-guess-count]'),
    reveal: el.querySelector<HTMLElement>('[data-guess-reveal]'),
    msg: el.querySelector<HTMLElement>('[data-guess-msg]'),
    start: el.querySelector<HTMLButtonElement>('[data-guess-start]'),
    undo: el.querySelector<HTMLButtonElement>('[data-guess-undo]'),
    reset: el.querySelector<HTMLButtonElement>('[data-guess-reset]'),
    confirm: el.querySelector<HTMLElement>('[data-guess-confirm]'),
    confirmText: el.querySelector<HTMLElement>('[data-guess-confirm-text]'),
    go: el.querySelector<HTMLButtonElement>('[data-guess-go]'),
    cancel: el.querySelector<HTMLButtonElement>('[data-guess-cancel]'),
    shownKey: '',
    pending: null,
    lastRevealed: null,
    lastMine: null,
  }));
  if (boards.length === 0) return;

  const ids = [...new Set(boards.map((b) => b.id).filter((id) => id !== ''))];
  let staff = false;
  let timer: number | null = null;
  let loading = false;
  let stopped = false;

  function say(board: Board, text: string): void {
    if (board.msg) board.msg.textContent = text;
  }

  function closeConfirm(board: Board): void {
    board.pending = null;
    if (board.confirm) board.confirm.hidden = true;
  }

  function paint(board: Board, state: BoardState): void {
    // 別の運営が押したなどで状態が変わったら、開いていた確かめの段は閉じる
    if (board.lastRevealed !== null && board.lastRevealed !== state.revealed) closeConfirm(board);
    board.lastRevealed = state.revealed;

    board.el.dataset.revealed = state.revealed ? '1' : '0';
    if (board.start) board.start.hidden = !staff || state.revealed || board.pending !== null;
    if (board.undo) board.undo.hidden = !staff || !state.revealed || board.pending !== null;
    if (board.reset) board.reset.hidden = !staff || board.pending !== null;

    // 運営が予想を消したら、欄と「送りました」の1行も空にする（また予想を出せる）
    if (board.input && board.lastMine !== null && state.mine === null && document.activeElement !== board.input) {
      board.input.value = '';
      say(board, '');
    }
    board.lastMine = state.mine;

    // 自分の予想を欄に入れておく（書いている途中は触らない）
    if (board.input && state.mine !== null && document.activeElement !== board.input && board.input.value === '') {
      board.input.value = fmt(state.mine);
    }

    const key = JSON.stringify(state);
    if (key === board.shownKey) return;
    board.shownKey = key;

    const unit = board.unit;
    if (board.count) {
      board.count.textContent = state.revealed
        ? `予想 ${state.count}人`
        : state.count === 0
          ? 'まだだれも予想していません。'
          : `${state.count}人が予想しました（答え合わせまで名前は出ません）`;
    }

    const items: HTMLLIElement[] = state.revealed
      ? state.entries.map((e) => {
          const li = document.createElement('li');
          li.textContent = `${e.name} ${fmt(e.value)}${unit}`;
          if (e.closest) li.className = 'is-near';
          return li;
        })
      : state.values.map((v) => {
          const li = document.createElement('li');
          li.textContent = `${fmt(v)}${unit}`;
          return li;
        });
    board.list?.replaceChildren(...items);

    if (board.reveal) {
      if (!state.revealed) {
        board.reveal.hidden = true;
        board.reveal.replaceChildren();
      } else {
        const b = document.createElement('b');
        b.textContent = `${fmt(state.answer)}${unit}`;
        const parts: (string | Node)[] = ['本当は ', b, state.answerNote ? `（${state.answerNote}）。` : '。'];
        const near = state.entries.filter((e) => e.closest);
        if (near.length === 0) {
          parts.push('予想はありませんでした。');
        } else {
          const who = document.createElement('span');
          who.className = 'kit-guess__near';
          who.textContent = near.map((e) => `${e.name}（${fmt(e.value)}${unit}）`).join('・');
          parts.push('いちばん近かったのは ', who);
        }
        board.reveal.replaceChildren(...parts);
        board.reveal.hidden = false;
        if (board.msg?.textContent) say(board, '');
      }
    }
  }

  async function refresh(): Promise<void> {
    if (loading || stopped || ids.length === 0) return;
    loading = true;
    try {
      const res = await fetch(`/api/guess?ids=${ids.map(encodeURIComponent).join(',')}`, { cache: 'no-store' });
      const data = (await res.json().catch(() => ({}))) as { boards?: Record<string, BoardState>; staff?: boolean; error?: string };
      if (!res.ok || !data.boards) {
        // ログアウトした・章が準備中に戻ったなど。読み直しても変わらないので止める
        if (res.status === 401 || res.status === 403 || res.status === 404) {
          stopped = true;
          stopPolling();
          for (const board of boards) {
            if (board.count) board.count.textContent = data.error ?? '読み込めませんでした。';
          }
        }
        return;
      }
      staff = data.staff === true;
      for (const board of boards) {
        // 運営として見ている間は予想の欄を出さない（20-platform.md 第26章。サーバも断る）
        board.el.dataset.staffView = staff ? '1' : '0';
        const state = data.boards[board.id];
        if (state) paint(board, state);
      }
    } catch {
      /* 通信が切れたときは次の5秒で読み直す */
    } finally {
      loading = false;
    }
  }

  function startPolling(): void {
    if (timer !== null || stopped) return;
    timer = window.setInterval(() => void refresh(), POLL_MS);
  }

  function stopPolling(): void {
    if (timer === null) return;
    window.clearInterval(timer);
    timer = null;
  }

  document.addEventListener('visibilitychange', () => {
    if (document.visibilityState === 'visible') {
      void refresh();
      startPolling();
    } else {
      stopPolling();
    }
  });

  for (const board of boards) {
    const form = board.el.querySelector<HTMLFormElement>('[data-guess-form]');
    const send = board.el.querySelector<HTMLButtonElement>('[data-guess-send]');
    form?.addEventListener('submit', async (e) => {
      e.preventDefault();
      if (!board.input) return;
      const raw = board.input.value.trim();
      const value = Number(raw);
      if (raw === '' || !Number.isFinite(value) || value < 0 || value > 100) {
        say(board, '0から100までの数を入れてください。');
        return;
      }
      if (send) send.disabled = true;
      const { ok, data } = await postJson('/api/guess', { id: board.id, value });
      if (send) send.disabled = false;
      if (!ok) {
        say(board, typeof data.error === 'string' ? data.error : '送れませんでした。');
        return;
      }
      const saved = typeof data.value === 'number' ? data.value : value;
      board.input.value = fmt(saved);
      say(board, `予想を送りました（${fmt(saved)}${board.unit}）。答え合わせまでは変えられます。`);
      void refresh();
    });

    const openConfirm = (action: StaffAction) => {
      board.pending = action;
      if (board.confirmText) {
        board.confirmText.textContent =
          action === 'reveal'
            ? '本当の数と、全員の名前を見せます。このあとは予想を変えられなくなります。'
            : action === 'undo'
              ? '答えと名前を隠して、予想を受け付ける状態に戻します。出した予想は消えません。'
              : '全員の予想を消します。元に戻せません。';
      }
      if (board.go) board.go.textContent = action === 'reveal' ? '答え合わせをする' : action === 'undo' ? 'やり直す' : '予想を消す';
      if (board.confirm) board.confirm.hidden = false;
      if (board.start) board.start.hidden = true;
      if (board.undo) board.undo.hidden = true;
      if (board.reset) board.reset.hidden = true;
    };
    board.start?.addEventListener('click', () => openConfirm('reveal'));
    board.undo?.addEventListener('click', () => openConfirm('undo'));
    board.reset?.addEventListener('click', () => openConfirm('reset'));
    board.cancel?.addEventListener('click', () => {
      closeConfirm(board);
      if (board.start) board.start.hidden = board.lastRevealed !== false;
      if (board.undo) board.undo.hidden = board.lastRevealed !== true;
      if (board.reset) board.reset.hidden = false;
    });
    board.go?.addEventListener('click', async () => {
      if (board.pending === null || !board.go) return;
      board.go.disabled = true;
      const action = board.pending;
      const body = action === 'reset' ? { id: board.id, reset: true } : { id: board.id, revealed: action === 'reveal' };
      const { ok, data } = await postJson('/api/guess/reveal', body);
      board.go.disabled = false;
      if (!ok) {
        say(board, typeof data.error === 'string' ? data.error : '送れませんでした。');
        return;
      }
      const revealedNow = action === 'reveal';
      closeConfirm(board);
      // 読み直しが走っている最中だと refresh がすぐ戻るので、ボタンはここで先に切り替えておく
      if (board.start) board.start.hidden = revealedNow;
      if (board.undo) board.undo.hidden = !revealedNow;
      if (board.reset) board.reset.hidden = false;
      if (action === 'reset') say(board, '予想を消しました。');
      board.shownKey = '';
      await refresh();
    });
  }

  if (document.visibilityState === 'visible') {
    void refresh();
    startPolling();
  }
}
