/**
 * メモを「解決」にする（20-platform.md 第20.3節）。運営以上だけ。行は消さない。
 */
import type { APIRoute } from 'astro';
import { json, serverConfig } from '../../../../../server/auth';
import { requireStaff } from '../../../../../server/staff';
import { resolveNote } from '../../../../../server/lessons-publish';

export const prerender = false;

export const POST: APIRoute = async ({ request, params }) => {
  const config = serverConfig();
  if (!config) return json({ error: 'サーバの設定が足りません。' }, 500);
  const { db } = config;

  const me = await requireStaff(request);
  if (!me) return json({ error: '管理画面です。' }, 403);

  const id = Number(params.id);
  if (!Number.isInteger(id) || id <= 0) return json({ error: '見つかりません。' }, 404);

  const ok = await resolveNote(db, id, me.id, Date.now());
  if (!ok) return json({ error: '見つかりません。' }, 404);

  return json({ ok: true }, 200);
};
