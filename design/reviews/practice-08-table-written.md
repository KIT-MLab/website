# 練習問題集 第8章（index / make / transpose）を書いた報告

模範解答: `src/content/practice/solutions/practice-08-<話題>-<n>.py`（15本）。入力から配列を作る形は第7章の練習問題と同じ（2次元は `table = []` と `table.append([int(input()), ...])` を行の数だけ書いてから `np.array(table)`）。日数が入力で変わる index-5 は `for i in range(days)` の中で `append`（第7章7節と同じ）。make の2問（make-2・make-4）は、第8章5節の形（`for` で `append(int(input()))` して `np.array(...).reshape(...)`）。使える範囲は、index が `python-08-transpose` の前まで、transpose が `python-08-range` の前まで、make が `python-08-scores` の前まで（`node scripts/taught.mjs` で確かめた）。

## 話題ごとの表

### index（教えた節: python-08-index）
| 問題の id | ★ | 何を確かめるか | 自分で考えること | 使う書き方（教えた節） |
|---|---|---|---|---|
| practice-08-index-1 | 1 | 階と区画の番号で1つの値を取る（駐輪場） | `[行, 列]` を書く（1） | `table.append`、`np.array(table)`、`parking[floor, area]`（07-shape、08-index） |
| practice-08-index-2 | 1 | 列を指定して全行を取る（コンビニの客数） | `[:, 列]` を書く（1） | `visitors[:, slot]`（08-index） |
| practice-08-index-3 | 2 | 行を指定して全列を取り、その合計も出す（点数表） | `[行, :]`、合計（2） | `scores[person, :]`、`.sum()`（08-index、07-agg） |
| practice-08-index-4 | 2 | 2つの列を取り出して引く（走るタイムの縮み） | 1回目の列、3回目の列、引き算（2） | `times[:, 0] - times[:, 2]`（08-index、07-array） |
| practice-08-index-5 | 3 | 日数が入力で決まる表を作り、指定した列の平均を超えた値だけ取る（雨量） | 表を作る、列を取る、平均より多い値を取り出す（3） | `for`＋`append`、`rain[:, point]`、`column[column > column.mean()]`（04-append、07-shape、08-index、07-select、07-agg） |

### transpose（教えた節: python-08-transpose, python-08-broadcast）
| 問題の id | ★ | 何を確かめるか | 自分で考えること | 使う書き方（教えた節） |
|---|---|---|---|---|
| practice-08-transpose-1 | 1 | 表の転置（2チーム×3試合の得点） | `.T`（1） | `goals.T`（08-transpose） |
| practice-08-transpose-2 | 1 | 表から、1つの並びを引く（腕立て・腹筋・スクワットの回数と目標） | 目標の並びを作って引く（1） | `np.array([int(input()), ...])`、`counts - target`（07-array、08-broadcast） |
| practice-08-transpose-3 | 2 | 転置した表を出し、その表の行ごとの最大を出す（跳んだ距離） | 転置、`axis=1` の最大（2） | `.T`、`.max(axis=1)`（08-transpose、07-stats） |
| practice-08-transpose-4 | 2 | 表の最初の行を、全部の行から引く（文房具の在庫の変化） | 最初の行を取る、引く（2） | `stock[0]`、`stock - stock[0]`（07-shape、08-broadcast） |
| practice-08-transpose-5 | 3 | 人ごとの平均を、転置して表から引き、もう一度転置して戻す（2回のテストの点数） | 人ごとの平均、転置して引く、戻す（3） | `.mean(axis=1)`、`(scores.T - average).T`（07-stats、08-transpose、08-broadcast） |

### make（教えた節: python-08-range, python-08-reshape）
| 問題の id | ★ | 何を確かめるか | 自分で考えること | 使う書き方（教えた節） |
|---|---|---|---|---|
| practice-08-make-1 | 1 | 個数を指定して等間隔に並べる（温度計の目盛り） | `np.linspace`（1） | `np.linspace(low, high, count)`（08-range） |
| practice-08-make-2 | 1 | 1列の値を3行2列にする（座席表） | `reshape(3, 2)`（1） | `for`＋`append(int(input()))`、`np.array(...).reshape(3, 2)`（04-append、08-reshape） |
| practice-08-make-3 | 2 | `np.arange` の終わりを含めず、10を掛ける（毎日増える貯金） | 終わりの値、10倍（2） | `np.arange(1, days + 1) * 10`（08-range、07-array） |
| practice-08-make-4 | 2 | 週の数×5個を `reshape` し、曜日ごとの合計を出す（図書館の来館者数） | 行の数を変数で決める、`axis=0` の合計（2） | `reshape(weeks, 5)`、`.sum(axis=0)`（08-reshape、07-stats） |
| practice-08-make-5 | 3 | 連番を作り、n行m列にし、転置する（座席番号の表） | 番号の個数と終わりの値、`reshape(n, m)`、`.T`（3） | `np.arange(1, rows * columns + 1).reshape(rows, columns)`、`.T`（08-range、08-reshape、08-transpose） |

