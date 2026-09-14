/**
 * 進度を受ける（20-platform.md 第6.1節・第7章）。
 *
 * 画面は進度を手元（localStorage）に書き、**節を離れるときと30秒ごと**にここへ送る。
 * だからこの口は「いま起きたこと」ではなく「手元に溜まったもの」を受け取る。
 * ふだんは1件、引き継ぎ（第6.1節「入ったときに手元の進度をどうするか」）のときは
 * まとめて届く。口を2つに分けず、どちらも配列で受ける。
 *
 * **入れ方は上書きではなく合わせる。**同じ節が別の端末から、別の順番で、何度でも届く
 * 前提だからである。上書きにすると、後から届いた古い写しが新しい記録を押し戻す。
 * 合わせ方は第6.1節の表のとおりで、SQL の ON CONFLICT に書いてある。
 *
 * 時刻はすべてミリ秒（第6章）。`seconds` だけが秒である（列の名前のとおり）。
 */
import type { APIRoute } from 'astro';
import type { Stmt } from '../../server/auth';
import { currentUser, json, readJsonObject, serverConfig } from '../../server/auth';

export const prerender = false;

/**
 * 1回に受ける上限。引き継ぎでまとめて送られても、この数で頭打ちにする。
 * 教材の節はこれより少ないので、まともな画面がこれを超えることはない。
 */
const MAX_LESSONS = 200;

/**
 * 合わせ方（第6.1節の表）。
 *
 *   state     … `done` が `opened` に勝つ。既に `done` なら `opened` で戻さない
 *   opened_at … 早いほう
 *   done_at   … 既にあれば早いほう。**片方が NULL のときに MIN を使わない。**
 *               SQLite の `MIN(x, NULL)` は NULL を返すので、
 *               「一度 done になった時刻」が opened の送り直しで消える
 *   seconds   … 大きいほう。**足さない。**同じものを二度送っても増えないため
 */
const MERGE = `
  INSERT INTO progress (user_id, lesson_id, state, opened_at, done_at, seconds)
  VALUES (?, ?, ?, ?, ?, ?)
  ON CONFLICT (user_id, lesson_id) DO UPDATE SET
    state     = CASE WHEN progress.state = 'done' OR excluded.state = 'done' THEN 'done' ELSE 'opened' END,
    opened_at = MIN(progress.opened_at, excluded.opened_at),
    done_at   = CASE
                  WHEN progress.done_at IS NULL THEN excluded.done_at
                  WHEN excluded.done_at IS NULL THEN progress.done_at
                  ELSE MIN(progress.done_at, excluded.done_at)
                END,
    seconds   = MAX(progress.seconds, excluded.seconds)
`;

/** ミリ秒として読めるものだけを通す。読めなければ null（呼ぶ側が既定値を決める）。 */
function toMs(value: unknown): number | null {
  if (typeof value !== 'number' || !Number.isFinite(value) || value <= 0) return null;
  return Math.floor(value);
}

/** 秒。負や壊れた値は 0 にする。0 なら MAX で必ず負けるので、記録を減らさない。 */
function toSeconds(value: unknown): number {
  if (typeof value !== 'number' || !Number.isFinite(value) || value <= 0) return 0;
  return Math.floor(value);
}

export const POST: APIRoute = async ({ request }) => {
  const config = serverConfig();
  if (!config) return json({ error: 'サーバの設定が足りません。' }, 500);
  const { db } = config;

  // 入っていない人の進度は受けない（第9章の12「ログアウトした状態でも本文は読める
  // （進度は記録されない）」）。画面は手元に書くだけで、そもそもここへ送らない。
  const user = await currentUser(request);
  if (!user) return json({ error: 'ログインしていません。' }, 401);

  const body = await readJsonObject(request);
  if (!body) return json({ error: '送信された内容を読み取れませんでした。' }, 400);

  const lessons = body.lessons;
  if (!Array.isArray(lessons)) return json({ error: '送信された内容を読み取れませんでした。' }, 400);
  if (lessons.length > MAX_LESSONS) {
    return json({ error: `一度に送れるのは${MAX_LESSONS}件までです。` }, 400);
  }

  const now = Date.now();
  const statements: Stmt[] = [];

  for (const raw of lessons) {
    // 1件が壊れていても全体を断らない。**断ると画面は同じ束を送り直し、同じところで
    // また断られる。**壊れた1件が残りの進度を永久に通さなくなるので、飛ばして次へ。
    if (raw === null || typeof raw !== 'object' || Array.isArray(raw)) continue;
    const item = raw as Record<string, unknown>;

    const lessonId = String(item.lessonId ?? '').trim();
    if (lessonId === '') continue;

    const state = item.state;
    if (state !== 'opened' && state !== 'done') continue;

    // 時刻が読めなければ「いま」にする。節を開いたこと自体は起きているので、
    // 時刻が欠けているだけで記録を捨てない。
    const openedAt = toMs(item.openedAt) ?? now;
    // `done_at` は done になった時刻。opened で送られてきた doneAt は見ない
    // （state と食い違う値を記録に入れないため）。
    const doneAt = state === 'done' ? (toMs(item.doneAt) ?? now) : null;

    statements.push(db.prepare(MERGE).bind(user.id, lessonId, state, openedAt, doneAt, toSeconds(item.seconds)));
  }

  // まとめて1往復で書く。1件ずつ await で回すと200件で200往復になる。
  if (statements.length > 0) await db.batch(statements);

  return json({ saved: statements.length }, 200);
};
