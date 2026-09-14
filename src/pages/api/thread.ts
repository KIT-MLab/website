/**
 * その節の自分のやりとり（20-platform.md 第8.5節・第10章）。
 *
 * 自分の質問と、自分あての返事を**古い順に1本**で返す。**学習者どうしは見えない**
 * （第8.5節）ので、条件はどちらも「自分」で固定してあり、利用者IDを受け取る口は作らない。
 *
 * **入っていない人にも 200 と空の一覧を返す。**401 にしない。入っていない人にレールの欄は
 * 出ないが、出ないことと口が落ちることは別である。`/api/me` と同じ考え方（第7.1節）。
 *
 * **呼んだ時点で既読にする**（第8.5節「学習者がやりとりを開いたとき」）。中身は
 * src/server/questions.ts の openThread にある。
 */
import type { APIRoute } from 'astro';
import { currentUser, json, serverConfig } from '../../server/auth';
import { openThread } from '../../server/questions';

export const prerender = false;

export const GET: APIRoute = async ({ request, url }) => {
  const config = serverConfig();
  if (!config) return json({ error: 'サーバの設定が足りません。' }, 500);

  const user = await currentUser(request);
  if (!user) return json({ items: [] }, 200);

  const lessonId = (url.searchParams.get('lessonId') ?? '').trim();
  if (lessonId === '') return json({ items: [] }, 200);

  return json({ items: await openThread(config.db, user.id, lessonId) }, 200);
};
