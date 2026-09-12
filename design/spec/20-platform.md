# 教材仕様 20: 土台

ログイン、進度の保存、サイト内での Python 実行、演習の採点、先生の画面。
`00-overview.md` の第3.1節でいう「土台」の定義。実装はここに書かれたとおりに作る。

---

## 1. 技術構成

| 項目 | 決定 |
|---|---|
| フレームワーク | Astro（既存）。`@astrojs/cloudflare` アダプタを追加する |
| 出力 | ページは事前生成（prerender）。`/api/*` だけ `export const prerender = false` でサーバ実行 |
| ホスティング | Cloudflare Workers（既存の `KIT-MLab/website`、main への push で自動デプロイ） |
| データベース | Cloudflare D1 |
| Python 実行 | Pyodide。Web Worker の中で動かす |
| 対話部分 | React island（既存の `@astrojs/react`） |
| 本文の置き場 | Astro content collections。1節＝1つの `.mdx`（`@astrojs/mdx` を追加する） |
| コード入力欄 | CodeMirror 6（`codemirror`、`@codemirror/lang-python`） |

依存の追加はこの表にあるものだけ。それ以外を足したくなったら仕様書に追記して合意してから入れる。

コード入力欄に CodeMirror を使う理由は**行番号**である。Python のエラーは `line 3` のように行番号で場所を示す。行番号のない入力欄では、エラーメッセージを読む練習ができない。

---

## 2. 本文の書式

### 2.1 ファイルの置き方

```
src/content/lessons/
  00-start/
    01-pc.mdx
    02-how-to-use.mdx
  01-python/
    01-print.mdx
    ...
```

ディレクトリ名が章、ファイル名が節。番号順に並ぶ。

### 2.2 frontmatter

```yaml
---
id: python-01-print          # 全体で一意。進度の記録に使う
chapter: 01-python
title: print文で値を表示する
minutes: 12                  # 想定所要時間
terms: [print, 文字列, 引数]  # この節で初出の用語。用語集に登録済みであること
---
```

### 2.3 本文で使う部品

Markdown に加えて、次の部品だけを使う。これ以外の独自部品を足さない。

| 部品 | 用途 |
|---|---|
| `<Run>` | その場で実行できるコード例。実行結果を下に出す |
| `<Mistake>` | よくある間違い。壊れたコード・エラーメッセージ・直し方の3つを持つ |
| `<Exercise>` | 課題。エディタと採点ボタンを出す |
| `<Level0>` | レベル0でだけ開いた状態で出る操作の補足 |
| `<Experiment>` | 図・実験を埋め込む（第4部以降で使う） |

書き方の例:

```mdx
<Run>
print("Hello")
</Run>

<Mistake code={`print(“Python”)`} error={`SyntaxError: invalid character '“' (U+201C)`}>
全角のダブルクォートを使っています。`"` は半角で入力してください。
</Mistake>

