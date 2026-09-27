/**
 * 規則の正解率ランキングを読む・規則を出す（design/spec/53-ml-intro.md 第9節）。
 *
 *   GET  /api/rule-board?id=…   表の中身（5秒ごとに読み直される）。テストデータの正解率は公開のあとだけ
 *   POST /api/rule-board        { id, description, train: [1 か 0 …], test: [1 か 0 …] }
 *                               規則を出す・出し直す（公開の前だけ）。返すのは訓練データの正解率だけ
 *
 * **メンバーだけ**。章が準備中なら運営・管理者だけ。所属は見ている人の所属（予想ボードと同じ）。
 * 公開・やり直すは /api/rule-board/reveal。
 */
import type { APIRoute } from 'astro';
import { currentUser, json, readJsonObject, serverConfig } from '../../../server/auth';
import { isStaffUser } from '../../../server/guess';
import { isMember } from '../../../server/member';
import {
  DESCRIPTION_MAX,
  TEST_SIZE,
  TRAIN_SIZE,
  canUseRuleBoard,
  readDescription,
  readPreds,
  ruleBoardDef,
  ruleTable,
  submitRule,
} from '../../../server/rule-board';

export const prerender = false;

export const GET: APIRoute = async ({ request, url }) => {
  const config = serverConfig();
  if (!config) return json({ error: 'サーバの設定が足りません。' }, 500);

  const user = await currentUser(request);
  if (!user || !isMember(user)) return json({ error: 'メンバー向けです。' }, 403);

  const id = url.searchParams.get('id') ?? '';
  const def = ruleBoardDef(id);
  if (!def) return json({ error: '見つかりません。' }, 404);
  if (!(await canUseRuleBoard(config.db, user, def))) return json({ error: 'この章は準備中です。' }, 403);

  const table = await ruleTable(config.db, user.cohort.code, user.id, id);
  return json({ ...table, staff: isStaffUser(user) }, 200);
};

export const POST: APIRoute = async ({ request }) => {
  const config = serverConfig();
  if (!config) return json({ error: 'サーバの設定が足りません。' }, 500);

  const user = await currentUser(request);
  if (!user || !isMember(user)) return json({ error: 'メンバー向けです。' }, 403);

  const body = await readJsonObject(request);
  if (!body) return json({ error: '送信された内容を読み取れませんでした。' }, 400);

  const id = typeof body.id === 'string' ? body.id : '';
  const def = ruleBoardDef(id);
  if (!def) return json({ error: '見つかりません。' }, 404);
  if (!(await canUseRuleBoard(config.db, user, def))) return json({ error: 'この章は準備中です。' }, 403);

  const description = readDescription(body.description);
  if (description === null) return json({ error: `規則の説明を1〜${DESCRIPTION_MAX}字で書いてください。` }, 400);
  const train = readPreds(body.train, TRAIN_SIZE);
  const test = readPreds(body.test, TEST_SIZE);
  if (train === null || test === null) return json({ error: '予測の形が違います。ページを読み込み直してください。' }, 400);

  const accuracy = await submitRule(config.db, user.cohort.code, id, user.id, description, train, test, Date.now());
  if (accuracy === null) return json({ error: '公開のあとは出せません。' }, 409);
  return json({ ok: true, train: accuracy }, 200);
};
