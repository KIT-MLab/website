/**
 * スライド（design/spec/53-ml-intro.md 第10節）。運営が「前へ」「次へ」を押すと、同じ所属のメンバーの画面の
 * スライドが1〜2秒で切り替わる。
 *
 * スライドの中身は src/lesson/slides/decks.mjs。どの節に付いているかは節の frontmatter の `slides` にあり、
 * build:tests が lesson-data.json の `slideDecks` に書き出す。**この表に無い名前は断る。**
 * 見てよい人は予想ボードと同じ（メンバーだけ。章が準備中なら運営・管理者だけ。src/server/guess.ts の canUseBoard）。
 *
 * いまの番号は所属ごと（migrations/0012_slides.sql）。**最後に動かしてから3時間たったら「いま進めていない」**
 * とみなし（live: false）、メンバーは運営に合わせず自由にめくる。
 */
import type { Db } from './auth';
import { deckById } from '../lesson/slides/decks.mjs';
import generated from '../generated/lesson-data.json';

export type SlideDeckDef = { lessonId: string; chapter: string; count: number };

const PLACES: Record<string, { lessonId: string; chapter: string }> =
  (generated as { slideDecks?: Record<string, { lessonId: string; chapter: string }> }).slideDecks ?? {};

/** 運営が最後に動かしてから、この時間を過ぎたら「いま進めていない」 */
export const LIVE_MS = 3 * 60 * 60 * 1000;

/** 節に付いているスライドなら、その節と枚数。無ければ null。 */
export function slideDeckDef(id: string): SlideDeckDef | null {
  if (!Object.prototype.hasOwnProperty.call(PLACES, id)) return null;
  const deck = deckById(id);
  if (!deck) return null;
  return { ...PLACES[id], count: deck.slides.length };
}

export type DeckPosition = { index: number; live: boolean };

/** 所属のいまの番号。行が無ければ0枚目で、進めていない。スライドが縮んでいたら最後の1枚にそろえる。 */
export async function deckPosition(db: Db, cohortCode: string, deckId: string, count: number, now: number): Promise<DeckPosition> {
  const row = await db
    .prepare('SELECT slide_index, updated_at FROM slide_positions WHERE cohort_code = ? AND deck_id = ?')
    .bind(cohortCode, deckId)
    .first<{ slide_index: number; updated_at: number }>();
  if (!row) return { index: 0, live: false };
  return { index: Math.min(Math.max(0, row.slide_index), count - 1), live: now - row.updated_at < LIVE_MS };
}

/** 番号を読む。0 から count - 1 までの整数でなければ null。 */
export function readSlideIndex(raw: unknown, count: number): number | null {
  if (typeof raw !== 'number' || !Number.isInteger(raw) || raw < 0 || raw >= count) return null;
  return raw;
}

/** 番号を書く（運営・管理者だけが呼ぶ）。 */
export async function setDeckPosition(db: Db, cohortCode: string, deckId: string, index: number, userId: string, now: number): Promise<void> {
  await db
    .prepare(
      `INSERT INTO slide_positions (cohort_code, deck_id, slide_index, updated_at, updated_by) VALUES (?, ?, ?, ?, ?)
       ON CONFLICT (cohort_code, deck_id) DO UPDATE SET slide_index = excluded.slide_index, updated_at = excluded.updated_at, updated_by = excluded.updated_by`,
    )
    .bind(cohortCode, deckId, index, now, userId)
    .run();
}
