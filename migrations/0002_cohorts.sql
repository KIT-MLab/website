-- 最初の招待コード2つ（20-platform.md 第5.2節、2026-09-14 決定）。
--
-- 中身のデータなので schema とは別の migration にしてある。
-- 開発用のデータベースを作るときも同じコードが入る。

INSERT INTO cohorts (code, name, kind, created_at) VALUES
  ('MLAB-2026', '2026年度 勉強会', 'internal', 1789344000000),
  ('MLAB-OPEN', '外部公開',        'external', 1789344000000);
