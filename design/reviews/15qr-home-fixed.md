# pandas・scikit-learn の表の直し（15q・15r のホーム）

触った所: `src/lesson/syntax-list.ts`（分類 pandas・sklearn の行の `note` と、pandas 1 の1行のコード・結果）、`15q-pandas/01-read.mdx`、`15q-pandas/03-missing.mdx`、`15r-sklearn/01-fit.mdx`。節の題・課題・模範解答は変えていない。

## 直した

- L1: 本体が直す約束のため触っていない。
- L2: pandas 1 の行 `print(df["Fare"].max())` を `print(df["Age"].max())`（結果 `80.0`、Pyodide で確認）に替えた。説明は「列の最大値（年齢のいちばん高い値）。欠けた値は飛ばして求める」（`min` の行と言い方をそろえた）。
- L3: `roc_auc_score` の説明に「第2引数は確率で、model.predict_proba(X)[:, 1] のように、1の列だけを渡す」を足した（2列のまま渡すと ValueError になることを Pyodide で確認）。
- L4: `model.score` の説明を決定のとおりにした（回帰のモデルでは別の物差しを返す、は Pyodide で確認）。
- L5・J5: `fillna` の行から `inplace` の文を外した。`dropna(subset=…)` の行に「捨てた表を使うときは df = … と入れ直す」、`dropna()` の行に「Cabin が欠けた人が多いので、残るのは183人まで大きく減る」を足した（結果の欄は変えていない。`df.dropna(subset=…)` だけでは df が変わらず 891 のまま、入れ直すと 714 になることを確認）。
- L6: `get_dummies` の説明から「one-hot 表現」を外した。`pd.get_dummies(df, columns=[...])` の行は表に無いので、足していない（決定は「あれば」）。
- J1: 15q-pandas/01-read の段落を「Kaggle で書くときは、コードの最後の行に `df` とだけ書けば、`print()` で囲まなくても表が出ます。」の形にした（Notebook の語を除いた）。
- J2: 15q-pandas/03-missing の「この節の練習問題で `Embarked` を `"S"` で埋めるのは…」の段落を、`isna().sum()` の出力の説明と `dtype: int64` の説明のあと、さらに `Age` を平均で埋める説明のあと（`{/* 課題 */}` の直前）へ移した。`dtype` の説明は出力の説明の直後に戻った。
- J3・J4: 15r-sklearn/01-fit の段落を「決定木に限らず、どれも `fit` で学習し、`predict` で予測します。ほかのモデルの使い方は、…表に載っています。」にした。
- J5: 上の L5・J5 のとおり（直し文の「`fillna(…, inplace=True)` と書いても…」ではなく、決定の「入れ直す」までに）。
- J6: `mean_absolute_error` の説明を「誤差の大きさ（プラスかマイナスかは無視した値）の平均」に。
- J7: `cross_val_score` の説明を「訓練データとテストデータの分け方を変えて、5回測る。5つの正解率が出る」に。
- J8: `df["Survived"].sum()` の説明を「列の合計。Survived は、生き残った人が 1 なので、合計が生き残った人数になる」に。

## 直さなかった（理由）

- 決定に「採らない」とあるもの（課題の別解、`taught.mjs` の件）は触っていない。
- L7〜L9・L8 の細かい言い回し・「足された3つの段落」の所見は、決定に出てこないので触っていない。

## 節ごとに変えた問題

なし（課題は変えていない）。

## 構文の一覧・台帳・用語集に足すもの

なし。

## 気づいたこと

- L2 の置き換えで、表の行 `df["Age"].max()` が pandas 1 の課題 b1（乗客の数・運賃の平均・年齢のいちばん高い値）の3行目の答えと同じ形になった。b1 は3つを組み合わせる課題で、残る2行は表から写せないので、課題としては成り立つ。
- 表の行のうち `LogisticRegression` の1行（NaN のエラー）は、メッセージ全体は版で長さが変わるが、先頭の `ValueError: Input X contains NaN.` は変わっていない。

## 目安を外したままにした所と理由

今回の直しは1文を足す・言い換えるだけなので、目安（検査6〜8）の新しい外れは増やしていない。`check:lessons` の目安警告（15r の各節など）は、直す前からあったもの。

## 検査の結果

- Pyodide（pandas 3.0.2・scikit-learn 1.8.0、`train.csv`）で、表の pandas・sklearn の54行を実行: 53行が結果の欄と一致、残る1行（`LogisticRegression`）は先頭が `ValueError: Input X contains NaN.` で一致（比べ方の都合で最後の行を見て不一致に見えただけ）。
- `npm run build:tests`: 108節 / 228問の期待値を作りました（用語・書き方の索引の確認事項21件は、ほかの章のもの）
- `npm run check:lessons`: 108節を検査して問題なし
- `npm run check:practice`: 29話題 / 135問を検査して問題なし
- `npm run check:weekly`: 4回を検査して問題なし
- `npm run build`: 完了
