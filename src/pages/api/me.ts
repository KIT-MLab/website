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
 */
import type { APIRoute } from 'astro';
import { currentUser, json, serverConfig } from '../../server/auth';

export const prerender = false;

type ProgressRow = { lesson_id: string; state: string; done_at: number | null; seconds: number };

export const GET: APIRoute = async ({ request }) => {
  const config = serverConfig();
  if (!config) return json({ error: 'サーバの設定が足りません。' }, 500);

  const user = await currentUser(request);
  if (!user) return json({ user: null }, 200);

  const now = Date.now();
  await config.db.prepare('UPDATE users SET last_seen_at = ? WHERE id = ?').bind(now, user.id).run();

  const progress = await config.db
    .prepare('SELECT lesson_id, state, done_at, seconds FROM progress WHERE user_id = ? ORDER BY lesson_id')
    .bind(user.id)
    .all<ProgressRow>();

  return json(
    {
      user,
      progress: progress.results.map((row) => ({
        lessonId: row.lesson_id,
        state: row.state,
        doneAt: row.done_at,
        seconds: row.seconds,
      })),
    },
    200,
  );
};
