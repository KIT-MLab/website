/**
 * 章の公開・準備中の切り替え（20-platform.md 第20.1節・第20.2節）。
 *
 * **管理者だけ。**運営（staff）は準備中の章を見られる・課題を解けるが、切り替えはできない
 * （第20.1節「公開と準備中の切り替えは管理者だけ」）。
 */
import type { APIRoute } from 'astro';
import { getCollection } from 'astro:content';
import { json, readJsonObject, serverConfig } from '../../../server/auth';
import { requireAdmin } from '../../../server/staff';
import { setChapterPublic } from '../../../server/lessons-publish';

export const prerender = false;

export const POST: APIRoute = async ({ request }) => {
  const config = serverConfig();
  if (!config) return json({ error: 'サーバの設定が足りません。' }, 500);
  const { db } = config;

  const me = await requireAdmin(request);
  if (!me) return json({ error: '管理者の画面です。' }, 403);

  const body = await readJsonObject(request);
  if (!body) return json({ error: '送信された内容を読み取れませんでした。' }, 400);

  const chapter = typeof body.chapter === 'string' ? body.chapter.trim() : '';
  if (chapter === '') return json({ error: '章を指定してください。' }, 400);

  const isPublic = body.public === true;

  const lessons = await getCollection('lessons');
  if (!lessons.some((l) => l.data.chapter === chapter)) return json({ error: '見つかりません。' }, 404);

  const now = Date.now();
  await setChapterPublic(db, chapter, isPublic, me.id, now);

  return json({ ok: true, chapter, public: isPublic, updatedAt: now }, 200);
};
