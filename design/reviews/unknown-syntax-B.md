# 未知の書き方の全数点検（担当B）

2026-10-20。代表の指摘（第7章1節の演習問題の `np.array([int(input()), int(input()), int(input())])`）を受けた全数点検。教材のファイルは書き換えていない。

- 範囲: 教材の節 第5〜8章・練習編2（47問）、練習問題集 第5〜8章（45問。第6章の read・bug は問題が0問）、今週の演習 10/13・10/20（12問）。**計104問**
- 「見せた書き方」の範囲: 教材の節は、その節までの本文・`<Run>`・「この節の書き方」の表（`node scripts/taught.mjs`）。練習問題集は、その話題の章の最後の節まで（20-platform.md 第22章の「まだ先」と同じ判じ方）。今週の演習は、frontmatter の `chapters` の最後の章まで
- 前提として確かめたこと: `[int(input()), int(input()), int(input())]`（リストの中で `int(input())` を並べる形）は、第4章2節の本文と `<Run>` で教えてある。代表が指摘した形のうち未知なのは、**それを `np.array( )` の中にそのまま書く組み合わせ**である。第7章1節の本文はいま「`a = int(input())` のように1つずつ変数に入れてから、`np.array([a, b, c])` のように変数を並べます」と書いている

---

## (a) 未知の形でしか解けない問題

**無し。**

未知の形を使った模範解答は、どれも、知っている書き方だけの別の道がある。for文を禁じている問題でも、1つずつ変数に読む道（第7章1節の本文）は塞がれていない。

---

## (b) 模範解答が未知の形だが、別の道がある問題

### B-1. `np.array([int(input()), …])` を模範解答に使っている（20問）

代表が第7章1節で直した形と同じものが、その後の節・練習問題集・今週の演習の模範解答に残っている。第7章1節の本文が「変数に入れてから並べる」と書いているので、**模範解答が本文と違うやり方をしている**状態でもある。

| 問題の id | ファイル（模範解答の行） | for文の禁止 | 別の道 |
|---|---|---|---|
| python-07-agg-b1 | src/content/lessons/07-array/solutions/python-07-agg-b1.py（3・4行目） | あり | 6つを変数に読み、`np.array([p1, p2, p3])` と `np.array([a1, a2, a3])`（第7章1節の本文。ヒント1も第7章1節の演習問題を指していて、そちらの模範解答はこの形） |
| python-07-select-b1 | src/content/lessons/07-array/solutions/python-07-select-b1.py（3行目） | あり | 5つを変数に読み、`np.array([a, b, c, d, e])` |
| python-07-slice-b1 | src/content/lessons/07-array/solutions/python-07-slice-b1.py（4行目） | あり | 6つを変数に読み、`np.array([…])` |
| practice-07-array-1 | src/content/practice/solutions/practice-07-array-1.py（3行目） | なし | 変数に読む。または for と append でリストに集め、`np.array(リスト)` |
| practice-07-array-2 | practice-07-array-2.py（3・4行目） | なし | 同上 |
| practice-07-array-3 | practice-07-array-3.py（3行目） | なし | 同上 |
| practice-07-array-4 | practice-07-array-4.py（3・4行目） | なし | 同上 |
| practice-07-select-1 | practice-07-select-1.py（3行目） | なし | 同上 |
| practice-07-select-2 | practice-07-select-2.py（3行目） | なし | 同上 |
| practice-07-select-3 | practice-07-select-3.py（3行目） | あり | 5つを変数に読む |
| practice-07-select-4 | practice-07-select-4.py（3行目） | なし | 変数に読む、または for と append |
| practice-07-select-5 | practice-07-select-5.py（4行目） | なし | 同上 |
| practice-07-stats-1 | practice-07-stats-1.py（3行目） | あり | 5つを変数に読む |
| practice-07-stats-2 | practice-07-stats-2.py（3行目） | あり | 5つを変数に読む |
| practice-07-stats-3 | practice-07-stats-3.py（3行目） | あり | 4つを変数に読む |
| practice-07-stats-4 | practice-07-stats-4.py（3行目） | なし | 変数に読む、または for と append |
| practice-08-transpose-2 | practice-08-transpose-2.py（7行目。目標の3つ） | なし | 同上 |
| weekly-2026-10-20-b1 | src/content/weekly/solutions/weekly-2026-10-20-b1.py（3行目） | あり | 5つを変数に読む |
| weekly-2026-10-20-b2 | weekly-2026-10-20-b2.py（3行目） | あり | 6つを変数に読み、`np.array([…]).reshape(3, 2)`。または `flat = []` のあと `flat.append(int(input()))` を6行（第4章4節。for を使わない） |
| weekly-2026-10-20-b6 | weekly-2026-10-20-b6.py（3行目） | あり | 同上 |

