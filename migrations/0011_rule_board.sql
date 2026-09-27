-- 規則の正解率ランキング（design/spec/53-ml-intro.md 第9節）。
--
-- rule_submissions: 1人1行。所属（cohorts.code）・ボードの id（教材の <RuleBoard id="…">）・人で1行。
-- 公開までは何度でも出し直せる（同じ行を上書きする。表に出るのはいちばん新しい規則）。
-- 規則のコードは受け取らない。ブラウザで規則を当てた予測（1 か 0）を、訓練データ・テストデータの
-- 順に '0' と '1' の文字列で持つ。正解率はサーバが答え（src/server/rule-board.ts）と比べて出す。
--
-- rule_reveals: テストデータの正解率を公開したボード。所属ごと。**行が有れば公開済み、無ければまだ。**
-- 「やり直す」は、この行を消すだけ（出した規則の行はそのまま残る）。guess_reveals と同じ形。

CREATE TABLE rule_submissions (
  cohort_code TEXT    NOT NULL REFERENCES cohorts(code),
  board_id    TEXT    NOT NULL,
  user_id     TEXT    NOT NULL REFERENCES users(id),
  description TEXT    NOT NULL,
  train_pred  TEXT    NOT NULL,
  test_pred   TEXT    NOT NULL,
  updated_at  INTEGER NOT NULL,
  PRIMARY KEY (cohort_code, board_id, user_id)
);

CREATE TABLE rule_reveals (
  cohort_code TEXT    NOT NULL REFERENCES cohorts(code),
  board_id    TEXT    NOT NULL,
  revealed_at INTEGER NOT NULL,
  revealed_by TEXT    NOT NULL REFERENCES users(id),
  PRIMARY KEY (cohort_code, board_id)
);
