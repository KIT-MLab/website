# pandas 1〜4・scikit-learn 1〜4 の「この節の書き方」の表（書き手の報告、2026-10-06）

設計メモ: `design/briefs/15qr-home.md`。触ったのは `src/lesson/syntax-list.ts`・`scripts/python-tools.mjs`・8節のうち3節の本文（1文ずつ）だけ。課題・題・ほかの章・Kaggle の設計メモは触っていない。commit していない。

**Pyodide で確かめられなかった行: 無し。** `node_modules/pyodide`（pandas 3.0.2・scikit-learn 1.8.0）に `src/lesson/files/train.csv` を書き込み、行ごとに新しい名前空間（前の行の import や変数が残らない）で実行して、出た値をそのまま `result` に書いた。完成した `syntax-list.ts` を読み直して全55行を再実行し、`result` との不一致は0件（確かめ方のスクリプトは scratchpad の `qr/verify2.mjs`。リポジトリには置いていない）。

## 仕組み（`syntax-list.ts`）

- 分類 `{ key: 'pandas', name: 'pandas' }` と `{ key: 'sklearn', name: 'scikit-learn' }` を足した。**置き場所は配列の末尾**（`evaluate` の後）。設計メモは「numpy の分類のあと」とだけあり、numpy の直後だと章の順（pandas は第15章の後ろ）と逆になるため、章の順にした。直後に置き直すなら、2つのブロックを動かすだけ
- ファイル頭の決まりに3行足した: pandas の行は `import pandas as pd` と `df = pd.read_csv("train.csv")` を済ませた前提（numpy と同じ形）。scikit-learn の行は、行のコードに `from sklearn… import …` と、使うモデルや小さな `X`・`y` を含める。表の `df` を使う行（`X = df[…]`）は pandas の行と同じ前提
- scikit-learn の行は、迷った末に「1つの行だけ読んで動く」形にした（小さな `X`・`y` を行の中に書く。5〜7行になる）。`df` を使うのは、欠けた値の話（LogisticRegression）と、実データの結果が要る行（feature_importances_・train_test_split・cross_val_score・get_depth）だけ

## 節ごとに足した行（55行）

結果は全部 Pyodide の出力。

### pandas 1（`python-15q-read`）13行

- 本文で教えている: `import pandas as pd`、`df = pd.read_csv("train.csv")` と `len(df)`（891）、`print(df.head(3))`（3行＋`[3 rows x 12 columns]`）、`df["Survived"].sum()`（342）、`.mean()`（0.3838383838383838）、`df["Fare"].max()`（512.3292）
- 表だけ: `df.shape`（(891, 12)）、`list(df.columns)`、`df["Age"].describe()`、`df["Age"].min()`（0.42）、`df["Age"].median()`（28.0、「小さい順に並べたときの真ん中の値」）、`df[["Pclass", "Age"]].head(3)`（`also: ['python-15r-features']`。「列の名前のリストを書くと、その列だけの表を取り出せる（[ ] は2組）」）、`df["Age"].std()`（14.526497332334042。「標準偏差（第11章5節）。np.std とは割る数が違うので、同じデータでも値が少し違う」。実測: `np.std` は 14.5163、`ddof=1` で 14.5265 で pandas と一致）

### pandas 2（`python-15q-select`）9行

- 本文: `women = df[df["Sex"] == "female"]` と `len`（314）、`&`（144）
- 表だけ: `|`（400）、`~`（577）、`isin(["C", "Q"])`（245）、`value_counts()`、`groupby("Sex")["Survived"].mean()`（female 0.742038・male 0.188908）、`sort_values(ascending=False).head(3)`、`df.loc[0, "Name"]`

### pandas 3（`python-15q-missing`）10行

- 本文: `isna().sum()`（177）、`df.isna().sum()`（12列）、`fillna(df["Age"].mean())` で入れ直す（説明に「inplace=True を使う形は効かない」。`inplace=True` は Pyodide で `ChainedAssignmentError` の警告が出て、欠けは177のまま残ることを確かめた）
- 表だけ: `isnull()`（177）、`notna().sum()`（714）、`dropna(subset=["Age"])`（714行）、`dropna()`（183行）、`fillna(median)`、`drop(columns=["Cabin"])`（列が11に）、`df["Family"] = df["SibSp"] + df["Parch"]`

### pandas 4（`python-15q-encode`）5行

- 本文: `map({"male": 0, "female": 1})` と `head(3)`
- 表だけ: 辞書に無い値が欠けた値になる（`{"S": 0, "C": 1}` で 79 = Q の77人＋欠け2人）、`replace({"S": 0, "C": 1}).head(6).tolist()`（`[0, 1, 0, 0, 0, 'Q']`。辞書に無い Q がそのまま残る所を見せるため、`tolist()` で出した）、`nunique()`（3）、`pd.get_dummies(df["Embarked"]).head(3)`
- 本文の指し「第4章7節で扱った辞書」は、第4章7節が 07-dict なので合っている（変更なし）