<Exercise id="python-01-print-b1" kind="build" ...>
3つの数を受け取り、いちばん大きい数を返す関数 `largest` を書いてください。
</Exercise>
```

### 2.4 規約の自動検査

`scripts/check-lessons.mjs` を作る。全 `.mdx` を読み、`10-lesson-and-writing.md` 第8章のチェックリストのうち機械判定できるものを検査する。

検査する項目:

1. 要素の順序（困る例 → やってみる → 説明 → よくある間違い → 課題）
2. `<Run>` が「説明」より前にあること
3. `<Mistake>` が1〜3個
4. `<Exercise>` が4〜7個、うち `kind="build"` が1個以上
5. `kind="build"` の `tests` に3件以上の入力があり、境界（0・負・同値・空のいずれか）を含むこと
6. すべての文が60字以内（句点で区切って数える。コードブロックと表は除く）
7. すべての段落が3文以内
8. 本文が400〜800字（コードブロック・課題・表を除く）
9. 禁止表現（`10-lesson-and-writing.md` 第4.2節）を含まないこと
10. 抽象語の言い換え（第4.3節の左列）を含まないこと
11. 本文に `！` を含まないこと
12. `terms` の全語が用語集にあること
13. `<Level0>` の中に用語集の語が出てこないこと（概念の説明が紛れていないかの近似判定）

**この検査はビルドの前に走らせ、失敗したらビルドを止める。**

---

## 3. Python の実行

### 3.1 動かし方

- Pyodide を Web Worker で動かす。UI を止めない
- 初回は約10MB の読み込みが要る。**最初の1回だけ、進捗の出るバーを出す**。2回目以降はブラウザのキャッシュから
- ページを開いた時点では読み込まない。**最初に ▶ を押したときに読み込む**
- 1回の実行の上限は**5秒**。超えたら止めて「時間がかかりすぎたので止めました。無限ループになっていないか確認してください」と出す
- 実行ごとに変数を引き継がない。1つの `<Run>` や `<Exercise>` は独立して動く

### 3.2 `input()` の扱い

既存の Colab 教材は `input()` を多用していた。ブラウザの `prompt` は使わない。

- コード欄の下に**「入力」欄**を置く。複数行書ける
- `input()` はこの欄を上から1行ずつ読む
- 行が尽きたら `EOFError` ではなく、「入力欄が空です。入力欄に値を書いてから実行してください」と出す
- 課題の採点では、入力欄の中身も採点側が指定する

### 3.3 使えるライブラリ

第1部では標準ライブラリと `math`、`random` のみ。第2部で `numpy` を足す。`matplotlib` は使わない（図はこちらで描く）。

`random` を使う課題では、採点時に種を固定する。

---

## 4. 演習と採点

### 4.1 課題の型

```ts
type Exercise = {
  id: string;
  kind: 'trace' | 'modify' | 'build';
  prompt: string;           // 問題文（mdx の中身）
  starter?: string;         // modify で渡す動くコード。build では渡さない
  stdin?: string;           // 入力欄の初期値
  tests: Test[];
  hints: string[];          // 段階的に出すヒント。0〜3個
  mistakes: string[];       // この課題で当てはめる「よくある間違い」の id
};

type Test =
  | { kind: 'stdout'; stdin?: string; expect: string }        // 出力の一致
  | { kind: 'call'; fn: string; args: unknown[]; expect: unknown }; // 関数の呼び出し結果
