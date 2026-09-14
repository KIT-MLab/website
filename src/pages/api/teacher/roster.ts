/**
 * 一覧（20-platform.md 第8.1節）。
 *
 * 先生の画面は「学生を行、章を列にした表」を描く。この口はその表の材料を返すだけで、
 * 章にまとめる仕事も、内部と外部を分ける仕事も画面がやる。だから節の状態は
 * `lessons` にそのまま並べ、所属は `cohortKind` を必ず入れて渡す（第5.2節の
 * 「内部と外部を別のタブに分け、既定では内部だけを表示する」がそれを見る）。
 *
 * **並びは「進度が遅い順」が既定**（第8.1節）。勉強会の前に、遅れている人から見るため。
 * 済んだ節の数が少ない順、同じなら最終アクセスが古い順にする。
 *
 * **利用者ごとに問い合わせを回さない。**進度は `users` に繋いで同じ範囲の条件で
 * 一度に引き、JavaScript の側で利用者ごとにまとめる。1人ずつ引くと30人で31往復になる。
 *
 * 時刻はすべてミリ秒（第6章）。
 */
import type { APIRoute } from 'astro';
import { json, serverConfig } from '../../../server/auth';
import { requireTeacher, visibleUsers } from '../../../server/teacher';

export const prerender = false;

type UserRow = {
  id: string;
  display_name: string;
  role: string;
  level: number;
  last_seen_at: number;
  cohort_code: string;
  cohort_kind: string;
};

type ProgressRow = { user_id: string; lesson_id: string; state: string };

export const GET: APIRoute = async ({ request }) => {
  const config = serverConfig();
  if (!config) return json({ error: 'サーバの設定が足りません。' }, 500);
  const { db } = config;

  const me = await requireTeacher(request);
  if (!me) return json({ error: '先生の画面です。' }, 403);

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

  // 進度も同じ条件で一度に引く。`state` 以外は使わないので引かない
  // （表のセルは未着手 / 開いた / 済 の3状態しか出さないため。第8.1節）。
  const progress = await db
    .prepare(
      `SELECT p.user_id, p.lesson_id, p.state
         FROM progress p
         JOIN users u ON u.id = p.user_id
        WHERE ${scope.where}`,
    )
    .bind(...scope.binds)
    .all<ProgressRow>();

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

  // 遅い順。済んだ節が少ない人が先、同じなら最後に来たのが古い人が先。
  students.sort((a, b) => {
    const done = (doneCount.get(a.id) ?? 0) - (doneCount.get(b.id) ?? 0);
    return done !== 0 ? done : a.lastSeenAt - b.lastSeenAt;
  });

  return json({ students }, 200);
};