### scikit-learn 1（`python-15r-fit`）9行

- 本文: `from sklearn.tree import DecisionTreeClassifier`、小さな `X`・`y` で `fit` と `predict`（`[1 0]`）
- 表だけ: `score(X, y)`（0.8。`(model.predict(X) == y).mean()` と同じ 0.8 であることも確かめた）、`predict_proba`（`[[0. 1.] [0.667 0.333]]` の形）、`export_text`（`age <= 17.00`）、`RandomForestClassifier(n_estimators=100, random_state=0)`（`[1 0]`）、`LogisticRegression(max_iter=1000)`（`Age` に欠けがあり `ValueError: Input X contains NaN.`。**result は1行目だけ**。実際のエラーは2行目以降に「欠けた値を受け付けない」旨の長い説明が続く）、`LinearRegression()`（`[9.]`）、`DecisionTreeRegressor(max_depth=2, random_state=0)`（`[11. 54.]`）
- 運営メモの `reshape(-1, 1)` は、すでに「第8章5節の冒頭の表（「この節の書き方」）」と直ってあったので変えていない

### scikit-learn 2（`python-15r-features`）1行 ＋ also 1行

- `model.feature_importances_`（`Pclass`・`Fare` の2列、深さ2で `[0.7223429 0.2776571]`）。深さ1だと `[1. 0.]` で、割合が見えないので深さ2にした
- `df[["Pclass", "Age"]]` の行は pandas 1 の行の `also` で出る

### scikit-learn 3（`python-15r-split`）6行

- 本文: `train_test_split(X, y, test_size=0.2, random_state=0)` と `len(X_train), len(X_test)`（712 179）
- 表だけ: `accuracy_score`（0.75。第1引数が答え・第2が予測）、`cross_val_score(..., cv=5)`（5つの正解率）、`mean_squared_error([3, 5, 2], [2, 5, 4])`（1.6666666666666667。「第12章2節の損失」）、`mean_absolute_error`（1.0）、`roc_auc_score`（0.75。「1 が満点で、0.5 は当てずっぽう」）

### scikit-learn 4（`python-15r-depth`）2行

- 本文: `DecisionTreeClassifier(max_depth=3, random_state=0)` と `get_depth()`（3）
- 表だけ: `max_depth=None`（`get_depth()` が 20。「None は第5章2節」）

載せなかったもの: 設計メモが避けるよう言った `dtypes` の文字の列の表記・`info()`・`astype`。ただし結果に `Name: …, dtype: int64`・`dtype: float64` の行が出る Series の行（`describe`・`value_counts`・`groupby`・`sort_values`・`Family`・`map`）は、数の列の表記で版でぶれにくいので、実行結果のまま載せた。

## 足した文（全文）

1. pandas 1（`01-read.mdx`、「列が多くて横に入りきらない…」の段落の次に新しい段落）:
   「このサイトでは、表を画面に出すときも `print()` で囲みます。Kaggle の Notebook では、コードの最後の行に表を書けば、`print()` で囲まなくても出ます。」
2. pandas 3（`03-missing.mdx`、`Embarked` は港の頭文字、の段落の次に新しい段落。課題の問題文は変えていない）:
   「この節の練習問題で `Embarked` を `"S"` で埋めるのは、`"S"` がいちばん多い値（644人）だからです。値ごとの人数は、pandas 2 の「この節の書き方」の表にある `value_counts` で数えられます。」（644人は `value_counts` で確認: S 644・C 168・Q 77）
3. scikit-learn 1（`01-fit.mdx`、`predict` は if文の代わり、の段落の次に新しい段落）:
   「scikit-learn のモデルは、決定木以外もどれも `fit` で学習し、`predict` で予測します。ほかのモデルは、この節の最初にある「この節の書き方」の表に載っています。」

どれも既存の段落に足すと検査7（段落が4文以上）の目安が増えるので、新しい段落にした。足したあとの新しい目安の知らせは0件（残っているのは、もとからあった段落の知らせ）。

## 台帳（`scripts/python-tools.mjs`）に足した道具と、誤報を数えた結果

