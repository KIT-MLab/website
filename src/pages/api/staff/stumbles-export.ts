/**
 * つまずきの記録の書き出し（design/spec/55-stumbles.md 第5.4節）。
 *
 *   GET /api/staff/stumbles-export?days=7|28|all
 *
 * 運営・管理者だけ。見える範囲は画面（/staff/stumbles/）と同じ。ブラウザがファイルとして保存する
 * （`stumbles-YYYY-MM-DD.json`。日付は日本時間）。**名前（表示名）は入れない。利用者の id だけ。**
 * 数え方は src/server/stumbles.ts、材料を引くのは src/server/stumbles-data.ts。
 */
import type { APIRoute } from 'astro';
import { json, serverConfig } from '../../../server/auth';
import { requireStaff } from '../../../server/staff';
import { ymd } from '../../../server/staff-data';
import { parseDays, toExport } from '../../../server/stumbles';
import { loadStumbles } from '../../../server/stumbles-data';

export const prerender = false;

export const GET: APIRoute = async ({ request, url }) => {
  const config = serverConfig();
  if (!config) return json({ error: 'サーバの設定が足りません。' }, 500);

  const me = await requireStaff(request);
  if (!me) return json({ error: '管理画面です。' }, 403);

  const now = Date.now();
  const days = parseDays(url.searchParams.get('days'));
  const data = await loadStumbles(config.db, me, days, now);

  return new Response(JSON.stringify(toExport(data, days, now), null, 2), {
    status: 200,
    headers: {
      'content-type': 'application/json; charset=utf-8',
      'cache-control': 'no-store',
      'content-disposition': `attachment; filename="stumbles-${ymd(now)}.json"`,
    },
  });
};
