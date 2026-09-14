/**
 * ログアウト（20-platform.md 第7章）。
 *
 * 2つやる。**両方やらないと抜けたことにならない。**
 *   - sessions の行を消す（Cookie を控えてあれば、それを送り直せば入れてしまうため）
 *   - Cookie を Max-Age=0 で潰す（この端末から送らなくなる）
 *
 * Cookie が無い、署名が合わない、既に消えている、のどれでも 200 を返す。
 * 「抜けた状態にしたい」という求めは、そのどれでも叶っているため。
 */
import type { APIRoute } from 'astro';
import { clearCookie, json, readCookie, serverConfig } from '../../server/auth';

export const prerender = false;

export const POST: APIRoute = async ({ request }) => {
  const config = serverConfig();
  if (!config) return json({ error: 'サーバの設定が足りません。' }, 500);

  const token = await readCookie(request, config.secret);
  if (token !== null) {
    await config.db.prepare('DELETE FROM sessions WHERE token = ?').bind(token).run();
  }

  return json({ ok: true }, 200, clearCookie());
};
