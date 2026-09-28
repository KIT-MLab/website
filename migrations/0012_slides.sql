-- スライド（design/spec/53-ml-intro.md 第10節）。
--
-- slide_positions: 運営がいま見せているスライドの番号。所属（cohorts.code）・スライドの名前
-- （節の frontmatter の slides。src/lesson/slides/decks.mjs）で1行。運営が「前へ」「次へ」を押すたびに上書きする。
-- メンバーの画面はこの行を読み直して同じ番号を出す。updated_at が3時間より古ければ「いま進めていない」とみなし、
-- メンバーは自由にめくる（判定はサーバ。src/server/slides.ts）。
-- スライドの名前が本当にあるか・番号が範囲の中かは、サーバが確かめてから書く。

CREATE TABLE slide_positions (
  cohort_code TEXT    NOT NULL REFERENCES cohorts(code),
  deck_id     TEXT    NOT NULL,
  slide_index INTEGER NOT NULL,
  updated_at  INTEGER NOT NULL,
  updated_by  TEXT    NOT NULL REFERENCES users(id),
  PRIMARY KEY (cohort_code, deck_id)
);
