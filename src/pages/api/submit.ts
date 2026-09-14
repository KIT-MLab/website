/**
 * 課題の提出を受ける（20-platform.md 第4.5節・第6.1節・第7章）。
 *
 * 採点を走らせるたびに1行入る。**先生が読むためのもの**なので、通った提出も落ちた提出も
 * 残す。合否だけを数えた要約にしないのは、詰まっている人のコードそのものを見たいため
 * （第8.4節）。
 *
 * 進度と同じく配列で受ける。ふだんは採点1回につき1件だが、繋がっていなかった間に
 * 溜まったぶんがまとめて届くことがある。
 *
 * **同じ提出が2行にならないようにする。**応答だけが届かなかったとき、画面は手元に
 * 残した提出を送り直す。そのまま2行になると「同じ課題を5回落とした」の判定
 * （第9章の9）が狂い、詰まっていない人が詰まって見える。
 * `(user_id, exercise_id, created_at)` に UNIQUE が張ってある（migrations/0003）ので、
 * `INSERT OR IGNORE` で入れれば二度目は黙って捨てられる。
 *
 * 時刻はすべてミリ秒（第6章）。
 */
import type { APIRoute } from 'astro';
import type { Stmt } from '../../server/auth';
import { currentUser, json, readJsonObject, serverConfig } from '../../server/auth';

export const prerender = false;

/** 1回に受ける上限。手元の控えも 200件までしか持たない（src/lesson/store/progress.ts）。 */
const MAX_SUBMISSIONS = 200;

/**
 * 1件のコードの長さの上限。
 *
 * 教材の課題は長くても数十行なので、これを超えるのは貼り付けか事故である。
 * 断らずに切るのは、**コードが長すぎるという理由で合否の記録まで落としたくない**ため。
 * 切ったことが分かるように末尾へ印を足す。先生が「途中で終わっている」と誤読しないため。
 */
const CODE_MAX = 20000;
const CUT_MARK = '…（長すぎるため切りました）';

const INSERT = `
  INSERT OR IGNORE INTO submissions (user_id, exercise_id, code, passed, failed_test, error_type, created_at)
  VALUES (?, ?, ?, ?, ?, ?, ?)
`;

/**
 * コードを上限まで切る。切るときは印のぶんも含めて CODE_MAX に収める。
 *
 * 符号位置で切るのは、`slice` が UTF-16 の単位で切るため。絵文字や一部の漢字の
 * 途中で切ると壊れた1文字が残る。長さが上限以下なら符号位置も必ず上限以下なので、
 * 数えるのは切るときだけでよい。
 */
function clampCode(value: unknown): string {
  const code = typeof value === 'string' ? value : '';
  if (code.length <= CODE_MAX) return code;
  return [...code].slice(0, CODE_MAX - CUT_MARK.length).join('') + CUT_MARK;
}

/** テストの番号。0始まりなので 0 を通す。読めなければ null（通ったときは元から null）。 */
function toIndex(value: unknown): number | null {
  if (typeof value !== 'number' || !Number.isFinite(value) || value < 0) return null;
  return Math.floor(value);
}

/** `'NameError'` など。文字列でなければ null。長さは念のため抑える。 */
function toErrorType(value: unknown): string | null {
  if (typeof value !== 'string' || value === '') return null;
  return value.slice(0, 100);
}

export const POST: APIRoute = async ({ request }) => {
  const config = serverConfig();
  if (!config) return json({ error: 'サーバの設定が足りません。' }, 500);
  const { db } = config;

  const user = await currentUser(request);
  if (!user) return json({ error: 'ログインしていません。' }, 401);

  const body = await readJsonObject(request);
  if (!body) return json({ error: '送信された内容を読み取れませんでした。' }, 400);

  const submissions = body.submissions;
  if (!Array.isArray(submissions)) return json({ error: '送信された内容を読み取れませんでした。' }, 400);
  if (submissions.length > MAX_SUBMISSIONS) {
    return json({ error: `一度に送れるのは${MAX_SUBMISSIONS}件までです。` }, 400);
  }

  const statements: Stmt[] = [];

  for (const raw of submissions) {
    // 進度と同じく、壊れた1件で束ごと断らない（送り直しても同じところで止まるため）。
    if (raw === null || typeof raw !== 'object' || Array.isArray(raw)) continue;
    const item = raw as Record<string, unknown>;

    const exerciseId = String(item.exerciseId ?? '').trim();
    if (exerciseId === '') continue;

    // `at` は重複を判じる鍵の一部なので、ここだけは「いま」で埋めない。
    // 埋めると送り直しのたびに別の時刻になり、同じ提出が何行にもなる。
    const at = item.at;
    if (typeof at !== 'number' || !Number.isFinite(at) || at <= 0) continue;

    // `lessonId` も届くが submissions に列は無い（第6章）。どの節の課題かは
    // exercise_id から引けるので、同じことを2か所に持たない。
    statements.push(
      db
        .prepare(INSERT)
        .bind(
          user.id,
          exerciseId,
          clampCode(item.code),
          item.passed ? 1 : 0,
          toIndex(item.failedTest),
          toErrorType(item.errorType),
          Math.floor(at),
        ),
    );
  }

  if (statements.length === 0) return json({ saved: 0 }, 200);

  // まとめて1往復で書く。返すのは**実際に入った件数**で、捨てられたぶんは数えない。
  // 画面はこの数を見て「送れた」と判じるのではなく、送り終えた印を消すだけなので、
  // 0 が返っても構わない（既に入っている、という意味だから）。
  const results = await db.batch(statements);
  const saved = results.reduce((sum, row) => sum + (row.meta?.changes ?? 0), 0);

  return json({ saved }, 200);
};
