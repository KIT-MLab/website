/**
 * 1人の詳細（20-platform.md 第8.4節）。
 *
 * 進度、課題の結果、提出コードの履歴（新しい順）を返す。
 *
 * **提出コードはそのまま返す。整形しない**（第8.4節）。書き方の癖と誤解を読むための
 * ものなので、直したものを見せては意味がない。空白の入れ方も、全角の記号も、
 * 途中で切れた行も、書かれたとおりに渡す。
 *
 * **範囲の外の利用者は 404 にする。**「権限がありません」と返すと、そのIDの人が
 * 居ることだけは分かってしまう。誰が居るかを教えないため、居ないときと同じ文面にする
 * （第5.4節の範囲。判定は src/server/teacher.ts）。
 *
 * 時刻はすべてミリ秒（第6章）。
 */
import type { APIRoute } from 'astro';
import { json, normalizeUserId, serverConfig } from '../../../../server/auth';
import { requireTeacher, visibleUsers } from '../../../../server/teacher';

export const prerender = false;

/**
 * 返す提出の数。新しい順に200件まで。
 *
 * 手元の控えも200件までしか持たない（第6.2節）ので、これ以上返しても画面には
 * 並べきれない。詰まっている箇所を読むのに要るのは直近の何回かである。
 */
const MAX_SUBMISSIONS = 200;

type UserRow = {
  id: string;
  display_name: string;
  role: string;
  level: number;
  last_seen_at: number;
  created_at: number;
  cohort_code: string;
  cohort_name: string;
  cohort_kind: string;
};

type ProgressRow = {
  lesson_id: string;
  state: string;
  opened_at: number;
  done_at: number | null;
  seconds: number;
};

type ExerciseRow = { exercise_id: string; passed: number; fails: number };

type SubmissionRow = {
  id: number;
  exercise_id: string;
  code: string;
  passed: number;
  failed_test: number | null;
  error_type: string | null;
  created_at: number;
};

export const GET: APIRoute = async ({ params, request }) => {
  const config = serverConfig();
  if (!config) return json({ error: 'サーバの設定が足りません。' }, 500);
  const { db } = config;

  const me = await requireTeacher(request);
  if (!me) return json({ error: '先生の画面です。' }, 403);

  // 利用者IDは打ち直される前提のもの（第5.3節）。先生が紙を見て打つこともあるので、
  // ログインと同じように前後の空白を落として大文字に揃えてから引く。
  const id = normalizeUserId(params.id ?? '');
  const scope = visibleUsers(me);

  // 範囲の条件を問い合わせに混ぜる。引いてから JavaScript で弾く書き方にしないのは、
  // 弾き忘れたときに別の所属の記録がそのまま出るため。
  const user = await db
    .prepare(
      `SELECT u.id, u.display_name, u.role, u.level, u.last_seen_at, u.created_at,
              c.code AS cohort_code, c.name AS cohort_name, c.kind AS cohort_kind
         FROM users u
         JOIN cohorts c ON c.code = u.cohort_code
        WHERE u.id = ? AND ${scope.where}`,
    )
    .bind(id, ...scope.binds)
    .first<UserRow>();
  if (!user) return json({ error: '見つかりません。' }, 404);

  const progress = await db
    .prepare(
      'SELECT lesson_id, state, opened_at, done_at, seconds FROM progress WHERE user_id = ? ORDER BY lesson_id',
    )
    .bind(id)
    .all<ProgressRow>();

  // 課題の結果は専用の表に持たず、提出の記録から作り直す（第6.1節の表）。
  // 数え方は /api/me と同じにしてある。学生が自分で見る数と先生が見る数が
  // 食い違わないようにするため。
  const exercises = await db
    .prepare(
      `SELECT exercise_id,
              MAX(passed) AS passed,
              SUM(CASE WHEN passed = 0 THEN 1 ELSE 0 END) AS fails
         FROM submissions WHERE user_id = ? GROUP BY exercise_id ORDER BY exercise_id`,
    )
    .bind(id)
    .all<ExerciseRow>();

  const submissions = await db
    .prepare(
      `SELECT id, exercise_id, code, passed, failed_test, error_type, created_at
         FROM submissions WHERE user_id = ? ORDER BY created_at DESC, id DESC LIMIT ?`,
    )
    .bind(id, MAX_SUBMISSIONS)
    .all<SubmissionRow>();

  return json(
    {
      user: {
        id: user.id,
        displayName: user.display_name,
        role: user.role,
        level: user.level,
        lastSeenAt: user.last_seen_at,
        createdAt: user.created_at,
        cohort: { code: user.cohort_code, name: user.cohort_name, kind: user.cohort_kind },
      },
      progress: progress.results.map((row) => ({
        lessonId: row.lesson_id,
        state: row.state,
        openedAt: row.opened_at,
        doneAt: row.done_at,
        seconds: row.seconds,
      })),
      exercises: exercises.results.map((row) => ({
        exerciseId: row.exercise_id,
        passed: row.passed === 1,
        fails: row.fails,
      })),
      submissions: submissions.results.map((row) => ({
        id: row.id,
        exerciseId: row.exercise_id,
        code: row.code, // そのまま。整形しない（第8.4節）
        passed: row.passed === 1,
        failedTest: row.failed_test,
        errorType: row.error_type,
        createdAt: row.created_at,
      })),
    },
    200,
  );
};
