/**
 * 詰まっているところ（20-platform.md 第8.2節）。**運営の画面の主役**。
 *
 * 3つの条件に当てはまる人と箇所を並べる。
 *
 *   | kind    | 条件                                     | しきい値               |
 *   |---------|------------------------------------------|------------------------|
 *   | `fails` | 同じ課題を繰り返し落としてまだ通っていない | 5回以上                 |
 *   | `slow`  | 同じ節に長くとどまっている                 | その節の minutes × 3   |
 *   | `away`  | 最後のアクセスから間が空いた               | 10日以上               |
 *
 * **3種類を混ぜない。**`fails` を多い順に全部、次に `slow` を超過の大きい順に全部、
 * 最後に `away` を古い順に全部並べる。混ぜて1本の順位にすると、何を見ているのかが
 * 行ごとに変わってしまい、上から順に当たるという読み方ができなくなる。
 *
 * **利用者ごとに問い合わせを回さない。**引くのは3回だけで、どれも `users` に繋いで
 * 範囲の条件で絞る。
 *
 * 時刻はすべてミリ秒（第6章）。`seconds` だけが秒である（列の名前のとおり）。
 */
import type { APIRoute } from 'astro';
import { getCollection } from 'astro:content';
import { json, serverConfig } from '../../../server/auth';
import { requireStaff, visibleUsers } from '../../../server/staff';

export const prerender = false;

/** 落ちた回数のしきい値。第9章の9「同じ課題を5回落とすと出る」。 */
const FAIL_LIMIT = 5;

/** 想定所要時間の何倍で「長くとどまっている」とするか。 */
const SLOW_FACTOR = 3;

/** 最後のアクセスから空いた長さのしきい値。 */
const AWAY_MS = 10 * 24 * 60 * 60 * 1000;

type UserRow = { id: string; display_name: string; cohort_kind: string; last_seen_at: number };
type FailRow = { user_id: string; exercise_id: string; fails: number };
type SlowRow = { user_id: string; lesson_id: string; seconds: number };

type Item = {
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

/**
 * 節の id → 想定所要時間（分）。教材の frontmatter から取る（第2.2節）。
 *
 * `astro:content` の `getCollection` は `prerender = false` のルートでも使える。
 * 教材は Vite がビルド時に読み込んで Worker のバンドルに入れるので、実行時に
 * ファイルを読みに行くわけではない。
 *
 * 1回だけ作って使い回す。要求のたびに22節ぶん作り直す理由がない。
 * 取り出しの中で作っているのは、モジュールの一番外で `await` しないため。
 */
let minutesCache: Map<string, number> | null = null;

async function lessonMinutes(): Promise<Map<string, number>> {
  if (minutesCache) return minutesCache;
  const map = new Map<string, number>();
  for (const entry of await getCollection('lessons')) map.set(entry.data.id, entry.data.minutes);
  minutesCache = map;
  return map;
}

export const GET: APIRoute = async ({ request }) => {
  const config = serverConfig();
  if (!config) return json({ error: 'サーバの設定が足りません。' }, 500);
  const { db } = config;

  const me = await requireStaff(request);
  if (!me) return json({ error: '運営の画面です。' }, 403);

  const scope = visibleUsers(me);
  const now = Date.now();

  const users = await db
    .prepare(
      `SELECT u.id, u.display_name, u.last_seen_at, c.kind AS cohort_kind
         FROM users u
         JOIN cohorts c ON c.code = u.cohort_code
        WHERE ${scope.where}`,
    )
    .bind(...scope.binds)
    .all<UserRow>();

  const byId = new Map(users.results.map((row) => [row.id, row]));

  // 課題ごとにまとめ、**一度も通っていないもの**だけを数える。
  // `SUM(passed) = 0` が「まだ通っていない」、`COUNT(*) >= 5` が「5回以上落ちた」。
  // 通ったあとで解き直して落とした人は詰まっていないので、ここには出さない。
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

  // 滞在時間は節ごとのしきい値と比べる。しきい値が教材の中にあるので SQL では絞れない。
  // 0 秒の行だけはどのしきい値も超えないので、ここで落としておく。
  const slow = await db
    .prepare(
      `SELECT p.user_id, p.lesson_id, p.seconds
         FROM progress p
         JOIN users u ON u.id = p.user_id
        WHERE ${scope.where} AND p.seconds > 0`,
    )
    .bind(...scope.binds)
    .all<SlowRow>();

  const minutes = await lessonMinutes();

  const failItems: Item[] = [];
  for (const row of fails.results) {
    const user = byId.get(row.user_id);
    if (!user) continue;
    failItems.push({
      kind: 'fails',
      userId: user.id,
      displayName: user.display_name,
      cohortKind: user.cohort_kind,
      // submissions に節の列は無い（第6章）ので、ここでは節が分からない。
      // 課題の id から節を引くのは画面の仕事にする。同じことを2か所に持たないため。
      lessonId: '',
      exerciseId: row.exercise_id,
      fails: row.fails,
      seconds: 0,
      expectedSeconds: 0,
      lastSeenAt: user.last_seen_at,
    });
  }
  failItems.sort((a, b) => b.fails - a.fails);

  const slowItems: Item[] = [];
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
  // 超過の大きい順。超過は「しきい値を何秒はみ出したか」そのもの（差）で見る。
  // 倍率で見る手もあるが、第8.2節が言っているのは超過であって倍率ではない。
  slowItems.sort((a, b) => b.seconds - b.expectedSeconds - (a.seconds - a.expectedSeconds));

  const awayItems: Item[] = [];
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

  return json({ items: [...failItems, ...slowItems, ...awayItems] }, 200);
};
