-- 招待コードを cohorts から切り離す（20-platform.md 第5.2.1節）。
--
-- これまで招待コード自体が cohorts.code（所属の主キー）だった。cohorts.code は
-- users.cohort_code / meetings.cohort_code から参照されているので、単純には変えられない。
--
-- 困るのはここから: 0002_cohorts.sql はこの公開リポジトリに入っていて、内部の招待コード
-- MLAB-2026 がそのまま世に出ている。招待コードを別のテーブルに出し、cohorts はこれまでどおり
-- 「所属（内部/外部の区別・表示名）」だけを持つIDとして残す。
--
-- MLAB-OPEN（外部向けの常設コード）は開いたまま入れる。MLAB-2026 は既に公開リポジトリに
-- 書かれてしまっているので、ここでは閉じて（open = 0）入れる。
-- **実際にメンバーへ配る内部の招待コードは、このファイル・このリポジトリには一切書かない。**
-- 本番と開発のデータベースへ、運営が `wrangler d1 execute` で直接1行ずつ足す
-- （手順は design/spec/90-cloudflare-setup.md）。

CREATE TABLE invite_codes (
  code        TEXT PRIMARY KEY,
  cohort_code TEXT NOT NULL REFERENCES cohorts(code),
  open        INTEGER NOT NULL DEFAULT 1,  -- 0 なら登録には使えない（閉じたコード）
  created_at  INTEGER NOT NULL
);

INSERT INTO invite_codes (code, cohort_code, open, created_at) VALUES
  ('MLAB-OPEN', 'MLAB-OPEN', 1, 1789344000000),
  ('MLAB-2026', 'MLAB-2026', 0, 1789344000000);
