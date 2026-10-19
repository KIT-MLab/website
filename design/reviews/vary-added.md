# 書き換える問題に vary を付けた（2026-10-20）

採否 `unknown-syntax-decision.md` の「2段目: 書き換える問題の抜け道」を直した。starter・問題文・模範解答・テストは変えていない（`vary` の1行を足しただけ。`forbid` は足していない）。

## 付けた数

| 場所 | modify の数 | vary あり | 付けなかった |
|---|---|---|---|
| 教材の節（`src/content/lessons`） | 99 | 90（うち python-07-agg-m1 は前から） | 9 |
| 練習問題集（`src/content/practice`） | 0 | 0 | 0 |
| 今週の演習（`src/content/weekly`） | 1 | 1（weekly-2026-10-13-m1） | 0 |

新しく付けたのは 90 問（節 89・今週の演習 1）。`src/generated/lesson-data.json` に `vary` と `varyExpects` が入っているのは 91 問（agg-m1 を含む）。練習問題集には kind="modify" の問題が無い。

## 付け方（3種類）

1. **データの行を差し替える**（値の並び・数が答えを決める問題）: 答えの値も位置も変わる値に替える。件数は変えない（python-04-index-m2 だけは「個数が変わっても動く」が問題の中身なので、個数を変えた）。例: python-07-select-m1、python-04-index-m1、python-12-model-m1、pandas の問題（`df = pd.read_csv("train.csv")` を `….head(100)` に。ファイルそのものは替えられないので、読んだ直後の行を絞る）。
2. **書き換えてはいけない行を、答えを変える形に差し替える**（学習者が直す行そのものが答えの問題。データの行が答えの値を決めていない問題）: 提出した人が正しく直していれば、差し替えても模範解答と同じ出力になる形にした。
   - 「値を決める」問題（if・elif・andor・scores など）は、条件の行を反転する（`if score >= 60:` → `if score < 60:`）。正しい値ならどれを選んでも、反転後は同じ枝に入る。条件の行を書き換えた・全部消した・答えを直接 print した提出は「○行目は書き換えないでください」で落ちる
   - 値が1つに決まらない問題（python-09-vector-m1 の `b`、python-12-loss-m1 の `b`、python-15-accuracy-m1 の `pred` など）は、データの行を替えると別の正解まで落とすので、出力の式に `+ 1` を足す形に差し替えて（`print(a @ w)` → `print(a @ w + 1)`）、データの行は「書き換えさせない」だけにした（`to` を `from` と同じにした）
   - 「数と記号は変えません」の python-02-precedence-m1・m2 は `10 - 4` と `/ 2`（`2 * 3` と `** 2`）をそれぞれ `from` にし、`10 - 6`・`/ 4` に差し替える。数や記号を変えた提出はここで落ちる
3. **関数の中身・呼び出しの形を確かめる**: python-05-def-m1（関数の `print` の文字を替え、関数を呼ばずに直接書いた行を落とす）、python-05-keyword-m1（`rate` の既定値を替え、`rate` を書いた呼び出しを落とす）、python-05-return-m1 ほか。

`forbid` は足していない（下の「forbid」の節）。

## 前から指摘のあった抜け道が塞がったか

- python-04-dict-m1: 1行目の辞書を `from` にした（書き換えると落ちる）。別に `print(menu["コーヒー"])` を `print(menu["紅茶"])` に差し替える（元の出力が変わらないままでは `build:tests` が止まるため）
- python-04-append-m1: 1行目を `[3, 7, 5]` に差し替える。`numbers.remove(3)`・`pop(0)`・`del numbers[0]` は通り、1行目の書き換えや `numbers = [2, 9]` の追加は落ちる
- python-04-index-m2: データのリストを7個にして動かす。`numbers[3 + 1]`・`print(4)` は落ち、`numbers[len(numbers) - 1]` は通る
- python-02-precedence-m1・m2、python-05-scope-m1（外に数や計算を書く道だけは残る。下）

## 付けなかった問題（9問）と理由

どれも、書き換える行そのものが答えで、書き換えてはいけない行（データの行・条件の行）が無い、または入力が2通りあって答えの直接 print がそもそも通らない。

