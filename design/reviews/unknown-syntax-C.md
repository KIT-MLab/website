# 未知の書き方の全数点検 C（タイタニック演習・第9〜12章）

2026-10-20。代表の指摘（第7章1節の `np.array([int(input()), …])`）を受けた全数点検の、C の担当分。
教材のファイルは書き換えていない。

## 範囲と数

| 章 | 節 | 課題 | うち modify | うち build | うち choose / type |
|---|---|---|---|---|---|
| 08q-mlintro（タイタニック1〜4） | 4 | 9 | 3 | 4 | 2 / 0 |
| 09-matrix | 6 | 12 | 5 | 6 | 0 / 1 |
| 10-slope | 5 | 11 | 4 | 5 | 2 / 0 |
| 11-probability | 6 | 11 | 5 | 6 | 0 / 0 |
| 12-predict | 5 | 8 | 2 | 4 | 1 / 1 |
| 計 | 26 | 51 | 19 | 25 | 5 / 2 |

コードを書く課題44問の模範解答（solutions/*.py）を1行ずつ読み、各行の書き方と組み合わせを、次の3つと照らした。

- `node scripts/taught.mjs python-12-study` の一覧（第9〜12章の `since` を含む）。08q は `python-08p-choose` の一覧に 08q の前の節を足して読んだ
- 各節の本文と `<Run>` のコード（08q の各節、第9〜12章の各節。第1〜8章は必要な所を開いて確かめた）
- syntax-list.ts の表（08q を `since` にした行は無い）

一般の並びでは第9章の前は 08p で、08q（メンバーだけ）は通らない前提で数えた。

`forbid` があるのは第9章の build 全部（`for ` など）、10-partial-b1・10-study-b1（`for `）、
11-distribution-m1（`0.5` など）、11-scores-b1（1人分ずつリストで読む形など）。

## (a) 未知の形でしか解けない問題

### 1. python-11-distribution-b1 と python-11-exp-b1（軽い）

- ファイル: src/content/lessons/11-probability/02-distribution.mdx、03-exp.mdx
- 模範解答の該当行（distribution-b1 の3〜5行目。exp-b1 も同じ形）:

  ```python
  def distribution(arr):
      total = np.sum(arr)
      return arr / total
  ```

- 何が未知か: **自作の関数に numpy の配列を渡し、配列を `return` で返す**組み合わせ。
  本文・`<Run>`・表で最初に出るのは第12章1節（表の `since: python-12-model` の
  「直線のモデルで全員分をまとめて予測する」）で、この2問より後。
  第5章6節が見せているのはリストを渡して数を返す関数、第10章4〜5節の `loss` は外の配列を読んで数を返す関数で、
  配列を受け取る形も配列を返す形も無い
- なぜその形でしか解けないか: 問題文が「分布に直して返す関数 `distribution` を定義」と形を指定している。
  リストで受け取っても、返すのは配列になる
- 軽いとする理由: 08p の演習問題（python-08p-combine-b1 の問題文「`steps` は配列です」、python-08p-choose-b3 の `to_percent` が配列を返す模範解答）で、
  学習者はすでに同じ形を書いている。ただし、どちらも演習問題で、本文での説明はどこにも無い（08p は担当外）
- ヒント: どちらのヒントも入力の読み方（append → `np.array`）か分布の作り方だけで、関数に配列を渡す点には触れていない
- 直し方の案: 第11章2節の本文に「関数には配列も渡せ、`return` で配列も返せる」の1文を置く。
  または `<Run>` の 4〜5行目を `def distribution(arr): …` の形にして見せる。
  表の第12章1節の行を `also: ['python-11-distribution']` にして、この節の表にも出す手もある

## (b) 模範解答が未知の形だが、別の道がある問題

### 1. python-09-vector-b1（src/content/lessons/09-matrix/01-vector.mdx）

- 模範解答の3〜4行目:

  ```python
  a = np.array([int(input()), int(input()), int(input())])
  b = np.array([int(input()), int(input()), int(input())])
  ```

- 何が未知か: 代表が第7章1節で指摘したのと**同じ形**。`[int(input()), …]` のリスト（第4章2節の本文）を、
  そのまま `np.array( )` の中に書く組み合わせ。本文・`<Run>`・表のどこにも無い（grep で確かめた。
  出てくるのは模範解答だけ: 07-agg-b1・07-select-b1・07-slice-b1・09-vector-b1・09-dot-b1）
- `forbid={['for ']}` で append の道は塞がれているが、別の道は開いている:
  - 第7章1節の本文（10/20 の直し）の形: `a1 = int(input())` … と1つずつ変数に読み、`a = np.array([a1, a2, a3])`
  - 第4章2節の形でリストに読み、`x = [int(input()), int(input()), int(input())]` → `a = np.array(x)`（第7章5節の `np.array(table)` と同じ渡し方）
- ヒント: 「2人分の点数を、それぞれ3つの成分を持つベクトルにします」だけで、未知の形へは誘導していない。ただ、どう読むかも言っていない
- 直し方の案: 模範解答を第7章1節と同じ「変数に読んでから `np.array([a1, a2, a3])`」に替える。
  ヒント1に「第7章1節と同じく、1つずつ変数に読んでから並べます」と足す

### 2. python-09-dot-b1（src/content/lessons/09-matrix/02-dot.mdx）

- 模範解答の3行目: `a = np.array([int(input()), int(input()), int(input())])`
- 何が未知か・別の道: 上の vector-b1 と同じ。`forbid={['for ', '*']}` でも、変数に読む道と、リストに読んで `np.array(x)` に渡す道は開いている（どちらも `*` を使わない）
- ヒント1「読み取った点数と重みを、それぞれベクトルにします」も、読み方は言っていない
- 直し方の案: vector-b1 と同じ

## 境目として確かめて、未知とはしなかったもの

出どころを書いておく。

- `f"…{round(rule, 3)}"`（08q の各問、11-frequency-b1）: 第2章2節・6節の本文 `{round(average, 1)}`
- for文の中で1回に2〜3行 `input()` を読む（08q-rule-b1、11-frequency-b1）: 第4章6節の本文（`for i in range(2):` の中で `[int(input()), …]`）
- `flat.append(int(input()))` / `append(float(input()))`（09-scores-b1、11 の b1 の多く、12-model-b1）: 第4章4節の本文3行目
- `table.append([int(input()), int(input()), int(input())])` を for文なしで2回（09-matvec-b1・09-matmul-b1。09-shape-b1 は float）:
  第7章7節の `<Run>` 22行目と第4章2節の本文。09-matvec-b1 のヒント1がそのまま言っている
- 関数の中で別の自作関数を呼ぶ・リストを引数で渡す（08q-learn-b1）: 第5章6節の本文
- 関数の外の変数を中で読む（08q-learn-m1、10-partial/study、12-loss/search/study）: 第5章5節の本文と表、第10章4節の本文
- `pred = np.array(pred)` と `(pred[:n] == survived[:n]).mean()`（08q-overfit-b1）: タイタニック4 の `<Run>` 8行目・27行目、第7章4節の表（スライスに変数）
- `round(rate(hours_a, …), 2)`（10-rate-b1）: 第5章6節の本文 `round(total_score(scores) / len(scores), 1)`
- `scores.std(axis=0)`（11-spread-b1、11-scores-b1）: 第11章5節の本文が「`x.std()` とも書け、`axis=0` を付けると列ごとに出せます」と書いている
- `(scores - scores.mean(axis=0)) / scores.std(axis=0)`（11-scores-b1）: 第8章3節の表 `t2 / t2.max(axis=0)`。ヒント2も言っている
- `hours = hours[:n]` のあとで `loss` が外の `hours` を読む（12-study-b1）: 第1章2節（入れ直し）・第7章4節（スライスに変数）・第5章5節。
  別の名前に入れて `loss` を書き換える道もある
- `np.linspace(a_min, a_max, a_num)`（12-search-b1）: 第8章4節の表の数を変数に替えただけ

## ヒントの誤り

### 1. python-09-shape-m1（src/content/lessons/09-matrix/05-shape.mdx）問題文とヒント2が食い違う（重い）

- 問題文: 「`(2, 3)` と表示されるように、4行目の `weights` を書き換えてください。」
- ヒント2: 「weightsに、3科目分の重みの組を4つ並べてください。」
- 正解の出力（src/generated/lesson-data.json）: `(2, 4)`。模範解答の `weights` は4行3列
- 何が起きるか: 問題文どおり3行にすると `(2, 3)` が出て、**不正解になる**。外すと画面に `(2, 4)` が出る。
  design/reviews/09-matrix-fixed2.md の L8 で目標を `(2, 4)` に替えたとき、模範解答とヒント2だけ直し、問題文の `(2, 3)` が残った
- 直し方の案: 問題文を「`(2, 4)` と表示されるように」にする

### 2. python-11-exp-m1（src/content/lessons/11-probability/03-exp.mdx）ヒントが、書き換えない行の書き換えを勧める（軽い）

- ヒント: 「3行目の `np.exp(1)` の `1` を変えて、結果が `1` になる数を探してください。」
- 何が違うか: 問題文が書き換えるのは5行目の `scores` で、出力の1行目は3行目の `2.718` のまま要る。
  3行目を変えて試したまま戻し忘れると、1行目が違って通らない
- 直し方の案: 「`np.exp(…)` が `1` になる数を探してください（`print(np.exp(0))` などで試せます）」のように、3行目を指さない

ほかのヒント（44問ぶん）は、指している節・行番号を開いて確かめた。行番号のずれと、指した先に書き方が無いものは見つからなかった。

## 4. 書き換える問題（modify）の抜け道

modify の19問は、どれも `tests={[{ kind: 'stdout' }]}`（入力なしで1回だけ実行）。採点は出力の文字列だけを比べ、
外すと正しい出力を画面に出す（src/lesson/ui/ExerciseBox.tsx 796行目）。

### 出力をそのまま print すると通る: 19問中18問

- python-08q-accuracy-m1、python-08q-rule-m1、python-08q-learn-m1（問題文に出力の値が無いので、1回外してから）
- python-09-vector-m1、python-09-dot-m1、python-09-matvec-m1、python-09-matmul-m1、python-09-shape-m1
- python-10-rate-m1、python-10-derivative-m1、python-10-direction-m1、python-10-partial-m1
- python-11-frequency-m1、python-11-exp-m1、python-11-log-m1、python-11-spread-m1
- python-12-model-m1、python-12-loss-m1

python-11-distribution-m1 だけは `forbid={['0.5', '0.3', '0.2']}` で、`print("[0.5 0.3 0.2]")` は落ちる（下の表のとおり、ほかの行を変える道は開いている）。

### 書き換えてよいと言っていない行を変えても通る: 19問中19問

手元の `py`（numpy 2.5.1）で動かし、lesson-data.json の正しい出力と1文字まで一致することを確かめた。

問題文が行を指している16問:

| 問題 | 問題文が指す行 | 代わりに変えた行 | 確かめた変え方 |
|---|---|---|---|
| python-09-vector-m1 | 4行目 `b` | 3行目 `a`（データ） | `[85, 70, 90]` |
| python-09-dot-m1 | 4行目 `w` | 3行目 `a`（データ） | `[80, 80, 80]` |
| python-09-matvec-m1 | 3行目 `scores` | 5行目 `result` | `np.array([scores @ w, scores @ w]).reshape(4)` |
| python-09-matmul-m1 | 4行目 `W` | 5行目 `result` | `result = scores` |
| python-09-shape-m1 | 4行目 `weights` | 5行目の print | `(scores @ weights.T @ np.ones((1, 4))).shape` |
| python-10-rate-m1 | 4行目 `score_b` | 2行目 `score_a`（データ） | `56` |
| python-10-derivative-m1 | 4行目 `x0` | 2行目（関数の式） | `return 1.5 * x ** 2` |
| python-10-direction-m1 | 4行目 `x0` | 2行目（関数の式） | `return x ** 2 + 5` |
| python-10-partial-m1 | 14行目 | 16行目の print | `print(round((loss(a, b + h) - loss(a, b)) / h, 1))` |
| python-11-frequency-m1 | 1行目 `records` | 8行目の print | `(count + 3) / len(records)` |
| python-11-distribution-m1 | 3行目 `scores` | 5行目 `dist` | `np.array([5, 3, 2]) / total` |
| python-11-exp-m1 | 5行目 `scores` | 6行目 `positive` | `np.exp(scores * 0)` |
| python-11-log-m1 | 3行目 `p` | 7行目・12行目 | `product * (x * 1e100)`、`np.log(x * 1e100)` |
| python-11-spread-m1 | 4行目 `class_b` | 7・9・10行目 | `c = (class_b - 70) / 3 + 70` を作り、`class_b` の代わりに使う |
| python-12-model-m1 | 8行目の `b` | 3行目 `hours`（データ） | `[3.0, 4.0, 6.0, 7.0, 9.0]` |
| python-12-loss-m1 | 10行目 `b` | 11行目 `pred` | `a * hours + b + 2` |

問題文が行を指していない3問（「規則に書き換えて」）。規則の行を変えず、データの行だけを変えて通る:

| 問題 | 確かめた変え方 |
|---|---|
| python-08q-accuracy-m1 | `female_survived = 109`、`male_died = 81` にし、表示の「女性」を「男性」に（7行目の式はそのまま） |
| python-08q-rule-m1 | `survived` のインデックス7を `1` から `0` に（7行目の `if` はそのまま） |
| python-08q-learn-m1 | `ages` の女性の年齢を全部 `0` に（8行目の `if ages[i] < border:` はそのまま） |

参考（4 の対象外）: python-09-dot-m1 の「3つの重みは、どれも0より大きい」は確かめていない。`w = np.array([1.0, 0.0, 0.0])` でも `80.0` が出て通る。
