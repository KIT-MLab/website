/**
 * 紐付けの確認（90-cloudflare-setup.md 第2.2節・第2.3節）。
 *
 * Cloudflare の画面での紐付けが効いているかを、外から1回で確かめるためだけの口。
 * **中身は一切返さない。**あるかないか（true / false）と、D1 なら `SELECT 1` が
 * 通るかどうかだけを返す。データベースの中身も、秘密鍵の値も返さない。
 *
 * 手元の wrangler はこの環境でログインできないため、紐付けの確認手段がこれしかない。
 * ログイン（第5章）を作ったあとも、設定を変えたときの確認に使えるので残す。
 */
import type { APIRoute } from 'astro';

export const prerender = false;

type Env = {
  DB?: D1Database;
  SESSION_SECRET?: string;
};

export const GET: APIRoute = async ({ locals }) => {
  const env = ((locals as { runtime?: { env?: Env } }).runtime?.env ?? {}) as Env;

  let db: string;
  if (!env.DB) {
    db = 'なし';
  } else {
    try {
      await env.DB.prepare('SELECT 1').first();
      db = 'つながった';
    } catch (e) {
      db = `つながらない: ${e instanceof Error ? e.message : String(e)}`;
    }
  }

  return new Response(
    JSON.stringify({
      db,
      sessionSecret: env.SESSION_SECRET ? 'あり' : 'なし',
    }),
    { headers: { 'content-type': 'application/json; charset=utf-8', 'cache-control': 'no-store' } },
  );
};
