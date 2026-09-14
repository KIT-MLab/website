/**
 * 質問と返事（20-platform.md 第10章・第8.5節）。
 *
 * 学習者が書く質問（`questions`）と運営が書く返事（`comments`）は表が2つに分かれている。
 * **書く人が違うから2つなのであって、読むときは1本にする。**第8.5節が「その節の1本の
 * やりとりとして時刻の順に並べる」と決めているので、混ぜ方をここに置く。質問だけ・
 * 返事だけを別々に見せると、何に対する返事かが分からなくなる。
 *
 * **運営の画面（/staff/questions）と口（/api/staff/questions）は同じ関数を呼ぶ。**
 * 並び（未返信が上、その中では古い順）と範囲（誰の質問を見てよいか）を2か所に書き写すと、
 * 片方だけ直したときに静かに食い違う。範囲は src/server/staff.ts の visibleUsers に任せる。
 *
 * 時刻はすべてミリ秒（第6章）。
 */
import type { CurrentUser, Db } from './auth';
import { visibleUsers } from './staff';

/**
 * 本文の長さの上限。**符号位置で数える**（`length` は UTF-16 の単位なので、絵文字や
 * 一部の漢字が2つ分に数えられる）。質問も返事も同じ上限にしてある。
 */
export const BODY_MAX = 2000;

export type BodyCheck = { ok: true; body: string } | { ok: false; error: string };

/**
 * 本文を検める。前後の空白を落とし、空なら断る。
 *
 * `noun` は断りの文に入れる呼び方（「質問」「返事」）。**断りの文だけが違って手順は同じ**
 * なので、口ごとに書き写さずにここへ渡す。
 */
export function checkBody(value: unknown, noun: string): BodyCheck {
  const body = typeof value === 'string' ? value.trim() : '';
  if (body === '') return { ok: false, error: `${noun}を書いてください。` };
  if ([...body].length > BODY_MAX) return { ok: false, error: `${noun}は${BODY_MAX}文字までです。` };
  return { ok: true, body };
}

// ---------------------------------------------------------------- 学習者の1本

/** やりとりの1件。`code` は質問に添えられた提出（第10.5節）で、返事には付かない。 */
export type ThreadItem = {
  kind: 'question' | 'comment';
  body: string;
  exerciseId: string | null;
  code: string | null;
  at: number;
};

type QuestionRow = { exercise_id: string | null; code: string | null; body: string; created_at: number };
type CommentRow = { exercise_id: string | null; body: string; created_at: number };

/**
 * その節の自分のやりとりを**古い順**に1本で返し、**返した返事を既読にする**（第8.5節）。
 *
 * 既読にするのを「節を開いたとき」ではなく「やりとりを開いたとき」にしてあるのは、
 * 節を開いただけで消えると、返事が来たことに気づかないまま件数が 0 になるためである。
 *
 * 読むのが先で、既読にするのが後。SELECT と同じ条件で UPDATE するので、**返した行と
 * 既読にした行が必ず一致する**。先に更新すると、その間に届いた返事まで読まずに消える。
 */
export async function openThread(db: Db, userId: string, lessonId: string): Promise<ThreadItem[]> {
  const questions = await db
    .prepare(
      `SELECT exercise_id, code, body, created_at
         FROM questions WHERE user_id = ? AND lesson_id = ? ORDER BY created_at, id`,
    )
    .bind(userId, lessonId)
    .all<QuestionRow>();

  const comments = await db
    .prepare(
      `SELECT exercise_id, body, created_at
         FROM comments WHERE to_user_id = ? AND lesson_id = ? ORDER BY created_at, id`,
    )
    .bind(userId, lessonId)
    .all<CommentRow>();

  await db
    .prepare('UPDATE comments SET read_at = ? WHERE to_user_id = ? AND lesson_id = ? AND read_at IS NULL')
    .bind(Date.now(), userId, lessonId)
    .run();

  const items: ThreadItem[] = [
    ...questions.results.map((row) => ({
      kind: 'question' as const,
      body: row.body,
      exerciseId: row.exercise_id,
      code: row.code,
      at: row.created_at,
    })),
    ...comments.results.map((row) => ({
      kind: 'comment' as const,
      body: row.body,
      exerciseId: row.exercise_id,
      code: null,
      at: row.created_at,
    })),
  ];
  // 会話なので上から下へ読む（第8.5節）
  items.sort((a, b) => a.at - b.at);
  return items;
}

