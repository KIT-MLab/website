/**
 * 返事を書く（20-platform.md 第8.5節・第10.4節・第7章）。
 *
 * 運営以上だけが書ける。質問への返事も、質問の無いところへ書くコメントも、同じ口で受ける。
 * どちらも学習者側では**その節の1本のやりとり**に混ざって出る（第8.5節）。
 *
 * **範囲の外の利用者あては 404 にする**（第5.4節）。「権限がありません」と返すと、その
 * IDの人が居ることだけは分かってしまうので、居ないときと同じ文面にする。
 *
 * **`comments` への書き込みと `questions.answered_at` の書き込みを別々の操作にしない**
 * （第10.4節）。`batch` は1つのトランザクションなので、片方だけ通って「返事を書いたのに
 * 未返信のまま残る」という食い違いが起きない。
 *
 * 時刻はミリ秒（第6章）。
 */
import type { APIRoute } from 'astro';
import type { Stmt } from '../../../server/auth';
import { json, normalizeUserId, readJsonObject, serverConfig } from '../../../server/auth';
import { requireStaff } from '../../../server/staff';
import { checkBody, inScope } from '../../../server/questions';

export const prerender = false;

/** 質問の id。読めなければ null（質問に紐づかない返事として扱う）。 */
function toQuestionId(value: unknown): number | null {
  const n = typeof value === 'string' ? Number(value) : value;
  if (typeof n !== 'number' || !Number.isInteger(n) || n <= 0) return null;
  return n;
}

export const POST: APIRoute = async ({ request }) => {
  const config = serverConfig();
  if (!config) return json({ error: 'サーバの設定が足りません。' }, 500);
  const { db } = config;

  const me = await requireStaff(request);
  if (!me) return json({ error: '運営の画面です。' }, 403);

  const payload = await readJsonObject(request);
  if (!payload) return json({ error: '送信された内容を読み取れませんでした。' }, 400);

  // 利用者IDは紙から打ち直される前提のもの（第5.3節）。ログインと同じに揃える
  const toUserId = normalizeUserId(String(payload.toUserId ?? ''));
  const lessonId = String(payload.lessonId ?? '').trim();
  if (toUserId === '' || lessonId === '') {
    return json({ error: '送信された内容を読み取れませんでした。' }, 400);
  }

  const exerciseId = String(payload.exerciseId ?? '').trim() || null;

  const checked = checkBody(payload.body, '返事');
  if (!checked.ok) return json({ error: checked.error, field: 'body' }, 400);

  if (!(await inScope(db, me, toUserId))) return json({ error: '見つかりません。' }, 404);

  const now = Date.now();
  const statements: Stmt[] = [
    db
      .prepare(
        `INSERT INTO comments (to_user_id, from_user_id, lesson_id, exercise_id, body, read_at, created_at)
         VALUES (?, ?, ?, ?, ?, NULL, ?)`,
      )
      .bind(toUserId, me.id, lessonId, exerciseId, checked.body, now),
  ];

  const questionId = toQuestionId(payload.questionId);
  if (questionId !== null) {
    // `user_id` も条件に入れる。別の人の質問を「返信済み」にできてしまわないため。
    // `answered_at IS NULL` を付けてあるのは、二度目の返事で最初に答えた時刻を
    // 上書きしないためである（待たせた長さを後から読むのはその時刻のほう）。
    statements.push(
      db
        .prepare('UPDATE questions SET answered_at = ? WHERE id = ? AND user_id = ? AND answered_at IS NULL')
        .bind(now, questionId, toUserId),
    );
  }

  await db.batch(statements);

  return json({ ok: true }, 200);
};
