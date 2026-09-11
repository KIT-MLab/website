# Cloudflare 側の設定手順（ユーザーが行う作業）

進度の保存に Cloudflare D1 を使う。D1 の作成と Worker への紐付けは、あなたの Cloudflare アカウントでの操作になるため、Claude では代行できない。ここに手順を残す。

**この作業が済むまでは、進度は各自のブラウザにだけ保存される。** 教材の本文と採点は先に動く。

---

## 1. 何をするか

1. D1 データベースを1つ作る
2. そのデータベースを、いまサイトを動かしている Worker に紐付ける
3. 発行された ID を `wrangler.jsonc` に書く（この1行だけ私が使う）
4. 秘密鍵を1つ登録する（ログインの署名に使う）

所要はおそらく10分程度。

---

## 2. 手順

### 2.1 D1 データベースを作る

1. https://dash.cloudflare.com にログイン
2. 左のメニューから **Storage & Databases** → **D1**
3. **Create database** を押す
4. 名前を `mlab-course` にする（名前は変えてよいが、変えたら教えてください）
5. 作成後の画面に出る **Database ID**（`xxxxxxxx-xxxx-...` の形）を控える

### 2.2 Worker に紐付ける

1. 左のメニューから **Compute (Workers)** → いまサイトを動かしている Worker（`website` のはず）を開く
2. **Settings** → **Bindings** → **Add** → **D1 database**
3. Variable name に `DB`（**この名前でないと動きません**）
4. D1 database に、いま作った `mlab-course` を選ぶ
5. **Deploy** を押す

### 2.3 秘密鍵を登録する

ログインの Cookie に署名するための鍵。

1. 同じ Worker の **Settings** → **Variables and Secrets** → **Add**
2. Type を **Secret** にする
3. Variable name に `SESSION_SECRET`
4. Value に、長いランダムな文字列を入れる。作り方の例（どちらでもよい）
   - ブラウザのアドレス欄で使えないので、コマンドプロンプトで
     ```
     powershell -Command "[Convert]::ToBase64String((1..48|%{Get-Random -Max 256}))"
     ```
   - またはパスワード生成サイトで64文字程度のものを作る
5. **Deploy** を押す

### 2.4 私に伝えること

- **Database ID**（2.1 で控えたもの）
- データベース名を変えた場合はその名前
- Worker の名前が `website` でない場合はその名前

`SESSION_SECRET` の中身は**伝えないでください**。Cloudflare 側に入っていれば動きます。

---

## 3. 私の側でやること

上記を受け取ったあとに私が行う。

1. `wrangler.jsonc` に D1 の紐付けを書く（Database ID が入る）
2. `migrations/0001_init.sql` にテーブル定義を置く（`20-platform.md` 第6章と第10.3節）
3. `npx wrangler d1 migrations apply mlab-course --remote` でテーブルを作る
4. 最初の招待コードを2つ登録する
   - 内部用（勉強会のメンバー向け）
   - 外部用（常設の公開コード）
5. あなたのアカウントを管理者にする

---

## 4. 費用

D1 の無料枠は、1日あたり読み取り500万行・書き込み10万行、保存容量5GB。

この教材の想定（学習者30人が週に数時間）では、1日の書き込みは数千行に収まる見込み。**無料枠を超える見込みはない。**

---

## 5. まだ決めていないこと

- 本番のデータベースと、開発用のデータベースを分けるか。分けないと、開発中の操作が本番の記録に混ざる。**分けることを勧める**（`mlab-course-dev` をもう1つ作る）。判断はあとで
