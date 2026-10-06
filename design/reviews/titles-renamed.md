# 節の題の付け替え（2026-10-06）

点検の報告 `design/reviews/titles-audit-2026-10-06.md` 第5.3節の「案」のとおりに、節の frontmatter の title を変えた。id・ファイル名・本文・課題は変えていない。

## 1. 変えた節の題（51節）

| 節 | いまの題 | 新しい題 |
|---|---|---|
| `01-python/06-scores` | 点数表を作る | 点数表を変数と計算で作る |
| `02-numbers/01-int-float` | intとfloatを使い分ける | intとfloat・型の変換 |
| `02-numbers/04-precedence` | 計算の順番とかっこ | 演算子の優先順位とかっこ |
| `02-numbers/06-scores` | 点数表の平均を整える | 点数表の平均をroundで整える |
| `03-branch/01-if` | if文で条件によって処理を変える | if文と比較演算子で処理を変える |
| `03-branch/05-scores` | 点数表に合否を付ける | 点数表にif文で合否を付ける |
| `04-loop/01-for` | for文で繰り返す | for文とrange()で繰り返す |
| `04-loop/04-append` | append()とremove()でリストを変える | リストの操作（append・sort・sumなど） |
| `04-loop/06-scores` | 点数表を人数ぶん繰り返す | 点数表をfor文で人数ぶん繰り返す |
| `04p-practice1/01-combine` | 組み合わせる | 第1〜4章の書き方を組み合わせる |
| `04p-practice1/02-choose` | 手を選ぶ | 第1〜4章から解き方を選ぶ |
| `05-function/01-def` | 関数を定義して呼び出す | defで関数を定義して呼び出す |
| `05-function/04-keyword` | 名前を書いて引数を渡す | キーワード引数（名前を書いて渡す） |
| `06-error/03-type` | TypeErrorとValueError | TypeError・ValueErrorなど止まるエラー |
| `06-error/04-logic` | エラーは出ないが答えが違う | エラーの出ない誤り（バグ）を探す |
| `07-array/02-agg` | 平均・合計・最大 | 配列の平均・合計・最大（mean・sum・max） |
| `07-array/03-select` | 条件で取り出す | 条件で取り出す（ブールインデックス） |
| `07-array/05-shape` | 形と2次元配列 | 2次元配列と形（shape） |
| `07-array/06-axis` | 軸を指定して計算する | 軸（axis）を指定して集計する |
| `07-array/07-scores` | 点数表を配列で書き直す | 点数表をnumpyの配列で書き直す |
| `08-table/01-index` | 行と列を指定するインデックス | 2次元配列のインデックス（行と列） |
| `08-table/02-transpose` | 転置 | 転置（.T）で行と列を入れ替える |
| `08-table/03-broadcast` | 形の違う配列どうしの計算 | 形の違う配列どうしの計算（ブロードキャスト） |
| `08-table/04-range` | 並びを一度に作る | arange・linspace・zerosで配列を作る |
| `08-table/06-scores` | 点数表をこの章で習ったことで書き直す | 点数表をreshapeとブロードキャストで書き直す |
| `08p-practice2/01-combine` | 組み合わせる | 第1〜8章の書き方を組み合わせる |
| `08p-practice2/02-choose` | 手を選ぶ | 第1〜8章から解き方を選ぶ |
| `08q-mlintro/03-learn` | 規則を自動で探す | 訓練データで規則を自動で探す |
| `08q-mlintro/04-overfit` | 訓練データに合わせすぎる | 訓練データに合わせすぎる（過学習） |
| `09-matrix/02-dot` | 内積 | 内積で重み付きの合計を出す |
| `09-matrix/05-shape` | 形の決まり | 行列の積の形の決まり |
| `09-matrix/06-scores` | 点数表をこの章で習ったことで書き直す | 点数表に配点の重みを行列の積で掛ける |
| `10-slope/03-direction` | 傾きの符号と動く向き | 微分の符号と、値を小さくする向き |
| `10-slope/05-study` | 勉強時間と点数のずれを減らす向き | 偏微分で勉強時間と点数のずれを減らす向き |
| `11-probability/03-exp` | 負の数を正の数に変える | 指数関数（exp）で正の数に変える |
| `11-probability/04-log` | 積を和に変える | 対数（log）で積を和に変える |
| `11-probability/05-spread` | 散らばりを数で表す | 分散と標準偏差で散らばりを表す |
| `11-probability/06-scores` | 点数表をこの章で習ったことで書き直す | 点数表を標準化して偏差値を出す |
| `12-predict/01-model` | 予測を関数にする | 予測を関数にする（モデルとパラメータ） |
| `12-predict/03-search` | 候補を全部試す | パラメータの候補を全部試す |
| `12-predict/04-count` | 試す数が増えると | パラメータが増えると全部は試せない |
| `13-regression/04-multi` | 入力が複数のときの予測 | 入力が複数の線形回帰（行列で予測する） |
| `13-regression/05-standardize` | 入力をそろえてから学習する | 標準化で入力をそろえてから学習する |
| `14-classify/01-label` | 合格の割合を確率とみなす | 合否をラベル（1と0）で表す |
| `15-evaluate/03-accuracy` | 正解率を基準と比べる | 正解率をベースラインと比べる |
| `15q-pandas/01-read` | 表を読み込む | read_csvでCSVの表を読み込む |
| `15q-pandas/02-select` | 条件で行を取り出す | データフレームから条件で行を取り出す |
| `15q-pandas/04-encode` | 文字を数に置き換える | 辞書とmapで文字を数に置き換える |
| `15r-sklearn/01-fit` | 境目を探させる | 決定木を学習させる（fit・predict） |
| `15r-sklearn/03-split` | 訓練データとテストデータに分ける | train_test_splitで訓練データとテストデータに分ける |
| `15r-sklearn/04-depth` | 木を深くしすぎる | 決定木を深くしすぎる（max_depth） |

