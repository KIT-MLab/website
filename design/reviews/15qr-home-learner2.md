# pandas 1〜4・scikit-learn 1〜4 の「話題のホーム」: 学習者の目の2回目の読み

読んだもの: `git diff ba05268 HEAD -- src/content src/lesson/syntax-list.ts src/components/lesson/SectionSyntax.astro`（コミット 07284f0）。直した所を中心に、1回目（`15qr-home-learner.md`）と同じ読み方で読んだ。課題の別解は挙げ直していない。

## 結果の確かめ

表の54行（`import pandas as pd` を除く）を、1回目と同じく Pyodide（pandas 3.0.2、scikit-learn 1.8.0、`src/lesson/files/train.csv`）で実行した。**54行とも表の「結果」と一致**（`LogisticRegression` の行は、エラーが `ValueError: Input X contains NaN.` で始まる点まで）。新しい行 `df["SibSp"].max()` は `8`。`roc_auc_score` の説明の書き方 `model.predict_proba(X)[:, 1]` を渡すと `0.7447` が返り、1回目に出た `ValueError` は出ない。確かめていないのは、Kaggle の版での出力と、画面での表示（`SectionSyntax.astro` の断りの見た目は、コードを読んだだけで、描画していない）。

## 1回目の指摘が直ったか

| 指摘 | 直し | 読んだ結果 |
|---|---|---|
| L1 行が続きに見える | pandas の行がある節の表の見出しの下に断りを出す | **直った。** 断りは、pandas 1〜4 と、`also` で pandas の行が出る scikit-learn 2 の表に出る。pandas 3 の表で、`fillna` の行（結果 0）のあとの `isnull` の行（結果 177）を読んでも、食い違いに見えない |
| L2 表の行が課題の答え | 行を `df["SibSp"].max()` → `8` に替えた | **直った。** `Fare` の最大値は表のどの行にも無く、`read-m1`（運賃の最大）は表を写しても通らない。説明に列の意味（一緒に乗ったきょうだい・夫婦の数）が付き、`SibSp` が何かも分かる |
| L3 `roc_auc_score` | 「`model.predict_proba(X)[:, 1]` のように、1の列だけを渡す」を足した | **直った**（上の確かめのとおり、この形なら通る） |
| L4 `score` | 「分類のモデルでは正解率…（回帰のモデルでは別の物差しを返す）」 | **直った** |
| L5 `dropna`・`inplace` | `dropna` に「df = … と入れ直す」と、`dropna()` に「Cabin が欠けた人が多いので、…大きく減る」。`fillna` の行から `inplace` の文を外した | 入れ直しと183人の理由は**直った**。`inplace` は、新しい引っかかりが1つ出た（M1） |
| L6 `get_dummies` | 「one-hot 表現」を外した | 語は**直った**。結果をモデルの X に入れる書き方は、そのまま（M2） |
| L7 `LogisticRegression` の行 | 直していない（段落の言い回しだけ「使い方は」に変えた） | **そのまま**（M3） |
| L8 言い回し | `mean_absolute_error` は「プラスかマイナスかは無視した値」、`cross_val_score` は「訓練データとテストデータの分け方を変えて、5回測る」に直した | その2つは**直った**。`groupby` の説明・`.tolist()`・RMSE・`Family` の `SibSp`/`Parch` は、そのまま（M4） |
| L9 `dtype` | 直していない（そのままでよい、としていた） | 変わらず、軽い |
| pandas 3 の段落の置き場所 | 「埋めたあとは、欠損値が 0 になり…791 になりました。」の後ろ、課題の直前に移した | **直った。** `dtype: int64` の説明が、出力のすぐ後ろに戻った。「この節の練習問題で…」が、直後の課題を指す形になり、自然 |
| pandas 1 の段落 | 「Notebook」をやめ、「Kaggle で書くときは、コードの最後の行に `df` とだけ書けば…」にした | **直った。** 未習の語が消え、何を書けばよいかも分かる |
| scikit-learn 1 の段落 | 「決定木に限らず、どれも」「ほかのモデルの使い方は」 | 変わらず、進める |

## 止まる（ここで学習者が進めなくなる）

無し

## 引っかかる（進めるが、迷うか、分からないまま通る）

- **M1** pandas 3 の `fillna` の行から `inplace` の文を外したので、`inplace=True` の書き方（Web で最も見つかる形）が、学習者に見える文では何も触れられなくなった
  場所: `df["Age"] = df["Age"].fillna(df["Age"].mean())` の行の説明（いまは「欠けた値を平均で埋め、df["Age"] に入れ直す」）と、`03-missing.mdx` の本文
  なぜ: 「inplace が学習者に分からない語」という1回目の指摘は直ったが、そのかわりに、`df["Age"].fillna(0, inplace=True)` を書いた学習者が、このサイトでは、表が変わらないまま（`df["Age"].isna().sum()` が 177 のまま。Pyodide で確かめた）になる。ChainedAssignmentError の英語の警告が出るだけで、本文にも表にも手がかりが無い。`inplace` への注意は、運営向けの欄（`<Facilitate>`）にしか残っていない。一方、Kaggle の pandas で `inplace=True` の書き方が効くかは、確かめていない。
  案: 説明に「`df["Age"].fillna(…, inplace=True)` と書いても、このサイトでは表が変わらない」と、効かない形と場所を絞って戻す。
