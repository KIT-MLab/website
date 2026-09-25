/**
 * 「今週の演習」を公開する（20-platform.md 第19.3節）。
 *
 * 運営以上だけ。所属は、運営なら自分の所属、管理者ならどれでも（第5.4節の範囲。
 * ただし kind が internal の所属だけ。src/server/weekly.ts の writableCohortsForWeekly）。
 * **一度公開したら公開したまま。取り消す口は作らない**ので、ここに DELETE は無い。
 * 同じ回をもう一度公開しても openWeekly が黙って何もしない。
 */
import type { APIRoute } from 'astro';
import { getCollection } from 'astro:content';
import { json, readJsonObject, serverConfig } from '../../../server/auth';
import { requireStaff } from '../../../server/staff';
import { openWeekly, writableCohortsForWeekly } from '../../../server/weekly';

export const prerender = false;

export const POST: APIRoute = async ({ request }) => {
  const config = serverConfig();
  if (!config) return json({ error: 'サーバの設定が足りません。' }, 500);
  const { db } = config;

  const me = await requireStaff(request);
  if (!me) return json({ error: '管理画面です。' }, 403);

  const body = await readJsonObject(request);
  if (!body) return json({ error: '送信された内容を読み取れませんでした。' }, 400);

  const weeklyId = typeof body.weeklyId === 'string' ? body.weeklyId.trim() : '';
  if (weeklyId === '') return json({ error: '回を選んでください。' }, 400);

  const cohorts = await writableCohortsForWeekly(db, me);
  const cohortCode = typeof body.cohort === 'string' && body.cohort.trim() !== '' ? body.cohort.trim() : me.cohort.code;
  if (!cohorts.some((c) => c.code === cohortCode)) return json({ error: '所属を選んでください。' }, 400);

  const entries = await getCollection('weekly');
  if (!entries.some((e) => e.data.id === weeklyId)) return json({ error: '見つかりません。' }, 404);

  await openWeekly(db, cohortCode, weeklyId, me.id, Date.now());
  return json({ ok: true }, 200);
};
