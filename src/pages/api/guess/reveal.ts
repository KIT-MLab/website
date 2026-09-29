/**
 * みんなの予想ボードの答え合わせ（design/spec/53-ml-intro.md 第6節・第7節）。
 *
 *   POST /api/guess/reveal   { id, revealed: true }  答え合わせをする（答え・名前・いちばん近い人を見せる）
 *                            { id, revealed: false } やり直す（押し間違えたとき。予想は消さない）
 *                            { id, reset: true }     予想を消す（所属の予想と答え合わせを消し、ボードを使い直す）
 *
 * **運営・管理者だけ。**効くのは押した人の所属のボードだけ（今週の演習の公開で運営が自分の所属に
 * 公開するのと同じ考え方。管理者も、節のページのボードが見せている自分の所属に効く）。
 */
import type { APIRoute } from 'astro';
import { json, readJsonObject, serverConfig } from '../../../server/auth';
import { canUseBoard, guessDef, resetGuesses, setRevealed } from '../../../server/guess';
import { requireStaff } from '../../../server/staff';

export const prerender = false;

export const POST: APIRoute = async ({ request }) => {
  const config = serverConfig();
  if (!config) return json({ error: 'サーバの設定が足りません。' }, 500);

  const me = await requireStaff(request);
  if (!me) return json({ error: '運営だけが押せます。' }, 403);

  const body = await readJsonObject(request);
  if (!body) return json({ error: '送信された内容を読み取れませんでした。' }, 400);

  const id = typeof body.id === 'string' ? body.id : '';
  const def = guessDef(id);
  if (!def) return json({ error: '見つかりません。' }, 404);
  if (!(await canUseBoard(config.db, me, def))) return json({ error: '運営だけが押せます。' }, 403);
  if (body.reset === true) {
    await resetGuesses(config.db, me.cohort.code, id);
    return json({ ok: true, reset: true }, 200);
  }
  if (typeof body.revealed !== 'boolean') return json({ error: '送信された内容を読み取れませんでした。' }, 400);

  await setRevealed(config.db, me.cohort.code, id, me.id, body.revealed, Date.now());
  return json({ ok: true, revealed: body.revealed }, 200);
};
