/**
 * 規則の正解率ランキング（design/spec/53-ml-intro.md 第9節。試作 c-proto.html の「案C の2」）。
 *
 * メンバーが書いた規則はブラウザで訓練データとテストデータの乗客（src/lesson/rule-board-data.ts）に当て、
 * **予測（1 か 0 の並び）と、規則のひとことの説明だけ**が届く。正解率はここで答えと比べて出す。
 *
 * **テストデータの答えはこのファイルにだけ置く。**画面の部品（src/lesson/・src/components/）から
 * import しないこと（ブラウザに配る物に入ってしまう）。テストデータの正解率も、運営が「公開」を
 * 押すまでは API の答えに入れない（出した本人にも返さない）。
 *
 * どのボードがどの節にあるかは教材の <RuleBoard> が持ち、build:tests が lesson-data.json の
 * `ruleBoards` に書き出す。**この表に無い id は断る。**見てよい人・所属の扱いは予想ボード
 * （src/server/guess.ts）と同じ。
 */
import type { CurrentUser, Db } from './auth';
import { canUseBoard } from './guess';
import { RULE_TEST, RULE_TRAIN } from '../lesson/rule-board-data';
import generated from '../generated/lesson-data.json';

export type RuleBoardDef = { lessonId: string; chapter: string };

const DEFS: Record<string, RuleBoardDef> =
  (generated as { ruleBoards?: Record<string, RuleBoardDef> }).ruleBoards ?? {};

/** 訓練データの答え（生き残ったら1）。タイタニック2 の <Run> の survived と同じ */
const TRAIN_SURVIVED = [0, 0, 1, 1, 0, 1, 0, 1, 0, 0, 1, 0, 1, 0, 1, 0, 0, 1, 0, 0];
/** テストデータの答え（PassengerId 171〜195 のうち年齢が整数の20人）。ブラウザに出さない */
const TEST_SURVIVED = [0, 0, 1, 0, 0, 0, 0, 0, 0, 0, 1, 1, 1, 0, 0, 1, 0, 1, 1, 1];

export const TRAIN_SIZE = RULE_TRAIN.sex.length;
export const TEST_SIZE = RULE_TEST.sex.length;

/** 規則のひとことの説明の長さの上限（字） */
export const DESCRIPTION_MAX = 40;

/** 教材にあるボードなら、その中身。無ければ null。 */
export function ruleBoardDef(id: string): RuleBoardDef | null {
  return Object.prototype.hasOwnProperty.call(DEFS, id) ? DEFS[id] : null;
}

/** 見て・出してよいか。予想ボードと同じ（メンバーで、章が公開済み。運営・管理者は準備中でも）。 */
export function canUseRuleBoard(db: Db, user: CurrentUser, def: RuleBoardDef): Promise<boolean> {
  return canUseBoard(db, user, def);
}

/** 予測の並びを '0'/'1' の文字列にする。長さが違う・1 と 0 以外が混ざる なら null。 */
export function readPreds(raw: unknown, size: number): string | null {
  if (!Array.isArray(raw) || raw.length !== size) return null;
  let out = '';
  for (const v of raw) {
    if (v !== 0 && v !== 1) return null;
    out += String(v);
  }
  return out;
}

/** 説明を1行にそろえる（改行・制御文字は空白に、続く空白は1つに）。空か長すぎれば null。 */
export function readDescription(raw: unknown): string | null {
  if (typeof raw !== 'string') return null;
  const text = raw.replace(/[\u0000-\u001f\u007f]/g, ' ').replace(/\s+/g, ' ').trim();
  const length = Array.from(text).length;
  if (length === 0 || length > DESCRIPTION_MAX) return null;
  return text;
}

function accuracy(preds: string, answers: number[]): number {
  let hits = 0;
  for (let i = 0; i < answers.length; i++) if (preds[i] === String(answers[i])) hits++;
  return hits / answers.length;
}

export type RuleRow = {
  rank: number;
  name: string;
  description: string;
  train: number;
  /** 公開前は null */
  test: number | null;
  mine: boolean;
};

export type RuleTable = { revealed: boolean; rows: RuleRow[]; mine: { description: string } | null };

