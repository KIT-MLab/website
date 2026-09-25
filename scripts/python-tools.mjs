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
  { name: 'input()',        in: 'python-01-input',      re: /\binput\s*\(/, term: 'input' },
  { name: 'int()',          in: 'python-01-input',      re: /\bint\s*\(/, term: 'int' },
  { name: '変数',            in: 'python-01-variable',   re: /^[ \t]*[A-Za-z_]\w*\s*=(?!=)/m },
  { name: 'f文字列',         in: 'python-01-fstring',    re: /f"|f'/ },
  { name: '文字列の連結（+）', in: 'python-01-fstring',    re: /["']\s*\+|\+\s*["']/, desc: '文字列どうしを `+` でつなげて、1つの文字列にする書き方。`"合計" + "点"` は `"合計点"` になる。' },
  { name: 'str()',          in: 'python-01-fstring',    re: /\bstr\s*\(/, term: 'str' },
  { name: 'float()',        in: 'python-02-int-float',  re: /\bfloat\s*\(/, term: 'float' },
  { name: 'round()',        in: 'python-02-round',      re: /\bround\s*\(/, term: 'round' },
  { name: '**',             in: 'python-02-operators',  re: /\*\*/, term: 'べき乗' },
  { name: '%',              in: 'python-02-operators',  re: /[^%\s]\s*%\s*[^%\s]/, term: '剰余' },
  { name: '//',             in: 'python-02-operators',  re: /\/\//, term: '整数除算' },
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
  { name: '添字 []',         in: 'python-04-index',    re: /\w\s*\[\s*[^\]]*\s*\]/, term: '添字' },
  { name: 'len()',          in: 'python-04-index',    re: /\blen\s*\(/, term: 'len' },
  { name: 'append()',       in: 'python-04-append',   re: /\.append\s*\(/, term: 'append' },
  { name: 'remove()',       in: 'python-04-append',   re: /\.remove\s*\(/, term: 'remove' },
  { name: 'while',          in: 'python-04-while',    re: /^[ \t]*while\s/m, term: 'while文' },

  // 第5章 まとめて名前を付ける
  { name: 'def',            in: 'python-05-def',      re: /^[ \t]*def\s/m },
  { name: 'return',         in: 'python-05-return',   re: /^[ \t]*return\b/m },
  { name: '既定値のある引数',  in: 'python-05-args',     re: /def\s+\w+\s*\([^)]*=[^)]*\)/, term: '既定値' },
  /* 呼び出す側の = 。定義側（既定値）とは別の道具である（第5.4節）。
     第7.2節の np.mean(scores, axis=0) がこれに当たる。def の行は数えない。
     数えると、既定値を定義している行そのものに当たってしまう */
  { name: '名前を書いて渡す引数', in: 'python-05-keyword',  re: /^(?!\s*def\b).*\b\w+\([^)]*\b[A-Za-z_]\w*\s*=[^=)]/m, term: 'キーワード引数' },

  // 第7章 数をまとめて扱う（numpy）。第6章は新しい道具を増やさない
  { name: 'numpy',          in: 'python-07-array',    re: /\bnumpy\b|\bnp\./ },
  /* 入れ子のリストで作る2次元の配列。軸（axis=）はこれが分かっていないと読めない。
     書かせたとき、7.2（軸）が 7.3（2次元配列）より前で [[...]] を使っていた。
     用語集の検査18 は章の単位でしか見ないので、章の中の順番は台帳でしか見られない */
  { name: '2次元配列',       in: 'python-07-shape',    re: /\[\s*\[/ },
  { name: 'スライス',        in: 'python-07-select',   re: /\[[^\]]*:[^\]]*\]/ },

  // 第8章 表の形を扱う（numpy）。形の違う配列どうしの計算（8.3）は見分けが付かないので載せない
  /* 名前の直後の [ ] の中にコンマがあるもの。a[1, 2] や a[:, 0]。
     np.array([[1, 2], [3, 4]]) は [ の直前が ( か空白なので当たらない */
  { name: '行と列の添字 [i, j]', in: 'python-08-index',  re: /\w\[[^\[\]]*,[^\[\]]*\]/, desc: '2次元配列から、行と列を指定して取り出す書き方。`a[1, 2]` は1行目の2列目（添字は0から数える）。`a[:, 0]` は0列目を丸ごと取り出す。' },
  { name: '転置 .T',        in: 'python-08-transpose', re: /\.T\b/, term: '転置' },
  { name: 'arange / linspace / zeros', in: 'python-08-range', re: /np\.(arange|linspace|zeros)\s*\(/, desc: '決まった並びの配列を一度に作る関数。`np.arange(0, 5)` は0から4まで1ずつ、`np.linspace(0, 1, 5)` は0から1までを等しい間隔で5個、`np.zeros(3)` は0を3個並べる。' },
  { name: 'reshape',        in: 'python-08-reshape',  re: /\.reshape\s*\(/ },

  // 第9章 ベクトルと行列（40-part2-curriculum.md 第2節）。内積も行列の積も同じ @ で書く
  { name: '内積・行列の積 @', in: 'python-09-dot',     re: /[\w)\]]\s*@\s*[\w([]/, term: ['内積','行列の積'] },

  // 第11章 確率の初歩（40-part2-curriculum.md 第4節）
  { name: 'np.exp',         in: 'python-11-exp',      re: /np\.exp\s*\(/, term: '指数関数' },
  { name: 'np.log',         in: 'python-11-log',      re: /np\.log\s*\(/, term: '対数' },
  { name: 'np.var / np.std', in: 'python-11-spread',  re: /np\.(var|std)\s*\(|\.(var|std)\s*\(/, term: ['分散','標準偏差'] },

  /* まだどの節でも教えていない道具。導入する節が無いので、どこで使っても落ちる（検査16）。
     第10章の書き手が a, b = 7, 30 を5か所で使い、読んで見つけた（2026-09-24）。
     教える節が決まったら、in をその節の id に直す */
  { name: '1行で複数の変数に入れる a, b = …', in: 'python-99-unpack', re: /^[ \t]*[A-Za-z_]\w*\s*,\s*[A-Za-z_]\w*\s*=(?!=)/m },
  /* 1行で書く条件式 x if 条件 else y。第3章で教えたのは行を分ける if / else だけ。
     第10.5節の書き手が使い、読んで見つけた（2026-09-24） */
  { name: '1行で書く条件式 … if … else …', in: 'python-99-ternary', re: /\S[ \t]+if[ \t]+[^:\n]+[ \t]else[ \t]+\S/ },
];
