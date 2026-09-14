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
  { name: '比較演算子',       in: 'python-03-if',         re: /[=!<>]=|[<>][^=]/ },
  { name: 'else',           in: 'python-03-else',       re: /^[ \t]*else\s*:/m },
  { name: 'elif',           in: 'python-03-elif',       re: /^[ \t]*elif\s/m },
  { name: 'and / or / not', in: 'python-03-andor',      re: /\b(and|or|not)\b/ },
];
