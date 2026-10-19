# 未知の書き方の全数検査の直し（1段目）（2026-10-20）

採否 `unknown-syntax-decision.md` の「1段目: 中身の直し」1〜5を直した。2段目（vary）は触っていない。

## 直した

### 1. `np.array([int(input()), …])` の模範解答（22問）

模範解答を、第7章1節の本文の形（1つずつ変数に読んでから `np.array([p1, p2, p3])`）に書き直した。出力は変わらない（下の検査）。

- python-07-agg-b1（`p1`〜`p3`・`a1`〜`a3`。第7章1節の演習問題の模範解答と同じ名前）、python-07-select-b1（`s1`〜`s5`）、python-07-slice-b1（`k` のあと `s1`〜`s6`）
- python-09-vector-b1（`a1`〜`a3`・`b1`〜`b3`）、python-09-dot-b1（`a1`〜`a3`）
- 練習問題集: practice-07-array-1〜4、practice-07-select-1〜5、practice-07-stats-1〜4、practice-08-transpose-2（目標の3つだけ `t1`〜`t3`。表の2行は `table.append([int(input()), …])` のまま。第7章7節の `<Run>` にある形）。場所は `src/content/practice/solutions/`
- 今週の演習: weekly-2026-10-20-b1・b2・b6（b2・b6 は `v1`〜`v6` を `flat = np.array([…])` にしてから `reshape(3, 2)`）。場所は `src/content/weekly/solutions/`
- 表: 第7章1節（`since: 'python-07-array'`、numpy の分類の `a - b` の行の次）に1行足した
  - `x = np.array([int(input()), int(input())])` / `print(x)` → `[3 5]（入力が3・5の2行のとき）`、説明「読み取った値を、変数に入れずにそのまま並べてもよい」
- ヒント: practice-07-array-1 のヒント1（第4章2節を指していた。H-2）を「3つの値を変数に読み取って配列にする書き方は、第7章1節にあります。」に。ほかの21問のヒントは、この形を指していなかったので触っていない

### 2. (a) 未知の形でしか解けない

- weekly-2026-10-06-b8: 第4章5節の表（while文の分類、`終わり` まで数える行の次）に1行足した
  - `numbers = []` / `line = input()` / `while line != "終わり":` / `    numbers.append(int(line))` / `    line = input()` / `print(numbers)` → `[3, 7]（入力が 3・7・終わり の3行のとき）`、説明「終わりの行まで読みながら、リストに足していく」
  - ヒント1の末尾「第4章5節（…）を読んでください。」を「読みながらリストに足す書き方は、第4章5節（…）の「この節の書き方」の表にあります。」に
- python-04p-combine-b4: ヒント1に「読みながらリストに足す書き方は、第4章5節の「この節の書き方」の表にあります。」を1文足した（A のヒントの誤り1も、これで指す先が表にある）。模範解答は変えていない（いまは表にある形）
- python-11-distribution-b1・python-11-exp-b1: 第9章1節（`since: 'python-09-vector'`）の表に1行足した。分類は「関数」（第5章の行の後ろ）
  - `def double(v):` / `    return v * 2` / （空行） / `print(double(np.array([3, 4])))` → `[6 8]`、説明「配列を受け取って、配列を返す関数」
  - 第11章1節は numpy を使っていない節なので浮く。第9章1節はベクトル（配列）を扱う最初の節なので、こちらにした。答えを写せる例（合計で割る）にはしていない

### 3. (b) 模範解答が未知の形

