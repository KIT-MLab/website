/**
 * 構文の一覧（20-platform.md 第22.1節）。
 *
 * 今週の演習の問題のページの右の欄に出す早見表のデータ。分類ごとに「書き方・結果・短い説明」を
 * 並べ、分類の最後にその書き方を扱う節（`since`）へのリンクを出す（呼び出し側 = weekly-syntax.ts）。
 *
 * 中身は第1〜8章で実際に教えたものだけ。`code` を `py`（numpy 入り）で実際に実行し、
 * `result` がその通りの出力になることを確かめてある（確かめ方は design/HANDOFF.md の引き継ぎに書く
 * 代わりに、このファイルを作った作業のやり取りに残す）。分類名は Python の言葉そのまま（第22.1節）。
 *
 * `since` は、その書き方をはじめて教える節の frontmatter の `id`。今週の演習の画面
 * （src/pages/learn/weekly/[id].astro）が、この節の属する章の並び順と、回の frontmatter の
 * `chapters` の最後の章を比べて、範囲外の行を落とす。
 */

export type SyntaxEntry = {
  /** 書き方（コード）。複数行は改行区切り */
  code: string;
  /** 実際に実行した結果。出力が無いものは空文字 */
  result: string;
  /** 短い説明（日本語で25字ほど） */
  note: string;
  /** これをはじめて教える節の id（frontmatter の id） */
  since: string;
};

export type SyntaxCategory = {
  /** 分類の内部の呼び名。ボタンの syntax プロパティで指す */
  key: string;
  /** 画面に出す分類名。Python の言葉そのまま（第22.1節） */
  name: string;
  entries: SyntaxEntry[];
};

