/**
 * 模範解答の開示（20-platform.md 第4.3.1節）。
 *
 * 模範解答はビルド成果物に含めない（第4.2節）。だからブラウザに配るデータの中には無く、
 * ここが唯一の取り出し口になる。取り出せるのは、その課題を通したあとだけ。
 *
 * いま足りていないこと:
 *   仕様書は「その利用者にその課題の合格済みの提出があるときだけ返す」と決めているが、
 *   それを確かめるにはアカウントと D1（第5章・第6章）が要る。どちらもまだ無いので、
 *   ここでは合格の確認をしていない。画面側が合格するまで呼ばないだけである。
 *   アカウントを作るときに、この関数の中で submissions を見る処理を足すこと。
 *
 * 置き場所は src/content/lessons/<章>/solutions/<課題のid>.py。
 * サーバがその場でファイルを読むので、模範解答は dist/ に入らない。
 */
import type { APIRoute } from 'astro';

export const prerender = false;

const SAFE_ID = /^[A-Za-z0-9_-]+$/;
const LESSONS_DIR = 'src/content/lessons';

function json(body: unknown, status: number): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'content-type': 'application/json; charset=utf-8', 'cache-control': 'no-store' },
  });
}

export const GET: APIRoute = async ({ params }) => {
  const id = params.id ?? '';
  if (!SAFE_ID.test(id)) return json({ message: '課題の id が不正です。' }, 400);

  // node:fs はビルド時に解決させない。Workers の上では読めないので、そのときは 503 を返す。
  const fsSpecifier = ['node', 'fs/promises'].join(':');
  let fs: typeof import('node:fs/promises');
  try {
    fs = (await import(/* @vite-ignore */ fsSpecifier)) as typeof import('node:fs/promises');
  } catch {
    return json({ message: '模範解答の置き場所がまだ用意できていません。' }, 503);
  }

  let chapters: string[];
  try {
    chapters = await fs.readdir(LESSONS_DIR);
  } catch {
    return json({ message: '模範解答の置き場所がまだ用意できていません。' }, 503);
  }

  for (const chapter of chapters) {
    const path = `${LESSONS_DIR}/${chapter}/solutions/${id}.py`;
    try {
      const code = await fs.readFile(path, 'utf8');
      return json({ id, code: code.replace(/\s+$/, '') }, 200);
    } catch {
      /* 次の章を見る */
    }
  }

  return json({ message: 'この課題の模範解答は登録されていません。' }, 404);
};
