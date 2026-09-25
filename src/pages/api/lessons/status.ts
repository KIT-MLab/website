/**
 * 章の公開状態を画面へ返す（20-platform.md 第20.1節）。
 *
 * `/learn/`（学習の一覧）と用語の検索の右の欄は、どちらも事前生成・静的な索引を持つ
 * ページなので、どの章が準備中かはブラウザからここを読んで知る（第13.2節と同じ考え方）。
 *
 * ログインしていなくても 200 を返す（`/api/me` と同じ約束。第7.1節）。準備中の章の一覧は
 * 誰が見ても困る情報ではない（中身までは見えない）ので、`public` の値だけを返す。
 */
import type { APIRoute } from 'astro';
import { currentUser, json, serverConfig } from '../../../server/auth';
import { publicChapters } from '../../../server/lessons-publish';

export const prerender = false;

export const GET: APIRoute = async ({ request }) => {
  const config = serverConfig();
  if (!config) return json({ error: 'サーバの設定が足りません。' }, 500);

  const user = await currentUser(request);
  const staff = user !== null && (user.role === 'staff' || user.role === 'admin');

  const pub = await publicChapters(config.db);
  return json({ public: [...pub], staff }, 200);
};