（practice-* のファイルはどれも src/content/practice/solutions/ にある）

- **何が未知か**: リストの中で関数を呼ぶ形（第4章2節）を、さらに `np.array( )` の中に書く組み合わせ。本文・`<Run>`・書き方の表のどこにも無い
- **なぜ別の道があるか**: 変数に1つずつ読んで並べる形は第7章1節の本文にある。for文を禁じていない問題なら、第4章4節の `append(int(input()))` で集めてから `np.array(リスト)`（第7章5節・第8章6節の本文）でもよい
- **直し方の案**（どちらかを代表が選ぶ）:
  - 案1: 20問の模範解答を、第7章1節の本文の形（変数に読んでから並べる）に書き換える。値が4つ以上で for文を禁じていない問題は、for と append で集めてから `np.array(リスト)` にしてもよい。いまの本文と食い違わない
  - 案2: 第7章1節の本文に、「`np.array([int(input()), int(input()), int(input())])` のように、読み取りながら並べても同じ配列になります（第4章2節のリストと同じ形）」と1文を足し、見せた書き方にする。模範解答はそのまま。値が5〜6個のときに、変数を5〜6個並べるより短く書ける

---

## ヒントの誤り（2件）

### H-1. weekly-2026-10-13-b3（src/content/weekly/2026-10-13.mdx）— 指しているコードの番号が違う

- ヒント1: 「入力の行をリストに集める書き方は、第4章4節（リストの操作（append・sort・sumなど））の**2つ目のコード**にあります」
- 第4章4節の `<Run>` は、1つ目が `append`・`remove`、**2つ目が `numbers[1] = 10`（位置を指定して入れ替える）**、3つ目が `for i in range(3):` と `numbers.append(int(input()))`。入力をリストに集めるのは**3つ目**
- 直し方の案: 「3つ目のコード」に直す

### H-2. practice-07-array-1（src/content/practice/07-array/array.mdx）— 未知の組み合わせへ誘導している

- ヒント1: 「3つの値の読み取り方は**第4章2節**に、配列にする書き方は第7章1節にあります」
- 第4章2節にある読み取り方は `[int(input()), int(input()), int(input())]`（リストの形）。これと第7章1節の `np.array([…])` を合わせると、代表が指摘した `np.array([int(input()), …])` になる。模範解答もその形（B-1）
- 第7章1節の本文は、読み取り方（変数に入れてから並べる）もいまは自分で書いているので、第4章2節を指す必要が無い
- 直し方の案: 「3つの値を変数に読み取って配列にする書き方は、第7章1節にあります」の1つにまとめる（B-1 で案2を選ぶなら、いまのままでもよい）

ほかのヒントは、指している節・行に、言っている書き方が実際にあることを確かめた（「最初のコードの○行目」のように行を指すものは、行を数えて確かめた）。

---

## 書き換える問題（kind="modify"）の抜け道

採点（src/lesson/grade.ts）は、`forbid` の文字列と、出力（stdout）が模範解答と同じかしか見ない。範囲の modify 22問のうち `forbid` を持つものは無い。**22問すべてに抜け道がある。**

### 出力をそのまま print すれば通る（21問）

テストが1つだけ（入力なし、または入力が1通り）なので、期待される出力を `print` で書けば通る。

