/**
 * 模範解答の開示（20-platform.md 第4.3.1節）。
 *
 * 仕様が求めているのは次の2つ。
 *   (1) 模範解答がクライアントのバンドルに入らないこと（第4.2節）
 *   (2) 合格済みの提出がある利用者にだけ返すこと（第4.3.1節）
 *
 * (1) の作り方:
 *   下の import.meta.glob は Vite がビルド時に展開する。展開先はこのファイル、つまり
 *   サーバ側のルートである。サーバ側のルートは Worker のバンドル（dist/_worker.js/）に
 *   入り、ブラウザに配る側（dist/_astro/ 等）には入らない。だから模範解答は
 *   クライアントのバンドルには現れない。開発サーバでも本番でも同じコードが動く。
 *
 * (2) の作り（2026-09-14 に本物にした）:
 *   Cookie のセッションから利用者を取り、submissions を
 *   `user_id = ? AND exercise_id = ? AND passed = 1` で引く。1行でもあれば返す。
 *
 *   **入っていない人には返さない。** 提出の記録がサーバに無いので、通したかどうかを
 *   確かめようがないためである。以前は画面が「合格した」と申告した `?passed=1` を
 *   そのまま信用していたが、申告は偽れるので制限として働いていなかった。
 *
 *   入っていない人には「登録すると読めます」と伝える。本文と課題そのものは
 *   入らなくても読めて解ける（第9章の12）。閉めるのは模範解答だけである。
 */
import type { APIRoute } from 'astro';
import { currentUser, serverConfig } from '../../../server/auth';

export const prerender = false;

/**
 * 模範解答の中身。Vite がビルド時に文字列として埋め込む。
 * 置き場所は src/content/lessons/<章>/solutions/<課題のid>.py（第4.2節）。
 */
const solutions = import.meta.glob('../../../content/lessons/**/solutions/*.py', {
  query: '?raw',
  import: 'default',
  eager: true,
}) as Record<string, string>;

/** 課題の id → 模範解答。ファイル名から拡張子を落としたものが課題の id。 */
const byExerciseId = new Map<string, string>();
for (const [path, code] of Object.entries(solutions)) {
  const name = path.split('/').pop() ?? '';
  byExerciseId.set(name.replace(/\.py$/, ''), code);
}

function json(body: unknown, status: number): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'content-type': 'application/json; charset=utf-8', 'cache-control': 'no-store' },
  });
}

export const GET: APIRoute = async ({ params, request }) => {
  const id = params.id ?? '';

  const config = serverConfig();
  if (!config) return json({ message: 'サーバの設定が足りません。' }, 500);

  const user = await currentUser(request);
  if (!user) {
    return json({ message: '模範解答は、登録して入ると読めます。' }, 403);
  }

  // 通した提出が1行でもあるか。無ければ返さない（第4.3.1節）
  const passed = await config.db
    .prepare('SELECT 1 AS ok FROM submissions WHERE user_id = ? AND exercise_id = ? AND passed = 1 LIMIT 1')
    .bind(user.id, id)
    .first<{ ok: number }>();
  if (!passed) {
    return json({ message: 'この課題を通したあとに読めます。' }, 403);
  }

  const code = byExerciseId.get(id);
  if (code === undefined) {
    return json({ message: 'この課題の模範解答は登録されていません。' }, 404);
  }

  return json({ id, code: code.replace(/\s+$/, '') }, 200);
};
