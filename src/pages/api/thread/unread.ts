/**
 * 未読の返事の件数（20-platform.md 第8.5節・第10.1節）。
 *
 * レールのボタンに添える数だけを返す。**節ごとではなく全体の件数**である。学習者は
 * 「どこかに返事が来ている」ことを先に知りたいので、いま開いている節に絞ると、別の節に
 * 来た返事に気づけない。
 *
 * 本文を返さないので軽い。中身は /api/thread を開いたときに読む（そこで既読になる）。
 * 入っていない人には 0 を返す（`/api/thread` と揃える。第7.1節）。
 */
import type { APIRoute } from 'astro';
import { currentUser, json, serverConfig } from '../../../server/auth';
import { unreadCount } from '../../../server/questions';

export const prerender = false;

export const GET: APIRoute = async ({ request }) => {
  const config = serverConfig();
  if (!config) return json({ error: 'サーバの設定が足りません。' }, 500);

  const user = await currentUser(request);
  if (!user) return json({ unread: 0 }, 200);

  return json({ unread: await unreadCount(config.db, user.id) }, 200);
};
