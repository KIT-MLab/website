/**
 * つまずきの記録（design/spec/55-stumbles.md 第5節）の材料を引く。数え方は src/server/stumbles.ts にある。
 *
 * 見える範囲はほかの運営の画面と同じ: src/server/staff.ts の visibleUsers、メンバーだけ（MEMBER_WHERE）、
 * 学習者の側の記録だけ（mode = 'learner'）。画面（/staff/stumbles/）と書き出し（/api/staff/stumbles-export）の
 * 両方がここを通る。
 */
import { getCollection } from 'astro:content';
import type { CurrentUser, Db } from './auth';
import { visibleUsers } from './staff';
import { lessonIndex, MEMBER_WHERE } from './member';
import { columnLabel } from './live-progress';
import { topicTitleText, practiceHref } from '../lesson/practice';
import { buildStumbles, periodStart, type Days, type StumbleCatalog, type Stumbles } from './stumbles';
import generated from '../generated/lesson-data.json';

type GenSet = { exerciseIds?: string[]; exercises?: Record<string, { kind?: string }> };
const gen = generated as { lessons?: Record<string, GenSet>; weekly?: Record<string, GenSet>; practice?: Record<string, GenSet> };

/**
 * 課題と節の呼び方（第5.2節・第5.3節）。
 *   節の課題       … 「3.2 練習1」（節の番号＋「みんなの進み具合」の列の札）
 *   今週の演習     … 「今週の演習 10/6 問3」
 *   練習問題集     … 「練習問題集 print() による出力 問2」
 * リンクは課題のあるページの、その課題の位置（#課題の id）。
 */
export async function stumbleCatalog(): Promise<StumbleCatalog> {
  const exercises: StumbleCatalog['exercises'] = new Map();
  const sections: StumbleCatalog['sections'] = new Map();

  const lessons = [...(await getCollection('lessons'))].sort((a, b) => a.id.localeCompare(b.id));
  const index = lessonIndex(lessons.map((l) => ({ entryId: l.id, lessonId: l.data.id, chapter: l.data.chapter, title: l.data.title })));
  lessons.forEach((l, order) => {
    const ref = index.get(l.data.id);
    if (ref) sections.set(l.data.id, { label: `${ref.no} ${ref.title}`, href: ref.href, estimateMinutes: l.data.minutes, order });
  });

  for (const [page, set] of Object.entries(gen.lessons ?? {})) {
    const ref = index.get(page);
    (set.exerciseIds ?? []).forEach((id, i) => {
      const tag = columnLabel(set.exercises?.[id]?.kind ?? '', i + 1);
      exercises.set(id, { label: ref ? `${ref.no} ${tag}` : `${page} ${tag}`, page, href: ref ? `${ref.href}#${id}` : '' });
    });
  }

  for (const w of await getCollection('weekly')) {
    const m = /^\d{4}-(\d{2})-(\d{2})$/.exec(w.data.date);
    const name = m ? `今週の演習 ${Number(m[1])}/${Number(m[2])}` : '今週の演習';
    (gen.weekly?.[w.data.id]?.exerciseIds ?? []).forEach((id, i) => {
      exercises.set(id, { label: `${name} 問${i + 1}`, page: w.data.id, href: `/learn/weekly/${encodeURIComponent(w.data.id)}/#${id}` });
    });
  }

  for (const t of await getCollection('practice')) {
    const name = `練習問題集 ${topicTitleText(t.data.title)}`;
    (gen.practice?.[t.data.id]?.exerciseIds ?? []).forEach((id, i) => {
      exercises.set(id, { label: `${name} 問${i + 1}`, page: t.data.id, href: `${practiceHref(t.data.chapter, t.data.topic)}#${id}` });
    });
  }

  return { exercises, sections };
}

/** 期間の中の提出と活動した分を引き、数える。 */
export async function loadStumbles(db: Db, me: CurrentUser, days: Days, now: number): Promise<Stumbles> {
  const scope = visibleUsers(me);
  const since = periodStart(days, now);

  const subs = await db
    .prepare(
      `SELECT s.user_id, s.exercise_id, s.passed, s.failed_test, s.error_type, s.code, s.created_at
         FROM submissions s
         JOIN users u ON u.id = s.user_id
         JOIN cohorts c ON c.code = u.cohort_code
        WHERE s.mode = 'learner' AND s.created_at >= ? AND ${scope.where} AND ${MEMBER_WHERE}
        ORDER BY s.created_at, s.id`,
    )
    .bind(since, ...scope.binds)
    .all<{
      user_id: string;
      exercise_id: string;
      passed: number;
      failed_test: number | null;
      error_type: string | null;
      code: string;
      created_at: number;
    }>();

  const minutes = await db
    .prepare(
      `SELECT a.user_id, a.minute, a.lesson_id, a.exercise_id
         FROM activity_minutes a
         JOIN users u ON u.id = a.user_id
         JOIN cohorts c ON c.code = u.cohort_code
        WHERE a.mode = 'learner' AND a.minute >= ? AND ${scope.where} AND ${MEMBER_WHERE}`,
    )
    .bind(since, ...scope.binds)
    .all<{ user_id: string; minute: number; lesson_id: string; exercise_id: string }>();

  return buildStumbles(
    subs.results.map((r) => ({
      userId: r.user_id,
      exerciseId: r.exercise_id,
      passed: r.passed === 1,
      failedTest: r.failed_test,
      errorType: r.error_type,
      code: r.code,
      at: r.created_at,
    })),
    minutes.results.map((r) => ({ userId: r.user_id, minute: r.minute, lessonId: r.lesson_id, exerciseId: r.exercise_id })),
    await stumbleCatalog(),
    since,
  );
}
