/**
 * 教材の公開と、気づいたことのメモ（20-platform.md 第20章）。
 *
 * ・章ごとの公開状態（`chapter_status`）。**行が無ければ準備中**（第20.1節）。管理者だけが
 *   切り替えられる。運営・管理者は準備中の章も中身まで見られる（第20.1節）
 * ・気づいたことのメモ（`review_notes`）。lesson_id と weekly_id が両方 NULL なら教材全体の話
 *   （第20.3節）。消す機能は無い。「解決」は resolved_at を立てるだけ
 *
 * 時刻はすべてミリ秒（第6章）。
 */
import type { Db } from './auth';

// ---------------------------------------------------------------- 章の公開

/** その章が公開済みか。行が無ければ準備中（第20.1節）。 */
export async function isChapterPublic(db: Db, chapter: string): Promise<boolean> {
  const row = await db
    .prepare('SELECT public FROM chapter_status WHERE chapter = ?')
    .bind(chapter)
    .first<{ public: number }>();
  return row !== null && row.public === 1;
}

/** 公開済みの章の集合。行の無い章（準備中）は入らない。 */
export async function publicChapters(db: Db): Promise<Set<string>> {
  const rows = await db.prepare('SELECT chapter FROM chapter_status WHERE public = 1').all<{ chapter: string }>();
  return new Set(rows.results.map((r) => r.chapter));
}

export type ChapterStatusRow = { public: boolean; updatedAt: number; updatedBy: string };

/** 全部の章の状態を1回で引く。記録の無い章はこの Map に入らない（＝準備中）。 */
export async function chapterStatuses(db: Db): Promise<Map<string, ChapterStatusRow>> {
  const rows = await db
    .prepare('SELECT chapter, public, updated_at, updated_by FROM chapter_status')
    .all<{ chapter: string; public: number; updated_at: number; updated_by: string }>();
  const out = new Map<string, ChapterStatusRow>();
  for (const row of rows.results) {
    out.set(row.chapter, { public: row.public === 1, updatedAt: row.updated_at, updatedBy: row.updated_by });
  }
  return out;
}

/** 公開・準備中を切り替える（管理者だけ。第20.1節）。呼ぶ側で requireAdmin を確かめること。 */
export async function setChapterPublic(
  db: Db,
  chapter: string,
  isPublic: boolean,
  updatedBy: string,
  now: number,
): Promise<void> {
  await db
    .prepare(
      `INSERT INTO chapter_status (chapter, public, updated_at, updated_by) VALUES (?, ?, ?, ?)
       ON CONFLICT (chapter) DO UPDATE SET public = excluded.public, updated_at = excluded.updated_at, updated_by = excluded.updated_by`,
    )
    .bind(chapter, isPublic ? 1 : 0, now, updatedBy)
    .run();
}

// ---------------------------------------------------------------- 気づいたことのメモ

export type ReviewNote = {
  id: number;
  lessonId: string | null;
  weeklyId: string | null;
  body: string;
  createdBy: string;
  createdByName: string;
  createdAt: number;
  resolvedAt: number | null;
};

type NoteRow = {
  id: number;
  lesson_id: string | null;
  weekly_id: string | null;
  body: string;
  created_by: string;
  created_by_name: string;
  created_at: number;
  resolved_at: number | null;
};

function fromRow(row: NoteRow): ReviewNote {
  return {
    id: row.id,
    lessonId: row.lesson_id,
    weeklyId: row.weekly_id,
    body: row.body,
    createdBy: row.created_by,
    createdByName: row.created_by_name,
    createdAt: row.created_at,
    resolvedAt: row.resolved_at,
  };
}

const SELECT_NOTE = `SELECT n.id, n.lesson_id, n.weekly_id, n.body, n.created_by, u.display_name AS created_by_name,
         n.created_at, n.resolved_at
    FROM review_notes n
    JOIN users u ON u.id = n.created_by`;