type SubmissionRow = {
  user_id: string;
  display_name: string;
  description: string;
  train_pred: string;
  test_pred: string;
  updated_at: number;
};

/**
 * 表の中身。訓練データの正解率の高い順。同じ正解率は同じ順位（1, 2, 2, 4）で、先に出した人を上に置く。
 * テストデータの正解率は公開したあとにだけ入れる。
 */
export async function ruleTable(db: Db, cohortCode: string, userId: string, boardId: string): Promise<RuleTable> {
  const rows = await db
    .prepare(
      `SELECT s.user_id, u.display_name, s.description, s.train_pred, s.test_pred, s.updated_at
         FROM rule_submissions s
         JOIN users u ON u.id = s.user_id
        WHERE s.cohort_code = ? AND s.board_id = ?`,
    )
    .bind(cohortCode, boardId)
    .all<SubmissionRow>();
  const revealed = await isRevealed(db, cohortCode, boardId);

  const scored = rows.results
    .map((r) => ({ r, train: accuracy(r.train_pred, TRAIN_SURVIVED) }))
    .sort((a, b) => b.train - a.train || a.r.updated_at - b.r.updated_at);

  const out: RuleRow[] = scored.map(({ r, train }) => ({
    rank: 1 + scored.filter((s) => s.train > train).length,
    name: r.display_name,
    description: r.description,
    train,
    test: revealed ? accuracy(r.test_pred, TEST_SURVIVED) : null,
    mine: r.user_id === userId,
  }));
  const own = rows.results.find((r) => r.user_id === userId);
  return { revealed, rows: out, mine: own ? { description: own.description } : null };
}

async function isRevealed(db: Db, cohortCode: string, boardId: string): Promise<boolean> {
  const row = await db
    .prepare('SELECT 1 FROM rule_reveals WHERE cohort_code = ? AND board_id = ?')
    .bind(cohortCode, boardId)
    .first();
  return row !== null;
}

/**
 * 規則を出す（出し直す）。返すのは訓練データの正解率。公開したあとなら書かずに null。
 * テストデータの正解率はここでは返さない（公開まで伏せるため）。
 */
export async function submitRule(
  db: Db,
  cohortCode: string,
  boardId: string,
  userId: string,
  description: string,
  trainPred: string,
  testPred: string,
  now: number,
): Promise<number | null> {
  if (await isRevealed(db, cohortCode, boardId)) return null;
  await db
    .prepare(
      `INSERT INTO rule_submissions (cohort_code, board_id, user_id, description, train_pred, test_pred, updated_at)
       VALUES (?, ?, ?, ?, ?, ?, ?)
       ON CONFLICT (cohort_code, board_id, user_id) DO UPDATE SET
         description = excluded.description, train_pred = excluded.train_pred,
         test_pred = excluded.test_pred, updated_at = excluded.updated_at`,
    )
    .bind(cohortCode, boardId, userId, description, trainPred, testPred, now)
    .run();
  return accuracy(trainPred, TRAIN_SURVIVED);
}

/** 公開する（revealed = true）／やり直す（false。行を消すだけで、出した規則は残る）。 */
export async function setRuleRevealed(
  db: Db,
  cohortCode: string,
  boardId: string,
  userId: string,
  revealed: boolean,
  now: number,
): Promise<void> {
  if (revealed) {
    await db
      .prepare('INSERT OR IGNORE INTO rule_reveals (cohort_code, board_id, revealed_at, revealed_by) VALUES (?, ?, ?, ?)')
      .bind(cohortCode, boardId, now, userId)
      .run();
  } else {
    await db.prepare('DELETE FROM rule_reveals WHERE cohort_code = ? AND board_id = ?').bind(cohortCode, boardId).run();
  }
}

/** 出した規則を消す（会のたびにボードを使い直すため）。所属の規則と公開の行を消す。公開の前でもあとでも。 */
export async function resetRuleBoard(db: Db, cohortCode: string, boardId: string): Promise<void> {
  await db.prepare('DELETE FROM rule_reveals WHERE cohort_code = ? AND board_id = ?').bind(cohortCode, boardId).run();
  await db.prepare('DELETE FROM rule_submissions WHERE cohort_code = ? AND board_id = ?').bind(cohortCode, boardId).run();
}