- **M2** pandas 4 の `get_dummies` の行: 結果を `X` に入れる書き方が、そのまま無い
  場所: `print(pd.get_dummies(df["Embarked"]).head(3))`（1回目の L6 の後半）
  なぜ: `Embarked` の3つの列ができる所までしか分からず、`pd.get_dummies(df[["Pclass", "Embarked"]])` のように表に渡す形や、元の `df` の列と並べる方法が出てこない。どの列が文字かを調べる行（`dtypes` など）も無い。ただし、`map` の行があるので、文字の列を数にする目的は果たせる。
  案: 説明に「表に使うと、文字の列だけが値ごとの列になる」と、`pd.get_dummies(df[["Pclass", "Embarked"]])` の行を足す。直さない場合は、そのまま進める。
- **M3** scikit-learn 1 の `LogisticRegression` の行: 「ほかのモデルの使い方」を探した人が、エラーの行に当たる
  場所: 結果が `ValueError: Input X contains NaN.` の行。段落は「ほかのモデルの使い方は、この節の最初の表に載っています」と言う
  なぜ: 成功して `predict` まで動く見本が、`RandomForestClassifier` の行（これは動く）しか無い。`LogisticRegression` の行は説明が「欠けた値があると止まる」だけで、`max_iter=1000` と、第14章のロジスティック回帰との関係は書いていない。ランダムフォレストの行を写せば進めるので、重くはない。
  案: 1回目と同じ（ロジスティック回帰の行を、欠けの無い小さい `X`・`y` で動く形にするか、説明に一言足す）。
- **M4** 説明の言い回し（1回目の L8 のうち直っていないもの。どれも軽い）
  - pandas 2 `groupby("Sex")["Survived"].mean()`: 「組ごとの平均」だけで、`("Sex")` が組を分ける列、`["Survived"]` が平均を出す列とは書いていない。
  - pandas 4 `replace` の行: `.tolist()` の説明が無い。
  - `mean_squared_error` の説明に、平方根を取れば元の単位に戻る（RMSE）とは無い（学習者は `np.sqrt` を持っている）。
  - pandas 3 `Family` の行: `SibSp`・`Parch` の意味が、この節の表には無い（pandas 1 の `SibSp` の行で `SibSp` だけは分かる）。
- **M5** `SibSp` の説明の言葉が、あとの節と少し違う（新しい指摘）
  場所: pandas 1 の表「一緒に乗ったきょうだい・夫婦の数のいちばん多い値」と、scikit-learn 4 の表「一緒に乗った兄弟姉妹と夫・妻の人数」
  なぜ: 同じ列を、「きょうだい・夫婦」と「兄弟姉妹と夫・妻」と書き分けている。「夫婦の数」は、夫婦1組を1と数えるのか、配偶者1人を1と数えるのか、読み方が分かれる（列の値は、配偶者が1人なら1を足す数）。進むのは妨げない。
  案: pandas 1 の説明を scikit-learn 4 と同じ「兄弟姉妹と夫・妻の人数」にそろえる。
- **M6** scikit-learn 3・4 の表の `df` の前提（新しい指摘というより、断りの出し方の穴）
  場所: scikit-learn 3 の表（`train_test_split`・`cross_val_score`）と scikit-learn 4 の表（`get_depth`）の `X = df[…]` の行
  なぜ: 断り「pandas の行は、どれも `df = pd.read_csv(...)` で読み込み直したところから動かした結果です」は、pandas の行がある節にしか出ない。scikit-learn 3・4 の表は pandas の行を持たないので、断りが無く、`df` が何かは書いていない（本文では pandas 3・4 で書いた処理の `df` と読める）。scikit-learn 2 の表には断りが出るが、文は「pandas の行は」なので、同じ表の `feature_importances_` の行（`df` を使う）に当たるか、読み手が迷う。どれも、読み込み直した直後の `df`（`Pclass`・`Fare` に欠けは無いので、`Age` を埋めたかどうかは結果に響かない）で動かした値なので、誤りではない。
  案: 断りを「表の `df` を使う行は、どれも…」にして、scikit-learn の表にも出す（または、そのままにする）。

## 足された・直された段落と断りの読み

- 断り（`SectionSyntax.astro`）: 位置は「この節の書き方」の見出しと表の間、文字の大きさは12.5px、色は薄く。表を読む前に目に入る場所で、位置は適切。文は1文で、未習の語は無い。pandas 1 の表では、2行目が `df = pd.read_csv("train.csv")` そのもので、断りと重なるが、害は無い。
- pandas 1 の段落: 上のとおり。
- pandas 3 の段落: 上のとおり。「644人」の根拠は、直前の `value_counts` の行で辿れる。
- scikit-learn 1 の段落: 言い回しの変更だけで、読みは変わらない。

## 要らない（消しても何も失わない文・問題）

無し

## 課題ごとの表

課題の本文・模範解答は変わっていない。1回目の表から変わるのは、`python-15q-read-m1` の「抜け道」だけ。

| 課題 | 変わった所 |
|---|---|
| pandas 1 m1 | 表の行が `SibSp` の最大に替わり、表を写して通る道は無くなった（抜け道: 無し）。ヒント「運賃の列の名前は…一覧にあります」は、そのまま有効 |
| そのほか14課題 | 変わり無し（1回目の表のとおり。別解は挙げ直していない） |

## この節は何のためにあるか

変わり無し（1回目の報告のとおり、8節とも一文で言える）。
