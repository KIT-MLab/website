/**
 * 運営の画面がサーバ側で読む問い合わせ（20-platform.md 第8章）。
 *
 * **画面は自分の API を fetch しない。**運営の画面は Worker の中で描かれるので、自分の
 * /api/staff/roster を呼ぶと Worker が自分自身へ HTTP で入り直すことになる。Cookie を
 * 積み直す手間も往復ぶんの遅さも要らない。ここに問い合わせを置き、ページから直接呼ぶ。
 *
 * 返す形は src/pages/api/staff/*.ts と同じにしてある。**いまは同じ SQL が2か所にある。**
 * 口（API）を触らない約束なので、そちらをこの module に向ける書き換えをしていない。
 * 向ける日が来たら1か所になる。それまでは、片方を直したらもう片方も直すこと。
 *
 * 範囲（誰の記録を見てよいか）の判定だけは書き写していない。src/server/staff.ts の
 * visibleUsers をそのまま使う。**ここを書き写すと、片方だけ直したときに別の所属の
 * 記録が漏れる。**
 *
 * 時刻はすべてミリ秒（第6章）。`seconds` だけが秒である（列の名前のとおり）。
 */
import type { CurrentUser, Db } from './auth';
import { hashPasscode, newPasscode, normalizeUserId } from './auth';
import { visibleUsers } from './staff';
// 課題の呼び方は src/lesson/exercise-place.ts に1つだけ置いてある。ここからは読むだけ
export { exerciseLabel, exercisePlaces, type ExercisePlace } from '../lesson/exercise-place';

/** 落ちた回数のしきい値（第8.2節）。src/pages/api/staff/stuck.ts と同じ値。 */
const FAIL_LIMIT = 5;

/** 想定所要時間の何倍で「長くとどまっている」とするか（第8.2節）。 */
const SLOW_FACTOR = 3;

/** 最後のアクセスから空いた長さのしきい値（第8.2節）。 */
const AWAY_MS = 10 * 24 * 60 * 60 * 1000;

// ---------------------------------------------------------------- 一覧

export type RosterStudent = {
  id: string;
  displayName: string;
  cohortCode: string;
  cohortKind: string;
  role: string;
  /** 0 | 1 | 2。画面では使わないが、口が返す形に入っている（第7章） */
  level: number;
  lastSeenAt: number;
  /** 節の id → 'opened' | 'done'。記録の無い節は入らない */
  lessons: Record<string, string>;
};

type UserRow = {
  id: string;
  display_name: string;
  role: string;
  level: number;
  last_seen_at: number;
  cohort_code: string;
  cohort_kind: string;
};

type ProgressStateRow = { user_id: string; lesson_id: string; state: string };

/**
 * 一覧の材料（第8.1節）。**並びは「進度が遅い順」**。済んだ節が少ない人が先、
 * 同じなら最後に来たのが古い人が先。
 *
 * 利用者ごとに問い合わせを回さない。進度は users に繋いで同じ範囲の条件で一度に引く。
 */
export async function rosterStudents(db: Db, me: CurrentUser): Promise<RosterStudent[]> {
  const scope = visibleUsers(me);

  const users = await db
    .prepare(
      `SELECT u.id, u.display_name, u.role, u.level, u.last_seen_at,
              c.code AS cohort_code, c.kind AS cohort_kind
         FROM users u
         JOIN cohorts c ON c.code = u.cohort_code
        WHERE ${scope.where}`,
    )
    .bind(...scope.binds)
    .all<UserRow>();

  const progress = await db
    .prepare(
      `SELECT p.user_id, p.lesson_id, p.state
         FROM progress p
         JOIN users u ON u.id = p.user_id
        WHERE ${scope.where}`,
    )
    .bind(...scope.binds)
    .all<ProgressStateRow>();

  const lessonsByUser = new Map<string, Record<string, string>>();
  const doneCount = new Map<string, number>();
  for (const row of progress.results) {
    let lessons = lessonsByUser.get(row.user_id);
    if (!lessons) {
      lessons = {};
      lessonsByUser.set(row.user_id, lessons);
    }
    lessons[row.lesson_id] = row.state;
    if (row.state === 'done') doneCount.set(row.user_id, (doneCount.get(row.user_id) ?? 0) + 1);
  }

  const students = users.results.map((row) => ({
    id: row.id,
    displayName: row.display_name,
    cohortCode: row.cohort_code,
    cohortKind: row.cohort_kind,
    role: row.role,
    level: row.level,
    lastSeenAt: row.last_seen_at,
    lessons: lessonsByUser.get(row.id) ?? {},
  }));

  students.sort((a, b) => {
    const done = (doneCount.get(a.id) ?? 0) - (doneCount.get(b.id) ?? 0);
    return done !== 0 ? done : a.lastSeenAt - b.lastSeenAt;
  });
  return students;
}

