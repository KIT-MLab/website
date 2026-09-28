/**
 * スライドのいまの番号（design/spec/53-ml-intro.md 第10節）。
 *
 *   GET  /api/slides?deck=intro1   いまの番号と、運営がいま進めているか（1.5秒ごとに読み直される）
 *   POST /api/slides               { deck, index } 番号を変える（運営・管理者だけ）
 *
 * 読むのは**メンバーだけ**。章が準備中なら運営・管理者だけ（予想ボードと同じ。src/server/guess.ts）。
 * 番号は所属ごと（見ている人・押した人の所属）。
 */
import type { APIRoute } from 'astro';
import { currentUser, json, readJsonObject, serverConfig } from '../../server/auth';
import { canUseBoard, isStaffUser } from '../../server/guess';
import { isMember } from '../../server/member';
import { requireStaff } from '../../server/staff';
import { deckPosition, readSlideIndex, setDeckPosition, slideDeckDef } from '../../server/slides';

export const prerender = false;

export const GET: APIRoute = async ({ request, url }) => {
  const config = serverConfig();
  if (!config) return json({ error: 'サーバの設定が足りません。' }, 500);

  const user = await currentUser(request);
  if (!user || !isMember(user)) return json({ error: 'メンバー向けです。' }, 403);

  const deckId = url.searchParams.get('deck') ?? '';
  const def = slideDeckDef(deckId);
  if (!def) return json({ error: '見つかりません。' }, 404);
  if (!(await canUseBoard(config.db, user, def))) return json({ error: 'この章は準備中です。' }, 403);

  const pos = await deckPosition(config.db, user.cohort.code, deckId, def.count, Date.now());
  return json({ ...pos, count: def.count, staff: isStaffUser(user) }, 200);
};

export const POST: APIRoute = async ({ request }) => {
  const config = serverConfig();
  if (!config) return json({ error: 'サーバの設定が足りません。' }, 500);

  const me = await requireStaff(request);
  if (!me) return json({ error: '運営だけが動かせます。' }, 403);

  const body = await readJsonObject(request);
  if (!body) return json({ error: '送信された内容を読み取れませんでした。' }, 400);

  const deckId = typeof body.deck === 'string' ? body.deck : '';
  const def = slideDeckDef(deckId);
  if (!def) return json({ error: '見つかりません。' }, 404);
  if (!(await canUseBoard(config.db, me, def))) return json({ error: '運営だけが動かせます。' }, 403);

  const index = readSlideIndex(body.index, def.count);
  if (index === null) return json({ error: `番号は0から${def.count - 1}までの整数です。` }, 400);

  await setDeckPosition(config.db, me.cohort.code, deckId, index, me.id, Date.now());
  return json({ ok: true, index }, 200);
};
