# 設計メモ: pandas・scikit-learn の章に「この節の書き方」の表を置く（2026-10-06）

元: 点検 `design/reviews/home-audit-2026-10-06.md` 第2.4節（pandas・scikit-learn の担当の報告の要点）、決まり `spec/10` 第2.4節。第1〜8章で同じことをした記録は `design/briefs/*-home.md` と `design/reviews/*-home-decision.md`（**読み手に指摘された形を先に避けること**）。

**いま、pandas 1〜4・scikit-learn 1〜4 の8節は「この節の書き方」の表が1行も無い。** 12/22 と1月は「詰まったら戻る節」で済ませる方針なので、ここが調べに戻る先になる。1月・3月の Kaggle は Titanic とは別の表で、回帰（数を当てる）のこともある。

**本文と課題は、ここに書いた1文の足し以外は変えない。** 中心は表の行を足すこと。節の題も変えない。8節とも準備中（代表が解いてから公開する）。

## 仕組み

- `src/lesson/syntax-list.ts` に分類 `{ key: 'pandas', name: 'pandas' }` と `{ key: 'sklearn', name: 'scikit-learn' }` を numpy の分類のあとに足す
- ファイル頭の決まりに1文: pandas の行は `import pandas as pd` と `df = pd.read_csv("train.csv")` を済ませた前提で書く（numpy の行と同じ形）。scikit-learn の行は、前提の `X`・`y`・`model` を行のコードに含めるか、前提を説明に書く
- 結果は **Pyodide（`node_modules/pyodide`、pandas・scikit-learn を loadPackage）で `src/lesson/files/train.csv` を読んで実行した出力** を書く。版で変わりやすいもの（`dtypes` の文字の列の表記、`info()`、`astype` の型の幅）は載せない。表の形の出力（`head()` など）は長いので、`head(3)` のように短くする
- 台帳 `scripts/python-tools.mjs` に、本文で教えている pandas・scikit-learn の道具（課程表 `spec/56-tools-curriculum.md` 第7節の表）を足す。`in` はその節の id。正規表現は誤報が出ないか、8節と第1〜15章で数えてから入れる（`HANDOFF.md` 第4章）。表にだけ載せる道具は台帳に足さない（後の節で使ってよいので、禁じる理由が無い）

## 節ごとに置く行

各行は、点検のときに Pyodide で確かめた値の案がある。書き手は実行し直して書く。

### pandas 1（python-15q-read）: 表を読む・形を見る・1列の集計

- 本文で教えている行: `import pandas as pd`、`df = pd.read_csv("train.csv")` と `len(df)`、`df.head()`（短く `head(3)` で）、`df["Survived"].sum()`、`.mean()`、`df["Fare"].max()`
- 表だけ: `df.shape` → `(891, 12)`、`list(df.columns)`、`df["Age"].describe()`、`df["Age"].min()`、`df["Age"].median()` 「中央値」、`df[["Pclass", "Age"]].head(3)` 「列の名前のリストで複数の列（[ ] は2組）」（scikit-learn 2 は `also`）、`df["Age"].std()` 「標準偏差。np.std とは割る数が違う」
- 本文に足す1文（無ければ）: このサイトでは、表を画面に出すときも `print()` で囲む（Kaggle の Notebook では最後の行は囲まなくても出る）。Kaggle 1 の設計メモがこの文を前提にしている

### pandas 2（python-15q-select）: 条件で行を取り出す・組ごとの集計

- 本文で教えている行: `df[df["Sex"] == "female"]` と `len(...)`、`&` で両方（条件は `( )` で囲む）
- 表だけ: `|` 「どちらか」、`~` 「条件を反転」、`isin(["C", "Q"])`、`df["Pclass"].value_counts()` 「値ごとの人数（多い順）」、`df.groupby("Sex")["Survived"].mean()` 「組ごとの平均を一度に」、`df["Fare"].sort_values(ascending=False).head(3)`、`df.loc[0, "Name"]`

### pandas 3（python-15q-missing）: 欠けた値