// ---------------------------------------------------------------- 詰まっているところ

export type StuckItem = {
  kind: 'fails' | 'slow' | 'away';
  userId: string;
  displayName: string;
  cohortKind: string;
  lessonId: string;
  exerciseId: string;
  fails: number;
  seconds: number;
  expectedSeconds: number;
  lastSeenAt: number;
};

type FailRow = { user_id: string; exercise_id: string; fails: number };
type SlowRow = { user_id: string; lesson_id: string; seconds: number };
type StuckUserRow = { id: string; display_name: string; cohort_kind: string; last_seen_at: number };

/**
 * 詰まっているところ（第8.2節）。**3種類を混ぜない。**fails を多い順に全部、次に slow を
 * 超過の大きい順に全部、最後に away を古い順に全部並べる。混ぜて1本の順位にすると、
 * 何を見ているのかが行ごとに変わる。
 *
 * `minutes` は節の id → 想定所要時間（分）。教材の frontmatter から取ったものを呼ぶ側が
 * 渡す。ここで astro:content を読まないのは、ページが章を組むのに同じものをすでに
 * 引いているためで、2回引く理由がないからである。
 */
export async function stuckItems(
  db: Db,
  me: CurrentUser,
  minutes: Map<string, number>,
  now: number,
): Promise<StuckItem[]> {
  const scope = visibleUsers(me);

  const users = await db
    .prepare(
      `SELECT u.id, u.display_name, u.last_seen_at, c.kind AS cohort_kind
         FROM users u
         JOIN cohorts c ON c.code = u.cohort_code
        WHERE ${scope.where}`,
    )
    .bind(...scope.binds)
    .all<StuckUserRow>();
  const byId = new Map(users.results.map((row) => [row.id, row]));

  // 一度も通っていない課題だけを数える。通ったあとで解き直して落とした人は詰まっていない。
  const fails = await db
    .prepare(
      `SELECT s.user_id, s.exercise_id, COUNT(*) AS fails
         FROM submissions s
         JOIN users u ON u.id = s.user_id
        WHERE ${scope.where}
        GROUP BY s.user_id, s.exercise_id
       HAVING SUM(s.passed) = 0 AND COUNT(*) >= ?`,
    )
    .bind(...scope.binds, FAIL_LIMIT)
    .all<FailRow>();

  // しきい値が教材の中にあるので SQL では絞れない。0秒の行だけは先に落としておく。
  const slow = await db
    .prepare(
      `SELECT p.user_id, p.lesson_id, p.seconds
         FROM progress p
         JOIN users u ON u.id = p.user_id
        WHERE ${scope.where} AND p.seconds > 0`,
    )
    .bind(...scope.binds)
    .all<SlowRow>();

  const failItems: StuckItem[] = [];
  for (const row of fails.results) {
    const user = byId.get(row.user_id);
    if (!user) continue;
    failItems.push({
      kind: 'fails',
      userId: user.id,
      displayName: user.display_name,
      cohortKind: user.cohort_kind,
      // submissions に節の列は無い。課題の id から節を引くのは画面の仕事にする。
      lessonId: '',
      exerciseId: row.exercise_id,
      fails: row.fails,
      seconds: 0,
      expectedSeconds: 0,
      lastSeenAt: user.last_seen_at,
    });
  }
  failItems.sort((a, b) => b.fails - a.fails);

  const slowItems: StuckItem[] = [];
  for (const row of slow.results) {
    const user = byId.get(row.user_id);
    if (!user) continue;
    // 教材から消えた節の記録が残っていることがある。しきい値が無いものは判じない。
    const m = minutes.get(row.lesson_id);
    if (m === undefined) continue;
    const expectedSeconds = m * 60 * SLOW_FACTOR;
    if (row.seconds < expectedSeconds) continue;
    slowItems.push({
      kind: 'slow',
      userId: user.id,
      displayName: user.display_name,
      cohortKind: user.cohort_kind,
      lessonId: row.lesson_id,
      exerciseId: '',
      fails: 0,
      seconds: row.seconds,
      expectedSeconds,
      lastSeenAt: user.last_seen_at,
    });
  }
  slowItems.sort((a, b) => b.seconds - b.expectedSeconds - (a.seconds - a.expectedSeconds));

  const awayItems: StuckItem[] = [];
  for (const user of users.results) {
    if (now - user.last_seen_at < AWAY_MS) continue;
    awayItems.push({
      kind: 'away',
      userId: user.id,
      displayName: user.display_name,
      cohortKind: user.cohort_kind,
      lessonId: '',
      exerciseId: '',
      fails: 0,
      seconds: 0,
      expectedSeconds: 0,
      lastSeenAt: user.last_seen_at,
    });
  }
  awayItems.sort((a, b) => a.lastSeenAt - b.lastSeenAt);

  return [...failItems, ...slowItems, ...awayItems];
}

