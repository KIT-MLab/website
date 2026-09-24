-- 週1の集まりと、活動した分の記録（20-platform.md 第13.4節・第13.6節）。
--
-- 定義は仕様書の写し。仕様書を直したらこの migration は書き換えず、次の番号を足す。

-- 集まり（1回につき1行）
CREATE TABLE meetings (
  id          INTEGER PRIMARY KEY AUTOINCREMENT,
  cohort_code TEXT    NOT NULL REFERENCES cohorts(code),
  no          INTEGER NOT NULL,              -- 第何回
  title       TEXT    NOT NULL,
  starts_at   INTEGER NOT NULL,              -- ミリ秒（UTC）
  place       TEXT    NOT NULL DEFAULT '',
  summary     TEXT    NOT NULL DEFAULT '',
  colab_url   TEXT    NOT NULL DEFAULT '',
  bring       TEXT    NOT NULL DEFAULT '',   -- 持ち物
  read_after  TEXT    NOT NULL DEFAULT '',   -- 節の id を空白で区切る（例: python-07-shape python-07-stats）
  team_note   TEXT    NOT NULL DEFAULT '',   -- チームでやったこと
  team_score  TEXT    NOT NULL DEFAULT '',   -- チームの数字（例: 正解率 0.787）。数とは限らないので文字列
  created_at  INTEGER NOT NULL,
  updated_at  INTEGER NOT NULL
);
CREATE INDEX meetings_by_cohort ON meetings (cohort_code, starts_at);

-- 活動した分（1人・1分につき1行）。取り組んだ時間 = 行数
CREATE TABLE activity_minutes (
  user_id   TEXT    NOT NULL REFERENCES users(id),
  minute    INTEGER NOT NULL,          -- その分の始まり（ミリ秒、60000 の倍数）
  lesson_id TEXT    NOT NULL DEFAULT '', -- 節の id。メンバーの画面なら 'home'
  PRIMARY KEY (user_id, minute)
);
