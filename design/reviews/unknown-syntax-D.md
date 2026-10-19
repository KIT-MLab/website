# 未知の書き方の全数点検 D（第13〜15章・pandas・scikit-learn）

2026-10-20。代表の指摘（第7章1節の `np.array([int(input()), …])`）を受けた全数点検の、D の担当分。
教材のファイルは書き換えていない。

## 範囲と数

| 章 | 節 | 課題 | うち modify | うち build | うち choose |
|---|---|---|---|---|---|
| 13-regression | 6 | 12 | 4 | 6 | 2 |
| 14-classify | 5 | 9 | 4 | 5 | 0 |
| 15-evaluate | 5 | 9 | 4 | 5 | 0 |
| 15q-pandas | 4 | 8 | 4 | 4 | 0 |
| 15r-sklearn | 4 | 7 | 2 | 4 | 1 |
| 計 | 24 | 45 | 18 | 24 | 3 |

コードを書く課題42問の模範解答（solutions/*.py）を1行ずつ読み、各行の書き方と組み合わせを
`node scripts/taught.mjs python-15-study` の一覧、各節の本文と `<Run>`、syntax-list.ts の表
（15q・15r は `since: python-15q-*` / `python-15r-*`）、メンバーが通るタイタニック1〜4（08q）の本文と照らした。
5章とも `forbid` は1つも無い（道を塞いでいる問題は無い）。

## (a) 未知の形でしか解けない問題

無し。

## (b) 模範解答が未知の形だが、別の道がある問題

無し。

境目として確かめて、未知とはしなかったもの（出どころを書いておく）:

- `[float(input()), float(input()), float(input())]`（python-13-rate-b1 の5行目）: 第4章2節の本文の
  `[int(input()), int(input()), int(input())]` と同じ形。int を float に替えただけ
- `x.append(float(input()))`（14-label-b1・14-sigmoid-b1・14-entropy-b1・15-split-b1 ほか）: 第4章4節の本文3行目
  `numbers.append(int(input()))`
- `f"確率{round(p, 2)} 合格"`（python-14-study-b1）: f文字列の {} の中で関数を呼ぶ形は第2章6節の本文 `f"平均{round(average, 1)}点"` から出ている
- `range(1, steps + 1)` / `range(1, n + 1)`（13-linear-b1・15-overfit-b1）: 13-linear-b1 のヒント2が形をそのまま見せている。
  15-overfit-b1 はその3節あと。`range(n)` で回して `i + 1` を使う道もある
- `round((model.predict(X_train) == y_train).mean(), 3)`（python-15r-split-b1）: scikit-learn 1 の本文の2つ目のコードが
  `train = (model.predict(X_train) == y_train).mean()` と `round(train, 3)` を2行で見せている。変数に入れてから丸める道がある
- `round(df["Fare"].mean(), 2)`（python-15q-read-b1）: 列を取り出してすぐ集計する形は、本文では
  `survived = df["Survived"]` → `survived.mean()` と2行。1行の形は pandas 1 の表（`print(df["Survived"].sum())`）にある。
  2問目なので表の形を使ってよい。`fare = df["Fare"]` と分ける道もある
- `df[(df["Pclass"] == pclass) & (df["Sex"] == sex)]`（python-15q-select-b1）: 本文の2つ目のコードの、数と文字列を引数の変数に替えた形。
  関数の中から外の `df` を読むことは問題文が言っており、第5章5節の表（外で作った名前は中から読める）にある
- `ages = np.array(ages)` と `ages[:n]`（python-15r-fit-b1）: タイタニック4 の2問目（`gap`）と同じ形。
  `reshape(n, 1)`・`reshape(len(ages) - n, 1)` はヒント3がそのまま見せている。第8章5節の表の `reshape(-1, 1)` でも書ける

## ヒントの誤り

### 1. python-15r-fit-b1（src/content/lessons/15r-sklearn/01-fit.mdx）ヒント1

- ヒント: 「受け取ったリストは `np.array()` で配列にしてから、スライスと `reshape` を使います（タイタニック4 の演習問題2 と同じです）。」
- 何が違うか: タイタニック4 の2問目 `python-08q-overfit-b1`（`gap`）は、`np.array()` とスライスだけで、`reshape` を使わない
  （08q-mlintro の本文・模範解答のどこにも `reshape` は無い）。「同じ」が `reshape` まで指しているように読める
- 重さ: 軽い。`reshape` の形はヒント3と、この節の本文6・8行目に出ている
- 直し方の案: 括弧を「`np.array()` で配列にしてスライスするところは、タイタニック4 の演習問題2 と同じです」に絞り、
  `reshape` は「この節の最初のコードの6行目と同じです」と別に指す

ほかのヒント（42問ぶん）は、指している節・行番号を開いて確かめた。行番号のずれと、指した先に書き方が無いものは見つからなかった。

## 4. 書き換える問題（modify）の抜け道

### 出力をそのまま print すると通る: 18問中18問

modify の18問は、どれも `tests={[{ kind: 'stdout' }]}`（入力なしで1回だけ実行）で、`forbid` も無い。
採点は出力の文字列だけを比べ、外れると「正しい出力」を画面に出す（src/lesson/ui/ExerciseBox.tsx 790行目）。
そのため、1回外したあとに、出た正しい出力を `print()` で書けば、どれも通る。問題文に出力の値が書いてある問題は、1回外す必要も無い。

- python-13-descent-m1、python-13-rate-m1、python-13-linear-m1、python-13-multi-m1
- python-14-label-m1、python-14-sigmoid-m1、python-14-entropy-m1、python-14-logistic-m1
- python-15-split-m1、python-15-overfit-m1、python-15-accuracy-m1、python-15-confusion-m1
- python-15q-read-m1、python-15q-select-m1、python-15q-missing-m1、python-15q-encode-m1
- python-15r-fit-m1、python-15r-features-m1

### 書き換えてよいと言っていない行（データの行など）を変えても通る: 6問

Pyodide で実際に動かして、正しい出力と一致することを確かめたもの（15r-fit-m1 は、同じ人を同じ順で学習させるだけなので、動かさずに判断した）。

| 問題 | 問題文が指す行 | 代わりに変えた行 | 確かめた変え方 |
|---|---|---|---|
| python-13-descent-m1 | 6行目 `steps` | 4行目 `x = 0`（始めの値） | `x = -15.75` で `2.808` / `1.0369` |
| python-13-linear-m1 | 11行目 `lr` | 4行目 `scores` のデータ | 末尾に `/ 2` で `[7.23 1.28]` |
| python-13-multi-m1 | 10行目の2つ目の重み | 4行目 `sleep` のデータ | `sleep` を `* 2`、重みを `1.0` で `[45. 52. 62. 69. 82.]` |
| python-14-label-m1 | 5行目（合格の条件） | 4行目 `scores` のデータ | 末尾に `- 10`、5行目は `>= 60` のままで `-0.27 1.11` |
| python-15-accuracy-m1 | 4行目 `pred` | 3行目 `passed` のデータ | `[1, 1, 1, 1, 1, 1, 1, 1, 1, 0]` で `0.1` / `0.9` |
| python-15r-fit-m1 | 6〜9行目の範囲（`survived` も同じ範囲に） | 4〜5行目 `ages`・`survived` のデータ | 2つの並びを、先頭10人を末尾へ回した順に書き直し、6〜9行目は元のまま（4人の予測の2行は足す） |

問題文が行を指していない modify（15q の4問、15r-features-m1）は「コードを書き換えて」なので、行の制限の抜け道は数えていない。
問題文の行の指定そのものがデータの行である問題（14-sigmoid-m1 の `z`、14-entropy-m1 の `p`）も数えていない。

参考（4 の対象外）: 入力が無く、テストが1回だけの build も、同じ理由で出力をそのまま print すると通る。
python-15q-read-b1、python-15q-missing-b1、python-15q-encode-b1、python-15r-split-b1 の4問。
