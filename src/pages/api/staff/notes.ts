/**
 * 気づいたことのメモを書く（20-platform.md 第20.3節）。
 *
 * 運営以上だけ。`lessonId` / `weeklyId` のどちらも送らなければ教材全体のメモになる
 * （「教材の公開」の画面のいちばん上の欄。src/server/lessons-publish.ts の createNote）。
 * 両方を同時に送ることはしない（画面側がどちらか一方だけを送る）。
 */
import type { APIRoute } from 'astro';
import { json, readJsonObject, serverConfig } from '../../../server/auth';
import { requireStaff } from '../../../server/staff';
import { createNote } from '../../../server/lessons-publish';

export const prerender = false;

const BODY_MAX = 2000;

export const POST: APIRoute = async ({ request }) => {
  const config = serverConfig();
  if (!config) return json({ error: 'サーバの設定が足りません。' }, 500);
  const { db } = config;

  const me = await requireStaff(request);
  if (!me) return json({ error: '管理画面です。' }, 403);

  const payload = await readJsonObject(request);
  if (!payload) return json({ error: '送信された内容を読み取れませんでした。' }, 400);

  const body = typeof payload.body === 'string' ? payload.body.trim() : '';
  if (body === '') return json({ error: '書いてください。', field: 'body' }, 400);
  if ([...body].length > BODY_MAX) return json({ error: `${BODY_MAX}文字までです。`, field: 'body' }, 400);

  const lessonId = typeof payload.lessonId === 'string' && payload.lessonId.trim() !== '' ? payload.lessonId.trim() : null;
  const weeklyId = typeof payload.weeklyId === 'string' && payload.weeklyId.trim() !== '' ? payload.weeklyId.trim() : null;

  const note = await createNote(db, { lessonId, weeklyId }, body, me.id, Date.now());

  return json({ note }, 200);
};
