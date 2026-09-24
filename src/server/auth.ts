/**
 * 登録とログインの土台（20-platform.md 第5章・第7章）。
 *
 * ここに置くのは「画面から見えない部分」だけ。利用者IDとパスワードの作り方、パスワードの
 * しまい方、Cookie の作り方と読み方、待たせる時間の計算。API のルート
 * （src/pages/api/register.ts 他）はこの関数を並べるだけで済むようにしてある。
 *
 * 新しい依存は足していない。ハッシュも署名も乱数も WebCrypto（Worker に最初からある）
 * だけで作る。**外から持ってきたパスワード用のライブラリを足さないのは、Worker の中で
 * 動く保証がないのと、この土台が何をしているかを後から読み直せるようにするため。**
 *
 * 時刻はすべてミリ秒（`Date.now()` の値）。第6章で「秒とミリ秒が混ざると比較したときに
 * 静かに間違う」と決めてあるので、この中でも秒には落とさない。
 *
 * 紐付け（D1 と署名鍵）の取り方は Astro v6 で変わった。`Astro.locals.runtime` は
 * 廃止で、`cloudflare:workers` の env を読む。この import は Worker の中でだけ
 * 解決できるので、このファイルを読み込んでよいのは `prerender = false` のルートに限る。
 */
import { env as workerEnv } from 'cloudflare:workers';

/**
 * D1 の型。`@cloudflare/workers-types` は入れていないので、使うぶんだけ自分で書く。
 * 依存を1つ増やして得られるのがこの6行だけなら、書いたほうが軽い。
 */
export type Stmt = {
  bind: (...values: unknown[]) => Stmt;
  first: <T>() => Promise<T | null>;
  all: <T>() => Promise<{ results: T[] }>;
  run: () => Promise<unknown>;
};

/**
 * `batch` の1件ぶんの答え。`meta.changes` が「その文で実際に変わった行数」で、
 * `INSERT OR IGNORE` が黙って捨てたときは 0 になる。/api/submit はこれを数える。
 */
export type BatchResult = { meta?: { changes?: number } };

/**
 * `batch` は複数の文を1往復で流す。**200件を1件ずつ `await` で回すと200往復になる**ので、
 * まとめて書く口（/api/progress と /api/submit）はこちらを使う。
 */
export type Db = {
  prepare: (sql: string) => Stmt;
  batch: (statements: Stmt[]) => Promise<BatchResult[]>;
};

/** 利用者ID に使う字母。`0 O 1 I L` を抜いてある（紙に書き写して打ち直すため）。 */
export const ID_ALPHABET = '23456789ABCDEFGHJKLMNPQRSTUVWXYZ';

/** PBKDF2 の回数。増やすときはこの数を上げるだけでよい（保存する文字列に回数が入っている）。 */
export const PBKDF2_ITERATIONS = 100000;

/** Cookie の名前。 */
export const COOKIE_NAME = 'kit_session';

/** Cookie とセッションの有効期間。180日（第5.3節）。秒とミリ秒の両方を持つ。 */
const COOKIE_MAX_AGE_SECONDS = 15552000;
const SESSION_MAX_AGE_MS = COOKIE_MAX_AGE_SECONDS * 1000;

const encoder = new TextEncoder();

// ---------------------------------------------------------------- 返し方

/**
 * JSON の応答。形は src/pages/api/solution/[id].ts に合わせてある。
 * 違うのは第3引数だけで、ここでは Set-Cookie を1つ足せるようにしてある
 * （登録・ログイン・ログアウトの3か所で要るため）。
 */
export function json(body: unknown, status: number, cookie?: string): Response {
  const headers: Record<string, string> = {
    'content-type': 'application/json; charset=utf-8',
    'cache-control': 'no-store',
  };
  if (cookie !== undefined) headers['set-cookie'] = cookie;
  return new Response(JSON.stringify(body), { status, headers });
}

/**
 * 本文を JSON の物体として読む。壊れていたり物体でなかったりしたら null。
 * `body.code` のような読み方をする前に、物体であることをここで一度だけ確かめる。
 */
export async function readJsonObject(request: Request): Promise<Record<string, unknown> | null> {
  try {
    const raw: unknown = await request.json();
    if (raw === null || typeof raw !== 'object' || Array.isArray(raw)) return null;
    return raw as Record<string, unknown>;
  } catch {
    return null;
  }
}

// ---------------------------------------------------------------- 紐付け