章の題は `src/lesson/chapters.ts` の `04-loop` だけ「第4章 for 文・while 文とリスト」→「第4章 for・while・リスト・辞書」にした（報告の案どおり。辞書が入ったため）。

## 2. 題の引用を直した場所（32か所）

「第N章M節（題）」の題の部分だけを新しい題にした。

| ファイル | 旧 → 新 |
|---|---|
| `src/content/lessons/08p-practice2/01-combine.mdx` | 名前を書いて引数を渡す → キーワード引数（名前を書いて渡す） |
| `src/content/lessons/08p-practice2/01-combine.mdx` | 条件で取り出す → 条件で取り出す（ブールインデックス） |
| `src/content/lessons/08p-practice2/01-combine.mdx` | 条件で取り出す → 条件で取り出す（ブールインデックス） |
| `src/content/lessons/08p-practice2/01-combine.mdx` | 軸を指定して計算する → 軸（axis）を指定して集計する |
| `src/content/lessons/08p-practice2/01-combine.mdx` | 行と列を指定するインデックス → 2次元配列のインデックス（行と列） |
| `src/content/lessons/08p-practice2/02-choose.mdx` | 平均・合計・最大 → 配列の平均・合計・最大（mean・sum・max） |
| `src/content/lessons/08p-practice2/02-choose.mdx` | 平均・合計・最大 → 配列の平均・合計・最大（mean・sum・max） |
| `src/content/lessons/08p-practice2/02-choose.mdx` | 軸を指定して計算する → 軸（axis）を指定して集計する |
| `src/content/lessons/08p-practice2/02-choose.mdx` | 行と列を指定するインデックス → 2次元配列のインデックス（行と列） |
| `src/content/lessons/08p-practice2/02-choose.mdx` | 形の違う配列どうしの計算 → 形の違う配列どうしの計算（ブロードキャスト） |
| `src/content/weekly/2026-09-29.mdx` | intとfloatを使い分ける → intとfloat・型の変換 |
| `src/content/weekly/2026-09-29.mdx` | intとfloatを使い分ける → intとfloat・型の変換 |
| `src/content/weekly/2026-10-06.mdx` | if文で条件によって処理を変える → if文と比較演算子で処理を変える |
| `src/content/weekly/2026-10-06.mdx` | if文で条件によって処理を変える → if文と比較演算子で処理を変える |
| `src/content/weekly/2026-10-06.mdx` | for文で繰り返す → for文とrange()で繰り返す |
| `src/content/weekly/2026-10-06.mdx` | append()とremove()でリストを変える → リストの操作（append・sort・sumなど） |
| `src/content/weekly/2026-10-13.mdx` | if文で条件によって処理を変える → if文と比較演算子で処理を変える |
| `src/content/weekly/2026-10-13.mdx` | if文で条件によって処理を変える → if文と比較演算子で処理を変える |
| `src/content/weekly/2026-10-13.mdx` | if文で条件によって処理を変える → if文と比較演算子で処理を変える |
| `src/content/weekly/2026-10-13.mdx` | append()とremove()でリストを変える → リストの操作（append・sort・sumなど） |
| `src/content/weekly/2026-10-13.mdx` | 関数を定義して呼び出す → defで関数を定義して呼び出す |
| `src/content/weekly/2026-10-13.mdx` | 名前を書いて引数を渡す → キーワード引数（名前を書いて渡す） |
| `src/content/weekly/2026-10-20.mdx` | append()とremove()でリストを変える → リストの操作（append・sort・sumなど） |
| `src/content/weekly/2026-10-20.mdx` | 平均・合計・最大 → 配列の平均・合計・最大（mean・sum・max） |
| `src/content/weekly/2026-10-20.mdx` | 平均・合計・最大 → 配列の平均・合計・最大（mean・sum・max） |
| `src/content/weekly/2026-10-20.mdx` | 条件で取り出す → 条件で取り出す（ブールインデックス） |
| `src/content/weekly/2026-10-20.mdx` | 条件で取り出す → 条件で取り出す（ブールインデックス） |
| `src/content/weekly/2026-10-20.mdx` | 軸を指定して計算する → 軸（axis）を指定して集計する |
| `src/content/weekly/2026-10-20.mdx` | 行と列を指定するインデックス → 2次元配列のインデックス（行と列） |
| `src/content/weekly/2026-10-20.mdx` | 転置 → 転置（.T）で行と列を入れ替える |
| `src/content/weekly/2026-10-20.mdx` | 並びを一度に作る → arange・linspace・zerosで配列を作る |
| `src/content/lessons/04p-practice1/01-combine.mdx` | 次の節「手を選ぶ」 → 「第1〜4章から解き方を選ぶ」 |

