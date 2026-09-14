/**
 * 自分の情報と進度（20-platform.md 第7章）。
 *
 * **ログインしていなくても 200 を返し、本文は `{ "user": null }` にする。401 にしない。**
 * 第9章の12「ログアウトした状態でも本文は読める（進度は記録されない）」がそれで、
 * 学習ページはログインの有無にかかわらず開ける。画面はこの `user` が null かどうかだけを
 * 見て、ログインの導線を出すか進度を出すかを決められる。401 にすると、ログインしていない
 * だけの正常な状態が、画面側ではエラー処理の道に落ちてしまう。
 *
 * `last_seen_at` はここで更新する。第8.1節の「行の末尾に最終アクセス日」と
 * 第8.2節の「最後のアクセスから10日以上」が、この列を見るため。
 *
 * 節の状態に加えて**課題の結果**も返す（第6.1節の最後）。別の端末で入り直した人に、
 * どの問題まで通したかを戻すため。課題の結果は専用の表には持たず、**提出の記録から
 * 毎回作り直す**（第6.1節の表「課題の結果 … 提出の記録から作り直す」）。
 * 同じことを2か所に持つと、送り直しや引き継ぎのたびに食い違うため。
 */
import type { APIRoute } from 'astro';
import { currentUser, json, serverConfig } from '../../server/auth';

export const prerender = false;

type ProgressRow = {
  lesson_id: string;
  state: string;
  opened_at: number;
  done_at: number | null;
  seconds: number;
};
type ExerciseRow = { exercise_id: string; passed: number; fails: number };

export const GET: APIRoute = async ({ request }) => {
  const config = serverConfig();
  if (!config) return json({ error: 'サーバの設定が足りません。' }, 500);

  const user = await currentUser(request);
  if (!user) return json({ user: null }, 200);

  const now = Date.now();
  await config.db.prepare('UPDATE users SET last_seen_at = ? WHERE id = ?').bind(now, user.id).run();

  const progress = await config.db
    .prepare(
      'SELECT lesson_id, state, opened_at, done_at, seconds FROM progress WHERE user_id = ? ORDER BY lesson_id',
    )
    .bind(user.id)
    .all<ProgressRow>();

  // `passed` は1回でもあれば通ったことにする（第6.1節の表）ので MAX。
  // `fails` は落ちた提出の数で、ヒントを出す判断（第4.3節）と
  // 「同じ課題を5回落とした」の判定（第9章の9）が見る。
  const exercises = await config.db
    .prepare(
      `SELECT exercise_id,
              MAX(passed) AS passed,
              SUM(CASE WHEN passed = 0 THEN 1 ELSE 0 END) AS fails
         FROM submissions WHERE user_id = ? GROUP BY exercise_id ORDER BY exercise_id`,
    )
    .bind(user.id)
    .all<ExerciseRow>();

  return json(
    {
      user,
      progress: progress.results.map((row) => ({
        lessonId: row.lesson_id,
        state: row.state,
        // 手元へ引き写すときに要る。節を開いた時刻は「早いほう」で合わせるので、
        // これが無いと引き写した側が必ず「いま」になり、開いた時刻が後ろへずれる（第6.1節）
        openedAt: row.opened_at,
        doneAt: row.done_at,
        seconds: row.seconds,
      })),
      exercises: exercises.results.map((row) => ({
        exerciseId: row.exercise_id,
        passed: row.passed === 1,
        fails: row.fails,
      })),
    },
    200,
  );
};
