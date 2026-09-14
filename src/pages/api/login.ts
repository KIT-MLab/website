/**
 * ログイン（20-platform.md 第5.3節・第7章）。
 *
 * 別の端末から利用者IDと合言葉で入る口。登録した端末は Cookie で入るので、ここは通らない。
 *
 * 合言葉は6桁の数字で100万通りしかない。利用者IDを知っている人が機械で片端から試せば
 * 1日ほどで当たる。だから**続けて外すほど待たせる**（第5.3節の表）。待たせ方は
 * `users.retry_after` に「この時刻まで試せない」を書いて即座に断るやり方で、
 * サーバを眠らせて待たせない（Worker の実行時間を食わないため）。
 *
 * 返す文面の決まりが2つある。どちらも**どこまで当たっているかを教えないため**。
 *   - 利用者IDが無いときと、合言葉が違うときは、同じ文面を返す
 *   - 待っている間は、入れた合言葉が合っていたかどうかを出さない（確かめもしない）
 */
import type { APIRoute } from 'astro';
import type { UserRow } from '../../server/auth';
import {
  formatWait,
  json,
  normalizeUserId,
  readJsonObject,
  serverConfig,
  startSession,
  toCurrentUser,
  verifyPasscode,
  waitMsFor,
} from '../../server/auth';

export const prerender = false;

/** 利用者IDが無いときと合言葉が違うときで、必ずこの1つを返す（第5.3節）。 */
const WRONG = '利用者IDか合言葉が違います。';

/** どの欄の下に断りを出すか（第5.6節）。画面に文面を読ませて振り分けさせないため */
const WRONG_FIELD = 'passcode';

type LoginRow = UserRow & { pass_hash: string; fail_count: number; retry_after: number };

export const POST: APIRoute = async ({ request }) => {
  const config = serverConfig();
  if (!config) return json({ error: 'サーバの設定が足りません。' }, 500);
  const { db, secret } = config;

  const body = await readJsonObject(request);
  if (!body) return json({ error: '送信された内容を読み取れませんでした。' }, 400);

  const id = normalizeUserId(String(body.id ?? ''));
  // 画面には 690 399 と3桁ずつ空けて出すので、そのまま写した人の空白を落とす（第5.6節）。
  // 画面側でも落としているが、口はここ1つとは限らないのでサーバでも受ける
  const passcode = String(body.passcode ?? '').replace(/s/g, '');
  const now = Date.now();

  // 1. 利用者を引く。無ければ合言葉違いと同じ文面で断る。
  //    「そのIDは存在しない」と返すと、まずIDだけを総当たりで絞り込めてしまう。
  const user = await db
    .prepare(
      `SELECT u.id, u.display_name, u.role, u.level, u.pass_hash, u.fail_count, u.retry_after,
              c.code AS cohort_code, c.name AS cohort_name, c.kind AS cohort_kind
         FROM users u JOIN cohorts c ON c.code = u.cohort_code
        WHERE u.id = ?`,
    )
    .bind(id)
    .first<LoginRow>();
  //    文面は揃うが、**応答の速さは揃わない。**合言葉の照合は PBKDF2 を10万回まわすので
  //    100ミリ秒ほどかかり、IDが無いときは数ミリ秒で返る。速さを測れば、IDが在ることだけは
  //    分かってしまう。揃えるには無いときにも同じだけ計算を空回しすればよいが、そうすると
  //    **でたらめなIDを送りつけるだけで Worker の CPU を100ミリ秒ずつ食える口**になる。
  //    在るIDへの総当たりは待ち時間で頭打ちになるのに、こちらは頭打ちが無い。
  //    IDは32文字の字母の6桁で約10億通りあり、当てずっぽうで引ける数ではないので、
  //    速さの差は残し、計算の空回しはしない。
  if (!user) return json({ error: WRONG, field: WRONG_FIELD }, 401);

  // 2. まだ待ち時間の中なら、合言葉を確かめずに断る。
  //    ここで先に照合してしまうと、返答の内容や速さから「合言葉は合っていた」と分かる。
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
