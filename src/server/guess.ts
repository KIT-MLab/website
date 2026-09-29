/**
 * みんなの予想ボード（design/spec/53-ml-intro.md 第6節・第7節）。
 *
 * ボードの中身（問い・答え・どの節か）は教材の <Guess> が持ち、build:tests が
 * src/generated/lesson-data.json の `guesses` に書き出す。**この表に無い id は断る**（勝手な id で
 * 行を作らせない）。答えはブラウザに配る物には入れず、答え合わせのあとにだけ API が返す。
 *
 * 予想と答え合わせの記録は所属（cohorts.code）ごと（migrations/0010_guess.sql）。
 * 見る人・出す人の所属のボードだけを扱う（運営の答え合わせも自分の所属だけに効く。今週の演習の公開
 * （src/server/weekly.ts）で運営が自分の所属にしか公開できないのと同じ考え方）。
 *
 * **答え合わせの前は、名前を1つも返さない。**数だけを小さい順に並べて返す（出した順に並べると、
 * 出した時刻から誰の数か見当がつくため）。
 */
import type { CurrentUser, Db } from './auth';
import { isMember } from './member';
import { isChapterPublic } from './lessons-publish';
import generated from '../generated/lesson-data.json';

export type GuessDef = {
  lessonId: string;
  chapter: string;
  question: string;
  unit: string;
  answer: number;
  answerNote?: string;
};

const DEFS: Record<string, GuessDef> = (generated as { guesses?: Record<string, GuessDef> }).guesses ?? {};

/** 教材にあるボードなら、その中身。無ければ null。 */
export function guessDef(id: string): GuessDef | null {
  return Object.prototype.hasOwnProperty.call(DEFS, id) ? DEFS[id] : null;
}

export function isStaffUser(user: CurrentUser): boolean {
  return user.role === 'staff' || user.role === 'admin';
}

/**
 * このボードを見て・出してよいか。メンバーで、かつ章が公開済み（運営・管理者は準備中の章も。
 * 節のページと同じ。20-platform.md 第20.1節）。
 */
export async function canUseBoard(db: Db, user: CurrentUser, def: Pick<GuessDef, 'chapter'>): Promise<boolean> {
  if (!isMember(user)) return false;
  if (isStaffUser(user)) return true;
  return isChapterPublic(db, def.chapter);
}

/** 予想は％で 0〜100。小数第1位までにそろえる（38.38 は 38.4 として受ける）。読めなければ null。 */
export function normalizeGuess(raw: unknown): number | null {
  const n = typeof raw === 'number' ? raw : typeof raw === 'string' && raw.trim() !== '' ? Number(raw) : NaN;
  if (!Number.isFinite(n) || n < 0 || n > 100) return null;
  return Math.round(n * 10) / 10;
}

export type BoardEntry = { name: string; value: number; closest: boolean; mine: boolean };

export type BoardState =
  | { revealed: false; count: number; values: number[]; mine: number | null }
  | { revealed: true; count: number; answer: number; answerNote: string; entries: BoardEntry[]; mine: number | null };

type Row = { guess_id: string; user_id: string; value: number; display_name: string };

/**
 * ボードの様子（第6節）。答え合わせの前は数だけ、あとは名前と答えといちばん近い人の印。
 * ids はすべて guessDef で確かめたものを渡すこと。
 */
export async function boardStates(db: Db, cohortCode: string, userId: string, ids: string[]): Promise<Record<string, BoardState>> {
  const out: Record<string, BoardState> = {};
  if (ids.length === 0) return out;
  const placeholders = ids.map(() => '?').join(', ');
  const rows = await db
    .prepare(
      `SELECT g.guess_id, g.user_id, g.value, u.display_name
         FROM guesses g
         JOIN users u ON u.id = g.user_id
        WHERE g.cohort_code = ? AND g.guess_id IN (${placeholders})`,
    )
    .bind(cohortCode, ...ids)
    .all<Row>();
  const reveals = await db
    .prepare(`SELECT guess_id FROM guess_reveals WHERE cohort_code = ? AND guess_id IN (${placeholders})`)
    .bind(cohortCode, ...ids)
    .all<{ guess_id: string }>();
  const revealed = new Set(reveals.results.map((r) => r.guess_id));

  for (const id of ids) {
    const def = DEFS[id];
    const mineRows = rows.results.filter((r) => r.guess_id === id);
    const sorted = [...mineRows].sort((a, b) => a.value - b.value || a.display_name.localeCompare(b.display_name));
    const mine = mineRows.find((r) => r.user_id === userId)?.value ?? null;
    if (!revealed.has(id)) {
      out[id] = { revealed: false, count: sorted.length, values: sorted.map((r) => r.value), mine };
      continue;
    }
    // いちばん近い人（同じ近さなら全員）。値は小数第1位までなので、誤差は小さな幅で吸収する
    const best = Math.min(...sorted.map((r) => Math.abs(r.value - def.answer)));
    out[id] = {
      revealed: true,
      count: sorted.length,
      answer: def.answer,
      answerNote: def.answerNote ?? '',
      entries: sorted.map((r) => ({
        name: r.display_name,
        value: r.value,
        closest: Math.abs(Math.abs(r.value - def.answer) - best) < 1e-9,
        mine: r.user_id === userId,
      })),
      mine,
    };
  }
  return out;
}

/** 予想を出す（書き換える）。答え合わせのあとなら書かずに false。 */
export async function submitGuess(db: Db, cohortCode: string, guessId: string, userId: string, value: number, now: number): Promise<boolean> {
  const done = await db
    .prepare('SELECT 1 FROM guess_reveals WHERE cohort_code = ? AND guess_id = ?')
    .bind(cohortCode, guessId)
    .first();
  if (done !== null) return false;
  await db
    .prepare(
      `INSERT INTO guesses (cohort_code, guess_id, user_id, value, updated_at) VALUES (?, ?, ?, ?, ?)
       ON CONFLICT (cohort_code, guess_id, user_id) DO UPDATE SET value = excluded.value, updated_at = excluded.updated_at`,
    )
    .bind(cohortCode, guessId, userId, value, now)
    .run();
  return true;
}

/** 答え合わせをする（revealed = true）／やり直す（false。行を消すだけで、予想は残る）。 */
export async function setRevealed(db: Db, cohortCode: string, guessId: string, userId: string, revealed: boolean, now: number): Promise<void> {
  if (revealed) {
    await db
      .prepare('INSERT OR IGNORE INTO guess_reveals (cohort_code, guess_id, revealed_at, revealed_by) VALUES (?, ?, ?, ?)')
      .bind(cohortCode, guessId, now, userId)
      .run();
  } else {
    await db.prepare('DELETE FROM guess_reveals WHERE cohort_code = ? AND guess_id = ?').bind(cohortCode, guessId).run();
  }
}

/** 予想を消す（会のたびにボードを使い直すため）。所属の予想と答え合わせの行を消す。答え合わせの前でもあとでも。 */
export async function resetGuesses(db: Db, cohortCode: string, guessId: string): Promise<void> {
  await db.prepare('DELETE FROM guess_reveals WHERE cohort_code = ? AND guess_id = ?').bind(cohortCode, guessId).run();
  await db.prepare('DELETE FROM guesses WHERE cohort_code = ? AND guess_id = ?').bind(cohortCode, guessId).run();
}
