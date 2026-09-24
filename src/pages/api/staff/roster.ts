/**
 * 一覧（20-platform.md 第8.1節・第7章）。
 *
 * **中身は src/server/staff-data.ts にある。** ここはロールを確かめて JSON にするだけ。
 * 同じ問い合わせを画面と口の2か所に置くと、しきい値や範囲を片方だけ直したときに
 * 静かに食い違う。運営の画面（/staff/）も同じ関数を呼んでいる。
 */
import type { APIRoute } from 'astro';
import { json, serverConfig } from '../../../server/auth';
import { requireStaff } from '../../../server/staff';
import { rosterStudents } from '../../../server/staff-data';

export const prerender = false;

export const GET: APIRoute = async ({ request }) => {
  const config = serverConfig();
  if (!config) return json({ error: 'サーバの設定が足りません。' }, 500);

  const me = await requireStaff(request);
  if (!me) return json({ error: '管理画面です。' }, 403);

  return json({ students: await rosterStudents(config.db, me) }, 200);
};