内訳: 今週の演習 `weekly/*.mdx` 21か所、練習編2（`08p-practice2`）10か所、練習編1 1か所。練習問題集（`src/content/practice`）のヒントには、題を括弧で引用している所は無かった（「第N章M節の最…」のように番号だけ）。

加えて、題を例にしたコメント2か所を直した: `src/pages/staff/activity.astro`・`src/server/member.ts` の「7.2 形と2次元配列」→「7.5 2次元配列と形（shape）」（元の例は節の番号も合っていなかった）。

## 3. 題が使われている所の確認

- 節の題は `scripts/build-tests.mjs`・`taught.mjs`・`exercise-place.ts` などが `data.title` として読むだけで、題の文字で何かを探す仕組みは無かった。「この節の書き方」（`src/lesson/syntax-list.ts`）は `since` に節の id を使っており、題は使っていない。id は変えていない。
- `src/lesson/plan.ts` の `label`・`title`（「numpy① 配列・平均・条件で取り出す」「タイタニック3 規則を自動で探す」「候補を全部試す」など）は、題を引用せず自由に書いた集まりの言葉なので直していない。
- `scripts/weekly-skills.mjs` の `name`（「名前を書いて引数を渡す」「並びを一度に作る（arange・linspace・zeros）」など）は、演習に必要な書き方の名前で、節の題とは別に付けたもの。直していない。
- `design/`（DECISIONS.md・spec・proposals など）の過去の記録に旧題が残っている（例: `design/spec/20-platform.md` の「第6章3節 TypeErrorとValueError」）。記録なので直していない。

## 4. 報告の案から変えたもの

- 4.4・6.3 は指示どおり「リストの操作（append・sort・sumなど）」「TypeError・ValueErrorなど止まるエラー」（中身に sort・sum、IndexError・KeyError が入っていることを確認）。
- 4.7 は今の題「辞書で名前から値を取り出す」が中身と合っているのでそのまま。
- 報告の案からの変更は無い（14.1 の案の括弧書き「11.1 と紛れないように」は題に入れていない。案の題そのものは「合否をラベル（1と0）で表す」）。

## 5. 検査

- `npm run build:tests`: 通った（108節 / 228問。「用語の検索の索引 19件、確かめてください」は第0章の用語など、今回の変更と関係ない従来からの通知）
- `npm run check:lessons`: 108節を検査して問題なし（目安から外れている所 185件は従来どおり、止めない種類）
- `npm run check:practice`: 29話題 / 135問を検査して問題なし
- `npm run check:weekly`: 4回を検査して問題なし
- `npm run build`: 通った
- commit はしていない。
