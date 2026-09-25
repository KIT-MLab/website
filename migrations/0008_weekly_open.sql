-- 「今週の演習」の公開の記録（20-platform.md 第19.3節）。
--
-- 所属（cohorts.code）ごとに、どの回（weekly の frontmatter id）をいつ誰が公開したか。
-- 公開は取り消さない（第19.3節）ので、消す・更新する口は作らない。行が有れば公開、
-- 無ければ未公開というだけの、いちばん単純な形にしてある。

CREATE TABLE weekly_open (
  cohort_code TEXT    NOT NULL REFERENCES cohorts(code),
  weekly_id   TEXT    NOT NULL,
  opened_at   INTEGER NOT NULL,
  opened_by   TEXT    NOT NULL REFERENCES users(id),
  PRIMARY KEY (cohort_code, weekly_id)
);
