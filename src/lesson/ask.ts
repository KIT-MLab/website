import { getLessonData } from './data';
import { STAGE } from './exercise-place';

/** POST には必ず付ける（第7.1節）。付けないと Astro が 403 を返す。 */
const JSON_HEADERS = { 'content-type': 'application/json' };

const FALLBACK_DENY = 'うまくいきませんでした。もう一度お試しください。';

/**
 * 「4問目（演習問題）について」。課題に紐づいた返事の頭に添える（第8.5節）。
 * 節と課題でやりとりを2本に分けず、どの課題の話かを文の頭で言う。
 */
function aboutExercise(exerciseId: string | null): string | null {
  if (!exerciseId) return null;
  const data = getLessonData();
  const at = data?.exerciseIds.indexOf(exerciseId) ?? -1;
  if (!data || at < 0) return null;
  const stage = STAGE[data.exercises[exerciseId]?.kind ?? ''] ?? '';
  return stage ? `${at + 1}問目（${stage}）について` : `${at + 1}問目について`;
}

/** 「9月15日 14:32」。年は出さない（同じ節のやりとりが年をまたぐことはまず無い）。 */
function when(ms: number): string {
  const d = new Date(ms);
  const mm = String(d.getMinutes()).padStart(2, '0');
  return `${d.getMonth() + 1}月${d.getDate()}日 ${d.getHours()}:${mm}`;
}

export function setupAsk(): void {
  const dialog = document.getElementById('kit-ask') as HTMLDialogElement | null;
  const button = document.getElementById('kit-ask-open') as HTMLButtonElement | null;
  if (!dialog || !button || typeof dialog.showModal !== 'function') return;

  const q = <T extends HTMLElement>(sel: string) => dialog.querySelector(sel) as T;
  const list = q<HTMLElement>('#kit-ask-thread');
  const none = q<HTMLElement>('#kit-ask-none');
  const form = q<HTMLFormElement>('#kit-ask-form');
  const input = q<HTMLTextAreaElement>('#kit-ask-body');
  const send = q<HTMLButtonElement>('#kit-ask-go');
  const deny = q<HTMLElement>('#kit-ask-deny');

  const lessonId = getLessonData()?.lessonId ?? '';

  /* --- レールのボタン --------------------------------------------- */

  /**
   * ボタンの文。**未読があれば件数を添える**（第10.1節「返信が来たら件数が出る」）。
   * 数は節ごとではなく全体（第8.5節）なので、この節に返事が無くても出る。
   */
  function paintButton(unread: number): void {
    button!.textContent = unread > 0 ? `質問（${unread}）` : '質問する';
  }

  async function refreshUnread(): Promise<void> {
    try {
      const res = await fetch('/api/thread/unread');
      const data = (await res.json()) as { unread?: number };
      paintButton(Number(data?.unread ?? 0));
    } catch {
      /* 数が出ないだけ。質問そのものは送れるので、押せなくはしない */
    }
  }

  /* --- やりとり ---------------------------------------------------- */

  function render(items: Item[]): void {
    list.replaceChildren();
    none.hidden = items.length > 0;

    for (const item of items) {
      const li = document.createElement('li');
      li.className = `kit-ask__item kit-ask__item--${item.kind}`;

      const head = document.createElement('p');
      head.className = 'kit-ask__from';
      head.textContent = `${item.kind === 'question' ? 'あなたの質問' : '返事'}　${when(item.at)}`;
      li.append(head);

      const body = document.createElement('p');
      body.className = 'kit-ask__body';
      const about = aboutExercise(item.exerciseId);
      if (about) {
        const tag = document.createElement('span');
        tag.className = 'kit-ask__about';
        tag.textContent = `${about}　`;
        body.append(tag);
      }
      body.append(document.createTextNode(item.body));
      li.append(body);

      // 添えたコード（第10.5節）。そのまま出す。整形しない
      if (item.code) {
        const code = document.createElement('pre');
        code.className = 'kit-ask__code';
        code.textContent = item.code;
        li.append(code);
      }

      list.append(li);
    }
    // 会話なので下が新しい。開いたときに最後が見えるようにする
    list.scrollTop = list.scrollHeight;
  }

  async function load(): Promise<void> {
    none.hidden = true;
    list.replaceChildren();
    try {
      const res = await fetch(`/api/thread?lessonId=${encodeURIComponent(lessonId)}`);
      const data = (await res.json()) as { items?: Item[] };
      render(data?.items ?? []);
    } catch {
      render([]);
      deny.textContent = '読み込めませんでした。もう一度お試しください。';
    }
    // 開いた時点で既読になる（第8.5節）ので、ボタンの件数も落とす
    void refreshUnread();
  }

  /* --- 開け閉め ---------------------------------------------------- */

  button.addEventListener('click', () => {
    deny.textContent = '';
    if (!dialog.open) dialog.showModal();
    input.focus();
    void load();
  });

  // 背景を押したら閉じる。::backdrop への click は <dialog> 自身に届く。
  // 塞ぐ段は無い（アカウントの小窓と違い、いつ閉じてもよいもの）
  dialog.addEventListener('click', (e) => {
    if (e.target === dialog) dialog.close();
  });

  for (const btn of dialog.querySelectorAll<HTMLButtonElement>('[data-ask-cancel]')) {
    btn.addEventListener('click', () => dialog.close());
  }

  /* --- 送る -------------------------------------------------------- */

  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    deny.textContent = '';
    const body = input.value.trim();
    if (body === '') {
      deny.textContent = '質問を書いてください。';
      return;
    }

    send.disabled = true;
    try {
      const res = await fetch('/api/question', {
        method: 'POST',
        headers: JSON_HEADERS,
        body: JSON.stringify({ lessonId, body }),
      });
      const data = (await res.json().catch(() => ({}))) as { error?: string };
      if (!res.ok) {
        deny.textContent = data.error ?? FALLBACK_DENY;
        return;
      }
    } catch {
      deny.textContent = '送れませんでした。もう一度お試しください。';
      return;
    } finally {
      send.disabled = false;
    }

    /* その場でやりとりに足す。読み込み直さない（読んでいた場所を失わないため）。
       添えたコードはサーバが選ぶので画面は知らない。ここでは出さず、次に開いたときに
       サーバから来たものが出る。 */
    input.value = '';
    none.hidden = true;
    const li = document.createElement('li');
    li.className = 'kit-ask__item kit-ask__item--question';
    const head = document.createElement('p');
    head.className = 'kit-ask__from';
    head.textContent = `あなたの質問　${when(Date.now())}`;
    const text = document.createElement('p');
    text.className = 'kit-ask__body';
    text.textContent = body;
    li.append(head, text);
    list.append(li);
    list.scrollTop = list.scrollHeight;
  });

  /* --- 最初に1回 --------------------------------------------------- */

  void refreshUnread();
  /* 入った直後にも数を出す。account.ts は入った処理を終えたところで kit:progress を
     鳴らすので、それに乗る（口を1つ増やさない）。読み込み直さずに欄が現れるため、
     この合図が無いと、次にページを開くまで件数が出ない。 */
  window.addEventListener('kit:progress', () => void refreshUnread());
}