/** 1件書く（運営以上。第20.3節）。`place` が両方 null なら教材全体のメモになる。 */
export async function createNote(
  db: Db,
  place: { lessonId?: string | null; weeklyId?: string | null },
  body: string,
  createdBy: string,
  now: number,
): Promise<ReviewNote> {
  const lessonId = place.lessonId ?? null;
  const weeklyId = place.weeklyId ?? null;
  const result = await db
    .prepare('INSERT INTO review_notes (lesson_id, weekly_id, body, created_by, created_at) VALUES (?, ?, ?, ?, ?)')
    .bind(lessonId, weeklyId, body, createdBy, now)
    .run();
  const id = (result as { meta?: { last_row_id?: number } }).meta?.last_row_id;
  const row = await db.prepare(`${SELECT_NOTE} WHERE n.id = ?`).bind(id).first<NoteRow>();
  if (row) return fromRow(row);
  // ここに来ることは無いはずだが、型のために組み立てて返す
  return { id: id ?? 0, lessonId, weeklyId, body, createdBy, createdByName: '', createdAt: now, resolvedAt: null };
}

/** その節の未解決のメモ（古い順）。 */
export async function notesForLesson(db: Db, lessonId: string): Promise<ReviewNote[]> {
  const rows = await db
    .prepare(`${SELECT_NOTE} WHERE n.lesson_id = ? AND n.resolved_at IS NULL ORDER BY n.created_at`)
    .bind(lessonId)
    .all<NoteRow>();
  return rows.results.map(fromRow);
}

/** その回（今週の演習）の未解決のメモ（古い順）。 */
export async function notesForWeekly(db: Db, weeklyId: string): Promise<ReviewNote[]> {
  const rows = await db
    .prepare(`${SELECT_NOTE} WHERE n.weekly_id = ? AND n.resolved_at IS NULL ORDER BY n.created_at`)
    .bind(weeklyId)
    .all<NoteRow>();
  return rows.results.map(fromRow);
}

/** 教材全体のメモ（第20.3節「教材全体に言えることを書く欄」）。 */
export async function wholeCourseNotes(db: Db, includeResolved: boolean): Promise<ReviewNote[]> {
  const where = includeResolved ? 'n.lesson_id IS NULL AND n.weekly_id IS NULL' : 'n.lesson_id IS NULL AND n.weekly_id IS NULL AND n.resolved_at IS NULL';
  const rows = await db.prepare(`${SELECT_NOTE} WHERE ${where} ORDER BY n.created_at`).all<NoteRow>();
  return rows.results.map(fromRow);
}

/** 節・回に紐づく全部のメモ（教材全体の話は含まない。第20.2節の一覧のため）。 */
export async function allPlacedNotes(db: Db, includeResolved: boolean): Promise<ReviewNote[]> {
  const where = includeResolved
    ? '(n.lesson_id IS NOT NULL OR n.weekly_id IS NOT NULL)'
    : '(n.lesson_id IS NOT NULL OR n.weekly_id IS NOT NULL) AND n.resolved_at IS NULL';
  const rows = await db.prepare(`${SELECT_NOTE} WHERE ${where} ORDER BY n.created_at`).all<NoteRow>();
  return rows.results.map(fromRow);
}

/**
 * 解決にする（運営以上）。**行は消さない**（記録として残す。第20.3節）。
 * 返り値は実際に解決にしたか（既に解決済み・存在しないときは false）。
 */
export async function resolveNote(db: Db, id: number, resolvedBy: string, now: number): Promise<boolean> {
  const result = await db
    .prepare('UPDATE review_notes SET resolved_at = ?, resolved_by = ? WHERE id = ? AND resolved_at IS NULL')
    .bind(now, resolvedBy, id)
    .run();
  const changes = (result as { meta?: { changes?: number } }).meta?.changes ?? 0;
  return changes > 0;
}

/** 開いている（未解決の）メモの数を、範囲を絞らず全部の節ぶん一度に数える（章ごとの集計に使う）。 */
export async function openNoteCountByLesson(db: Db): Promise<Map<string, number>> {
  const rows = await db
    .prepare(
      `SELECT lesson_id, COUNT(*) AS n FROM review_notes
        WHERE lesson_id IS NOT NULL AND resolved_at IS NULL GROUP BY lesson_id`,
    )
    .all<{ lesson_id: string; n: number }>();
  return new Map(rows.results.map((r) => [r.lesson_id, r.n]));
}