- python-02-int-float-b1: 模範解答を `n = int(q)` と変数に入れてから `f"小数:{q} 整数:{n}"` に
- practice-03-elif-5・practice-03-if-5: 第3章2節の表（if文の分類、else の行の次）に1行足した
  - `score = 45` / `if score >= 60:` / `    message = "合格"` / `else:` / `    message = "不合格"` / `print(score, message)` → `45 不合格`、説明「ifやelseの中で変数に値を入れ、あとで使う」（第3章2節の本文と同じ点数の例。送料・時間の問題の答えを写せる形にはしていない）
  - practice-03-elif-5 のヒント2に「ifやelseの中で変数に値を入れる書き方は、第3章2節の「この節の書き方」の表にあります。」を足した（A のヒントの誤り2）
  - practice-03-if-5 のヒント1に「分けた数は、第3章2節の「この節の書き方」の表のように、elseの中で変数に入れられます。」を足した
  - 模範解答は変えていない（いまは表にある形）

### 4. ヒントの誤り

- weekly-2026-10-13-b3（H-1）: 「第4章4節の2つ目のコード」→「3つ目のコード」（入力を for と append で集めるのは3つ目の `<Run>`）
- python-15r-fit-b1（D-1）: ヒント1の括弧「（タイタニック4 の演習問題2 と同じです）」を、「配列にしてスライスするところはタイタニック4 の演習問題2 と、`reshape` はこの節の最初のコードの6行目と同じです。」に分けた（6行目が `X_train = ages[:30].reshape(30, 1)` であることを確かめた）
- python-11-exp-m1（C-2）: 「3行目の `np.exp(1)` の `1` を変えて、結果が `1` になる数を探してください。」→「`np.exp(…)` の結果が `1` になる数を探してください。3行目は `2.718` を表示する行なので、変えずに残します。」（C の案の `print(np.exp(0))` は答えの数を書くので使わなかった）
- python-04p-combine-b4・practice-03-elif-5・weekly-2026-10-06-b8（A のヒントの誤り1〜3）、practice-07-array-1（H-2）: 上の1〜3に書いたとおり

### 5. 問題の誤り

- python-09-shape-m1: 問題文「`(2, 3)` と表示されるように」→「`(2, 4)` と表示されるように」。ヒント1・2（weights の行の数、重みの組を4つ）はもう `(2, 4)` に合っていたので変えていない

## 直さなかったもの（理由）

- python-09-vector-b1・python-09-dot-b1 のヒント1に「第7章1節と同じく、1つずつ変数に読んでから並べます」を足す案（C）: 決定の1は「この形を指しているヒントを直す」で、この2問のヒントは読み方に触れていない。足していない
- python-11-distribution-b1・python-11-exp-b1 のヒント: 決定に無いので、第9章1節の表を指す文は足していない
- 6（境目のもの）と2段目（vary）: 決定のとおり触っていない

## 構文の一覧に足した行（`src/lesson/syntax-list.ts`。`py` で実行して結果を確かめた）

| since | 分類 | code | result |
|---|---|---|---|
| python-03-else | if文 | `score = 45` … `print(score, message)` | `45 不合格` |
| python-04-while | while文 | `numbers = []` … `print(numbers)` | `[3, 7]`（入力 3・7・終わり） |
| python-07-array | numpy | `x = np.array([int(input()), int(input())])` / `print(x)` | `[3 5]`（入力 3・5） |
| python-09-vector | 関数 | `def double(v):` … `print(double(np.array([3, 4])))` | `[6 8]` |

分類の中は since の節の順のまま（どれも同じ since の行の後ろか、分類の最後）。ファイルは CRLF のまま（1074行すべて CRLF）。`node scripts/taught.mjs python-09-vector` に4行とも出ることを確かめた。

## 検査の結果

- `npm run build:tests`: 108節 / 228問、今週の演習 4回 / 24問、練習問題集 29話題 / 135問の期待値を作りました。直す前の `src/generated/lesson-data.json` と項目ごとに比べ、違いはヒント8つの文だけ（`tests` の `expect` はすべて同じ）
- `npm run check:lessons`: 108節を検査して問題なし（目安から外れている所 202件。直した文に当たるものは無い）
- `npm run check:practice`: 29話題 / 135問を検査して問題なし
- `npm run check:weekly`: 4回を検査して問題なし
- `npm run build`: Complete
