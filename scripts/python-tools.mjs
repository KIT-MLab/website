/**
 * Python の道具の導入順（30-python-curriculum.md 第4章の課程表）。
 *
 * **これは課程表の写しではなく、機械が読む台帳である。** 節がここに書かれた節より前で
 * その道具を使っていたら、検査16 が落とす。
 *
 * 教材でいちばん起こしやすい誤りは「まだ教えていない道具を、先の節で教える前提で使う」
 * ことである。書き手は自分が知っているので気づかない。読み手は詰まるが、何が足りないのかを
 * 言葉にできない。人の目で見つけるのは難しく、機械なら確実に見つかる。
 *
 * `re` は**見分けの付くものだけ**を書く。曖昧なものは台帳に入れない。誤検出を出すくらいなら
 * 見逃すほうがよい（検査13 で同じ失敗をしている）。
 *
 * 用語の検索（20-platform.md 第18章）もこの台帳を読む。書き方ごとに、どちらか1つを書く。
 *   - `term`: 用語集（design/spec/glossary.md）の同じものを指す語。検索ではその用語の札に合わせる
 *   - `desc`: 用語集に無い書き方の、札に出す1〜2文の説明
 * 名前が用語集の語と同じもの（print など）はどちらも要らない。どれも無いと build:tests が止まる。
 */