/**
 * D1 と署名鍵をまとめて取る。どちらかが無ければ null。
 * 呼ぶ側は null のとき 500 と「サーバの設定が足りません。」を返す。
 *
 * **署名鍵が無いまま動かさない。**無いときに適当な既定値で署名すると、その値を知っている
 * 人が誰にでもなりすませる。落ちたほうが安全なので落とす。
 */
export function serverConfig(): { db: Db; secret: string } | null {
  let env: Record<string, unknown>;
  try {
    env = (workerEnv ?? {}) as Record<string, unknown>;
  } catch {
    return null;
  }
  const db = env.DB as Db | undefined;
  const secret = env.SESSION_SECRET;
  if (!db || typeof db.prepare !== 'function') return null;
  if (typeof secret !== 'string' || secret.length === 0) return null;
  return { db, secret };
}

// ---------------------------------------------------------------- 乱数

/**
 * 字母から count 文字を引く。
 *
 * 256 を字母数で割り切れるところまでのバイトだけを採り、あまりの範囲に落ちたバイトは
 * 捨てる（拒否サンプリング）。捨てずに `% 字母数` を取ると、番号の小さい字だけが
 * わずかに出やすくなる。いまの字母は32文字で 256 を割り切るので実際には1つも捨てないが、
 * **字母を変えたときに静かに偏らないよう、この形で書いておく。**
 */
function randomChars(count: number): string {
  const n = ID_ALPHABET.length;
  const limit = 256 - (256 % n);
  const buf = new Uint8Array(count);
  let out = '';
  while (out.length < count) {
    crypto.getRandomValues(buf);
    for (const b of buf) {
      if (b >= limit) continue;
      out += ID_ALPHABET[b % n];
      if (out.length === count) break;
    }
  }
  return out;
}

/** 利用者ID。`u_` ＋ 字母6文字（例: `u_7QK3M9`）。 */
export function newUserId(): string {
  return `u_${randomChars(6)}`;
}

/**
 * 打ち直された利用者IDの揺れを吸う。
 *
 * このIDは**画面で見て紙に書き写し、別の端末で打ち直す**ものである（第5.3節）。
 * 携帯電話の入力欄は先頭を勝手に大文字にすることがあるし、字母（`23456789A〜Z`）に
 * 小文字は1つも無いので、小文字で打たれたものを別のIDとして扱う理由が無い。
 * 前後の空白を落とし、大文字に揃え、接頭辞だけ `u_` に戻す。
 */
export function normalizeUserId(raw: string): string {
  return raw.trim().toUpperCase().replace(/^U_/, 'u_');
}

/**
 * 表示名の揺れを吸う（第14.4節）。NFKC で正規化して（全角の英数字を半角に）前後の空白を落とす。
 * 登録でしまう値も、ログインで引く値もこれを通す。大文字小文字は D1 の `COLLATE NOCASE` で揃える。
 */
export function normalizeDisplayName(raw: string): string {
  return raw.normalize('NFKC').trim();
}

/** `u_` で始まる入力（大文字小文字を問わない）は利用者IDとして受ける（第14.4節）。 */
export function looksLikeUserId(raw: string): boolean {
  return /^u_/i.test(raw.trim());
}

/**
 * パスワード。6桁の数字（`000000`〜`999999`）。
 *
 * 数ではなく文字列で組み立てる。**数にすると先頭の0が落ちて5桁になり、打ち直せなくなる。**
 * 1桁ずつ、250 未満のバイトだけを採って `% 10` する（250〜255 を採ると 0〜5 が
 * わずかに出やすくなる）。
 */
export function newPasscode(): string {
  const buf = new Uint8Array(1);
  let out = '';
  while (out.length < 6) {
    crypto.getRandomValues(buf);
    if (buf[0] >= 250) continue;
    out += String(buf[0] % 10);
  }
  return out;
}

/** セッションの token。32バイトの乱数を base64url にしたもの。 */
export function newSessionToken(): string {
  return toBase64Url(crypto.getRandomValues(new Uint8Array(32)));
}

// ---------------------------------------------------------------- パスワード

async function pbkdf2(passcode: string, salt: Uint8Array, iterations: number): Promise<Uint8Array> {
  const key = await crypto.subtle.importKey('raw', encoder.encode(passcode), 'PBKDF2', false, [
    'deriveBits',
  ]);
  const bits = await crypto.subtle.deriveBits(
    { name: 'PBKDF2', salt, iterations, hash: 'SHA-256' },
    key,
    256, // 32バイト
  );
  return new Uint8Array(bits);
}

