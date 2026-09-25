/**
 * パスワードの作り直し（20-platform.md 第5.3節「運営が管理画面から再発行する」）。
 *
 * **中身は src/server/staff-data.ts の resetPasscode にある。** ここはロールを確かめて
 * JSON にするだけ（src/pages/api/staff/user/[id].ts と同じ形）。
 *
 * 範囲の外の利用者は、居ない人とまったく同じ 404 を返す。自分自身と、管理者でない運営が
 * 管理者を指定した場合は 403（規則は resetPasscode のコメントに書いてある）。
 *
 * 新しいパスワードの平文はこの応答の1回だけ返す。**絶対にログへ出さない。**
 */
import type { APIRoute } from 'astro';
import { json, serverConfig } from '../../../../../server/auth';
import { requireStaff } from '../../../../../server/staff';
import { resetPasscode } from '../../../../../server/staff-data';

export const prerender = false;

export const POST: APIRoute = async ({ params, request }) => {
  const config = serverConfig();
  if (!config) return json({ error: 'サーバの設定が足りません。' }, 500);

  const me = await requireStaff(request);
  if (!me) return json({ error: '管理画面です。' }, 403);

  const result = await resetPasscode(config.db, me, params.id ?? '');
  if (!result.ok) {
    if (result.reason === 'not_found') return json({ error: '見つかりません。' }, 404);
    if (result.reason === 'self') return json({ error: '自分のパスワードはここでは作り直せません。' }, 403);
    return json({ error: '管理者のパスワードは管理者だけが作り直せます。' }, 403);
  }

  return json({ id: result.id, passcode: result.passcode }, 200);
};