/** 未読の返事の件数。**節ごとではなく全体**（レールのボタンに添える数）。 */
export async function unreadCount(db: Db, userId: string): Promise<number> {
  const row = await db
    .prepare('SELECT COUNT(*) AS n FROM comments WHERE to_user_id = ? AND read_at IS NULL')
    .bind(userId)
    .first<{ n: number }>();
  return row?.n ?? 0;
}

// ---------------------------------------------------------------- 運営の一覧

export type StaffQuestion = {
  id: number;
  userId: string;
  displayName: string;
  cohortKind: string;
  lessonId: string;
  exerciseId: string | null;
  code: string | null;
  body: string;
  answeredAt: number | null;
  createdAt: number;
  /** その人の済んだ節数（第10.4節「その人の進度」） */
  done: number;
};

type StaffRow = {
  id: number;
  user_id: string;
  display_name: string;
  cohort_kind: string;
  lesson_id: string;
  exercise_id: string | null;
  code: string | null;
  body: string;
  answered_at: number | null;
  created_at: number;
};

/**
 * 運営が見る質問の一覧（第10.4節）。**未返信が上、その中では古い順。**
 * 待たせている人から先に見るためである。
 *
 * `answered_at IS NULL` は SQLite では 1 か 0 なので、DESC で未返信が先に来る。
 *
 * 進度（済んだ節数）は利用者ごとに引き直さない。1回の問い合わせで全員ぶんを数えて
 * から突き合わせる。1人ずつ回すと、質問30件で31回になる。
 */
export async function staffQuestions(db: Db, me: CurrentUser): Promise<StaffQuestion[]> {
  const scope = visibleUsers(me);

  const rows = await db
    .prepare(
      `SELECT q.id, q.user_id, q.lesson_id, q.exercise_id, q.code, q.body, q.answered_at, q.created_at,
              u.display_name, c.kind AS cohort_kind
         FROM questions q
         JOIN users u ON u.id = q.user_id
         JOIN cohorts c ON c.code = u.cohort_code
        WHERE ${scope.where}
        ORDER BY (q.answered_at IS NULL) DESC, q.created_at ASC, q.id ASC`,
    )
    .bind(...scope.binds)
    .all<StaffRow>();

  const done = await db
    .prepare(
      `SELECT p.user_id, COUNT(*) AS done
         FROM progress p
         JOIN users u ON u.id = p.user_id
        WHERE ${scope.where} AND p.state = 'done'
        GROUP BY p.user_id`,
    )
    .bind(...scope.binds)
    .all<{ user_id: string; done: number }>();
  const doneByUser = new Map(done.results.map((row) => [row.user_id, row.done]));

  return rows.results.map((row) => ({
    id: row.id,
    userId: row.user_id,
    displayName: row.display_name,
    cohortKind: row.cohort_kind,
    lessonId: row.lesson_id,
    exerciseId: row.exercise_id,
    code: row.code,
    body: row.body,
    answeredAt: row.answered_at,
    createdAt: row.created_at,
    done: doneByUser.get(row.user_id) ?? 0,
  }));
}

/**
 * その利用者が自分の範囲の中に居るか（第5.4節）。
 *
 * 範囲の条件は問い合わせに混ぜる。引いてから JavaScript で弾く書き方にしないのは、
 * 弾き忘れたときに別の所属の人へ黙って返事が届くためである。
 */
export async function inScope(db: Db, me: CurrentUser, userId: string): Promise<boolean> {
  const scope = visibleUsers(me);
  const row = await db
    .prepare(`SELECT u.id FROM users u WHERE u.id = ? AND ${scope.where}`)
    .bind(userId, ...scope.binds)
    .first<{ id: string }>();
  return row !== null;
}
