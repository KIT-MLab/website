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
 * (2) のいま:
 *   合否の記録はまだ localStorage にある（src/lesson/store/progress.ts）。
 *   サーバからは本人の提出記録を見られないので、**いまは画面が「合格した」と申告した値を
 *   そのまま信用している**。申告は偽れるので、これは本物の制限ではない。
 *
 *   次に D1 とログイン（第5章・第6章）を入れたとき、ここを次のように差し替える。
 *     - Cookie のセッションから利用者IDを取る
 *     - submissions を `user_id = ? AND exercise_id = ? AND passed = 1` で引く
 *     - 1行でもあれば返す。無ければ 403
 *   そのときこの ?passed= は消す。
 */
import type { APIRoute } from 'astro';

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

export const GET: APIRoute = async ({ params, url }) => {
  const id = params.id ?? '';

  // いまは画面の申告をそのまま信用している。D1 を入れたら提出記録を見る（冒頭のコメント）。
  if (url.searchParams.get('passed') !== '1') {
    return json({ message: 'この課題を通したあとに読めます。' }, 403);
  }

  const code = byExerciseId.get(id);
  if (code === undefined) {
    return json({ message: 'この課題の模範解答は登録されていません。' }, 404);
  }

  return json({ id, code: code.replace(/\s+$/, '') }, 200);
};
