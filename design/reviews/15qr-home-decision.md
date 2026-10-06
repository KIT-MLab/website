# pandas・scikit-learn の表の採否（2026-10-06、Claude 本体）

読み手の報告: `15qr-home-learner.md`（L1〜L6）、`15qr-home-japanese.md`（J1〜J8）。「止まる」は0件。8つの調べ物（列名・いちばん多い値・組ごとの平均・欠けた行を捨てる・文字を数に・ほかのモデル・数を当てるモデル・回帰の物差し）は、どれも答えにたどり着けた。表の結果は Pyodide で一致。

## 採る

| 指摘 | 直し方 |
|---|---|
| L1 | pandas の行が1つでもある節では、表の見出しの下に「pandas の行は、どれも `df = pd.read_csv("train.csv")` で読み込み直したところから動かした結果です。」を出す（本体が `SectionSyntax.astro` に足した。直す人は触らない） |
| L2 | pandas 1 の表の `print(df["Fare"].max())` は課題 m1 の答えを写せる。`print(df["Age"].max())`（結果は Pyodide で確かめる）「列の最大値（年齢のいちばん高い値）」に替える |
| L3 | `roc_auc_score` の説明に「確率は `model.predict_proba(X)[:, 1]` のように、1の列だけを渡す」を足す（長ければ2文に） |
| L4 | `model.score` の説明を「分類のモデルでは正解率。(model.predict(X) == y).mean() と同じ（回帰のモデルでは別の物差しを返す）」に |
| L5・J5 | `fillna` の行の説明から `inplace` を外し、「欠けた値を平均で埋め、df["Age"] に入れ直す」までに。`dropna(subset=…)` の行は「捨てた表を使うときは df = … と入れ直す」を足す。`dropna()` の行は「Cabin が欠けた人が多いので、大きく減る」を足す |
| L6 | `get_dummies` の説明から「one-hot」の語を外し、「値ごとに列を作り、その行の値の列だけ True にする」に。`pd.get_dummies(df, columns=[...])` の行があれば「表の中の列を置き換える（そのままモデルの X に使える）」 |
| J1 | pandas 1 の段落を「Kaggle で書くときは、コードの最後の行に `df` とだけ書けば、`print()` で囲まなくても表が出ます。」の形に |
| J2 | pandas 3 の `value_counts` の段落を、出力の説明と `dtype` の説明のあとへ移す（課題の直前） |
| J3・J4 | scikit-learn 1 の段落を「決定木に限らず、scikit-learn のモデルはどれも `fit` で学習し、`predict` で予測します。ほかのモデルの使い方は、…表に載っています。」に |
| J6〜J8 | 報告の直し文のとおり |

## 採らない

- 課題の別解（pandas 2 b1、scikit-learn 1〜3。学習者の目が「実質は同じ考え方、または起きにくい」とした分）: 解き方として誤りではない
- `taught.mjs` がメンバーだけの章の id で止まる件: 教材ではなく道具の話。別に直す（`HANDOFF.md` に書く）
