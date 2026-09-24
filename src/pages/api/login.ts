/**
 * ログイン（20-platform.md 第5.3節・第7章）。
 *
 * 別の端末から表示名とパスワードで入る口（第14.4節）。`u_` で始まる入力は、これまでどおり
 * 利用者IDとして引く。登録した端末は Cookie で入るので、ここは通らない。
 *
 * パスワードは6桁の数字で100万通りしかない。表示名を知っている人が機械で片端から試せば
 * 1日ほどで当たる。だから**続けて外すほど待たせる**（第5.3節の表）。待たせ方は
 * `users.retry_after` に「この時刻まで試せない」を書いて即座に断るやり方で、
 * サーバを眠らせて待たせない（Worker の実行時間を食わないため）。
 *
 * 返す文面の決まりが2つある。どちらも**どこまで当たっているかを教えないため**。
 *   - 表示名（利用者ID）が無いときと、パスワードが違うときは、同じ文面を返す
 *   - 待っている間は、入れたパスワードが合っていたかどうかを出さない（確かめもしない）
 */
import type { APIRoute } from 'astro';
import type { UserRow } from '../../server/auth';
import {
  formatWait,
  json,
  looksLikeUserId,
  normalizeDisplayName,
  normalizeUserId,
  readJsonObject,
  serverConfig,
  startSession,
  toCurrentUser,
  verifyPasscode,
  waitMsFor,
} from '../../server/auth';

export const prerender = false;

/** 表示名が無いときとパスワードが違うときで、必ずこの1つを返す（第5.3節・第14.4節）。 */
const WRONG = '表示名かパスワードが違います。';

/** どの欄の下に断りを出すか（第5.6節）。画面に文面を読ませて振り分けさせないため */
const WRONG_FIELD = 'passcode';

type LoginRow = UserRow & { pass_hash: string; fail_count: number; retry_after: number };

export const POST: APIRoute = async ({ request }) => {
  const config = serverConfig();
  if (!config) return json({ error: 'サーバの設定が足りません。' }, 500);
  const { db, secret } = config;

  const body = await readJsonObject(request);
  if (!body) return json({ error: '送信された内容を読み取れませんでした。' }, 400);

  // `id` の中身は表示名。`u_` で始まるときだけ利用者IDとして引く（第14.4節）
  const given = String(body.id ?? '');
  // 画面には 690 399 と3桁ずつ空けて出すので、そのまま写した人の空白を落とす（第5.6節）。
  // 画面側でも落としているが、口はここ1つとは限らないのでサーバでも受ける
  const passcode = String(body.passcode ?? '').replace(/\s/g, '');
  const now = Date.now();

  // 1. 利用者を引く。無ければパスワード違いと同じ文面で断る。
  //    「その表示名は存在しない」と返すと、まず表示名だけを総当たりで絞り込めてしまう。
  //    `u_` で始まる入力は利用者IDとして引き、無ければ表示名としても引く
  //    （`u_` で始まる表示名で登録した人が入れなくならないように）。
  const find = (where: string, value: string) =>
    db
      .prepare(
        `SELECT u.id, u.display_name, u.role, u.level, u.pass_hash, u.fail_count, u.retry_after,
                c.code AS cohort_code, c.name AS cohort_name, c.kind AS cohort_kind
           FROM users u JOIN cohorts c ON c.code = u.cohort_code
          WHERE ${where}`,
      )
      .bind(value)
      .first<LoginRow>();
  const byName = () => find('u.display_name = ? COLLATE NOCASE', normalizeDisplayName(given));
  const user = looksLikeUserId(given)
    ? ((await find('u.id = ?', normalizeUserId(given))) ?? (await byName()))
    : await byName();
  //    文面は揃うが、**応答の速さは揃わない。**パスワードの照合は PBKDF2 を10万回まわすので
  //    100ミリ秒ほどかかり、IDが無いときは数ミリ秒で返る。速さを測れば、IDが在ることだけは
  //    分かってしまう。揃えるには無いときにも同じだけ計算を空回しすればよいが、そうすると
  //    **でたらめなIDを送りつけるだけで Worker の CPU を100ミリ秒ずつ食える口**になる。
  //    在るIDへの総当たりは待ち時間で頭打ちになるのに、こちらは頭打ちが無い。
  //    IDは32文字の字母の6桁で約10億通りあり、当てずっぽうで引ける数ではないので、
  //    速さの差は残し、計算の空回しはしない。
  //    表示名で引くようになって（第14.4節）、この理由は表示名には当てはまらない。ただ表示名が
  //    在るかどうかは、登録で「すでに使われています」と断られることからも分かるので、
  //    ここで揃えても隠せない。同じく空回しはしない。
  if (!user) return json({ error: WRONG, field: WRONG_FIELD }, 401);

  // 2. まだ待ち時間の中なら、パスワードを確かめずに断る。
  //    ここで先に照合してしまうと、返答の内容や速さから「パスワードは合っていた」と分かる。
  if (user.retry_after > now) {
    return json(
      { error: `あと${formatWait(user.retry_after - now)}たってからもう一度試してください。`, field: WRONG_FIELD },
      429,
    );
  }

  // 3. 違えば回数を1つ増やし、次に試せる時刻を書いて、1と同じ文面で断る。
  if (!(await verifyPasscode(passcode, user.pass_hash))) {
    const failCount = user.fail_count + 1;
    await db
      .prepare('UPDATE users SET fail_count = ?, retry_after = ? WHERE id = ?')
      .bind(failCount, now + waitMsFor(failCount), user.id)
      .run();
    return json({ error: WRONG, field: WRONG_FIELD }, 401);
  }

  // 4. 合えば回数を0に戻す。**打ち間違いを引きずらせない**（第5.3節）。
  await db
    .prepare('UPDATE users SET fail_count = 0, retry_after = 0, last_seen_at = ? WHERE id = ?')
    .bind(now, user.id)
    .run();

  const cookie = await startSession(db, secret, user.id, now);
  return json(toCurrentUser(user), 200, cookie);
};
