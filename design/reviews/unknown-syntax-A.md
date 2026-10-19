# 未知の書き方の全数点検 A（第0〜4章・練習編1・練習問題集 第1〜4章・今週の演習 9/29・10/6）

2026-10-20。代表の指摘（第7章1節の `np.array([int(input()), …])`、第7章2節の「3行目を書き換える」問題の抜け道）を受けた点検。教材のファイルは触っていない。

## 範囲と数え方

- 見た問題: 教材の節 85問（type 9・choose 5・modify 41・build 30）、練習問題集 90問（第1〜4章の18話題）、今週の演習 12問（9/29 6問・10/6 6問）。計187問
- 「見たことのある書き方」:
  - 教材の節の問題: その節までの本文、`<Run>`、「この節の書き方」の表（`src/lesson/syntax-list.ts` の `since`）
  - 練習問題集: その話題の章まで（spec 20-platform.md 第25.6節「書き方の台帳はその話題の章まで。章の中の順番までは見ない」に合わせた）
  - 今週の演習: 回の `chapters` の最後の章まで
- 模範解答（`solutions/*.py`）は合格した人にしか見えないので、「見せた所」には数えていない
- 第0章の問題は打つ・選ぶ問題だけで Python を書かないので、対象外

## (a) 未知の形でしか解けない問題

### 1. weekly-2026-10-06-b8（`src/content/weekly/2026-10-06.mdx`。模範解答は `src/content/weekly/solutions/weekly-2026-10-06-b8.py`）

- 模範解答の該当行:
  ```python
  while line != "終わり":
      numbers.append(int(line))
      line = input()
  ```
- 何が未知か: **while で `終わり` まで読みながら append する組み合わせ**。部品はどちらも見せている（while で読む形は第4章5節の本文、for の中の `numbers.append(int(input()))` は第4章4節の本文）。ただし、while で読みながらリストに足す形は、第4章・練習編1の本文、`<Run>`、表のどこにも無い
- なぜこの形でしか解けないか: 人数が決まっておらず、真ん中（`len // 2` 番目）を取るには、全部読み終わってから位置で取り出すしかない。入力は読み直せないので、リストに全部残す必要がある。リストを作るには append を使うか、`numbers = numbers + [int(line)]`（第4章4節の表の `[1, 2] + [3]` を使う形）しかなく、どちらも未知の組み合わせになる。forbid で塞いでいるのではなく、問題の中身から決まる
- 重さ: 代表の指摘の例（式の中の関数呼び出し。どこにも説明が無い）より軽い。文を並べ替えるだけの組み合わせで、ヒント1が段取りを文で言い切っている（「`終わり`が来るまでwhile文で読み取り、リストに追加していきます」）。ただ、そのヒントが「読んでください」と挙げる第4章5節に append は無い（ヒントの誤りの3に挙げた）
- 直し方の案: 第4章5節の本文か表に、while で読みながら append する短い例を1つ置く（表に置けば「表に載った書き方」になる）。または第4章4節の最後の例（for と append）の直後に「while でも同じように足せる」と一文で書く

## (b) 模範解答が未知の形だが、知っている書き方だけで解ける問題

### 1. python-02-int-float-b1（`src/content/lessons/02-numbers/01-int-float.mdx`。模範解答は `solutions/python-02-int-float-b1.py`）

- 模範解答の該当行: `print(f"小数:{q} 整数:{int(q)}")`
- 何が未知か: **f文字列の `{}` の中で関数を呼ぶ形**。第1章5節で見せたのは「`{}` の中に変数か計算の式」（`{100 - score}`）まで。`{round(average, 1)}` のように `{}` の中で関数を呼ぶ形は、次の第2章2節の本文で初めて出る
- 別の道: `n = int(q)` と変数に入れてから `{n}` と書けば、知っている書き方だけで解ける。forbid は無く、問題文も形を決めていない。ヒントもこの形へは誘導していない
- 直し方の案: 模範解答を `whole = int(q)` → `{whole}` の形に書き直す（いちばん小さい）。または第1章5節の本文の「`{}` の中には…計算の式も書けます」に、関数を呼ぶ例を添える

### 2. python-04p-combine-b4（`src/content/lessons/04p-practice1/01-combine.mdx`。模範解答は `solutions/python-04p-combine-b4.py`）

- 模範解答の該当行:
  ```python
  while line != "終わり":
      height = int(line)
      if height >= 100 and height <= 250:
          accepted.append(height)
  ```
