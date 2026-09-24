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
 */

/** 道具の並び。`in` はその道具を導入する節の id。 */
export const PYTHON_TOOLS = [
  { name: 'print',          in: 'python-01-print',      re: /\bprint\s*\(/ },
  { name: 'input()',        in: 'python-01-input',      re: /\binput\s*\(/ },
  { name: 'int()',          in: 'python-01-input',      re: /\bint\s*\(/ },
  { name: '変数',            in: 'python-01-variable',   re: /^[ \t]*[A-Za-z_]\w*\s*=(?!=)/m },
  { name: 'f文字列',         in: 'python-01-fstring',    re: /f"|f'/ },
  { name: '文字列の連結（+）', in: 'python-01-fstring',    re: /["']\s*\+|\+\s*["']/ },
  { name: 'str()',          in: 'python-01-fstring',    re: /\bstr\s*\(/ },
  { name: 'float()',        in: 'python-02-int-float',  re: /\bfloat\s*\(/ },
  { name: 'round()',        in: 'python-02-round',      re: /\bround\s*\(/ },
  { name: '**',             in: 'python-02-operators',  re: /\*\*/ },
  { name: '%',              in: 'python-02-operators',  re: /[^%\s]\s*%\s*[^%\s]/ },
  { name: '//',             in: 'python-02-operators',  re: /\/\// },
  { name: 'import',         in: 'python-02-math',       re: /^[ \t]*import\s/m },
  { name: 'math',           in: 'python-02-math',       re: /\bmath\./ },
  { name: 'if',             in: 'python-03-if',         re: /^[ \t]*if\s/m },
  { name: '>= <=',          in: 'python-03-if',         re: /[<>]=/ },
  { name: '> <',            in: 'python-03-if',         re: /[<>](?!=)/ },
  { name: '==',             in: 'python-03-if',         re: /==/ },
  { name: '!=',             in: 'python-03-if',         re: /!=/ },
  { name: 'else',           in: 'python-03-else',       re: /^[ \t]*else\s*:/m },
  { name: 'elif',           in: 'python-03-elif',       re: /^[ \t]*elif\s/m },
  { name: 'and / or / not', in: 'python-03-andor',      re: /\b(and|or|not)\b/ },

  /* ここから下はまだ書いていない章（30-python-curriculum.md 第4章の課程表）。
     **先に順番を決めて置いてある。** こうしておけば、書き手が先の道具に手を伸ばした
     瞬間に検査16 が落とす。第1.1節が print しか教えていないのに input() を使う課題を
     置いてしまったのは、順番が機械に入っていなかったからである。
     `in` の節の id もここで決めてある。書くときはこの id に合わせる。 */

  // 第4章 繰り返す
  { name: 'for',            in: 'python-04-for',      re: /^[ \t]*for\s/m },
  { name: 'range()',        in: 'python-04-for',      re: /\brange\s*\(/ },
  { name: 'リスト',          in: 'python-04-list',     re: /=\s*\[|\[\s*\]/ },
  { name: '添字 []',         in: 'python-04-index',    re: /\w\s*\[\s*[^\]]*\s*\]/ },
  { name: 'len()',          in: 'python-04-index',    re: /\blen\s*\(/ },
  { name: 'append()',       in: 'python-04-append',   re: /\.append\s*\(/ },
  { name: 'remove()',       in: 'python-04-append',   re: /\.remove\s*\(/ },
  { name: 'while',          in: 'python-04-while',    re: /^[ \t]*while\s/m },

  // 第5章 まとめて名前を付ける
  { name: 'def',            in: 'python-05-def',      re: /^[ \t]*def\s/m },
  { name: 'return',         in: 'python-05-return',   re: /^[ \t]*return\b/m },
  { name: '既定値のある引数',  in: 'python-05-args',     re: /def\s+\w+\s*\([^)]*=[^)]*\)/ },
  /* 呼び出す側の = 。定義側（既定値）とは別の道具である（第5.4節）。
     第7.2節の np.mean(scores, axis=0) がこれに当たる。def の行は数えない。
     数えると、既定値を定義している行そのものに当たってしまう */
  { name: '名前を書いて渡す引数', in: 'python-05-keyword',  re: /^(?!\s*def\b).*\b\w+\([^)]*\b[A-Za-z_]\w*\s*=[^=)]/m },

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
  { name: '行と列の添字 [i, j]', in: 'python-08-index',  re: /\w\[[^\[\]]*,[^\[\]]*\]/ },
  { name: '転置 .T',        in: 'python-08-transpose', re: /\.T\b/ },
  { name: 'arange / linspace / zeros', in: 'python-08-range', re: /np\.(arange|linspace|zeros)\s*\(/ },
  { name: 'reshape',        in: 'python-08-reshape',  re: /\.reshape\s*\(/ },

  // 第9章 ベクトルと行列（40-part2-curriculum.md 第2節）。内積も行列の積も同じ @ で書く
  { name: '内積・行列の積 @', in: 'python-09-dot',     re: /[\w)\]]\s*@\s*[\w([]/ },
];
