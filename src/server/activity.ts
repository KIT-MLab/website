/**
 * 活動を見る画面（/staff/activity/）がサーバ側で読む問い合わせ（20-platform.md 第13.7節）。
 *
 * 見える範囲は第5.4節のとおりで、**src/server/staff.ts の visibleUsers をそのまま使う。**
 * そのうえで**メンバー**（第13.1節）だけに絞る。条件は src/server/member.ts の MEMBER_WHERE。
 *
 * 取り組んだ時間 = activity_minutes の行数（1行 = 1分）。
 * 週は月曜0時（日本時間）から。曜日と時の計算も日本時間で、SQL の中で9時間足してから割る。
 *
 * 時刻はすべてミリ秒（第6章）。
 */
import type { CurrentUser, Db } from './auth';
import { visibleUsers } from './staff';
import { MEMBER_WHERE, WEEK_MS, weekStart } from './member';

const JST_OFFSET_MS = 9 * 60 * 60 * 1000;

/** users を u、cohorts を c として繋ぐ。範囲とメンバーの条件はこの別名を見る */
function usersJoin(alias: string): string {
  return `JOIN users u ON u.id = ${alias}.user_id JOIN cohorts c ON c.code = u.cohort_code`;
}

// ---------------------------------------------------------------- 1. 一覧

export type ActivityRow = {
  id: string;
  displayName: string;
  /** 最後に活動した分の始まり。一度も無ければ null */
  lastMinute: number | null;
  thisWeek: number;
  lastWeek: number;
  fourWeeks: number;
  done: number;
};

/** 週の区切り。「直近4週」は今週を含めて4つの週（3週前の月曜0時から）。 */
export function weekBounds(now: number): { thisWeek: number; lastWeek: number; fourWeeks: number } {
  const thisWeek = weekStart(now);
  return { thisWeek, lastWeek: thisWeek - WEEK_MS, fourWeeks: thisWeek - 3 * WEEK_MS };
}

/** メンバーごとに1行。並びは最後に活動したのが新しい順、一度も無い人は最後。 */
export async function activityList(db: Db, me: CurrentUser, now: number): Promise<ActivityRow[]> {
  const scope = visibleUsers(me);
  const b = weekBounds(now);

  const rows = await db
    .prepare(
      `SELECT u.id, u.display_name,
              MAX(a.minute) AS last_minute,
              SUM(CASE WHEN a.minute >= ? THEN 1 ELSE 0 END) AS this_week,
              SUM(CASE WHEN a.minute >= ? AND a.minute < ? THEN 1 ELSE 0 END) AS last_week,
              SUM(CASE WHEN a.minute >= ? THEN 1 ELSE 0 END) AS four_weeks
         FROM users u
         JOIN cohorts c ON c.code = u.cohort_code
         LEFT JOIN activity_minutes a ON a.user_id = u.id
        WHERE ${scope.where} AND ${MEMBER_WHERE}
        GROUP BY u.id`,
    )
    .bind(b.thisWeek, b.lastWeek, b.thisWeek, b.fourWeeks, ...scope.binds)
    .all<{
      id: string;
      display_name: string;
      last_minute: number | null;
      this_week: number | null;
      last_week: number | null;
      four_weeks: number | null;
    }>();

  const done = await db
    .prepare(
      `SELECT p.user_id, COUNT(*) AS done
         FROM progress p ${usersJoin('p')}
        WHERE ${scope.where} AND ${MEMBER_WHERE} AND p.state = 'done'
        GROUP BY p.user_id`,
    )
    .bind(...scope.binds)
    .all<{ user_id: string; done: number }>();
  const doneByUser = new Map(done.results.map((row) => [row.user_id, row.done]));

  const out = rows.results.map((row) => ({
    id: row.id,
    displayName: row.display_name,
    lastMinute: row.last_minute,
    thisWeek: row.this_week ?? 0,
    lastWeek: row.last_week ?? 0,
    fourWeeks: row.four_weeks ?? 0,
    done: doneByUser.get(row.id) ?? 0,
  }));
  out.sort((a, b) => (b.lastMinute ?? -1) - (a.lastMinute ?? -1));
  return out;
}

// ---------------------------------------------------------------- 2. 時間帯の表