- 何が未知か: (a)-1 と同じく、**while で読みながら append する組み合わせ**
- 別の道: 合計と個数を0から始める変数にして、受け付けたときに足すだけで解ける（while の中で数を足す形は第4章5節の本文そのまま）。リストは要らない。forbid は無い
- ヒント: ヒント1が「受け付けた値だけをリストに集めておくと、あとでまとめて平均を計算できます」と、未知の組み合わせのほうへ誘導している
- 直し方の案: ヒント1を合計と個数の変数の方向に書き換え、模範解答もその形にする。または (a)-1 の直し（第4章5節に while と append の例を置く）で、こちらも既知になる

### 3. practice-03-elif-5（`src/content/practice/03-branch/elif.mdx`。模範解答は `src/content/practice/solutions/practice-03-elif-5.py`）

- 模範解答の該当行:
  ```python
  if total >= 10000:
      fee = 0
  elif total >= 5000:
      fee = 300
  else:
      fee = 600
  ```
- 何が未知か: **if・elif・else の中で変数に値を入れる形**。第1〜3章の本文、`<Run>`、表で、if の中身はどれも `print` だけで、ブロックの中の代入は1つも無い（初めて出るのは第4章2節の `largest = value`）。練習問題集は章の範囲で見るので、第3章の問題の時点では未知
- 別の道: 枝ごとに `print(0)` と `print(total)`、`print(300)` と `print(total + 300)` … と2行ずつ表示すれば、知っている書き方だけで解ける。forbid は無い
- ヒント: ヒント2の「送料を変数に入れておくと、支払う金額を求めるときに使えます」が、未知の形へ誘導している
- 直し方の案: 第3章1節か3節の本文で、if の中身に代入も書けることを一文と短い例で見せる（第3章のどこかで見せれば、下の 4 も同時に直る）。または模範解答とヒントを、枝ごとに表示する形に直す

### 4. practice-03-if-5（`src/content/practice/03-branch/if.mdx`。模範解答は `src/content/practice/solutions/practice-03-if-5.py`）

- 模範解答の該当行:
  ```python
  else:
      hours = minutes // 60
      rest = minutes % 60
  ```
- 何が未知か: 3 と同じく、**else の中で変数に値を入れる形**
- 別の道: `hours` と `rest` を if の前に計算しておき、if と else の中では `print` だけにすれば、知っている書き方だけで解ける。forbid は無い。ヒントは中立
- 直し方の案: 3 と同じ（第3章の本文で見せる）。または模範解答で `hours`・`rest` を if の前に移す

## ヒントの誤り

1. **python-04p-combine-b4 のヒント1**: 本文で見せていない「while で読みながら append」へ誘導している。(b)-2 に書いたとおり
2. **practice-03-elif-5 のヒント2**: 第3章の時点で見せていない「if の枝の中の代入」へ誘導している。(b)-3 に書いたとおり
3. **weekly-2026-10-06-b8 のヒント1**: 「while文で読み取り、リストに追加していきます。第4章5節を読んでください」とあるが、第4章5節に append は無い（append を繰り返しの中で使う例は、第4章4節の for の例だけ）

ほかのヒントで「第N章M節の◯つ目のコード」「表にある〜」と指しているものは、すべて開いて確かめた。指した所に、言っている書き方があった（例: practice-04-while-1 の「第4章5節の表の `n = n - 1`」、python-04-dict の本文の「第4章4節の表の `in`」、practice-04-list-1 の「第4章2節の2つ目のコードの2行目」）。

## 未知とは数えなかった境目（参考）

水増ししないために、迷ったが「見せた形の応用」と判断したものを挙げておく。

- python-01-fstring-b2 `print("【" + input() + "】")`: `+` でつなぐ中の関数呼び出しは、同じ節の `<Run>` の `"合計" + str(5) + "円"` で見せている。`input()` を引数に書く形も第1章3節の本文にある
- python-04-while-b1・weekly-2026-10-06-b7 の `total + int(line)`・`total + int(input())`: 計算の式の中の関数呼び出しは、第1章4節の表の `print(int("5") + 1)` で見せている
- python-04-index-b1 と practice-04-index-3 の `numbers[len(numbers) - 1 - i]`: 第4章3節の本文の `numbers[len(numbers) - 2]` と `numbers[i]` を合わせた形
- 第4章以降の「for の中で if」「while の中で if」: それぞれ第4章2節の `<Run>` と、第4章5節の表（`break` の例）で見せている
- python-04-list-b1 以降の `[int(input()), …]`: 第4章2節の本文で説明している（第7章1節で代表が指摘した形は、第1〜4章では説明つきで出ている）

