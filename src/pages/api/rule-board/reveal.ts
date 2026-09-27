/**
 * 規則の正解率ランキングの公開（design/spec/53-ml-intro.md 第9節）。
 *
 *   POST /api/rule-board/reveal   { id, revealed: true }  公開する（全員のテストデータの正解率を見せる）
 *                                 { id, revealed: false } やり直す（押し間違えたとき。出した規則は消さない）
 *
 * **運営・管理者だけ。**効くのは押した人の所属のボードだけ（予想ボードの答え合わせと同じ）。
 */
import type { APIRoute } from 'astro';
import { json, readJsonObject, serverConfig } from '../../../server/auth';
import { canUseRuleBoard, ruleBoardDef, setRuleRevealed } from '../../../server/rule-board';
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
  const def = ruleBoardDef(id);
  if (!def) return json({ error: '見つかりません。' }, 404);
  if (!(await canUseRuleBoard(config.db, me, def))) return json({ error: '運営だけが押せます。' }, 403);
  if (typeof body.revealed !== 'boolean') return json({ error: '送信された内容を読み取れませんでした。' }, 400);

  await setRuleRevealed(config.db, me.cohort.code, id, me.id, body.revealed, Date.now());
  return json({ ok: true, revealed: body.revealed }, 200);
};
