/**
 * みんなの予想ボードを読む・予想を出す（design/spec/53-ml-intro.md 第6節・第7節）。
 *
 *   GET  /api/guess?ids=a,b   ページの中のボードの様子をまとめて返す（5秒ごとに読み直される）
 *   POST /api/guess           { id, value } 予想を出す・書き換える（答え合わせの前だけ）
 *
 * **メンバーだけ**（20-platform.md 第13.1節）。節が準備中なら運営・管理者だけ（第20.1節）。
 * 所属は見ている人の所属（src/server/guess.ts）。答え合わせは /api/guess/reveal。
 */
import type { APIRoute } from 'astro';
import { currentUser, json, readJsonObject, serverConfig } from '../../../server/auth';
import { boardStates, canUseBoard, guessDef, isStaffUser, normalizeGuess, submitGuess } from '../../../server/guess';
import { isMember } from '../../../server/member';

export const prerender = false;

/** 1ページに置くボードは多くても数個。読み直しの問い合わせを小さく保つための上限 */
const MAX_IDS = 10;

export const GET: APIRoute = async ({ request, url }) => {
  const config = serverConfig();
  if (!config) return json({ error: 'サーバの設定が足りません。' }, 500);

  const user = await currentUser(request);
  if (!user || !isMember(user)) return json({ error: 'メンバー向けです。' }, 403);

  const ids = [...new Set((url.searchParams.get('ids') ?? '').split(',').map((s) => s.trim()).filter((s) => s !== ''))];
  if (ids.length === 0 || ids.length > MAX_IDS) return json({ error: 'ボードを選んでください。' }, 400);

  const allowed: string[] = [];
  for (const id of ids) {
    const def = guessDef(id);
    if (!def) return json({ error: '見つかりません。' }, 404);
    if (!(await canUseBoard(config.db, user, def))) return json({ error: 'この節は準備中です。' }, 403);
    allowed.push(id);
  }

  const boards = await boardStates(config.db, user.cohort.code, user.id, allowed);
  return json({ boards, staff: isStaffUser(user) }, 200);
};

export const POST: APIRoute = async ({ request }) => {
  const config = serverConfig();
  if (!config) return json({ error: 'サーバの設定が足りません。' }, 500);

  const user = await currentUser(request);
  if (!user || !isMember(user)) return json({ error: 'メンバー向けです。' }, 403);

  const body = await readJsonObject(request);
  if (!body) return json({ error: '送信された内容を読み取れませんでした。' }, 400);

  const id = typeof body.id === 'string' ? body.id : '';
  const def = guessDef(id);
  if (!def) return json({ error: '見つかりません。' }, 404);
  if (!(await canUseBoard(config.db, user, def))) return json({ error: 'この節は準備中です。' }, 403);

  // 運営として見ている間は出せない（第26章）。予想はメンバーの画面に並ぶので、学習者として出す
  if (isStaffUser(user)) return json({ error: '運営として見ている間は予想を出せません。' }, 403);
  const value = normalizeGuess(body.value);
  if (value === null) return json({ error: '0から100までの数を入れてください。' }, 400);

  const ok = await submitGuess(config.db, user.cohort.code, id, user.id, value, Date.now());
  if (!ok) return json({ error: '答え合わせのあとは変えられません。' }, 409);
  return json({ ok: true, value }, 200);
};