// ---------------------------------------------------------------- 1人の詳細

/** 出す提出の数。新しい順に200件まで（第6.2節の手元の控えと同じ数）。 */
export const MAX_SUBMISSIONS = 200;

export type UserDetail = {
  user: {
    id: string;
    displayName: string;
    role: string;
    lastSeenAt: number;
    createdAt: number;
    cohort: { code: string; name: string; kind: string };
  };
  progress: {
    lessonId: string;
    state: string;
    openedAt: number;
    doneAt: number | null;
    seconds: number;
  }[];
  submissions: {
    id: number;
    exerciseId: string;
    code: string;
    passed: boolean;
    failedTest: number | null;
    errorType: string | null;
    createdAt: number;
  }[];
};

type DetailUserRow = {
  id: string;
  display_name: string;
  role: string;
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

type SubmissionRow = {
  id: number;
  exercise_id: string;
  code: string;
  passed: number;
  failed_test: number | null;
  error_type: string | null;
  created_at: number;
};

/**
 * 1人の詳細（第8.4節）。**範囲の外の利用者は null。**呼ぶ側は 404 にする。
 * 「権限がありません」と返すと、そのIDの人が居ることだけは分かってしまう。
 *
 * **提出コードはそのまま返す。整形しない。**空白の入れ方も、全角の記号も、書かれた
 * とおりに渡す。書き方の癖と誤解を読むためのものである。
 */
export async function userDetail(
  db: Db,
  me: CurrentUser,
  rawId: string,
): Promise<UserDetail | null> {
  // 利用者IDは紙から打ち直される前提のもの（第5.3節）。ログインと同じに揃える。
  const id = normalizeUserId(rawId);
  const scope = visibleUsers(me);

  // 範囲の条件を問い合わせに混ぜる。引いてから JavaScript で弾く書き方にしないのは、
  // 弾き忘れたときに別の所属の記録がそのまま出るため。
  const user = await db
    .prepare(
      `SELECT u.id, u.display_name, u.role, u.last_seen_at, u.created_at,
              c.code AS cohort_code, c.name AS cohort_name, c.kind AS cohort_kind
         FROM users u
         JOIN cohorts c ON c.code = u.cohort_code
        WHERE u.id = ? AND ${scope.where}`,
    )
    .bind(id, ...scope.binds)
    .first<DetailUserRow>();
  if (!user) return null;

  const progress = await db
    .prepare(
      'SELECT lesson_id, state, opened_at, done_at, seconds FROM progress WHERE user_id = ? ORDER BY lesson_id',
    )
    .bind(id)
    .all<ProgressRow>();

  const submissions = await db
    .prepare(
      `SELECT id, exercise_id, code, passed, failed_test, error_type, created_at
         FROM submissions WHERE user_id = ? ORDER BY created_at DESC, id DESC LIMIT ?`,
    )
    .bind(id, MAX_SUBMISSIONS)
    .all<SubmissionRow>();

  return {
    user: {
      id: user.id,
      displayName: user.display_name,
      role: user.role,
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
    submissions: submissions.results.map((row) => ({
      id: row.id,
      exerciseId: row.exercise_id,
      code: row.code, // そのまま。整形しない（第8.4節）
      passed: row.passed === 1,
      failedTest: row.failed_test,
      errorType: row.error_type,
      createdAt: row.created_at,
    })),
  };
}

// ---------------------------------------------------------------- パスワードの作り直し

/**
 * パスワードの作り直しの答え（第5.3節「運営が管理画面から再発行する」）。
 *
 * `reason` の意味:
 *   `not_found` … 範囲の外、または居ない利用者。**居ないときとまったく同じ**にする
 *                 （userDetail と同じ考え方。居るかどうかを教えない）
 *   `self`      … 自分自身は指定できない
 *   `forbidden` … 管理者でない運営が、管理者を指定した
 */
export type PasscodeResetResult =
  | { ok: true; id: string; passcode: string }
  | { ok: false; reason: 'not_found' | 'self' | 'forbidden' };

type ResetTargetRow = { id: string; role: string };

/**
 * パスワードを作り直す（第5.3節）。範囲は userDetail とまったく同じ `visibleUsers`
 * （運営は自分の所属だけ、管理者は全部）。範囲の外は「見つからない」と同じ 404 に
 * なるよう、呼ぶ側に `not_found` を返す。
 *
 * ここで決めた規則（仕様書に細則が無いため、ここで定める）:
 *   - **誰も自分自身のパスワードはここでは作り直せない。** 管理者も例外にしない。
 *     取り違えて自分を指定したときに、自分のログインをその場で失う操作を許さないため
 *     （src/pages/api/admin/role.ts の「自分の管理者は外せない」と同じ考え方）
 *   - **運営（staff）は管理者（admin）のパスワードを作り直せない。** 管理者だけができる
 *   - それ以外は visibleUsers の範囲どおり（運営は自分の所属の学生・運営、管理者は全部）
 *
 * 作り直す中身は3つ: 新しいハッシュを保存する・`fail_count`/`retry_after` を0に戻す・
 * その利用者の `sessions` を全部消す（ログイン中の端末をログアウトさせる。第5.3節）。
 * 平文のパスワードは戻り値としてだけ渡す。**ログには一切出さない。**
 */
export async function resetPasscode(db: Db, me: CurrentUser, rawId: string): Promise<PasscodeResetResult> {
  const id = normalizeUserId(rawId);
  const scope = visibleUsers(me);

  const target = await db
    .prepare(`SELECT u.id AS id, u.role AS role FROM users u WHERE u.id = ? AND ${scope.where}`)
    .bind(id, ...scope.binds)
    .first<ResetTargetRow>();
  if (!target) return { ok: false, reason: 'not_found' };

  if (target.id === me.id) return { ok: false, reason: 'self' };
  if (target.role === 'admin' && me.role !== 'admin') return { ok: false, reason: 'forbidden' };

  const passcode = newPasscode();
  const passHash = await hashPasscode(passcode);

  await db
    .prepare('UPDATE users SET pass_hash = ?, fail_count = 0, retry_after = 0 WHERE id = ?')
    .bind(passHash, target.id)
    .run();
  await db.prepare('DELETE FROM sessions WHERE user_id = ?').bind(target.id).run();

  return { ok: true, id: target.id, passcode };
}

// ---------------------------------------------------------------- 日付の出し方

/**
 * ミリ秒 → `YYYY-MM-DD`。
 *
 * 9時間足してから切っているのは、**Worker の時計が UTC だから**である。画面を描くのは
 * サーバ側なので、そのまま切ると日本の朝9時より前が前日の日付で出る。読むのは日本に
 * 居る運営なので、日本の日付で出す。
 */
/**
 * 節の通し番号。**章ごとに1から数える**（教材の課程表と同じ数え方）。
 *
 * 運営の画面は教材と照らし合わせる場所なので、題だけだと何番目の節か分からない。
 * 渡す一覧は節の並び順（ファイル名の順）であること。
 * 練習編の節は、この番号を src/lesson/chapters.ts の practiceSectionLabel に渡して「練習1-2」と呼ぶ
 * （20-platform.md 第15.1節）。「第◯章◯節」にしない。
 */
export function sectionNumbers(ordered: { lessonId: string; chapter: string }[]): Map<string, number> {
  const out = new Map<string, number>();
  const count = new Map<string, number>();
  for (const { lessonId, chapter } of ordered) {
    const n = (count.get(chapter) ?? 0) + 1;
    count.set(chapter, n);
    out.set(lessonId, n);
  }
  return out;
}

export function ymd(ms: number): string {
  return new Date(ms + 9 * 60 * 60 * 1000).toISOString().slice(0, 10);
}

/** 何日前か。丸一日たっていなければ 0。 */
export function daysAgo(ms: number, now: number): number {
  return Math.max(0, Math.floor((now - ms) / (24 * 60 * 60 * 1000)));
}

/** 秒 → `38分`。1分に満たないものは `1分未満`。 */
export function minutesLabel(seconds: number): string {
  const m = Math.floor(seconds / 60);
  return m < 1 ? '1分未満' : `${m}分`;
}
