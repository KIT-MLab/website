/**
 * 今週の演習で確かめる技能の一覧（20-platform.md 第24章）。
 *
 * 2026-09-26、利用者が 9/29 の問題を解いて「全部が // や % に寄りすぎて、ほかの技能が
 * 確認できない」と指摘した。どの技能を確かめ、どれを確かめていないかを切り分けるため、
 * 技能を章ごとに並べ、模範解答のコードから機械で見分ける。
 *
 * `re` は模範解答のコードに当てる。**見分けの付くものだけ**を書く（python-tools.mjs と同じ方針）。
 * 見分けられない技能（手順を組み立てる、など）はここに入れず、第24.3節に人が見る項目として書く。
 * `basic: true` は、ほぼ全部の問題で使う土台（print・input など）。偏りの判定には数えない。
 *
 * 表は `npm run report:weekly` で見る（scripts/report-weekly.mjs）。
 */

/** @typedef {{ key: string, chapter: string, name: string, re: RegExp, basic?: boolean }} Skill */

/** @type {Skill[]} */
export const SKILLS = [
  // 第1章
  { key: 'print', chapter: '01-python', name: 'print で表示する', re: /\bprint\s*\(/, basic: true },
  { key: 'input-int', chapter: '01-python', name: 'input で受け取り int() で数に直す', re: /\bint\s*\(\s*input\s*\(/, basic: true },
  { key: 'format', chapter: '01-python', name: '文章の形に組み立てる（f文字列・+ と str()・カンマ区切り）', re: /f"|f'|\bstr\s*\(|print\s*\([^)\n]*,/, basic: true },
  // 第2章
  { key: 'float', chapter: '02-numbers', name: '小数を受け取る・割り算で小数を作る（float・/）', re: /\bfloat\s*\(|[^/]\/[^/=]/ },
  { key: 'round', chapter: '02-numbers', name: 'round() で桁をそろえる', re: /\bround\s*\(/ },
  { key: 'pow', chapter: '02-numbers', name: 'べき乗 **', re: /\*\*/ },
  { key: 'divmod', chapter: '02-numbers', name: '商 // と余り %', re: /\/\/|[^%\s]\s*%\s*[^%\s]/ },
  { key: 'paren', chapter: '02-numbers', name: '計算の順番をかっこで決める', re: /\([^()\n]*[-+][^()\n]*\)\s*[*/]|[*/]\s*\([^()\n]*[-+][^()\n]*\)/ },
  { key: 'math', chapter: '02-numbers', name: 'math モジュール（sqrt・pi など）', re: /\bmath\./ },
  // 第3章
  { key: 'if', chapter: '03-branch', name: 'if / else で分ける', re: /^[ \t]*if\s/m },
  { key: 'elif', chapter: '03-branch', name: 'elif で3段階以上に分ける', re: /^[ \t]*elif\s/m },
  { key: 'andor', chapter: '03-branch', name: 'and・or・not で条件を組み合わせる', re: /\b(and|or|not)\b/ },
  // 第4章
  { key: 'for-range', chapter: '04-loop', name: 'for と range で決まった回数繰り返す', re: /^[ \t]*for\s+\w+\s+in\s+range\s*\(/m },
  { key: 'for-list', chapter: '04-loop', name: 'for でリストの値を順に見る', re: /^[ \t]*for\s+\w+\s+in\s+(?!range\b)[A-Za-z_]\w*\s*:/m },
  { key: 'list-build', chapter: '04-loop', name: 'リストを作って append で足していく', re: /\.append\s*\(/ },
  { key: 'index-len', chapter: '04-loop', name: 'インデックスと len() で位置を指定する', re: /\blen\s*\(|\b[a-z_]\w*\[\s*-?\w+\s*\]/ },
  { key: 'while', chapter: '04-loop', name: 'while で終わりを決めずに繰り返す', re: /^[ \t]*while\s/m },
  { key: 'accumulate', chapter: '04-loop', name: '繰り返しの中で数える・足し上げる', re: /\+=|\b(\w+)\s*=\s*\1\s*\+/ },
  // 第5章
  { key: 'def-return', chapter: '05-function', name: '関数を作って値を返す（def・return）', re: /^[ \t]*return\b/m },
  { key: 'default-arg', chapter: '05-function', name: 'デフォルト引数', re: /def\s+\w+\s*\([^)]*=[^)]*\)/ },
  { key: 'keyword-arg', chapter: '05-function', name: '名前を書いて引数を渡す', re: /^(?!\s*def\b).*\b\w+\([^)]*\b[A-Za-z_]\w*\s*=[^=)]/m },
  // 第7章
  { key: 'np-elementwise', chapter: '07-array', name: 'numpy の配列を作る', re: /\bnp\.array\s*\(/, basic: true },
  { key: 'np-agg', chapter: '07-array', name: '合計・平均・最大（sum・mean・max・min）', re: /\.(sum|mean|max|min)\s*\(|np\.(sum|mean|max|min)\s*\(/ },
  { key: 'np-axis', chapter: '07-array', name: '軸を指定する（axis）', re: /axis\s*=/ },
  { key: 'np-mask', chapter: '07-array', name: 'ブールインデックス（配列[条件]）', re: /\w\[[^\]\n]*(<|>|==|!=)[^\]\n]*\]/ },
  { key: 'np-slice', chapter: '07-array', name: 'スライスで範囲を取り出す', re: /\[[^\]\n]*:[^\]\n]*\]/ },
  // 第8章
  { key: 'np-ij', chapter: '08-table', name: '行と列のインデックス [i, j]・[:, j]', re: /\w\[[^\[\]\n]*,[^\[\]\n]*\]/ },
  { key: 'np-T', chapter: '08-table', name: '転置 .T', re: /\.T\b/ },
  { key: 'np-make', chapter: '08-table', name: '並びを一度に作る（arange・linspace・zeros）', re: /np\.(arange|linspace|zeros)\s*\(/ },
  { key: 'np-reshape', chapter: '08-table', name: 'reshape で表にする', re: /\.reshape\s*\(/ },
];
