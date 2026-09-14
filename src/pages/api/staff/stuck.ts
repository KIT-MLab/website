/**
 * 詰まっているところ（20-platform.md 第8.2節・第7章）。
 *
 * **中身は src/server/staff-data.ts にある。** ここはロールを確かめ、節の想定所要時間を
 * 教材から集めて渡し、JSON にするだけ。しきい値を2か所に書かないためである。
 *
 * 想定所要は astro:content から取る。prerender = false のルートでも、ビルドした
 * Worker の中で解決できることを実測してある。
 */
import type { APIRoute } from 'astro';
import { getCollection } from 'astro:content';
import { json, serverConfig } from '../../../server/auth';
import { requireStaff } from '../../../server/staff';
import { stuckItems } from '../../../server/staff-data';

export const prerender = false;

export const GET: APIRoute = async ({ request }) => {
  const config = serverConfig();
  if (!config) return json({ error: 'サーバの設定が足りません。' }, 500);

  const me = await requireStaff(request);
  if (!me) return json({ error: '運営の画面です。' }, 403);

  const minutes = new Map<string, number>();
  for (const lesson of await getCollection('lessons')) minutes.set(lesson.data.id, lesson.data.minutes);

  return json({ items: await stuckItems(config.db, me, minutes, Date.now()) }, 200);
};