| 問題 | 理由 |
|---|---|
| python-01-print-m1 | `print("青")` を足すだけ。足した行が答え。残す行は `print("赤")` だけで、差し替えても答えが変わらない |
| python-01-print-m2 | 2行を `print("赤", "青")` の1行に書き換える。全部書き換える |
| python-01-input-basic-m1 | テストの入力が2通り（佐藤・鈴木）で、名前を直接 print する提出は通らない。足す行そのものが答え |
| python-01-input-m1 | テストの入力が2通り。`print(x * 2)` の数を書き換えるだけで、残す行が無い |
| python-01-input-m2 | テストの入力が2通り |
| python-02-int-float-m1 | `print(10 / 4)` の数そのものを書き換える。データの行が無い |
| python-02-int-float-m2 | 同上（`print(float(10))` `print(6.8)` を書き換える） |
| python-02-operators-m1 | 同上（3行の数を書き換える） |
| python-02-math-m1 | `print(math.sqrt(9))` の `9` を書き換える。データの行が無い |

## 入力の無い組む問題（D の参考4問）

python-15q-read-b1・python-15q-missing-b1・python-15q-encode-b1・python-15r-split-b1 は **付けられなかった**。データは `train.csv`（ファイル）で、これらの問題には `starter` が無い。`vary` の `from` は `starter` の中の文字列で、`build-tests.mjs` は starter が無い課題の `vary` を止める（「starter と模範解答のある課題にだけ付けられます」）。starter を足すのは「starter を変えない」に反するので足していない。付けるなら、(a) 仕組みを広げて starter 無しでも `from` を模範解答にだけ見る形にするか、(b) 問題に starter（`import pandas as pd` と `df = pd.read_csv("train.csv")` の2行）を足して、その2行目を `from` にするか。決めてもらえれば付ける。ほかに「入力が無く、テスト1組」の組む問題は practice-01-print-1〜5（出力する文字そのものが答えの問題）だけだった。

## forbid

- python-02-precedence-m1・m2: `forbid` では確かめられない（「この数と記号だけを使う」は書いてよいものの指定で、`forbid` は書いてはいけないものの指定）。かわりに `vary`（数と記号を `from` にする）で確かめた。`forbid` は足していない
- python-04-index-m2 の「`len()` を使って」: `forbid` では確かめられない（使うことの指定）。`vary`（リストの個数を変えて動かす）で確かめられるようになったので、`forbid` は足していない。既にある `forbid={['numbers[4]', '[-']}` はそのまま

## 残った抜け道（vary では塞げないもの）

- python-05-scope-m1: 関数の外に計算（`total = total - 20`）を書き足す道。外に書いた計算も同じ値になるので、差し替えても区別がつかない
- python-09-dot-m1: 「3つの重みは、どれも0より大きい」は確かめていない（`w = np.array([1.0, 0.0, 0.0])` でも `80.0` が出る）
- python-04-while-m1・python-04-for-m1: `from` の行（`while line != "終わり":`、`print(i)`）を書き換える別解（`while True:` と `break`、`print(i + 1)` と `range(10)`）は、正しい答えでも「書き換えないでください」で落ちる。問題が「いまのコードを書き換える」ものなので採った
- 「値を決める」問題で、条件の行を反転して確かめている問題は、書き換えてよい行（値の行）が1行だけの前提。starter を変えると `from` の行が変わるので、starter を直すときは `vary` も見る

## 検査の結果

- `npm run build:tests`: 108節 / 228問、今週の演習 4回 / 24問、練習問題集 29話題 / 135問の期待値を作りました（`from` が starter と模範解答に1回ずつあること、差し替えると期待値が変わることを全部確かめて通った。最初に付けた値を直したのは1か所だけ: python-01-variable-m3 の `from` を ` = 120` から `120` に。スペースを詰めて書く提出を落とさないため）
- `npm run check:lessons`: 108節を検査して問題なし
- `npm run check:practice`: 29話題 / 135問を検査して問題なし
- `npm run check:weekly`: 4回を検査して問題なし
- `npm run build`: Complete
- ファイルの改行は元のまま（差分は挿入90行・削除0行）

## 確かめていないこと

- ブラウザで実際に提出して「書き換えないでください」「データを別の値にして…」が出るかは見ていない。`build-tests` が模範解答を差し替えて動かし、期待値が変わることまでは確かめた
- 正しい別解を落とさないかは、問題ごとに手で考えた（条件の反転、出力の式に `+ 1` を足す形、データの行の差し替えは答えが1つに決まる問題だけ）。数値計算が絡む python-13-linear-m1・python-14-label-m1・python-15-split-m1 は、模範解答の値で期待値を作ってあり、学習率やしきい値が違う別解は落ちる（答えが1つに決まる問題なので採った）
