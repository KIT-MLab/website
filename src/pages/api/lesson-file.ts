/**
 * 節に添えたファイル（design/spec/57-lesson-files.md 第3.2節）。
 *
 *   GET /api/lesson-file?lesson=<節の id>&name=<ファイル名>
 *
 * その節の frontmatter の files に name があるときだけ返す。それ以外は 404。
 * **その節のページを見られる人にだけ返す**（src/pages/learn/lesson/[...id].astro の canSee と同じ判じ方）。
 * 見られない人には 403 で、中身を1文字も送らない。
 *
 * Cloudflare Workers にはファイルの読み出しが無いので、ビルドのときにサーバの束に入れる。
 * この口はサーバでしか動かないので、ブラウザに配る束には入らない。
 */
import type { APIRoute } from 'astro';
import { getCollection } from 'astro:content';
import { currentUser, json, serverConfig } from '../../server/auth';
import { isMember } from '../../server/member';
import { isLessonPublic } from '../../server/lessons-publish';
import { isMembersOnlyChapter } from '../../lesson/chapters';

export const prerender = false;

/** src/lesson/files/ の下のファイル。名前 → 中身 */
const FILES: Record<string, string> = Object.fromEntries(
  Object.entries(import.meta.glob<string>('../../lesson/files/*', { query: '?raw', import: 'default', eager: true })).map(
    ([path, text]) => [path.slice(path.lastIndexOf('/') + 1), text],
  ),
);

export const GET: APIRoute = async ({ request, url }) => {
  const config = serverConfig();
  if (!config) return json({ error: 'サーバの設定が足りません。' }, 500);

  const lessonId = url.searchParams.get('lesson') ?? '';
  const name = url.searchParams.get('name') ?? '';
  const entry = (await getCollection('lessons')).find((l) => l.data.id === lessonId);
  if (!entry || !(entry.data.files ?? []).includes(name) || !Object.prototype.hasOwnProperty.call(FILES, name)) {
    return json({ error: '見つかりません。' }, 404);
  }

  // 節のページと同じ判じ方。メンバーだけの章ならメンバー、準備中なら運営・管理者
  const viewer = await currentUser(request);
  const isStaff = viewer !== null && (viewer.role === 'staff' || viewer.role === 'admin');
  const membersOnly = isMembersOnlyChapter(entry.data.chapter);
  if (membersOnly && !(viewer !== null && isMember(viewer))) return json({ error: 'メンバー向けです。' }, 403);
  if (!isStaff && !(await isLessonPublic(config.db, entry.data.chapter, entry.data.id))) {
    return json({ error: 'この節は準備中です。' }, 403);
  }

  return new Response(FILES[name], {
    status: 200,
    headers: {
      'content-type': name.endsWith('.csv') ? 'text/csv; charset=utf-8' : 'text/plain; charset=utf-8',
      // メンバーだけのファイルなので public にしない
      'cache-control': 'private, max-age=600',
    },
  });
};