```

### 4.2 期待値の作り方

**模範解答をブラウザに配らない。** 代わりに、ビルド時に模範解答を実行して `expect` を埋める。

- 模範解答は `src/content/lessons/**/solutions/*.py` に置く。**このディレクトリはビルド成果物に含めない**
- `scripts/build-tests.mjs` が模範解答を実行し、`expect` を持つテスト定義を生成する
- 生成物だけがブラウザに渡る

模範解答をここで全部読むので、**使い回しの照合もここでやる**（`10-lesson-and-writing.md` 第3.5節）。
同じ節で2つの課題の模範解答が同じなら不合格。「組む」の模範解答がその節の `<Run>` か例題の
「打つコード」と同じでも不合格。比較は空白と改行の違いを除いて行う。

### 4.3 採点の流れ

1. 学習者のコードを Pyodide で実行する
2. `tests` を順に走らせる
3. 全部通れば合格。1つでも落ちたら不合格
4. 不合格のとき、次の順で応答を選ぶ
   1. **実行時にエラーが出た場合**: その節の `<Mistake>` の `error` と照合する。前方一致すれば、その `<Mistake>` の説明を出す
   2. 照合しない場合: エラーの型（`NameError`、`SyntaxError` 等）ごとの一般的な説明を出す
   3. **エラーは出ないが結果が違う場合**: 最初に落ちたテストの入力と、期待した値と、実際の値を並べて出す
5. 3回落ちたら `hints` の1つ目を出す。以降1回落ちるごとに次のヒントを出す

**単なる「不正解」だけを返してはいけない。** `00-overview.md` 第3.3節の受け入れ条件。

### 4.3.1 模範解答の開示

**通したあとだけ見える。** 合格すると、その課題に「別の書き方を見る」が出る。

- 模範解答は `/api/solution/:exerciseId` から取る。**その利用者にその課題の合格済みの提出があるときだけ返す**
- ビルド成果物に模範解答を含めない（第4.2節）ので、通す前に読み出す手段はない
- ログインしていない人は合格を記録できないため、模範解答も見られない
- 落とした回数では開かない。待てば見えると分かると、考えるのをやめる人が出る

### 4.4 判定の緩さ

- 出力の比較は、**行末の空白と末尾の改行を無視**する
- 数値の比較は、浮動小数点なら相対誤差 `1e-9` まで許す
- **模範解答と違う書き方でも、テストが通れば合格**とする。書き方の指定は問題文に書いた範囲（「`max` は使わないでください」など）だけを、提出コードの文字列検査で確認する

### 4.5 記録

採点を走らせるたびに、**提出されたコードと結果を D1 に記録する**。先生が読むため。

---

## 5. アカウント

### 5.1 方針

外部にも公開する。内部（勉強会のメンバー）と外部（見に来た人）を見分けられること。重い本人確認はしないが、簡単ななりすましは防ぐ。

### 5.2 登録

1. 招待コード（例: `KIT-2026A`）を入力する
2. 表示名を決める
3. サーバが**利用者ID**（例: `u_7QK3M9`）と**合言葉**（6桁の数字）を発行し、画面に出す
4. 「控えました」を押すと先へ進む

招待コードは先生が発行する。コードごとに**所属**（内部 / 外部）と、既定のロール（学生）が決まる。

**外部から来た人も登録して全機能を使える。** サイトに常設の公開コードを1つ置き、学習ページから登録できるようにする。採点も進度の保存も内部の学生と同じ。先生の画面では**内部と外部を別のタブに分け、既定では内部だけを表示する**。

### 5.3 ログイン

- 登録した端末は、署名付き Cookie で自動的にログインした状態になる（有効期間180日）
- 別の端末では、**利用者ID と合言葉**で入る
- 合言葉を忘れた場合、先生が管理画面から再発行する

### 5.4 ロール

| ロール | できること |
|---|---|
| 学生 | 自分の進度と提出の閲覧。先生からのコメントの閲覧 |
| 先生 | 自分の所属の全学生の進度・提出の閲覧、コメント、招待コードの発行、合言葉の再発行 |
| 管理者 | 上記すべて。**先生ロールの付与と剥奪** |

先生を増やす操作は管理画面の1画面で済ませる。利用者IDを入れて「先生にする」を押す。

### 5.5 扱う個人情報

**表示名だけ**。メールアドレス、学籍番号、本名は集めない。登録画面に「表示名は他の学習者には見えません。先生には見えます」と明記する。

---

## 6. データベース

Cloudflare D1。テーブルは次の7つ。

```sql
-- 所属（招待コード1つにつき1行）
CREATE TABLE cohorts (
  code       TEXT PRIMARY KEY,          -- 'KIT-2026A'
  name       TEXT NOT NULL,             -- '2026年度 春'
  kind       TEXT NOT NULL,             -- 'internal' | 'external'
  created_at INTEGER NOT NULL
);

-- 利用者
CREATE TABLE users (
  id           TEXT PRIMARY KEY,        -- 'u_7QK3M9'
  cohort_code  TEXT NOT NULL REFERENCES cohorts(code),
  display_name TEXT NOT NULL,
  role         TEXT NOT NULL,           -- 'student' | 'teacher' | 'admin'
  pass_hash    TEXT NOT NULL,           -- 合言葉のハッシュ
  level        INTEGER NOT NULL,        -- 0 | 1 | 2
  created_at   INTEGER NOT NULL,
  last_seen_at INTEGER NOT NULL
);

-- 節ごとの進度
CREATE TABLE progress (
  user_id    TEXT NOT NULL REFERENCES users(id),
  lesson_id  TEXT NOT NULL,             -- frontmatter の id
  state      TEXT NOT NULL,             -- 'opened' | 'done'
  opened_at  INTEGER NOT NULL,
  done_at    INTEGER,
  seconds    INTEGER NOT NULL DEFAULT 0, -- 滞在の合計
  PRIMARY KEY (user_id, lesson_id)
);

-- 課題の提出（1回の採点につき1行）
CREATE TABLE submissions (
  id          INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id     TEXT NOT NULL REFERENCES users(id),
  exercise_id TEXT NOT NULL,
  code        TEXT NOT NULL,
  passed      INTEGER NOT NULL,          -- 0 | 1
  failed_test INTEGER,                   -- 落ちたテストの番号
  error_type  TEXT,                      -- 'NameError' 等
  created_at  INTEGER NOT NULL
);

-- 確認問題の回答
CREATE TABLE answers (
  user_id    TEXT NOT NULL REFERENCES users(id),
  question_id TEXT NOT NULL,
  choice     TEXT NOT NULL,
  correct    INTEGER NOT NULL,
  tries      INTEGER NOT NULL,
  created_at INTEGER NOT NULL,
  PRIMARY KEY (user_id, question_id)
);

-- 先生からのコメント
CREATE TABLE comments (
  id          INTEGER PRIMARY KEY AUTOINCREMENT,
  to_user_id  TEXT NOT NULL REFERENCES users(id),
  from_user_id TEXT NOT NULL REFERENCES users(id),
  lesson_id   TEXT,
  exercise_id TEXT,
  body        TEXT NOT NULL,
  read_at     INTEGER,
  created_at  INTEGER NOT NULL
);

-- ログインの控え
CREATE TABLE sessions (
  token      TEXT PRIMARY KEY,
  user_id    TEXT NOT NULL REFERENCES users(id),
  expires_at INTEGER NOT NULL
);
```

進度は**節を開いた時点で `opened`**、その節の課題を全部通した時点で `done` にする。

---

## 7. API

`/api/` の下。すべて JSON。ログインが要るものは Cookie のセッションで判定する。

| メソッド | 経路 | 用途 |
|---|---|---|
| POST | `/api/register` | 招待コードと表示名で登録。IDと合言葉を返す |
| POST | `/api/login` | 利用者IDと合言葉でログイン |
| POST | `/api/logout` | ログアウト |
| GET | `/api/me` | 自分の情報と進度をまとめて返す |
| POST | `/api/progress` | 節を開いた／終えた、滞在時間を送る |
| POST | `/api/submit` | 課題の提出（コード・合否・落ちたテスト・エラー型） |
| POST | `/api/answer` | 確認問題の回答 |
| GET | `/api/teacher/roster` | 所属の全学生の進度一覧（先生以上） |
| GET | `/api/teacher/stuck` | 詰まっている学生と箇所（先生以上） |
| GET | `/api/teacher/user/:id` | 1人の詳細と提出コード（先生以上） |
| POST | `/api/teacher/comment` | コメントを書く（先生以上） |
| POST | `/api/teacher/cohort` | 招待コードの発行（先生以上） |
| POST | `/api/admin/role` | ロールの変更（管理者のみ） |

進度の送信は**節を離れるときと30秒ごと**にまとめて送る。1操作ごとには送らない。

---

## 8. 先生の画面

`/teacher/` の下。先生ロール以上でだけ開ける。

### 8.1 一覧

学生を行、章を列にした表。セルは**未着手 / 開いた / 済**の3状態を色で示す。行の末尾に最終アクセス日。

並び替えは「進度が遅い順」を既定にする。勉強会の前に、遅れている人から見るため。

### 8.2 詰まっているところ

次の条件のどれかに当てはまる学生と箇所を並べる。**この画面が先生の画面の主役**。

| 条件 | しきい値 |
|---|---|
| 同じ課題を繰り返し落としている | 5回以上落ちて未通過 |
| 同じ節に長くとどまっている | 想定所要時間の3倍以上 |
| 最後のアクセスから間が空いた | 10日以上 |

各行から、その学生の提出コードに1クリックで飛べる。

### 8.3 問いごとの正答率

課題と確認問題を、**正答率の低い順**に並べる。これは学生ではなく**教材を直すための画面**。分母が5人未満のものは灰色にする。

### 8.4 1人の詳細

進度、提出コードの履歴（新しい順）、確認問題の回答、コメントのやりとり。

提出コードは**そのまま表示する**。整形しない。書き方の癖と誤解を読むためなので、直したものを見せては意味がない。

### 8.5 コメント

節または課題に紐づけて書く。学生側では、その節を開いたときに本文の横に出る。未読のコメントがあれば、上部に件数を出す。

---

## 9. 第1期の受け入れ条件

土台の完成は、次がすべて通ることで判定する。

1. `npm run check:lessons` が通る（第2.4節の検査）
2. 未登録の状態でサイトに来て、公開の招待コードで登録でき、IDと合言葉が発行される
3. 別のブラウザからIDと合言葉でログインできる
4. `<Run>` の ▶ を押すと5秒以内に結果が出る（Pyodide の初回読み込みを除く）
5. `input()` を使うコードが、入力欄の中身を読んで動く
6. 無限ループを書いて実行すると5秒で止まり、その旨が出る
7. `kind="build"` の課題に模範解答と違う正しい解を出すと合格する
8. 全角のダブルクォートを含むコードを提出すると、その節の `<Mistake>` の説明が出る
9. 同じ課題を5回落とすと、先生の画面の「詰まっているところ」に出る
10. 先生がコメントを書くと、学生側の該当の節に出る
11. 管理者が利用者IDを指定して先生ロールを付けられる
12. ログアウトした状態でも本文は読める（進度は記録されない）

---

## 10. 先生に聞く

学習者が詰まったその場で質問を送れるようにする。宿題中に詰まった人を、次の勉強会まで放置しないため。

### 10.1 学習者側

- 右レールの「先生に聞く」から送る
- 送信時に、**いま開いている節のIDと、直前に提出したコード（あれば）を自動で添える**。学習者は状況を説明しなくてよい
- 本文は必須。空では送れない
- 送ったあとは、その節に自分の質問と返信が残る
- 返信が来たら、上部に件数が出る

### 10.2 先生側

- `/teacher/questions` に未返信のものから並ぶ
- 各行に、質問・節・添付されたコード・その学生の進度が同じ画面で見える。別の画面に飛ばない
- 返信すると、第8.5節のコメントとして学生に届く

### 10.3 テーブル

```sql
CREATE TABLE questions (
  id          INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id     TEXT NOT NULL REFERENCES users(id),
  lesson_id   TEXT NOT NULL,
  exercise_id TEXT,
  code        TEXT,                    -- 直前の提出。無ければ NULL
  body        TEXT NOT NULL,
  answered_at INTEGER,
  created_at  INTEGER NOT NULL
);
```

API: `POST /api/question`（学習者）、`GET /api/teacher/questions`（先生以上）。返信は `POST /api/teacher/comment` を使う。

---

## 11. 第0章「パソコンの操作」の範囲

レベル0で必修、レベル1で任意、レベル2では確認テストで飛ばせる。

### 11.1 扱うもの

| 項目 | 扱い方 |
|---|---|
| 全角と半角、日本語入力の切り替え | **この教材で最も事故が多い箇所。** `（` `”` `：` `＝` `１００` `，` の全角が実際に踏まれている。半角で入力する練習を、その場の入力欄でさせる |
| 記号の入力方法 | `"` `_` `#` `*` `[` `{` `|` `~` の位置と Shift の組み合わせ。**キーボードの配列は人によって違う**ので、図で教えるのではなく、入力欄に打たせて合っているか判定する |
| ファイルとフォルダ、拡張子 | 保存先が分かる、拡張子を表示する設定にする。第5部（自分の環境）で必須になる |
| コピーと貼り付け、選択 | `Ctrl+C` `Ctrl+V` `Ctrl+A`、ドラッグでの選択、行の選択 |
| 取り消し | `Ctrl+Z`。**書き間違えたコードを戻せると分かっているかどうかで、手の動きが変わる** |

### 11.2 扱わないもの

- 文章を書くこと自体（レポートで既にやっている）
- 機種やOSによって違う操作（特定のノートPC固有のキーなど）
- タッチタイピング

### 11.3 書き方

**説明より練習を主にする。** この章だけは、本文を短くして入力欄を多く置く。判定は入力された文字列を直接見る（半角になっているか、記号が合っているか）。Python の実行は使わない。
