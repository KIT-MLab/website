/**
 * 活動した分を数えて送る（20-platform.md 第13.6節）。
 *
 * **活動した分** = その1分の間に、画面が見えていて、かつ直前120秒以内に入力
 * （pointerdown pointermove keydown wheel scroll touchstart のどれか）があった分。
 * 節の画面を開いたままの放置を数えないため。読んでいて手が止まる時間は120秒まで許す。
 *
 * 15秒ごとに「いま活動しているか」を見て、していればその分の始まり
 * （`Math.floor(Date.now() / 60000) * 60000`）を手元の集合に足す。
 *
 * **取り組んでいる課題**（design/spec/55-stumbles.md 第3.2節）も1分ごとに添える。
 * = 最後に触った課題の箱（課題の箱の中での pointerdown keydown input focusin）。
 * 課題の箱は src/components/lesson/Exercise.astro の根（`section.kit-ex`。id 属性が課題の id）。
 * 触った箱が画面から完全に外れたら（1ピクセルも見えていない）「無し」に戻す（本文を読みに戻った）。
 * 取り組んでいる課題が変わったときは、その分を手元に足して2秒後に送る（集まりの最中に「いま」が遅れないように）。
 *
 * **送る時機はここで決めない。**呼ぶ側が持っている「30秒ごと」「pagehide」「裏に回ったとき」
 * の送信から `send()` を呼ぶ。節の画面では進度の送信と同じ時機にそろえるためで、
 * 送る仕掛けを2つ並べると、どちらかだけが鳴ったときに食い違う。
 * 例外は上の「取り組んでいる課題が変わったとき」だけ。
 *
 * 入っていない人は何も送らない。`loggedIn` が false なら溜めたものを捨てる。
 */

const INPUTS = ['pointerdown', 'pointermove', 'keydown', 'wheel', 'scroll', 'touchstart'];
/** 課題の箱を「触った」とみなす入力（第3.2節） */
const TOUCHES = ['pointerdown', 'keydown', 'input', 'focusin'];
const EXERCISE_BOX = 'section.kit-ex[id]';
const CHECK_EVERY_MS = 15000;
const IDLE_MS = 120000;
const MINUTE_MS = 60000;
/** 取り組んでいる課題が変わってから送るまで。このあいだの変わり目は1回にまとめる */
const CHANGE_SEND_MS = 2000;
/** 1回に送る上限。口（/api/activity）の上限と同じ */
const MAX_SEND = 200;

export type ActivityTracker = { send: () => Promise<void> };

/** 1分ぶんの記録。どの節（ページ）にいて、どの課題に取り組んでいたか（無ければ ''） */
type Entry = { lessonId: string; exerciseId: string };

/**
 * `lessonId` は記録に添えるページの id。節の id・今週の演習の id・練習問題集の話題の id。
 * メンバーの画面なら 'home'。
 * `loggedIn` は送る直前に1回だけ呼ぶ。
 */
export function trackActivity(lessonId: string, loggedIn: () => Promise<boolean>): ActivityTracker {
  /** 最後に入力があった時刻。まだ1度も無ければ null（開いただけでは数えない） */
  let lastInput: number | null = null;
  /** まだ送っていない分 → その分の記録 */
  const pending = new Map<number, Entry>();
  /** 取り組んでいる課題の id。無ければ '' */
  let current = '';
  /** 変わり目で送るのを待っている印 */
  let changeTimer: number | null = null;

  const mark = () => {
    lastInput = Date.now();
  };
  // scroll は泡立たないので、捕獲の段で window に届くものを拾う
  for (const type of INPUTS) window.addEventListener(type, mark, { passive: true, capture: true });

  /** いまの分を、いまの取り組んでいる課題で手元に置く（同じ分の中で変わったら、あとのもので上書き） */
  function markMinute(): void {
    const minute = Math.floor(Date.now() / MINUTE_MS) * MINUTE_MS;
    pending.set(minute, { lessonId, exerciseId: current });
  }

  function change(next: string): void {
    if (next === current) return;
    current = next;
    // 変わるのは触ったときか、スクロールで箱が外れたときだけ。どちらも入力なので、この分は活動した分
    mark();
    markMinute();
    if (changeTimer === null) {
      changeTimer = window.setTimeout(() => {
        changeTimer = null;
        void send();
      }, CHANGE_SEND_MS);
    }
  }

  // 触った箱が画面から完全に外れたら「無し」に戻す。見ている箱は1つだけ
  const seen = typeof IntersectionObserver === 'function'
    ? new IntersectionObserver((entries) => {
        for (const entry of entries) {
          if (!entry.isIntersecting && (entry.target as HTMLElement).id === current) change('');
        }
      })
    : null;
  let watched: Element | null = null;

  const touch = (event: Event) => {
    const target = event.target;
    if (!(target instanceof Element)) return;
    const box = target.closest(EXERCISE_BOX);
    if (!box || box.id === '') return;
    if (box !== watched) {
      if (watched) seen?.unobserve(watched);
      watched = box;
      seen?.observe(box);
    }
    change(box.id);
  };
  for (const type of TOUCHES) document.addEventListener(type, touch, { passive: true, capture: true });

  window.setInterval(() => {
    if (document.visibilityState !== 'visible' || lastInput === null) return;
    if (Date.now() - lastInput > IDLE_MS) return;
    markMinute();
  }, CHECK_EVERY_MS);

  async function send(): Promise<void> {
    if (pending.size === 0) return;
    if (!(await loggedIn())) {
      pending.clear();
      return;
    }

    // 送る分は先に手元から外す。送っている間に次の送信（pagehide など）が重なっても
    // 同じ分を二重に送らず、そのあいだに溜まった分は次の送信に回る
    const batch = [...pending].slice(0, MAX_SEND);
    for (const [minute] of batch) pending.delete(minute);

    let keep = true;
    try {
      const res = await fetch('/api/activity', {
        method: 'POST',
        // POST には必ず付ける（第7.1節）。付けないと Astro が 403 を返す
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({
          minutes: batch.map(([minute, e]) => ({ minute, lessonId: e.lessonId, exerciseId: e.exerciseId })),
        }),
        // 画面を離れる途中でも打ち切られないように。200件でも 64KB には届かない
        keepalive: true,
      });
      // 通った、または送り直しても通らない（入っていない・形が違う）ものは戻さない
      keep = !res.ok && res.status !== 401 && res.status !== 400;
    } catch {
      keep = true;
    }
    if (keep) for (const [minute, e] of batch) if (!pending.has(minute)) pending.set(minute, e);
  }

  return { send };
}