台帳に入れる前に、検査16 と同じコードの取り方（本文の ```python・`code=`/`starter=`/`badCode=`/`goodCode=`・模範解答。運営メモは除く）で、`src/content/lessons` の全節・`src/content/practice`（問題と模範解答）・`src/content/weekly`（問題と模範解答）に当てた。「導入する節より前の節」に当たった数＝誤報の候補、「導入する節が書いたものに1度は出てくるか」（検査17）も数えた。

| 道具 | `in` | 当たった節・問題の数 | `in` より前に当たった数 | 練習・今週 | 検査17 |
|---|---|---|---|---|---|
| `pandas`（`\bpandas\b\|\bpd\.`） | `python-15q-read` | 32 | 0 | 0 | 出る |
| `pd.read_csv`（`\.read_csv\s*\(`） | 同上 | 32 | 0 | 0 | 出る |
| `.head()` | 同上 | 5 | 0 | 0 | 出る |
| `.isna()` | `python-15q-missing` | 8 | 0 | 0 | 出る |
| `.fillna()` | 同上 | 14 | 0 | 0 | 出る |
| `.map()` | `python-15q-encode` | 15 | 0 | 0 | 出る |
| `.fit() / .predict()` | `python-15r-fit` | 14 | 0 | 0 | 出る |
| `DecisionTreeClassifier`（用語「決定木」の別名） | 同上 | 15 | 0 | 0 | 出る |
| `train_test_split` | `python-15r-split` | 6 | 0 | 0 | 出る |
| 辞書 `{"キー": 値}`（用語「辞書」） | `python-04-dict` | 21 | 0 | 0 | 出る |
| 要素ごとの and / or（`&` と `\|`） | `python-07-select` | 9 | 0 | 0 | 出る |

誤報は **0件**（全部、導入する節より後の本物の使用）。f文字列の `{x}`・`{price * count}` は辞書の正規表現に当たらないことも見た。`|` だけの当たりは0件（`&` の9件だけ）。

- 辞書と `&`・`|` は、設計メモの引用元（`spec/56` 第7節）では P4・P2 が導入する書き方だったが、いまは本文で教える節が前にある（辞書 = 第4章7節、`&` `|` = 第7章3節）ので、`in` をそちらにした。`spec/56` の表は「`in` は `python-15-confusion`」とあるが、第7章3節が `&` を先に教えているのでそれより前の節に置いた
- `build:tests` の用語検索の知らせが1件増えた: 「書き方「要素ごとの and / or（& と |）」: 第7章3節の「やってみる」の `<Run>` にこの書き方が無く、使い方の例を出しません」（目安の知らせ。ほかの20件はもとから。`&` の `<Run>` を足すかは本体が決めること）
- 台帳の `desc`（用語検索の札の説明）を、`pd.read_csv`・`.head()`・`.isna()`・`.fillna()`・`.map()`・`.fit() / .predict()`・`train_test_split`・`&` `|` に書いた。`pandas` は用語集の語と同じ名前、辞書・DecisionTreeClassifier は `term` で用語集を指している

## 足さなかったもの・迷ったもの

- **台帳に足さなかった**:
  - 表にだけ載せた書き方: `isnull`・`notna`・`dropna`・`drop`・`replace`・`nunique`・`get_dummies`・`value_counts`・`groupby`・`RandomForestClassifier`・`LogisticRegression`・`LinearRegression`・`DecisionTreeRegressor`・`export_text`・`cross_val_score`・評価の関数（設計メモのとおり）
  - `from … import …`: `spec/56` の表にはあるが、いまは第2章5節の表の `from math import sqrt` が先で、そこは表にだけ載っていて本文のコードに無い（検査17 が通らない）。第15章の導入に寄せると、第2章5節の表と食い違うので入れていない
  - 名前の直後の `[[`（`df[["A", "B"]]`）: pandas 1 の表にだけ置いたので足していない（本文で教えているのは scikit-learn 2 の本文）
  - `pd.DataFrame(`・`.to_csv(`: Kaggle の章のもの
- 表の行の説明は、その行だけを読んで分かるように書いた（過去の指摘への対応）。迷った所:
  - `std` の説明「割る数が違う」は、n-1 で割る・n で割る、まで書くと長くなるので書いていない
  - `roc_auc_score` は「確率で順位を付けて測る物差し。第2引数は確率。1 が満点で、0.5 は当てずっぽう」とした（意味の細かい定義には踏み込んでいない）
  - `LogisticRegression` の行はエラーしか出ない（成功する形は `RandomForestClassifier` の行と同じ `fit` / `predict` なので足していない）
  - pandas 1 の `describe` の説明に「count は、欠けた値を除いた個数」（714）を入れた
- 設計メモの「本文で教えている行」に `import pandas as pd` を入れたので、表の最初の行は `import pandas as pd`（結果は空）
- 運営メモ（`<Facilitate>`）は直していない

## 検査の結果

```
npm run build:tests    108節 / 228問・今週の演習 4回 / 24問・練習問題集 29話題 / 135問の期待値を作りました（知らせ21件、うち新しいのは上の1件）
npm run check:lessons  108節を検査して問題なし（目安の知らせ 検査6〜11 は、もとからの段落・文のもののみ。足した3つの段落では0件）
npm run check:practice 29話題 / 135問を検査して問題なし
npm run check:weekly   4回を検査して問題なし
npm run build          完了（Complete!）
```
