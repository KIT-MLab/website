/**
 * 登録（20-platform.md 第5.2節・第7章）。
 *
 * 招待コードと表示名を受け取り、利用者IDと合言葉を発行して返す。
 * 集める個人情報は**表示名だけ**（第5.5節）。メールアドレスも学籍番号も本名も受け取らない。
 *
 * **合言葉の平文を返すのはこの応答の1回だけ。**しまってあるのは PBKDF2 のハッシュなので、
 * このあとはサーバも先生も元の6桁を読めない。忘れたときは先生が再発行する（第5.3節）。
 * だから画面は「控えました」を押させるまで先へ進めてはいけない。
 *
 * 登録したらそのままログインした状態にする（第5.2節の4のあと、すぐ学習に入れるように）。
 * ここで Cookie を1つ返すのがそれにあたる。
 */
import type { APIRoute } from 'astro';
import {
  hashPasscode,
  json,
  newPasscode,
  newUserId,
  readJsonObject,
  serverConfig,
  startSession,
} from '../../server/auth';

export const prerender = false;

/** 表示名の長さの上限。画面の一覧に並べたときに崩れない程度、という以上の意味はない。 */
const NAME_MAX = 40;

/** 利用者IDを作り直す回数。字母32文字の6桁で約10億通りなので、2回目でぶつかることはまず無い。 */
const ID_TRIES = 5;

type CohortRow = { code: string; name: string; kind: string };

/**
 * D1 が返す例外のうち、主キーの衝突だけを拾う。
 * 中身を見て判じているのは、D1 が種類を表す番号を渡してくれないため。
 * 衝突以外（テーブルが無い等）はここで握り潰さずに投げ直す。
 */
function isUniqueViolation(e: unknown): boolean {
  const text = e instanceof Error ? `${e.message} ${e.cause instanceof Error ? e.cause.message : ''}` : String(e);
  return text.includes('UNIQUE constraint failed');
}

export const POST: APIRoute = async ({ request }) => {
  const config = serverConfig();
  if (!config) return json({ error: 'サーバの設定が足りません。' }, 500);
  const { db, secret } = config;

  const body = await readJsonObject(request);
  if (!body) return json({ error: '送信された内容を読み取れませんでした。' }, 400);

  // 招待コードは前後の空白を落として大文字に。紙から打ち直す前提なので、
  // 小文字で打っても末尾に空白が付いても通す（第5.2節）。
  const code = String(body.code ?? '').trim().toUpperCase();
  const cohort = await db
    .prepare('SELECT code, name, kind FROM cohorts WHERE code = ?')
    .bind(code)
    .first<CohortRow>();
  if (!cohort) return json({ error: '招待コードが違います。' }, 400);

  // 長さは符号位置で数える。`String.length` は UTF-16 の単位なので、絵文字や一部の
  // 漢字が2文字と数えられ、画面に出す「40文字まで」と食い違う。
  const displayName = String(body.displayName ?? '').trim();
  const nameLength = [...displayName].length;
  if (nameLength === 0) return json({ error: '表示名を入れてください。' }, 400);
  if (nameLength > NAME_MAX) return json({ error: `表示名は${NAME_MAX}文字までです。` }, 400);

  const passcode = newPasscode();
  const passHash = await hashPasscode(passcode);
  const now = Date.now();

  // 利用者IDは乱数なので、まれに既にある値を引く。ぶつかったら引き直す。
  // 先に SELECT して空きを確かめる書き方にしないのは、確かめてから INSERT するまでの間に
  // 他の登録が同じ値を取れてしまうため。INSERT を試して断られたら引き直すほうが確実。
  let id = '';
  for (let i = 0; i < ID_TRIES; i++) {
    const candidate = newUserId();
    try {
      await db
        .prepare(
          `INSERT INTO users
             (id, cohort_code, display_name, role, pass_hash, level, created_at, last_seen_at, fail_count, retry_after)
           VALUES (?, ?, ?, 'student', ?, 0, ?, ?, 0, 0)`,
        )
        .bind(candidate, cohort.code, displayName, passHash, now, now)
        .run();
      id = candidate;
      break;
    } catch (e) {
      if (!isUniqueViolation(e)) throw e;
    }
  }
  if (id === '') return json({ error: '登録できませんでした。もう一度お試しください。' }, 500);

  const cookie = await startSession(db, secret, id, now);

  return json(
    {
      id,
      passcode, // これが平文で出る唯一の場所
      displayName,
      role: 'student',
      level: 0,
      cohort: { code: cohort.code, name: cohort.name, kind: cohort.kind },
    },
    200,
    cookie,
  );
};
