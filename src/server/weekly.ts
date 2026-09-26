/**
 * 「今週の演習」の公開の記録と、運営の画面の一覧・表の材料（20-platform.md 第19章）。
 *
 * 内容（本文・課題・期待値）は src/content/weekly の MDX と src/generated/lesson-data.json
 * の `weekly` が持つ。ここが持つのは**公開したかどうか**だけ（migrations/0008_weekly_open.sql）。
 * **一度公開したら公開したまま。取り消す口は作らない**（第19.3節）ので、
 * ここに UPDATE / DELETE は一切無い。
 *
 * 見える範囲（運営は自分の所属、管理者は全部）は src/server/staff.ts の visibleUsers を
 * そのまま使う。書き写すと片方だけ直したときに別の所属が見えるため。
 *
 * 時刻はすべてミリ秒（第6章）。
 */
import type { CurrentUser, Db } from './auth';
import { visibleUsers } from './staff';

/** その所属で公開済みの weekly の id（frontmatter の id）の集合。 */
export async function openWeeklyIds(db: Db, cohortCode: string): Promise<Set<string>> {
  const rows = await db
    .prepare('SELECT weekly_id FROM weekly_open WHERE cohort_code = ?')
    .bind(cohortCode)
    .all<{ weekly_id: string }>();
  return new Set(rows.results.map((row) => row.weekly_id));
}

/** 1件が、その所属で公開済みかどうか。 */
export async function isWeeklyOpen(db: Db, cohortCode: string, weeklyId: string): Promise<boolean> {
  const row = await db
    .prepare('SELECT 1 FROM weekly_open WHERE cohort_code = ? AND weekly_id = ?')
    .bind(cohortCode, weeklyId)
    .first();
  return row !== null;
}

/**
 * 公開する（第19.3節）。既に公開済みなら何もしない（`INSERT OR IGNORE`）。
 * 範囲（`writableCohortsForWeekly` に入っているか）は呼ぶ側（API）が先に確かめること。
 */
export async function openWeekly(db: Db, cohortCode: string, weeklyId: string, openedBy: string, now: number): Promise<void> {
  await db
    .prepare('INSERT OR IGNORE INTO weekly_open (cohort_code, weekly_id, opened_at, opened_by) VALUES (?, ?, ?, ?)')
    .bind(cohortCode, weeklyId, now, openedBy)
    .run();
}

/**
 * 公開の操作をしてよい所属。運営は自分の所属1つ、管理者は全部（第13.5節の writableCohorts
 * と同じ考え方だが、こちらは**kind が internal のものだけ**に絞る）。メンバー（第13.1節）は
 * 所属の kind が internal の人だけなので、外部向けの所属に公開しても誰にも見えず意味が無い。
 */
export async function writableCohortsForWeekly(db: Db, me: CurrentUser): Promise<{ code: string; name: string }[]> {
  const scope = visibleUsers(me);
  const rows = await db
    .prepare(
      `SELECT u.cohort_code AS code, u.name
         FROM (SELECT code AS cohort_code, name FROM cohorts WHERE kind = 'internal') u
        WHERE ${scope.where}
        ORDER BY u.cohort_code`,
    )
    .bind(...scope.binds)
    .all<{ code: string; name: string }>();
  return rows.results;
}

// ---------------------------------------------------------------- 運営の画面（詳しい様子）

export type WeeklyBoardCell = { state: 'pass' | 'fail' | 'none'; fails: number };
export type WeeklyBoardPerson = { userId: string; displayName: string; cells: WeeklyBoardCell[] };
export type WeeklyBoard = {
  /** 問題ごとの通した人数。exerciseIds と同じ並び */
  passedCounts: number[];
  people: WeeklyBoardPerson[];
  /**
   * いちばん詰まっている問題のインデックス（試作の式: 落ちた回数 − 通した人数 × 2 がいちばん大きい列）。
   * 該当なし（問題が無い）なら -1（20-platform.md 第19.5節）。
   */
  hotIndex: number;
};

type SubRow = { user_id: string; exercise_id: string; passed: number; fails: number };
type UserRow = { id: string; display_name: string };

/**
 * 回ごとの表の材料（第19.5節）。**その所属の利用者だけ**を行にする。範囲の確認
 * （呼んでよい所属か）は呼ぶ側が visibleUsers / writableCohorts で先に確かめること。
 * 15秒ごとにこの関数を呼び直して JSON で返すのが運営の画面の自動更新（同節）。
 */
export async function weeklyBoard(db: Db, cohortCode: string, exerciseIds: string[]): Promise<WeeklyBoard> {
  if (exerciseIds.length === 0) return { passedCounts: [], people: [], hotIndex: -1 };

  const users = await db
    .prepare('SELECT id, display_name FROM users WHERE cohort_code = ? ORDER BY display_name')
    .bind(cohortCode)
    .all<UserRow>();

  const placeholders = exerciseIds.map(() => '?').join(', ');
  const subs = await db
    .prepare(
      `SELECT s.user_id, s.exercise_id, MAX(s.passed) AS passed,
              SUM(CASE WHEN s.passed = 0 THEN 1 ELSE 0 END) AS fails
         FROM submissions s
         JOIN users u ON u.id = s.user_id
        WHERE u.cohort_code = ? AND s.exercise_id IN (${placeholders})
        GROUP BY s.user_id, s.exercise_id`,
    )
    .bind(cohortCode, ...exerciseIds)
    .all<SubRow>();

  const byUser = new Map<string, Map<string, { passed: boolean; fails: number }>>();
  for (const row of subs.results) {
    const map = byUser.get(row.user_id) ?? new Map();
    map.set(row.exercise_id, { passed: row.passed === 1, fails: row.fails });
    byUser.set(row.user_id, map);
  }

  const people: WeeklyBoardPerson[] = users.results.map((u) => ({
    userId: u.id,
    displayName: u.display_name,
    cells: exerciseIds.map((exId) => {
      const cell = byUser.get(u.id)?.get(exId);
      if (!cell) return { state: 'none', fails: 0 };
      return cell.passed ? { state: 'pass', fails: cell.fails } : { state: 'fail', fails: cell.fails };
    }),
  }));

  const passedCounts = exerciseIds.map((_, i) => people.filter((p) => p.cells[i].state === 'pass').length);
  const failCounts = exerciseIds.map((_, i) => people.reduce((sum, p) => sum + p.cells[i].fails, 0));

  // 「いちばん詰まっている」＝ 落ちた回数 − 通した人数 × 2 がいちばん大きい列（試作の式。第19.5節）
  let hotIndex = -1;
  let hotScore = -Infinity;
  exerciseIds.forEach((_, i) => {
    const score = failCounts[i] - passedCounts[i] * 2;
    if (score > hotScore) {
      hotScore = score;
      hotIndex = i;
    }
  });

  return { passedCounts, people, hotIndex };
}
