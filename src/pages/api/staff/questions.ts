/**
 * 質問の一覧（20-platform.md 第10.2節・第10.4節・第7章）。
 *
 * **中身は src/server/questions.ts にある。** ここはロールを確かめて JSON にするだけ。
 * 運営の画面（/staff/questions）も同じ関数を呼ぶ。並び（未返信が上・古い順）と範囲を
 * 2か所に置くと、片方だけ直したときに静かに食い違う。
 */
import type { APIRoute } from 'astro';
import { json, serverConfig } from '../../../server/auth';
import { requireStaff } from '../../../server/staff';
import { staffQuestions } from '../../../server/questions';

export const prerender = false;

export const GET: APIRoute = async ({ request }) => {
  const config = serverConfig();
  if (!config) return json({ error: 'サーバの設定が足りません。' }, 500);

  const me = await requireStaff(request);
  if (!me) return json({ error: '運営の画面です。' }, 403);

  return json({ items: await staffQuestions(config.db, me) }, 200);
};
