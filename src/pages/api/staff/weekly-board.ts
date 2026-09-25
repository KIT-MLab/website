/**
 * 運営の画面が15秒ごとに読み直す、回ごとの表（20-platform.md 第19.5節）。
 *
 * `GET /api/staff/weekly-board?id=<weeklyのid>&cohort=<所属コード>`。cohort を省くと
 * 自分の所属。範囲の外の所属を指定したら 404（見えているかどうかを外に漏らさない。
 * src/server/staff.ts requireStaff の考え方と同じ）。
 */
import type { APIRoute } from 'astro';
import { json, serverConfig } from '../../../server/auth';
import { requireStaff } from '../../../server/staff';
import { weeklyBoard, writableCohortsForWeekly } from '../../../server/weekly';
import generated from '../../../generated/lesson-data.json';

export const prerender = false;

export const GET: APIRoute = async ({ request, url }) => {
  const config = serverConfig();
  if (!config) return json({ error: 'サーバの設定が足りません。' }, 500);
  const { db } = config;

  const me = await requireStaff(request);
  if (!me) return json({ error: '管理画面です。' }, 403);

  const weeklyId = url.searchParams.get('id') ?? '';
  if (weeklyId === '') return json({ error: '見つかりません。' }, 404);

  const cohorts = await writableCohortsForWeekly(db, me);
  const cohortParam = url.searchParams.get('cohort');
  const cohortCode = cohortParam && cohortParam !== '' ? cohortParam : me.cohort.code;
  if (!cohorts.some((c) => c.code === cohortCode)) return json({ error: '見つかりません。' }, 404);

  const genWeekly = (generated as { weekly?: Record<string, { exerciseIds: string[] }> }).weekly ?? {};
  const exerciseIds = genWeekly[weeklyId]?.exerciseIds ?? [];
  if (exerciseIds.length === 0) return json({ error: '見つかりません。' }, 404);

  const board = await weeklyBoard(db, cohortCode, exerciseIds);
  return json({ exerciseIds, ...board }, 200);
};
