/**
 * 質問を受ける（20-platform.md 第10.1節・第10.5節）。
 *
 * 学習者は詰まったその場で押すだけでよい。**状況は説明させない**（第10章）ので、
 * いま開いている節と、その人の**いちばん最近の提出のコード**をサーバ側で添える。
 *
 * `submissions` に節の列は無い（第6章）ので「この節での直前の提出」は引けない。
 * 第10.5節のとおり**利用者の最後の提出をそのまま採る**。節をまたいで古いものが付くことは
 * あるが、質問の直前に手を動かしていれば同じ節のものになる。提出が1件も無ければ NULL。
 *
 * 時刻はミリ秒（第6章）。
 */
import type { APIRoute } from 'astro';
import { currentUser, json, readJsonObject, serverConfig } from '../../server/auth';
import { checkBody } from '../../server/questions';

export const prerender = false;

export const POST: APIRoute = async ({ request }) => {
  const config = serverConfig();
  if (!config) return json({ error: 'サーバの設定が足りません。' }, 500);
  const { db } = config;

  // 入っていない人には送り先が無い（第10.1節）。画面もそもそも欄を出さない。
  const user = await currentUser(request);
  if (!user) return json({ error: 'ログインしていません。' }, 401);

  const payload = await readJsonObject(request);
  if (!payload) return json({ error: '送信された内容を読み取れませんでした。' }, 400);

  // 節が分からない質問はやりとりの置き場所が決まらない。画面は必ず付ける
  const lessonId = String(payload.lessonId ?? '').trim();
  if (lessonId === '') return json({ error: '送信された内容を読み取れませんでした。' }, 400);

  const exerciseId = String(payload.exerciseId ?? '').trim() || null;

  const checked = checkBody(payload.body, '質問');
  if (!checked.ok) return json({ error: checked.error, field: 'body' }, 400);

  // 添えるコード（第10.5節）。1件だけ。学習者には選ばせない
  const last = await db
    .prepare('SELECT code FROM submissions WHERE user_id = ? ORDER BY created_at DESC, id DESC LIMIT 1')
    .bind(user.id)
    .first<{ code: string }>();

  await db
    .prepare(
      'INSERT INTO questions (user_id, lesson_id, exercise_id, code, body, created_at) VALUES (?, ?, ?, ?, ?, ?)',
    )
    .bind(user.id, lessonId, exerciseId, last?.code ?? null, checked.body, Date.now())
    .run();

  return json({ ok: true }, 200);
};
