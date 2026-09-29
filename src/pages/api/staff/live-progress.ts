/**
 * 「みんなの進み具合（運営だけ）」の表（design/spec/53-ml-intro.md 第11節）。ページの中の表が10秒ごとに読み直す。
 *
 *   GET /api/staff/live-progress?lesson=<節の id>     タイタニック演習の節
 *   GET /api/staff/live-progress?weekly=<今週の演習の id>
 *
 * **運営として見ている運営・管理者だけ**（いま効いているロールで判じる。学習者として見ているときも、
 * メンバーも、入っていない人も 403）。行は見ている人の所属のメンバーだけ（管理者も自分の所属）。
 */
import type { APIRoute } from 'astro';
import { getCollection } from 'astro:content';
import { json, serverConfig } from '../../../server/auth';
import { requireStaff } from '../../../server/staff';
import { lessonIndex } from '../../../server/member';
import { liveProgress } from '../../../server/live-progress';
import generated from '../../../generated/lesson-data.json';

export const prerender = false;

type GenSet = { exerciseIds?: string[]; exercises?: Record<string, { kind?: string }> };
const gen = generated as { lessons?: Record<string, GenSet>; weekly?: Record<string, GenSet>; practice?: Record<string, GenSet> };

export const GET: APIRoute = async ({ request, url }) => {
  const config = serverConfig();
  if (!config) return json({ error: 'サーバの設定が足りません。' }, 500);

  const me = await requireStaff(request);
  if (!me) return json({ error: '運営として見ているときだけ見られます。' }, 403);

  const lessonId = url.searchParams.get('lesson') ?? '';
  const weeklyId = url.searchParams.get('weekly') ?? '';
  const pageId = lessonId !== '' ? lessonId : weeklyId;
  const set = lessonId !== '' ? gen.lessons?.[lessonId] : weeklyId !== '' ? gen.weekly?.[weeklyId] : undefined;
  const exerciseIds = set?.exerciseIds ?? [];
  if (!set || exerciseIds.length === 0) return json({ error: '見つかりません。' }, 404);
  const kinds = exerciseIds.map((id) => set.exercises?.[id]?.kind ?? '');

  // 課題の id → どのページか（「いま」がほかのページのときの呼び名に使う）
  const homes = new Map<string, string>();
  for (const group of [gen.lessons, gen.weekly, gen.practice]) {
    for (const [page, s] of Object.entries(group ?? {})) for (const id of s.exerciseIds ?? []) homes.set(id, page);
  }
  // ページの短い呼び名。節は「タイタニック2」「1.2」、今週の演習は「今週の演習 9/29」、練習問題集はまとめて1つ
  const names = new Map<string, string>();
  const lessons = [...(await getCollection('lessons'))].sort((a, b) => a.id.localeCompare(b.id));
  const index = lessonIndex(lessons.map((l) => ({ entryId: l.id, lessonId: l.data.id, chapter: l.data.chapter, title: l.data.title })));
  for (const [id, ref] of index) names.set(id, ref.no);
  for (const w of await getCollection('weekly')) {
    const m = /^\d{4}-(\d{2})-(\d{2})$/.exec(w.data.date);
    names.set(w.data.id, m ? `今週の演習 ${Number(m[1])}/${Number(m[2])}` : '今週の演習');
  }
  for (const page of Object.keys(gen.practice ?? {})) names.set(page, '練習問題集');

  const data = await liveProgress(config.db, me.cohort.code, pageId, exerciseIds, kinds, homes, names, Date.now());
  return json(data, 200);
};
