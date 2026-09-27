-- みんなの予想ボード（design/spec/53-ml-intro.md 第6節・第7節）。
--
-- guesses: 1人1つの予想。所属（cohorts.code）・ボードの id（教材の <Guess id="…">）・人で1行。
-- 答え合わせまでは何度でも書き換えられる（同じ行を上書きする）。値は％（0〜100、小数第1位まで）。
--
-- guess_reveals: 答え合わせをしたボード。所属ごと。**行が有れば答え合わせ済み、無ければまだ。**
-- 運営が押し間違えたときの「やり直す」は、この行を消すだけ（予想の行はそのまま残る）。
-- ボードの id が本当に教材にあるかは、サーバが生成物（lesson-data.json の guesses）で確かめる。

CREATE TABLE guesses (
  cohort_code TEXT    NOT NULL REFERENCES cohorts(code),
  guess_id    TEXT    NOT NULL,
  user_id     TEXT    NOT NULL REFERENCES users(id),
  value       REAL    NOT NULL,
  updated_at  INTEGER NOT NULL,
  PRIMARY KEY (cohort_code, guess_id, user_id)
);

CREATE TABLE guess_reveals (
  cohort_code TEXT    NOT NULL REFERENCES cohorts(code),
  guess_id    TEXT    NOT NULL,
  revealed_at INTEGER NOT NULL,
  revealed_by TEXT    NOT NULL REFERENCES users(id),
  PRIMARY KEY (cohort_code, guess_id)
);
