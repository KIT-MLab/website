-- 土台の最初のテーブル（20-platform.md 第6章、第10.3節）。
--
-- 定義は仕様書の写し。仕様書を直したらこの migration は書き換えず、次の番号を足す。
-- 一度あてた migration を書き換えても、あてた側のデータベースは変わらないため。
--
-- 索引は張っていない。想定は学習者30人で、いちばん行数が増える submissions でも
-- 年に数万行。D1 がそのまま走査しても間に合う。遅くなってから足す。

-- 所属（招待コード1つにつき1行）
CREATE TABLE cohorts (
  code       TEXT PRIMARY KEY,          -- 'KIT-2026A'
  name       TEXT NOT NULL,             -- '2026年度 春'
  kind       TEXT NOT NULL,             -- 'internal' | 'external'
  created_at INTEGER NOT NULL
);

-- 利用者
CREATE TABLE users (
  id           TEXT PRIMARY KEY,        -- 'u_7QK3M9'
  cohort_code  TEXT NOT NULL REFERENCES cohorts(code),
  display_name TEXT NOT NULL,
  role         TEXT NOT NULL,           -- 'student' | 'teacher' | 'admin'
  pass_hash    TEXT NOT NULL,           -- 合言葉のハッシュ
  level        INTEGER NOT NULL,        -- 0 | 1 | 2
  created_at   INTEGER NOT NULL,
  last_seen_at INTEGER NOT NULL,
  fail_count   INTEGER NOT NULL DEFAULT 0, -- 続けて合言葉を外した回数（第5.3節）
  retry_after  INTEGER NOT NULL DEFAULT 0  -- この時刻まで試せない
);

-- 節ごとの進度
CREATE TABLE progress (
  user_id    TEXT NOT NULL REFERENCES users(id),
  lesson_id  TEXT NOT NULL,             -- frontmatter の id
  state      TEXT NOT NULL,             -- 'opened' | 'done'
  opened_at  INTEGER NOT NULL,
  done_at    INTEGER,
  seconds    INTEGER NOT NULL DEFAULT 0, -- 滞在の合計
  PRIMARY KEY (user_id, lesson_id)
);

-- 課題の提出（1回の採点につき1行）
CREATE TABLE submissions (
  id          INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id     TEXT NOT NULL REFERENCES users(id),
  exercise_id TEXT NOT NULL,
  code        TEXT NOT NULL,
  passed      INTEGER NOT NULL,          -- 0 | 1
  failed_test INTEGER,                   -- 落ちたテストの番号
  error_type  TEXT,                      -- 'NameError' 等
  created_at  INTEGER NOT NULL
);

-- 確認問題の回答
CREATE TABLE answers (
  user_id    TEXT NOT NULL REFERENCES users(id),
  question_id TEXT NOT NULL,
  choice     TEXT NOT NULL,
  correct    INTEGER NOT NULL,
  tries      INTEGER NOT NULL,
  created_at INTEGER NOT NULL,
  PRIMARY KEY (user_id, question_id)
);

-- 先生からのコメント
CREATE TABLE comments (
  id          INTEGER PRIMARY KEY AUTOINCREMENT,
  to_user_id  TEXT NOT NULL REFERENCES users(id),
  from_user_id TEXT NOT NULL REFERENCES users(id),
  lesson_id   TEXT,
  exercise_id TEXT,
  body        TEXT NOT NULL,
  read_at     INTEGER,
  created_at  INTEGER NOT NULL
);

-- ログインの控え
CREATE TABLE sessions (
  token      TEXT PRIMARY KEY,
  user_id    TEXT NOT NULL REFERENCES users(id),
  expires_at INTEGER NOT NULL
);

-- 先生に聞く（第10.3節）
CREATE TABLE questions (
  id          INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id     TEXT NOT NULL REFERENCES users(id),
  lesson_id   TEXT NOT NULL,
  exercise_id TEXT,
  code        TEXT,                    -- 直前の提出。無ければ NULL
  body        TEXT NOT NULL,
  answered_at INTEGER,
  created_at  INTEGER NOT NULL
);