- 本文で教えている行: `df["Age"].isna().sum()`、`df.isna().sum()`、`fillna(df["Age"].mean())` で入れ直す（説明に「inplace=True は効かない」）
- 表だけ: `isnull()` 「isna と同じ」、`notna().sum()`、`dropna(subset=["Age"])`、`dropna()` 「どこか1つでも欠けた行を捨てる」、`fillna(df["Age"].median())`、`df.drop(columns=["Cabin"])` 「列を消す。入れ直す」、`df["Family"] = df["SibSp"] + df["Parch"]` 「列どうしの計算で新しい列」
- 本文に足す1文: `Embarked` を `"S"` で埋めるのは、いちばん多い値だから（644人。値ごとの人数は pandas 2 の表の `value_counts` で数えられる）。課題の問題文は変えない

### pandas 4（python-15q-encode）: 文字を数に

- 本文で教えている行: `map({"male": 0, "female": 1})`、辞書に無い値は欠けた値になる
- 表だけ: `replace({...})` 「map と似る。辞書に無い値はそのまま残る」、`nunique()`、`pd.get_dummies(df["Embarked"]).head(3)` 「値ごとに列を作る（one-hot）」
- 辞書そのもの（キーで取り出す）は第4章7節。本文の指しを確かめる

### scikit-learn 1（python-15r-fit）: fit と predict

- 本文で教えている行: `from sklearn.tree import DecisionTreeClassifier`、小さな `X`・`y` で `fit` と `predict`
- 表だけ: `model.score(X, y)` 「正解率。(model.predict(X) == y).mean() と同じ」、`model.predict_proba(...)` 「0と1それぞれの確率」、`export_text` 「選んだ境目を文字で見る」
- **ほかのモデル（1月・3月のための入口）**: `RandomForestClassifier(n_estimators=100, random_state=0)` 「決定木をたくさん作って多数決」、`LogisticRegression(max_iter=1000)` 「欠けた値があると止まる」、`LinearRegression()` 「数を当てる（回帰）」、`DecisionTreeRegressor(max_depth=2, random_state=0)` 「回帰の決定木」。どのモデルも `fit` と `predict` で同じように使える、を説明に。本文に足す1文（無ければ）: scikit-learn のモデルはどれも `fit` と `predict` で使える。ほかのモデルは表にある
- 運営メモに `reshape(-1, 1)` を「教えていない」とあれば、第8章5節の表にあると直す（第7〜8章の直しで直っていれば不要）

### scikit-learn 2（python-15r-features）: 特徴量

- 表だけ: `model.feature_importances_` 「どの列を使ったか」。`df[["Pclass", "Sex", "Age"]]` の行は pandas 1 の行に `also` で出す

### scikit-learn 3（python-15r-split）: 分けて測る

- 本文で教えている行: `train_test_split(X, y, test_size=0.2, random_state=0)` と `len(X_train), len(X_test)`
- 表だけ: `accuracy_score`、`cross_val_score(..., cv=5)` 「分け方を5通り変えて測る」、**回帰の物差し** `mean_squared_error([3, 5, 2], [2, 5, 4])` 「誤差の2乗の平均（第12章の損失）」、`mean_absolute_error`、`roc_auc_score([0, 0, 1, 1], [0.1, 0.4, 0.35, 0.8])` 「確率で順位を付けて測る物差し」

### scikit-learn 4（python-15r-depth）: 深さ

- 本文で教えている行: `DecisionTreeClassifier(max_depth=3, random_state=0)` 「深さの上限。random_state で毎回同じ木」
- 表だけ: `max_depth=None` と `get_depth()` 「None は制限なし」（None のホームは第5章2節）

## 守ること

- 触らないもの: `scripts/` の検査（台帳を除く）、`src/lesson/` の画面の部品（`syntax-list.ts` を除く）、`spec/` の 10/20/30、ここに書いていない章の `.mdx`、Kaggle の設計メモ
- 検査は `npm run build:tests` → `npm run check:lessons` → `npm run check:practice` → `npm run check:weekly` → `npm run build`
- git の作業ツリーを書き換える命令（checkout --・reset・stash・restore・switch）は使わない。commit しない
- 終わったら、節ごとに「足した行」「足した文（全文）」「台帳に足した道具と、誤報を数えた結果」「足さなかったもの・迷ったもの」と、Pyodide で確かめられなかった行を `design/reviews/15qr-home-written.md` に書く
