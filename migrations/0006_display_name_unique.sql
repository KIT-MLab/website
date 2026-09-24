-- 表示名を重複させない（20-platform.md 第14.4節）。ログインを表示名とパスワードで行うため。
--
-- 大文字小文字は区別しない（COLLATE NOCASE は ASCII の範囲だけを揃える）。全角と半角の揺れは
-- しまう前に NFKC で正規化して揃えてある（src/server/auth.ts の normalizeDisplayName）。
-- 同じ表示名が既に2つ以上あると、この索引は作れずに止まる。あてる前に確かめること。

CREATE UNIQUE INDEX users_display_name ON users (display_name COLLATE NOCASE);