- 第5章: python-05-def-m1、python-05-return-m1、python-05-keyword-m1、python-05-scope-m1
- 第6章: python-06-read-m1、python-06-syntax-m1、python-06-type-m1、python-06-logic-m1、python-06-logic-m2、python-06-scores-m1
- 第7章: python-07-array-m1、python-07-agg-m1、python-07-select-m1、python-07-slice-m1、python-07-shape-m1、python-07-stats-m1
- 第8章: python-08-index-m1、python-08-transpose-m1、python-08-broadcast-m1、python-08-range-m1、python-08-reshape-m1

### 書き換えてよいと言っていない行を書き換えても通る（上の21問のうち13問。重なりあり）

問題文が「○行目を書き換えて」「○行目の値を書き換えて」「関数の外には書き足さない」と範囲を決めているのに、ほかの行を変えても通るもの。

| 問題の id | 決めている範囲 | 通ってしまう例 |
|---|---|---|
| python-05-return-m1 | 4行目に渡す2つの値 | 5行目を `print(result - 15)` にする |
| python-05-keyword-m1 | 4行目の呼び出し方（rate は書かない） | 1行目の `shipping=0` を `500` にして `price_with_tax(1000)`。または `rate` に `0.1` を書く |
| python-05-scope-m1 | 関数の外に計算も数も書き足さない | 外に `print(80)` を2行書く |
| python-07-array-m1 | 3行目 | 2行目のデータを `[55, 105, 155]` にする |
| python-07-agg-m1 | 3行目 | 2行目のデータを書き換える（代表の指摘） |
| python-07-select-m1 | 3行目 | 2行目のデータを書き換える |
| python-07-slice-m1 | 3行目の範囲 | 2行目のデータを書き換える |
| python-07-shape-m1 | 3行目 | 2行目のデータを書き換える |
| python-07-stats-m1 | 3行目 | 2行目のデータを `[[80, 50], [80, 50]]` にする |
| python-08-index-m1 | 3行目 | 2行目のデータを書き換える |
| python-08-broadcast-m1 | 3行目の `average` の値 | 2行目の1人目を `[75, 65, 70]` にする |
| python-08-range-m1 | 2行目 | 3行目を `print(x * 2)` にする |
| python-08-reshape-m1 | 2行目の `flat` の値 | 4行目を `print(table[1] * 10)` にする |

第6章の「直してください」の6問と python-05-def-m1（1行足す）は、書き換える行を決めていないので、この表には入れていない（出力をそのまま print する抜け道はある）。

### 関数を通らずに通る（1問）

- weekly-2026-10-13-m1: テストは入力の違う3通りなので、決まった数を print しても通らない。ただし、直すべき関数（2行目の綴り）に触れず、7行目を `print(m + s + e)` にすると通る

---

## 未知ではないと判じたもの（境目。代表が違う判断なら知らせてほしい）

水増しを避けるため件数に入れなかったが、判断が分かれうるもの。

- python-07-shape-b1 ほか（`table.append([int(input()), int(input()), int(input())])`）: 第7章5節の時点では本文に無いが、同じ節の**ヒント2が形をそのまま説明**している。第7章7節からは本文の `<Run>` にある
- python-08-reshape-b1（`np.array(flat).reshape(count, 3)` のように、関数の結果に続けてメソッドを付ける）: 第8章5節の時点では本文に無いが、第7章1節の書き方の表に `np.array([1.5, 2.7]).astype(int)` があり、第7章3節の本文に `(pred == y).sum()` がある。第8章6節からは本文にある。ヒント1のとおり2行に分ける道もある
- weekly-2026-10-20-b3（2次元の表を数と比べ、`.sum(axis=0)` で列ごとに数える）: 部品はどれも第7章3節・6節にあり、**ヒント1が組み合わせ方を説明**している
- practice-07-select-4（`60 - low`。数から配列を引く）: 本文の例は「配列 − 数」だけだが、**ヒント2が説明**している
- python-08-index-b1（`np.round(column.mean(), 1)`。1つの数に `np.round`）: 第7章7節の本文は `np.round(配列, 1)` だけ。`round()` で書く道がある
- f文字列の `{}` の中のインデックス（`{averages[i]}`。python-07-scores-b1・python-08-scores-b1）: 書き方の表に「{}の中に変数や式を書ける」とあり、`{}` の中で関数を呼ぶ形（`round(average, 1)`）は第2章6節から本文にある