## 4. 書き換える問題（kind="modify"）の抜け道

採点（`src/lesson/grade.ts` の `gradeExercise`）は、forbid の文字列と、出力が同じかどうかしか見ていない。どの行を書き換えたか、どの書き方を使ったかは見ない。

### 4-1. 答えをそのまま print すると通る: 38問 / modify 41問

入力欄を使わず、判定が1組だけの問題（37問）と、入力欄を使うが判定が1組だけの問題（1問）。どれも、出力を `print("…")` で直接書けば通る。

- 第1章: python-01-print-m1, python-01-print-m2, python-01-variable-m1, python-01-variable-m2, python-01-variable-m3, python-01-fstring-m1, python-01-fstring-m2, python-01-scores-m1, python-01-scores-m2
- 第2章: python-02-int-float-m1, python-02-int-float-m2, python-02-round-m1, python-02-round-m2, python-02-operators-m1, python-02-operators-m2, python-02-precedence-m1, python-02-precedence-m2, python-02-math-m1, python-02-scores-m1, python-02-scores-m2
- 第3章: python-03-if-m1, python-03-if-m2, python-03-else-m1, python-03-else-m2, python-03-elif-m1, python-03-elif-m2, python-03-andor-m1, python-03-andor-m2, python-03-scores-m1, python-03-scores-m2
- 第4章: python-04-for-m1, python-04-list-m1, python-04-list-m2, python-04-index-m1, python-04-index-m2, python-04-append-m1, python-04-dict-m1
- 入力欄を使うが判定が1組: python-04-while-m1（`a` `b` `c` を3つの `print` で書けば、`input()` を1回も呼ばずに通る）

通らないのは、入力の違う判定が2組ある3問（python-01-input-basic-m1, python-01-input-m1, python-01-input-m2）だけ。

forbid があっても塞げていないもの: python-04-index-m2（`numbers[4]` と `[-` を禁じているが、`print(4)` も `numbers[3 + 1]` も通る。問題文が求める `len()` は確かめられていない）、python-04-dict-m1（下の 4-2）。

### 4-2. 書き換えてよいと言っていない行を書き換えても通る: 13問（4-1 の内数）

直接 print しなくても、問題文が指していない行（データの行・条件の行）を書き換えたり、問題文の決まりを破ったりして通るもの。

- python-01-print-m2（「引数は2つ」なのに `print("赤 青")` で通る）
- python-01-scores-m1（`english` を足さず、`japanese = 135` に変えても `合計217点`）
- python-02-precedence-m1, python-02-precedence-m2（「数と記号は変えません」が確かめられない）
- python-02-scores-m2（`threshold` を変えず、f文字列の中に `基準80点` と書いても通る）
- python-03-scores-m1（`threshold` でなく `if` の条件の向きを変えても通る）
- python-03-scores-m2（`english` でなく `japanese = 59` に変えても `平均59.7点 不合格`）
- python-03-if-m2（`if` を足さず、`print("0です")` を1行足すだけで通る）
- python-04-index-m1（インデックスでなくデータの行を `[7, 0, 4, 0, 0]` に変えても通る）
- python-04-index-m2（`len()` を使わなくても通る。4-1 のとおり）
- python-04-list-m2（`print` でなくデータの行を `[6, 14, 4, 18, 8]` に変えても通る）
- python-04-append-m1（1行目を `[7, 2]` に変えても、`numbers = [2, 9]` を足しても通る）
- python-04-dict-m1（「1行目の辞書は書き換えないで」とあるが、1行目を `{"コーヒー": 420, "紅茶": 350}` にして `menu["ココア"] = 450` を足すと、forbid の `"ココア":` に掛からずに通る）

ほかに、「値を決めて」と言う第3章の問題（python-03-if-m1, else-m1, else-m2, elif-m1, elif-m2, andor-m1, andor-m2）は、値でなく `if` の条件や枝の中身を書き換えても通る。python-03-if-m1 は出力が空なので、コードを全部消しても通る。

練習問題集と今週の演習（第1〜4章・9/29・10/6）には、書き換える問題は無い。
