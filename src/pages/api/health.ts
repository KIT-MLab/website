/**
 * 紐付けの確認（90-cloudflare-setup.md 第2.2節・第2.3節）。
 *
 * Cloudflare の画面での紐付けが効いているかを、外から1回で確かめるためだけの口。
 * **中身は一切返さない。**あるかないか（あり / なし）と、D1 なら `SELECT 1` が
 * 通るかどうかだけを返す。データベースの中身も、秘密鍵の値も返さない。
 *
 * 手元の wrangler はこの環境でログインできないため、紐付けの確認手段がこれしかない。
 * ログイン（第5章）を作ったあとも、設定を変えたときの確認に使えるので残す。
 *
 * 全体を try で包んでいるのは、**紐付けが無いときに 500 で終わらせないため**。
 * 何が無いのかを知るための口が、無いことで落ちては役に立たない。
 */
import type { APIRoute } from 'astro';

export const prerender = false;

function json(body: unknown): Response {
  return new Response(JSON.stringify(body, null, 1), {
    headers: { 'content-type': 'application/json; charset=utf-8', 'cache-control': 'no-store' },
  });
}

const message = (e: unknown) => (e instanceof Error ? `${e.name}: ${e.message}` : String(e));

export const GET: APIRoute = async (context) => {
  const out: Record<string, string> = {};

  let env: Record<string, unknown> = {};
  try {
    const runtime = (context.locals as { runtime?: { env?: Record<string, unknown> } }).runtime;
    env = runtime?.env ?? {};
    out.runtime = runtime ? 'あり' : 'なし';
    out.bindings = Object.keys(env).sort().join(' ') || '(空)';
  } catch (e) {
    out.runtime = `読めない: ${message(e)}`;
    return json(out);
  }

  const db = env.DB as { prepare?: (q: string) => { first: () => Promise<unknown> } } | undefined;
  if (!db) {
    out.db = 'なし';
  } else if (typeof db.prepare !== 'function') {
    out.db = 'ある。ただし D1 の形をしていない';
  } else {
    try {
      await db.prepare('SELECT 1').first();
      out.db = 'つながった';
    } catch (e) {
      out.db = `つながらない: ${message(e)}`;
    }
  }

  out.sessionSecret = typeof env.SESSION_SECRET === 'string' && env.SESSION_SECRET.length > 0 ? 'あり' : 'なし';
  return json(out);
};
