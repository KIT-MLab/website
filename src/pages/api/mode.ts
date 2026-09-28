/**
 * 学習者として・運営としてを切り替える（20-platform.md 第26章）。
 *
 *   POST /api/mode   { mode: 'learner' | 'staff' }
 *
 * 選んだ側は**このブラウザの** Cookie（`mlab_mode`）に書くだけで、アカウントには書かない。
 * 会場の据え置きの PC は運営として、手元の携帯電話は学習者として、を同じアカウントで並べるため。
 *
 * 切り替えられるのは記録の中のロールが運営・管理者の人だけ。学生には断る（Cookie を自分で
 * 書いても何も変わらないので、断るのは画面の押し間違いを知らせるためだけである）。
 *
 * 画面は切り替える**前に**手元の未送信を送りきってから呼ぶ（src/lesson/account.ts）。
 * 送る側はこの Cookie で決まるので、切り替えたあとに送ると前の側の記録が次の側に入る。
 */
import type { APIRoute } from 'astro';
import { currentUser, hasModes, json, modeCookie, readJsonObject, serverConfig } from '../../server/auth';

export const prerender = false;

export const POST: APIRoute = async ({ request }) => {
  const config = serverConfig();
  if (!config) return json({ error: 'サーバの設定が足りません。' }, 500);

  const user = await currentUser(request);
  if (!user) return json({ error: 'ログインしていません。' }, 401);
  if (!hasModes(user.realRole)) return json({ error: '切り替えはありません。' }, 403);

  const body = await readJsonObject(request);
  const mode = body?.mode;
  if (mode !== 'learner' && mode !== 'staff') return json({ error: '送信された内容を読み取れませんでした。' }, 400);

  return json({ mode }, 200, modeCookie(mode));
};