/**
 * パスワードをしまえる形にする。PBKDF2-HMAC-SHA256、ソルト16バイト、出力32バイト。
 *
 * 形は `pbkdf2$<回数>$<ソルトのbase64url>$<ハッシュのbase64url>`。
 * **回数を文字列の中に入れてあるのは、あとで回数を変えても古い記録が読めるようにするため。**
 * 回数を定数だけで持つと、上げた瞬間に既存の全員がログインできなくなる。
 */
export async function hashPasscode(passcode: string): Promise<string> {
  const salt = crypto.getRandomValues(new Uint8Array(16));
  const hash = await pbkdf2(passcode, salt, PBKDF2_ITERATIONS);
  return `pbkdf2$${PBKDF2_ITERATIONS}$${toBase64Url(salt)}$${toBase64Url(hash)}`;
}

/**
 * しまってある形と突き合わせる。回数とソルトは保存文字列から読む（上の理由）。
 * 比較は定数時間（下の equalBytes）。
 */
export async function verifyPasscode(passcode: string, stored: string): Promise<boolean> {
  const parts = stored.split('$');
  if (parts.length !== 4 || parts[0] !== 'pbkdf2') return false;

  const iterations = Number(parts[1]);
  if (!Number.isInteger(iterations) || iterations <= 0) return false;

  const salt = fromBase64Url(parts[2]);
  const expected = fromBase64Url(parts[3]);
  if (salt === null || expected === null) return false;

  return equalBytes(await pbkdf2(passcode, salt, iterations), expected);
}

/**
 * バイト列が同じかどうかを、**中身によらず同じ時間で**判じる。
 *
 * 先頭から見て違った時点で抜けると、「何バイト目まで合っていたか」が返答の速さに現れる。
 * 速さを測りながら1バイトずつ合わせていけば、総当たりより桁違いに少ない回数で当てられる。
 * だから最後まで回し、違いを XOR で溜めてから1回だけ判じる。
 */
function equalBytes(a: Uint8Array, b: Uint8Array): boolean {
  if (a.length !== b.length) return false;
  let diff = 0;
  for (let i = 0; i < a.length; i++) diff |= a[i] ^ b[i];
  return diff === 0;
}

// ---------------------------------------------------------------- Cookie

async function hmacKey(secret: string): Promise<CryptoKey> {
  return crypto.subtle.importKey('raw', encoder.encode(secret), { name: 'HMAC', hash: 'SHA-256' }, false, [
    'sign',
  ]);
}

/** token に署名する。HMAC-SHA256 を base64url にしたもの。 */
export async function signToken(token: string, secret: string): Promise<string> {
  const sig = await crypto.subtle.sign('HMAC', await hmacKey(secret), encoder.encode(token));
  return toBase64Url(new Uint8Array(sig));
}

/**
 * Set-Cookie の中身を作る。値は `<token>.<署名>`。
 *
 * 属性の意味:
 *   HttpOnly       … JavaScript から読めない（教材の中で動く Pyodide からも読めない）
 *   Secure         … https でだけ送る
 *   SameSite=Lax   … 他所のサイトからの POST には付かない
 *   Path=/         … サイト全体
 *   Max-Age=180日  … 第5.3節「登録した端末は署名付き Cookie で自動的にログインした状態」
 */
export async function makeCookie(token: string, secret: string): Promise<string> {
  const value = `${token}.${await signToken(token, secret)}`;
  return `${COOKIE_NAME}=${value}; HttpOnly; Secure; SameSite=Lax; Path=/; Max-Age=${COOKIE_MAX_AGE_SECONDS}`;
}

/** Cookie を潰す。属性は makeCookie と同じに揃える（揃っていないと消えないブラウザがある）。 */
export function clearCookie(): string {
  return `${COOKIE_NAME}=; HttpOnly; Secure; SameSite=Lax; Path=/; Max-Age=0`;
}

/**
 * Cookie から token を取り出す。署名が合わなければ null。
 *
 * 署名の比較も定数時間で行う。ここを `===` で済ませると、署名を1文字ずつ削り出せる。
 */
export async function readCookie(request: Request, secret: string): Promise<string | null> {
  const header = request.headers.get('cookie');
  if (!header) return null;

  let value: string | null = null;
  for (const part of header.split(';')) {
    const item = part.trim();
    if (item.startsWith(`${COOKIE_NAME}=`)) value = item.slice(COOKIE_NAME.length + 1);
  }
  if (value === null) return null;

  // token は base64url なので `.` を含まない。最初の `.` で割れる。
  const dot = value.indexOf('.');
  if (dot <= 0) return null;
  const token = value.slice(0, dot);

  const given = fromBase64Url(value.slice(dot + 1));
  const wanted = fromBase64Url(await signToken(token, secret));
  if (given === null || wanted === null) return null;
  return equalBytes(given, wanted) ? token : null;
}

