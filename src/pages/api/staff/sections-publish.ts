/**
 * 節の公開・準備中の切り替え（design/spec/53-ml-intro.md 第12節）。
 *
 * プロジェクトの教材の章（タイタニック演習）は、節を1つずつ決まった集まりで使うので節ごとに公開する。
 * 形は章の切り替え（lessons-publish.ts）と同じで、`{ lesson: <節の id>, public }`。
 * **管理者だけ。**プロジェクトの教材の章の節でなければ 400（ほかの章は章ごとに公開する）。
 */
import type { APIRoute } from 'astro';
import { getCollection } from 'astro:content';
import { json, readJsonObject, serverConfig } from '../../../server/auth';
import { requireAdmin } from '../../../server/staff';
import { setSectionPublic } from '../../../server/lessons-publish';
import { isMembersOnlyChapter } from '../../../lesson/chapters';

export const prerender = false;

export const POST: APIRoute = async ({ request }) => {
  const config = serverConfig();
  if (!config) return json({ error: 'サーバの設定が足りません。' }, 500);
  const { db } = config;

  const me = await requireAdmin(request);
  if (!me) return json({ error: '管理者の画面です。' }, 403);

  const body = await readJsonObject(request);
  if (!body) return json({ error: '送信された内容を読み取れませんでした。' }, 400);

  const lessonId = typeof body.lesson === 'string' ? body.lesson.trim() : '';
  if (lessonId === '') return json({ error: '節を指定してください。' }, 400);

  const isPublic = body.public === true;

  const lessons = await getCollection('lessons');
  const entry = lessons.find((l) => l.data.id === lessonId);
  if (!entry) return json({ error: '見つかりません。' }, 404);
  if (!isMembersOnlyChapter(entry.data.chapter)) return json({ error: 'この節は章ごとに公開します。' }, 400);

  const now = Date.now();
  await setSectionPublic(db, lessonId, isPublic, me.id, now);

  return json({ ok: true, lesson: lessonId, public: isPublic, updatedAt: now }, 200);
};