/**
 * 直近4週の活動した分を、人ごとに曜日（月=0〜日=6）×時（0〜23、日本時間）で数える。
 * 返す `cells` は長さ168で、`曜日 * 24 + 時` の位置にその分の数が入る。
 *
 * 1970-01-01 は木曜なので、日本時間の日数に3を足して7で割った余りが「月曜=0」の曜日。
 */
export async function activityGrid(
  db: Db,
  me: CurrentUser,
  now: number,
): Promise<{ userId: string; cells: number[] }[]> {
  const scope = visibleUsers(me);
  const rows = await db
    .prepare(
      `SELECT a.user_id,
              ((a.minute + ${JST_OFFSET_MS}) / 86400000 + 3) % 7 AS dow,
              ((a.minute + ${JST_OFFSET_MS}) / 3600000) % 24 AS hour,
              COUNT(*) AS n
         FROM activity_minutes a ${usersJoin('a')}
        WHERE a.minute >= ? AND ${scope.where} AND ${MEMBER_WHERE}
        GROUP BY a.user_id, dow, hour`,
    )
    .bind(weekBounds(now).fourWeeks, ...scope.binds)
    .all<{ user_id: string; dow: number; hour: number; n: number }>();

  const byUser = new Map<string, number[]>();
  for (const row of rows.results) {
    let cells = byUser.get(row.user_id);
    if (!cells) {
      cells = new Array(168).fill(0);
      byUser.set(row.user_id, cells);
    }
    cells[row.dow * 24 + row.hour] += row.n;
  }
  return [...byUser].map(([userId, cells]) => ({ userId, cells }));
}

// ---------------------------------------------------------------- 3. 最近の出来事

export type ActivityEvent =
  | { kind: 'done'; userId: string; displayName: string; lessonId: string; at: number }
  | { kind: 'submit'; userId: string; displayName: string; exerciseId: string; passed: boolean; at: number }
  | { kind: 'question'; userId: string; displayName: string; lessonId: string; at: number };

/**
 * 3種類（節を済ませた・課題を提出した・質問した）を新しい順に混ぜて `limit` 件。
 * 種類ごとに `limit` 件ずつ引いてから混ぜて切る（どの種類が多くても取りこぼさない）。
 */
export async function recentEvents(db: Db, me: CurrentUser, limit: number): Promise<ActivityEvent[]> {
  const scope = visibleUsers(me);

  const done = await db
    .prepare(
      `SELECT p.user_id, u.display_name, p.lesson_id, p.done_at AS at
         FROM progress p ${usersJoin('p')}
        WHERE p.state = 'done' AND p.done_at IS NOT NULL AND ${scope.where} AND ${MEMBER_WHERE}
        ORDER BY p.done_at DESC LIMIT ?`,
    )
    .bind(...scope.binds, limit)
    .all<{ user_id: string; display_name: string; lesson_id: string; at: number }>();

  const submits = await db
    .prepare(
      `SELECT s.user_id, u.display_name, s.exercise_id, s.passed, s.created_at AS at
         FROM submissions s ${usersJoin('s')}
        WHERE ${scope.where} AND ${MEMBER_WHERE}
        ORDER BY s.created_at DESC, s.id DESC LIMIT ?`,
    )
    .bind(...scope.binds, limit)
    .all<{ user_id: string; display_name: string; exercise_id: string; passed: number; at: number }>();

  const questions = await db
    .prepare(
      `SELECT q.user_id, u.display_name, q.lesson_id, q.created_at AS at
         FROM questions q ${usersJoin('q')}
        WHERE ${scope.where} AND ${MEMBER_WHERE}
        ORDER BY q.created_at DESC, q.id DESC LIMIT ?`,
    )
    .bind(...scope.binds, limit)
    .all<{ user_id: string; display_name: string; lesson_id: string; at: number }>();

  const events: ActivityEvent[] = [
    ...done.results.map((r) => ({
      kind: 'done' as const,
      userId: r.user_id,
      displayName: r.display_name,
      lessonId: r.lesson_id,
      at: r.at,
    })),
    ...submits.results.map((r) => ({
      kind: 'submit' as const,
      userId: r.user_id,
      displayName: r.display_name,
      exerciseId: r.exercise_id,
      passed: r.passed === 1,
      at: r.at,
    })),
    ...questions.results.map((r) => ({
      kind: 'question' as const,
      userId: r.user_id,
      displayName: r.display_name,
      lessonId: r.lesson_id,
      at: r.at,
    })),
  ];
  events.sort((a, b) => b.at - a.at);
  return events.slice(0, limit);
}