export const SYNTAX_CATEGORIES: SyntaxCategory[] = [
  {
    key: 'operators',
    name: '演算子',
    entries: [
      { code: '7 + 2', result: '9', note: '足す', since: 'python-01-print' },
      { code: '7 - 2', result: '5', note: '引く', since: 'python-01-variable' },
      { code: '7 * 2', result: '14', note: '掛ける', since: 'python-01-input' },
      { code: '7 / 2', result: '3.5', note: '割る（答えは小数）', since: 'python-02-int-float' },
      { code: '7 // 2', result: '3', note: '割った商（小数点以下を切り捨て）', since: 'python-02-operators' },
      { code: '7 % 2', result: '1', note: '割った余り', since: 'python-02-operators' },
      { code: '7 ** 2', result: '49', note: 'べき乗（7の2乗）', since: 'python-02-operators' },
      { code: '(1 + 2) * 3', result: '9', note: 'かっこの中が先', since: 'python-02-precedence' },
    ],
  },
  {
    key: 'print',
    name: 'print文',
    entries: [
      { code: 'print(5)', result: '5', note: '値を1行に表示', since: 'python-01-print' },
      { code: 'print("合計", 5)', result: '合計 5', note: 'コンマで並べると空白でつながる', since: 'python-01-print' },
      { code: 'print("合計", 5, "円")', result: '合計 5 円', note: 'いくつでも並べられる', since: 'python-01-print' },
      {
        code: 'print("合計" + str(5) + "円")',
        result: '合計5円',
        note: '文字列どうしを+でつなぐ。数はstr()で',
        since: 'python-01-fstring',
      },
      { code: 'x = 5\nprint(f"合計{x}円")', result: '合計5円', note: '{}の中に変数や式を書ける', since: 'python-01-fstring' },
      { code: 'print()', result: '', note: '何も渡さず空の行を出す', since: 'python-01-print' },
    ],
  },
  {
    key: 'input',
    name: 'input と型変換',
    entries: [
      { code: 'x = input()', result: '"5"（入力が5のとき）', note: '入力欄の1行を文字列で受け取る', since: 'python-01-input' },
      { code: 'int("5")', result: '5', note: '整数に直す', since: 'python-01-input' },
      { code: 'float("2.5")', result: '2.5', note: '小数に直す', since: 'python-02-int-float' },
      { code: 'int(7.9)', result: '7', note: '小数を整数に（切り捨て）', since: 'python-02-int-float' },
    ],
  },
  {
    key: 'round-math',
    name: 'round と math',
    entries: [
      { code: 'round(3.14159, 2)', result: '3.14', note: '小数第2位まで丸める', since: 'python-02-round' },
      { code: 'round(2.7)', result: '3', note: '桁数を省略すると整数に丸める', since: 'python-02-round' },
      { code: 'import math', result: '', note: '数学の関数を使う準備', since: 'python-02-math' },
      { code: 'math.sqrt(16)', result: '4.0', note: '平方根', since: 'python-02-math' },
      { code: 'math.pi', result: '3.141592653589793', note: '円周率（かっこは付けない）', since: 'python-02-math' },
    ],
  },
  {
    key: 'compare',
    name: '比較演算子',
    entries: [
      { code: '7 > 5', result: 'True', note: 'より大きい', since: 'python-03-if' },
      { code: '7 < 5', result: 'False', note: 'より小さい', since: 'python-03-if' },
      { code: '5 >= 5', result: 'True', note: '以上', since: 'python-03-if' },
      { code: '5 <= 3', result: 'False', note: '以下', since: 'python-03-if' },
      { code: '5 == 5', result: 'True', note: '等しい', since: 'python-03-if' },
      { code: '5 != 5', result: 'False', note: '等しくない', since: 'python-03-if' },
      { code: '60 >= 60 and 60 < 80', result: 'True', note: 'and は両方成り立つとき', since: 'python-03-andor' },
      { code: '60 < 0 or 60 > 100', result: 'False', note: 'or はどちらか一方でも成り立つとき', since: 'python-03-andor' },
      { code: 'not (60 >= 60)', result: 'False', note: 'not は条件を反転させる', since: 'python-03-andor' },
    ],
  },
  {
    key: 'if',
    name: 'if文',
    entries: [
      {
        code: 'score = 75\nif score >= 60:\n    print("合格")',
        result: '合格',
        note: '条件が成り立つときだけ実行する',
        since: 'python-03-if',
      },
      {
        code: 'score = 45\nif score >= 60:\n    print("合格")\nelse:\n    print("不合格")',
        result: '不合格',
        note: '成り立たなかったときはelse',
        since: 'python-03-else',
      },
      {
        code: 'score = 85\nif score >= 90:\n    print("優")\nelif score >= 80:\n    print("良")\nelse:\n    print("可")',
        result: '良',
        note: 'elifで3段階以上に分ける',
        since: 'python-03-elif',
      },
    ],
  },
  {
    key: 'for',
    name: 'for文',
    entries: [
      {
        code: 'for i in range(1, 4):\n    print(i)',
        result: '1\n2\n3',
        note: '1から3まで（終わりの数は含まない）',
        since: 'python-04-for',
      },
      { code: 'for i in range(3):\n    print(i)', result: '0\n1\n2', note: '1つだけ渡すと0から始まる', since: 'python-04-for' },
      {
        code: 'for v in [3, 7, 2]:\n    print(v)',
        result: '3\n7\n2',
        note: 'リストの値を先頭から順に取り出す',
        since: 'python-04-list',
      },
    ],
  },
  {
    key: 'while',
    name: 'while文',
    entries: [
      {
        code: 'count = 0\nwhile count < 3:\n    count = count + 1\nprint(count)',
        result: '3',
        note: '条件が成り立つ間だけ繰り返す',
        since: 'python-04-while',
      },
      {
        code: 'n = 5\nwhile n > 0:\n    n = n - 1\nprint(n)',
        result: '0',
        note: '成り立たなくなったら終わる',
        since: 'python-04-while',
      },
    ],
  },
  {
    key: 'list',
    name: 'リスト',
    entries: [
      { code: 'print([3, 7, 2])', result: '[3, 7, 2]', note: '値をまとめて持つ', since: 'python-04-list' },
      { code: 'numbers = [3, 7, 2]\nprint(numbers[0])', result: '3', note: '添字は0から数える', since: 'python-04-index' },
      { code: 'numbers = [3, 7, 2]\nprint(len(numbers))', result: '3', note: '値の数を調べる', since: 'python-04-index' },
      {
        code: 'numbers = [3, 7, 2]\nnumbers.append(9)\nprint(numbers)',
        result: '[3, 7, 2, 9]',
        note: '末尾に値を1つ加える',
        since: 'python-04-append',
      },
      {
        code: 'numbers = [3, 7, 2]\nnumbers.remove(7)\nprint(numbers)',
        result: '[3, 2]',
        note: '値を指定して取り除く',
        since: 'python-04-append',
      },
    ],
  },
  {
    key: 'function',
    name: '関数',
    entries: [
      {
        code: 'def show_average(a, b):\n    print(f"平均{(a + b) / 2}")\n\nshow_average(80, 90)',
        result: '平均85.0',
        note: '関数を定義して呼び出す',
        since: 'python-05-def',
      },
      {
        code: 'def average(a, b):\n    return (a + b) / 2\n\nprint(average(80, 90))',
        result: '85.0',
        note: 'returnで値を外に持ち帰る',
        since: 'python-05-return',
      },
      {
        code: 'def price_with_tax(amount, rate=0.1):\n    return amount * (1 + rate)\n\nprint(price_with_tax(1000))',
        result: '1100.0',
        note: '既定値があれば省略できる',
        since: 'python-05-args',
      },
      {
        code: 'def price_with_tax(amount, rate=0.1):\n    return amount * (1 + rate)\n\nprint(price_with_tax(1000, rate=0.2))',
        result: '1200.0',
        note: '名前を書いて渡す（順番を問わない）',
        since: 'python-05-keyword',
      },
    ],
  },
  {
    key: 'errors',
    name: 'よく出るエラー',
    entries: [
      { code: 'NameError', result: '', note: '使った名前が定義されていない（綴りミスが多い）', since: 'python-06-syntax' },
      { code: 'SyntaxError', result: '', note: '文の形が読み取れない（: 忘れ・全角記号など）', since: 'python-06-syntax' },
      { code: 'IndexError', result: '', note: '添字がリストや配列の範囲の外', since: 'python-06-read' },
      { code: 'TypeError', result: '', note: '型が合わない操作（文字列+数など）', since: 'python-06-type' },
      { code: 'ValueError', result: '', note: '型は合っているが値が変換できない', since: 'python-06-type' },
    ],
  },
  {
    key: 'numpy',
    name: 'numpy',
    entries: [
      { code: 'import numpy as np', result: '', note: 'numpyをnpという名前で使う準備', since: 'python-07-array' },
      {
        code: 'scores = np.array([40, 55, 50])\nprint(scores + 10)',
        result: '[50 65 60]',
        note: '要素ごとにまとめて計算する',
        since: 'python-07-array',
      },
      {
        code: 'scores = np.array([[80, 70, 90], [60, 50, 40]])\nprint(scores.shape)',
        result: '(2, 3)',
        note: '行数と列数を調べる',
        since: 'python-07-shape',
      },
      {
        code: 'scores = np.array([[80, 70, 90], [60, 50, 40]])\nprint(scores.mean())',
        result: '65.0',
        note: '配列全体の平均',
        since: 'python-07-stats',
      },
      {
        code: 'scores = np.array([[80, 70, 90], [60, 50, 40]])\nprint(scores.mean(axis=0))',
        result: '[70. 60. 65.]',
        note: '軸を指定すると方向ごとに計算',
        since: 'python-07-stats',
      },
      {
        code: 'scores = np.array([[80, 70, 90], [60, 50, 40]])\nprint(scores.sum(axis=1))',
        result: '[240 150]',
        note: 'sum・max・minも同じ形',
        since: 'python-07-stats',
      },
      {
        code: 'scores = np.array([40, 90, 55, 70, 30])\nprint(scores[scores >= 60])',
        result: '[90 70]',
        note: '条件に合う値だけ取り出す',
        since: 'python-07-select',
      },
      {
        code: 'scores = np.array([40, 90, 55, 70, 30])\nprint(scores[1:3])',
        result: '[90 55]',
        note: 'スライスで範囲を取り出す（終わりは含まない）',
        since: 'python-07-select',
      },
      {
        code: 'scores = np.array([[80, 70, 90], [60, 50, 40]])\nprint(scores[0, 1])',
        result: '70',
        note: '行と列をまとめて指定 [行, 列]',
        since: 'python-08-index',
      },
      {
        code: 'scores = np.array([[80, 70, 90], [60, 50, 40]])\nprint(scores[:, 1])',
        result: '[70 50]',
        note: ':ですべての行、列だけ絞る',
        since: 'python-08-index',
      },
      {
        code: 'scores = np.array([[80, 70, 90], [60, 50, 40]])\nprint(scores.T)',
        result: '[[80 60]\n [70 50]\n [90 40]]',
        note: '.Tで行と列を入れ替える',
        since: 'python-08-transpose',
      },
      {
        code: 'flat = np.array([80, 70, 90, 60, 50, 40])\nprint(flat.reshape(2, 3))',
        result: '[[80 70 90]\n [60 50 40]]',
        note: '並び順のまま形を変える',
        since: 'python-08-reshape',
      },
      {
        code: 'print(np.arange(0, 3, 0.5))',
        result: '[0.  0.5 1.  1.5 2.  2.5]',
        note: '始まり・終わり・きざみで並びを作る',
        since: 'python-08-range',
      },
      {
        code: 'print(np.linspace(0, 2, 5))',
        result: '[0.  0.5 1.  1.5 2. ]',
        note: '個数を指定して等間隔に並べる',
        since: 'python-08-range',
      },
      { code: 'print(np.zeros(3))', result: '[0. 0. 0.]', note: '0を指定した個数だけ並べる', since: 'python-08-range' },
    ],
  },
];

/** すべての分類の key（Exercise.astro の syntax プロパティの検査に使う）。 */
export const SYNTAX_CATEGORY_KEYS: string[] = SYNTAX_CATEGORIES.map((c) => c.key);
