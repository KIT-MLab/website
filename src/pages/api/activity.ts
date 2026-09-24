/**
 * 活動した分を受ける（20-platform.md 第13.6節）。
 *
 * 本文は `{ minutes: [{ minute, lessonId }] }`。1回200件まで。
 * 画面は教材の各節とメンバーの画面で、15秒ごとに「いま活動しているか」を見て、
 * していればその分の始まりを手元に溜め、30秒ごとと画面を離れるときにここへ送る。
 *
 * **取り組んだ時間 = 活動した分の行数。**主キーが (user_id, minute) なので、同じ分に
 * 2つのタブで活動しても1行になる。`INSERT OR IGNORE` で二度目は黙って捨てる。
 *
 * 次のものは黙って捨てる（断らない。断ると画面が同じ束を送り直し続ける）:
 *   ・minute が 60000 の倍数でない
 *   ・いまより2分以上先
 *   ・7日より前
 *
 * 入っていない人は 401（第13.8節「ログインしていない人から取らない」）。
 */
import type { APIRoute } from 'astro';
import type { Stmt } from '../../server/auth';
import { currentUser, json, readJsonObject, serverConfig } from '../../server/auth';

export const prerender = false;

const MAX_MINUTES = 200;
const MINUTE_MS = 60000;
const AHEAD_MS = 2 * MINUTE_MS;
const KEEP_MS = 7 * 24 * 60 * MINUTE_MS;

export const POST: APIRoute = async ({ request }) => {
  const config = serverConfig();
  if (!config) return json({ error: 'サーバの設定が足りません。' }, 500);
  const { db } = config;

  const user = await currentUser(request);
  if (!user) return json({ error: 'ログインしていません。' }, 401);

  const body = await readJsonObject(request);
  if (!body || !Array.isArray(body.minutes)) return json({ error: '送信された内容を読み取れませんでした。' }, 400);
  if (body.minutes.length > MAX_MINUTES) {
    return json({ error: `一度に送れるのは${MAX_MINUTES}件までです。` }, 400);
  }

  const now = Date.now();
  const statements: Stmt[] = [];
  for (const raw of body.minutes) {
    if (raw === null || typeof raw !== 'object' || Array.isArray(raw)) continue;
    const item = raw as Record<string, unknown>;
    const minute = item.minute;
    if (typeof minute !== 'number' || !Number.isInteger(minute) || minute % MINUTE_MS !== 0) continue;
    if (minute >= now + AHEAD_MS || minute < now - KEEP_MS) continue;
    // 節の id は40字に届かない。長い文字列を送られても表を太らせない
    const lessonId = typeof item.lessonId === 'string' ? item.lessonId.trim().slice(0, 80) : '';
    statements.push(
      db
        .prepare('INSERT OR IGNORE INTO activity_minutes (user_id, minute, lesson_id) VALUES (?, ?, ?)')
        .bind(user.id, minute, lessonId),
    );
  }

  // 実際に増えた行数。INSERT OR IGNORE が捨てた分は meta.changes が 0 になる
  const results = statements.length > 0 ? await db.batch(statements) : [];
  const saved = results.reduce((sum, r) => sum + (r.meta?.changes ?? 0), 0);
  return json({ saved }, 200);
};
