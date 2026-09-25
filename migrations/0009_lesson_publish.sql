-- 教材の公開と、運営が確かめるためのメモ（20-platform.md 第20章）。
--
-- chapter_status: 章ごとの公開状態。**行が無ければ準備中**（第20.1節「最初は全部の章を
-- 準備中にする」「記録が無い章は準備中」）。行があるときだけ public の値を見る。
-- このため、章を書き足しても行を1つも入れる必要がない。
--
-- review_notes: 気づいたことのメモ（第20.3節）。lesson_id と weekly_id が両方 NULL なら
-- 教材全体に言える話（教材の公開の画面のいちばん上）。どちらか一方に値があれば、その節・
-- その回のメモ。解決は resolved_at を立てるだけで、行は消さない（記録として残す）。

CREATE TABLE chapter_status (
  chapter    TEXT PRIMARY KEY,
  public     INTEGER NOT NULL DEFAULT 0,
  updated_at INTEGER NOT NULL,
  updated_by TEXT NOT NULL REFERENCES users(id)
);

CREATE TABLE review_notes (
  id          INTEGER PRIMARY KEY AUTOINCREMENT,
  lesson_id   TEXT,
  weekly_id   TEXT,
  body        TEXT NOT NULL,
  created_by  TEXT NOT NULL REFERENCES users(id),
  created_at  INTEGER NOT NULL,
  resolved_at INTEGER,
  resolved_by TEXT REFERENCES users(id)
);

CREATE INDEX review_notes_lesson ON review_notes (lesson_id);
CREATE INDEX review_notes_weekly ON review_notes (weekly_id);
