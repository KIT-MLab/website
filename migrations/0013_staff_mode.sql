-- 学習者と運営の切り分け（20-platform.md 第26章。2026-09-28 決定）。
--
-- 運営・管理者は同じアカウントのまま「学習者として」「運営として」を切り替える。
-- 運営として解いた記録は学習者の記録と混ぜない。進度・提出・活動した分の3つに
-- mode（'learner' | 'staff'）を足し、どちらの側の記録かを持たせる。学生はいつも 'learner'。
--
-- **これまでの記録のうち、ロールが admin の人の行は運営の側に移す**（代表の指示「これまでに
-- やったことは全部運営として」）。staff の人の行は学習者の側のまま。行は1つも消さない。
--
-- progress は主キーが (user_id, lesson_id) で、mode を主キーに入れるには作り直すしかない
-- （SQLite は主キーを ALTER できない）。activity_minutes も同じ。submissions は列を足し、
-- 同じ提出を2行にしない索引（0003）に mode を入れ直す。
--
-- 予想ボード・規則の正解率ランキング・スライドの行（0010〜0012）は触らない。

-- 1. 節ごとの進度
CREATE TABLE progress_new (
  user_id    TEXT NOT NULL REFERENCES users(id),
  mode       TEXT NOT NULL DEFAULT 'learner', -- 'learner' | 'staff'
  lesson_id  TEXT NOT NULL,
  state      TEXT NOT NULL,
  opened_at  INTEGER NOT NULL,
  done_at    INTEGER,
  seconds    INTEGER NOT NULL DEFAULT 0,
  PRIMARY KEY (user_id, mode, lesson_id)
);

INSERT INTO progress_new (user_id, mode, lesson_id, state, opened_at, done_at, seconds)
  SELECT user_id,
         CASE WHEN user_id IN (SELECT id FROM users WHERE role = 'admin') THEN 'staff' ELSE 'learner' END,
         lesson_id, state, opened_at, done_at, seconds
    FROM progress;

DROP TABLE progress;
ALTER TABLE progress_new RENAME TO progress;

-- 2. 課題の提出
ALTER TABLE submissions ADD COLUMN mode TEXT NOT NULL DEFAULT 'learner'; -- 'learner' | 'staff'

UPDATE submissions SET mode = 'staff'
 WHERE user_id IN (SELECT id FROM users WHERE role = 'admin');

DROP INDEX submissions_once;
CREATE UNIQUE INDEX submissions_once
  ON submissions (user_id, mode, exercise_id, created_at);

-- 3. 活動した分
CREATE TABLE activity_minutes_new (
  user_id   TEXT    NOT NULL REFERENCES users(id),
  mode      TEXT    NOT NULL DEFAULT 'learner', -- 'learner' | 'staff'
  minute    INTEGER NOT NULL,
  lesson_id TEXT    NOT NULL DEFAULT '',
  PRIMARY KEY (user_id, mode, minute)
);

INSERT INTO activity_minutes_new (user_id, mode, minute, lesson_id)
  SELECT user_id,
         CASE WHEN user_id IN (SELECT id FROM users WHERE role = 'admin') THEN 'staff' ELSE 'learner' END,
         minute, lesson_id
    FROM activity_minutes;

DROP TABLE activity_minutes;
ALTER TABLE activity_minutes_new RENAME TO activity_minutes;