/** 道具の並び。`in` はその道具を導入する節の id。 */
export const PYTHON_TOOLS = [
  { name: 'print',          in: 'python-01-print',      re: /\bprint\s*\(/ },
  { name: '変数',            in: 'python-01-variable',   re: /^[ \t]*[A-Za-z_]\w*\s*=(?!=)/m },
  { name: 'input()',        in: 'python-01-input-basic', re: /\binput\s*\(/, term: 'input' },
  { name: 'int()',          in: 'python-01-input',      re: /\bint\s*\(/, term: 'int' },
  { name: 'f文字列',         in: 'python-01-fstring',    re: /f"|f'/ },
  { name: '文字列の連結（+）', in: 'python-01-fstring',    re: /["']\s*\+|\+\s*["']/, desc: '文字列どうしを `+` でつなげて、1つの文字列にする書き方。`"合計" + "点"` は `"合計点"` になる。' },
  { name: 'str()',          in: 'python-01-fstring',    re: /\bstr\s*\(/, term: 'str' },
  { name: 'float()',        in: 'python-02-int-float',  re: /\bfloat\s*\(/, term: 'float' },
  { name: 'round()',        in: 'python-02-round',      re: /\bround\s*\(/, term: 'round' },
  { name: '**',             in: 'python-02-operators',  re: /\*\*/, term: 'べき乗' },
  { name: '%',              in: 'python-02-operators',  re: /[^%\s]\s*%\s*[^%\s]/, term: '余り' },
  { name: '//',             in: 'python-02-operators',  re: /\/\//, term: '切り捨て除算' },
  { name: 'import',         in: 'python-02-math',       re: /^[ \t]*import\s/m },
  { name: 'math',           in: 'python-02-math',       re: /\bmath\./ },
  { name: 'if',             in: 'python-03-if',         re: /^[ \t]*if\s/m, term: 'if文' },
  { name: '>= <=',          in: 'python-03-if',         re: /[<>]=/, desc: '2つの値を比べる書き方。`a >= b` は a が b 以上のとき、`a <= b` は a が b 以下のときに成り立つ。' },
  { name: '> <',            in: 'python-03-if',         re: /[<>](?!=)/, desc: '2つの値を比べる書き方。`a > b` は a が b より大きいとき、`a < b` は a が b より小さいときに成り立つ。' },
  { name: '==',             in: 'python-03-if',         re: /==/, desc: '2つの値が等しいかを調べる書き方。変数に入れる `=` とは別のもの。' },
  { name: '!=',             in: 'python-03-if',         re: /!=/, desc: '2つの値が等しくないかを調べる書き方。等しくないときに成り立つ。' },
  { name: 'else',           in: 'python-03-else',       re: /^[ \t]*else\s*:/m },
  { name: 'elif',           in: 'python-03-elif',       re: /^[ \t]*elif\s/m },
  { name: 'and / or / not', in: 'python-03-andor',      re: /\b(and|or|not)\b/, term: ['and','or','not'] },

  /* ここから下はまだ書いていない章（30-python-curriculum.md 第4章の課程表）。
     **先に順番を決めて置いてある。** こうしておけば、書き手が先の道具に手を伸ばした
     瞬間に検査16 が落とす。第1.1節が print しか教えていないのに input() を使う課題を
     置いてしまったのは、順番が機械に入っていなかったからである。
     `in` の節の id もここで決めてある。書くときはこの id に合わせる。 */

  // 第4章 繰り返す
  { name: 'for',            in: 'python-04-for',      re: /^[ \t]*for\s/m, term: 'for文' },
  { name: 'range()',        in: 'python-04-for',      re: /\brange\s*\(/, term: 'range' },
  { name: 'リスト',          in: 'python-04-list',     re: /=\s*\[|\[\s*\]/ },
  { name: 'インデックス []',   in: 'python-04-index',    re: /\w\s*\[\s*[^\]]*\s*\]/, term: 'インデックス' },
  { name: 'len()',          in: 'python-04-index',    re: /\blen\s*\(/, term: 'len' },
  { name: 'append()',       in: 'python-04-append',   re: /\.append\s*\(/, term: 'append' },
  { name: 'remove()',       in: 'python-04-append',   re: /\.remove\s*\(/, term: 'remove' },
  { name: 'while',          in: 'python-04-while',    re: /^[ \t]*while\s/m, term: 'while文' },

  // 第5章 まとめて名前を付ける
  { name: 'def',            in: 'python-05-def',      re: /^[ \t]*def\s/m },
  { name: 'return',         in: 'python-05-return',   re: /^[ \t]*return\b/m },
  { name: 'デフォルト引数',    in: 'python-05-args',     re: /def\s+\w+\s*\([^)]*=[^)]*\)/, term: 'デフォルト値' },
  /* 呼び出す側の = 。定義側（デフォルト値）とは別の道具である（第5.4節）。
     第7.2節の np.mean(scores, axis=0) がこれに当たる。def の行は数えない。
     数えると、デフォルト値を定義している行そのものに当たってしまう */
  { name: '名前を書いて渡す引数', in: 'python-05-keyword',  re: /^(?!\s*def\b).*\b\w+\([^)]*\b[A-Za-z_]\w*\s*=[^=)]/m, term: 'キーワード引数' },

  // 第7章 数をまとめて扱う（numpy）。第6章は新しい道具を増やさない
  { name: 'numpy',          in: 'python-07-array',    re: /\bnumpy\b|\bnp\./ },
  /* 入れ子のリストで作る2次元の配列。軸（axis=）はこれが分かっていないと読めない。
     書かせたとき、7.2（軸）が 7.3（2次元配列）より前で [[...]] を使っていた。
     用語集の検査18 は章の単位でしか見ないので、章の中の順番は台帳でしか見られない */
  { name: '2次元配列',       in: 'python-07-shape',    re: /\[\s*\[/ },
  // 2026-10-06: リストのスライスを第4章3節の「この節の書き方」の表に載せたので、そこから使ってよい（話題のホームの決定。表に載せた書き方は課題で使ってよい）
  { name: 'スライス',        in: 'python-04-index',    re: /\[[^\]]*:[^\]]*\]/ },

  // 第8章 表の形を扱う（numpy）。形の違う配列どうしの計算（8.3）は見分けが付かないので載せない
  /* 名前の直後の [ ] の中にコンマがあるもの。a[1, 2] や a[:, 0]。
     np.array([[1, 2], [3, 4]]) は [ の直前が ( か空白なので当たらない */
  { name: '行と列のインデックス [i, j]', in: 'python-08-index',  re: /\w\[[^\[\]]*,[^\[\]]*\]/, desc: '2次元配列から、行と列を指定して取り出す書き方。`a[1, 2]` は1行目の2列目（インデックスは0から数える）。`a[:, 0]` は0列目を丸ごと取り出す。' },
  { name: '転置 .T',        in: 'python-08-transpose', re: /\.T\b/, term: '転置' },
  { name: 'arange / linspace / zeros', in: 'python-08-range', re: /np\.(arange|linspace|zeros)\s*\(/, desc: '決まった並びの配列を一度に作る関数。`np.arange(0, 5)` は0から4まで1ずつ、`np.linspace(0, 1, 5)` は0から1までを等しい間隔で5個、`np.zeros(3)` は0を3個並べる。' },
  { name: 'reshape',        in: 'python-08-reshape',  re: /\.reshape\s*\(/ },

  // 第9章 ベクトルと行列（40-part2-curriculum.md 第2節）。内積も行列の積も同じ @ で書く
  { name: '内積・行列の積 @', in: 'python-09-dot',     re: /[\w)\]]\s*@\s*[\w([]/, term: ['内積','行列の積'] },

  // 第11章 確率の初歩（40-part2-curriculum.md 第4節）
  { name: 'np.exp',         in: 'python-11-exp',      re: /np\.exp\s*\(/, term: '指数関数' },
  { name: 'np.log',         in: 'python-11-log',      re: /np\.log\s*\(/, term: '対数' },
  { name: 'np.var / np.std', in: 'python-11-spread',  re: /np\.(var|std)\s*\(|\.(var|std)\s*\(/, term: ['分散','標準偏差'] },

  // 第15章 評価（50-part3-curriculum.md 第2.4節）
  { name: 'np.random.default_rng / .permutation', in: 'python-08-range', re: /np\.random\.default_rng\s*\(|\.permutation\s*\(/, desc: '乱数の種を固定して、配列の並びをランダムに混ぜる書き方。`np.random.default_rng(7)` は種7の乱数の生成器を作り、`.permutation(n)` はその生成器を使って0からn-1の整数をランダムな順に並べた配列を返す。種が同じなら、並びは何度実行しても同じになる。' },
  { name: 'np.polyfit / np.polyval', in: 'python-15-overfit', re: /np\.polyfit\s*\(|np\.polyval\s*\(/, desc: 'データに当てはまる曲線を求める関数。`np.polyfit(x, y, 次数)` は、指定した次数までの曲線のうち誤差の2乗の平均が最も小さくなる係数を一度に求め、`np.polyval(係数, x)` はその係数で予測の値を求める。' },

  /* 第15章 pandas・scikit-learn（56-tools-curriculum.md 第7節の表。2026-10-06 に足した）。
     表にだけ載せた書き方（isnull・dropna・get_dummies・RandomForestClassifier など）は、後の節で使ってよいので台帳に入れない。
     辞書と & | は、本文で教える節が pandas の節より前にある（第4章7節・第7章3節）ので、そちらを `in` にした。
     from … import … は、第2章5節の「この節の書き方」の表で教えているため入れない */
  { name: '辞書 {"キー": 値}', in: 'python-04-dict',      re: /\{\s*["'][^"'\n]*["']\s*:/, term: '辞書' },
  { name: '要素ごとの and / or（& と |）', in: 'python-07-select', re: /(?<!&)&(?!&)|(?<!\|)\|(?!\|)/, desc: '2つの条件（True と False の並び）を、要素ごとにつなぐ書き方。`&` は両方が True の位置だけ True、`|` はどちらかが True の位置が True になる。それぞれの条件は `( )` で囲む。' },
  { name: 'pandas',         in: 'python-15q-read',      re: /\bpandas\b|\bpd\./ },
  { name: 'pd.read_csv',    in: 'python-15q-read',      re: /\.read_csv\s*\(/, desc: 'CSV ファイルを読み込んで、表（データフレーム）にする書き方。`pd.read_csv("train.csv")` は、`train.csv` の表を読み込む。' },
  { name: '.head()',        in: 'python-15q-read',      re: /\.head\s*\(/, desc: '表の最初の数行を取り出す書き方。`df.head(3)` は最初の3行で、数を省くと5行になる。' },
  { name: '.isna()',        in: 'python-15q-missing',   re: /\.isna\s*\(/, desc: '値が欠けているか（欠損値か）を調べる書き方。`df["Age"].isna()` は、欠けた所が True の列を返し、`.sum()` を続けると欠けた数になる。' },
  { name: '.fillna()',      in: 'python-15q-missing',   re: /\.fillna\s*\(/, desc: '欠損値を、決めた値で埋める書き方。`df["Age"].fillna(30)` は、欠けた所を 30 にした列を返す。表そのものは変わらないので、`df["Age"] = …` で入れ直す。' },
  { name: '.map()',         in: 'python-15q-encode',    re: /\.map\s*\(/, desc: '列の値を、辞書にしたがって別の値に置き換える書き方。`df["Sex"].map({"male": 0, "female": 1})` は、`male` を 0、`female` を 1 にした列を返す。' },
  { name: '.fit() / .predict()', in: 'python-15r-fit',  re: /\.(fit|predict)\s*\(/, desc: 'scikit-learn のモデルで、学習と予測をする書き方。`model.fit(X, y)` は特徴量 X と答え y から学習し、`model.predict(X)` は X の予測を返す。' },
  { name: 'DecisionTreeClassifier', in: 'python-15r-fit', re: /DecisionTreeClassifier/, term: '決定木' },
  { name: 'train_test_split', in: 'python-15r-split',  re: /train_test_split/, desc: 'データを訓練データとテストデータに分ける関数。`train_test_split(X, y, test_size=0.2, random_state=0)` は、2割をテストデータにして、`X_train, X_test, y_train, y_test` の順に返す。' },

  /* まだどの節でも教えていない道具。導入する節が無いので、どこで使っても落ちる（検査16）。
     第10章の書き手が a, b = 7, 30 を5か所で使い、読んで見つけた（2026-09-24）。
     教える節が決まったら、in をその節の id に直す */
  // scikit-learn 3（メンバーだけの章 15r-sklearn）で train_test_split と一緒に教える（2026-10-03 代表の選択。design/spec/56-tools-curriculum.md 第5節 G）
  // 2026-10-06 代表の決定でホームを第1章2節へ（in を python-01-variable に。表の行も第1章2節に置いた）
  { name: '1行で複数の変数に入れる a, b = …', in: 'python-01-variable', re: /^[ \t]*[A-Za-z_]\w*(\s*,\s*[A-Za-z_]\w*)+\s*=(?!=)/m, desc: '関数が返した複数の値を、コンマで並べた変数に順に入れる書き方。`a, b = 関数(…)` と書くと、1つ目が `a`、2つ目が `b` に入る。' },
  /* 1行で書く条件式 x if 条件 else y。第3章で教えたのは行を分ける if / else だけ。
     第10.5節の書き手が使い、読んで見つけた（2026-09-24） */
  { name: '1行で書く条件式 … if … else …', in: 'python-99-ternary', re: /\S[ \t]+if[ \t]+[^:\n]+[ \t]else[ \t]+\S/ },
  /* None を変数に入れる書き方と、is None で調べる書き方。第5章で「return が無いと None が返る」とだけ
     説明した。第12章の書き手が best_loss = None と is None を使い、読んで見つけた（2026-09-25） */
  { name: 'None を入れる・is None で調べる', in: 'python-99-none', re: /\bis\s+(not\s+)?None\b|=\s*None\b/ },
];
