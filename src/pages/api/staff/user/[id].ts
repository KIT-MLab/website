/**
 * 1人の詳細（20-platform.md 第8.4節・第7章）。
 *
 * **中身は src/server/staff-data.ts にある。** ここはロールを確かめて JSON にするだけ。
 *
 * 範囲の外の利用者は、**居ない人とまったく同じ 404** を返す。誰が居るかを教えないため。
 * その判定も staff-data.ts の中にあり、見えない相手には null が返る。
 */
import type { APIRoute } from 'astro';
import { json, normalizeUserId, serverConfig } from '../../../../server/auth';
import { requireStaff } from '../../../../server/staff';
import { userDetail } from '../../../../server/staff-data';

export const prerender = false;

export const GET: APIRoute = async ({ params, request }) => {
  const config = serverConfig();
  if (!config) return json({ error: 'サーバの設定が足りません。' }, 500);

  const me = await requireStaff(request);
  if (!me) return json({ error: '運営の画面です。' }, 403);

  // 紙を見て打ち直す場面があるので、ログインと同じ揺れを吸う
  const detail = await userDetail(config.db, me, normalizeUserId(params.id ?? ''));
  if (!detail) return json({ error: '見つかりません。' }, 404);

  return json(detail, 200);
};