テストケースは、各問題3〜5組（index-5 は5組、transpose-3・4 と make-2・4 は4組、make-3 は5組）。同じ入力は1つも入れていない。教材の章の題材（点数表）を使ったのは、index-3（index の話題）と transpose-5（transpose の話題）で、どちらも話題に1問。第7章の題材は、重ねていない。

## 別の書き方で解き直した結果

問題文と `<Input>` `<Output>` だけから、numpy を使わない純 Python（リストと `for`）で解き直した別解を書き（スクラッチパッドの `alt.py`）、全15問・全59組のテストケースで、模範解答の出力の数値（並び順を含む）と一致した（`bad: 0`）。空の結果（`[]`）、0、負の数、全部同じ値も含む。出力の形（配列の改行、空白の入れ方）は、`build:tests` が作った期待値と模範解答が同じ動きをすることで確かめた（`build:tests` は通る）。

- 小数の揺れを避けた点: make-1 は刻みが `0.25` `2.5` のように二進数で正確になる値だけ。transpose-5 は、列が2つなので平均が `.5` 刻みで正確になり、丸めが要らない（`np.round` を使わずに済む）。`-0.` は出ない。
- 浮動小数点の表示: make-1 の出力は `[ 0.   2.5  5.   7.5 10. ]` のように点が付く。`<Output>` に一言書いた。transpose-5 にも書いた。

## 検査の結果

- `npm run build:tests`: 練習問題集 29話題 / 135問の期待値を作りました。第8章の15問の模範解答はすべて tests[0] で動く。
- `npm run check:practice`: 29話題 / 135問を検査して問題なし。
- `npm run report:practice`: 08-table 15問。試せていない技能: なし。寄りすぎ: なし。

## 迷った所・本体に確かめること

- make-2・make-4 に `forbid={['append([']}` を付けた。付けないと、1人ずつ（1行ずつ）リストにして `np.array` に渡す第7章の書き方でも同じ出力になり、`reshape` を使わなくても通る。第8章5節の課題も同じ `forbid` を使っている。問題文にも「人ごと（週ごと）にリストを作って集めないでください」と書いた。
- make-1・make-3・make-5、transpose-2・4 に `forbid={['for ']}` を付けた（第8章の節の課題と同じ扱い）。for文で1つずつ作っても同じ出力になるため。
- transpose-5 は、列が2つなので、`(a - b) / 2` を使って `.T` なしでも組める抜け道がある。それでも、平均との差を表の形（人ごとに1行）で出すには、教えた範囲では `(scores.T - average).T` が最短になる。3列にすると平均が `.333…` の小数になって丸めの指示が1つ増える（★3の「自分で考えること3個」を超える）ので、2列にした。
- transpose-3 の2行目の出力（`.max(axis=1)`）は、転置しなくても `axis=0` で求められる。ただし最初に転置した表を表示させるので、`.T` を使わずには通らない。
- index-1・2・3・5 は、行や列の番号を入力で読んで `[floor, area]`、`[:, slot]` のように変数を `[ ]` に書く。第8章1節は定数（`scores[0, 1]`、`scores[:, 1]`）だけを見せている。節の課題（b1）が同じ形（変数の列番号）を使っていて、第7章4節で `scores[:k]` を見せているので、書いてよいと判断した。本体で不安なら、1節の最初のコードに変数の例を足す。
- make-3 で、日数の範囲を「0以上15以下」にした（`[]` の境界ケースを作るため。検査5が境界を求める）。15にしたのは、配列が1行に収まる（numpy は75文字で折り返す）ため。make-1 の目盛りの数、make-4 の週の数の上限も、同じ理由で出力が折り返さない範囲のテストだけを置いた。
- make の話題は `sections` に range と reshape を持つので、make-5（★3）で前の話題の `.T`（第8章2節）も使った。
- ヒントで指した節のコードの行は、節を開いて数えた。第8章1節の最初のコードの4行目（`scores[0, 1]`）・5行目（`scores[:, 1]`）・6行目（`scores[1, :]`）、第8章3節の6行目（`scores - subject_mean`）、第8章4節の3行目（`np.arange`）・6行目（`np.linspace`）、第8章5節の5行目（`flat.reshape(2, 3)`）、第8章2節の6行目（`print(scores.T)`）、第7章5節の9行目（`print(scores[0])`）。空行も行に数える（節の説明の数え方と同じ）。
- 第7章の約束（10/6・10/13 の回）は、第8章に当てはめていない。

## 構文の一覧・台帳・用語集に足すもの（足さずに書く）

無し。（index の問題が `scores[変数, 変数]`、`scores[:, 変数]` と変数をインデックスに書く点だけ、上の「迷った所」に書いた。）
