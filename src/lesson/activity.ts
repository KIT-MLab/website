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
 * **送る時機はここで決めない。**呼ぶ側が持っている「30秒ごと」「pagehide」「裏に回ったとき」
 * の送信から `send()` を呼ぶ。節の画面では進度の送信と同じ時機にそろえるためで、
 * 送る仕掛けを2つ並べると、どちらかだけが鳴ったときに食い違う。
 *
 * 入っていない人は何も送らない。`loggedIn` が false なら溜めたものを捨てる。
 */

const INPUTS = ['pointerdown', 'pointermove', 'keydown', 'wheel', 'scroll', 'touchstart'];
const CHECK_EVERY_MS = 15000;
const IDLE_MS = 120000;
const MINUTE_MS = 60000;
/** 1回に送る上限。口（/api/activity）の上限と同じ */
const MAX_SEND = 200;

export type ActivityTracker = { send: () => Promise<void> };

/**
 * `lessonId` は記録に添える節の id。メンバーの画面なら 'home'。
 * `loggedIn` は送る直前に1回だけ呼ぶ。
 */
export function trackActivity(lessonId: string, loggedIn: () => Promise<boolean>): ActivityTracker {
  /** 最後に入力があった時刻。まだ1度も無ければ null（開いただけでは数えない） */
  let lastInput: number | null = null;
  /** まだ送っていない分 → 節の id */
  const pending = new Map<number, string>();

  const mark = () => {
    lastInput = Date.now();
  };
  // scroll は泡立たないので、捕獲の段で window に届くものを拾う
  for (const type of INPUTS) window.addEventListener(type, mark, { passive: true, capture: true });

  window.setInterval(() => {
    if (document.visibilityState !== 'visible' || lastInput === null) return;
    const now = Date.now();
    if (now - lastInput > IDLE_MS) return;
    const minute = Math.floor(now / MINUTE_MS) * MINUTE_MS;
    if (!pending.has(minute)) pending.set(minute, lessonId);
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
        body: JSON.stringify({ minutes: batch.map(([minute, id]) => ({ minute, lessonId: id })) }),
        // 画面を離れる途中でも打ち切られないように。200件でも 64KB には届かない
        keepalive: true,
      });
      // 通った、または送り直しても通らない（入っていない・形が違う）ものは戻さない
      keep = !res.ok && res.status !== 401 && res.status !== 400;
    } catch {
      keep = true;
    }
    if (keep) for (const [minute, id] of batch) if (!pending.has(minute)) pending.set(minute, id);
  }

  return { send };
}