// ---------------------------------------------------------------- セッション

/**
 * セッションを1つ作り、Set-Cookie の中身を返す。
 * 登録とログインで踏む手順が同じなので、まとめてある（第5.2節の4と第5.3節）。
 */
export async function startSession(db: Db, secret: string, userId: string, now: number): Promise<string> {
  const token = newSessionToken();
  await db
    .prepare('INSERT INTO sessions (token, user_id, expires_at) VALUES (?, ?, ?)')
    .bind(token, userId, now + SESSION_MAX_AGE_MS)
    .run();
  return makeCookie(token, secret);
}

/** 画面と API が受け取る利用者の形。**パスワードもそのハッシュもここには入れない。** */
export type CurrentUser = {
  id: string;
  displayName: string;
  role: string;
  level: number;
  cohort: { code: string; name: string; kind: string };
};

/** users と cohorts を繋いで引いた1行。所属は毎回いっしょに引く（画面が必ず使うため）。 */
export type UserRow = {
  id: string;
  display_name: string;
  role: string;
  level: number;
  cohort_code: string;
  cohort_name: string;
  cohort_kind: string;
};

export function toCurrentUser(row: UserRow): CurrentUser {
  return {
    id: row.id,
    displayName: row.display_name,
    role: row.role,
    level: row.level,
    cohort: { code: row.cohort_code, name: row.cohort_name, kind: row.cohort_kind },
  };
}

/**
 * いまログインしている人を返す。合わなければ null（例外にしない）。
 *
 * 期限切れのセッションは `expires_at > ?` で弾く。行そのものは残るが、掃除はまだ作らない。
 * 学習者30人の規模では溜まっても困らないので、困ってから足す。
 */
export async function currentUser(request: Request): Promise<CurrentUser | null> {
  const config = serverConfig();
  if (!config) return null;

  const token = await readCookie(request, config.secret);
  if (token === null) return null;

  const row = await config.db
    .prepare(
      `SELECT u.id, u.display_name, u.role, u.level,
              c.code AS cohort_code, c.name AS cohort_name, c.kind AS cohort_kind
         FROM sessions s
         JOIN users u ON u.id = s.user_id
         JOIN cohorts c ON c.code = u.cohort_code
        WHERE s.token = ? AND s.expires_at > ?`,
    )
    .bind(token, Date.now())
    .first<UserRow>();
  return row ? toCurrentUser(row) : null;
}

// ---------------------------------------------------------------- 待たせる

/**
 * 続けて外した回数から、次に試せるまでの長さ（ミリ秒）を出す（第5.3節の表）。
 *
 * | 1〜2回 | すぐ | 3〜4回 | 30秒 | 5〜7回 | 5分 | 8回以上 | 1時間 |
 *
 * 眠って待つのではなく、この長さを `users.retry_after` に足して書き、次の要求を即座に
 * 断る。**Worker を待たせない**（第5.3節）。
 */
export function waitMsFor(failCount: number): number {
  if (failCount <= 2) return 0;
  if (failCount <= 4) return 30000;
  if (failCount <= 7) return 300000;
  return 3600000;
}

/**
 * 残りの長さを画面に出す文にする。秒に切り上げる（「あと0秒」と出してすぐには試せない、
 * という食い違いを避けるため）。60秒以上なら `5分30秒`、ちょうどなら `5分`、
 * 60秒未満なら `30秒`。
 */
export function formatWait(ms: number): string {
  const seconds = Math.ceil(Math.max(0, ms) / 1000);
  if (seconds < 60) return `${seconds}秒`;
  const minutes = Math.floor(seconds / 60);
  const rest = seconds % 60;
  return rest === 0 ? `${minutes}分` : `${minutes}分${rest}秒`;
}

// ---------------------------------------------------------------- base64url

function toBase64Url(bytes: Uint8Array): string {
  let binary = '';
  for (const b of bytes) binary += String.fromCharCode(b);
  return btoa(binary).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}

function fromBase64Url(text: string): Uint8Array | null {
  try {
    const binary = atob(text.replace(/-/g, '+').replace(/_/g, '/'));
    const out = new Uint8Array(binary.length);
    for (let i = 0; i < binary.length; i++) out[i] = binary.charCodeAt(i);
    return out;
  } catch {
    return null;
  }
}
