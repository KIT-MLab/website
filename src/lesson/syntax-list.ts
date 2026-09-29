/**
 * 構文の一覧（20-platform.md 第22.1節）。
 *
 * 今週の演習の問題のページの右の欄に出す早見表のデータ。分類ごとに「書き方・結果・短い説明」を
 * 並べ、分類の最後にその書き方を扱う節（`since`）へのリンクを出す（呼び出し側 = weekly-syntax.ts）。
 * 同じデータから、各節の説明のあとの「この節の書き方」の表も作る（`since` がその節の行だけ。
 * src/components/lesson/SectionSyntax.astro。DECISIONS.md「書き方のまとめ（2026-09-27）」）。
 *
 * 中身は第1〜15章で実際に教えたものだけ。`code` を `py`（numpy 入り）で実際に実行し、
 * `result` がその通りの出力になることを確かめてある（確かめ方は design/HANDOFF.md の引き継ぎに書く
 * 代わりに、このファイルを作った作業のやり取りに残す）。分類名は Python の言葉そのまま（第22.1節）。
 * numpy の行は `import numpy as np` を済ませた前提で書く（`import numpy as np` の行を除く）。
 *
 * `since` は、その書き方をはじめて教える節の frontmatter の `id`。**節の表に出る場所でもある**ので、
 * 本文でその書き方を扱っている節にする。今週の演習の画面（src/pages/learn/weekly/[id].astro）が、
 * この節の属する章の並び順と、回の frontmatter の `chapters` の最後の章を比べて、範囲外の行を落とす。
 * 分類の中は `since` の節の順に並べる（節の表はこの順に出る）。
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
      { code: 'print(2 + 3)', result: '5', note: '足し算', since: 'python-01-print' },
      { code: 'print(7 - 2)', result: '5', note: '引き算', since: 'python-01-print' },
      { code: 'print(4 * 3)', result: '12', note: '掛け算', since: 'python-01-print' },
      { code: 'print(7 / 2)', result: '3.5', note: '割り算（答えは小数。詳しくは第2章1節）', since: 'python-01-print' },
      { code: 'print(9 / 3)', result: '3.0', note: '割り切れても答えは float', since: 'python-02-int-float' },
      { code: 'print(1 + 2.5)', result: '3.5', note: '整数と小数を混ぜると float になる', since: 'python-02-int-float' },
      { code: 'print(7 // 2)', result: '3', note: '割った商（小数点以下を切り捨て）', since: 'python-02-operators' },
      { code: 'print(7 % 2)', result: '1', note: '割った余り', since: 'python-02-operators' },
      { code: 'print(7 ** 2)', result: '49', note: 'べき乗（7の2乗）', since: 'python-02-operators' },
      { code: 'print((1 + 2) * 3)', result: '9', note: 'かっこの中が先', since: 'python-02-precedence' },
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
    key: 'variable',
    name: '変数',
    entries: [
      { code: 'price = 100\nprint(price + 50)', result: '150', note: '名前に値を結び付けて使う', since: 'python-01-variable' },
      { code: 'a = 1\na = 3\nprint(a)', result: '3', note: '入れ直すと前の値は残らない', since: 'python-01-variable' },
      { code: 'a = 1\na = a + 10\nprint(a)', result: '11', note: 'いまの値をもとに入れ直す', since: 'python-01-variable' },
    ],
  },
  {
    key: 'input',
    name: 'input と型変換',
    entries: [
      { code: 'input()', result: '"5"（入力が5のとき）', note: '入力欄の1行を文字列で受け取る', since: 'python-01-input-basic' },
      { code: 'name = input()\nprint("こんにちは", name)', result: 'こんにちは 佐藤（入力が佐藤のとき）', note: '読み取った1行を変数に入れて使う', since: 'python-01-input-basic' },
      { code: 'a = input()\nb = input()\nprint(b, a)', result: '青 赤（入力が赤と青の2行のとき）', note: '呼ぶたびに次の行を上から読む', since: 'python-01-input-basic' },
      { code: 'print(input())', result: '佐藤（入力が佐藤のとき）', note: '変数に入れずにそのまま表示', since: 'python-01-input-basic' },
      { code: 'print(int("5") + 1)', result: '6', note: '整数に直す', since: 'python-01-input' },
      { code: 'print(float("2.5"))', result: '2.5', note: '小数に直す', since: 'python-02-int-float' },
      { code: 'print(int(7.9))', result: '7', note: '小数を整数に（切り捨て）', since: 'python-02-int-float' },
    ],
  },
  {
    key: 'round-math',
    name: 'round と math',
    entries: [
      { code: 'print(round(3.14159, 2))', result: '3.14', note: '小数第2位まで丸める', since: 'python-02-round' },
            { code: 'print(round(2.7))', result: '3', note: '桁数を省略すると整数に丸める', since: 'python-02-round' },
      { code: 'print(round(2.5))', result: '2', note: 'ちょうど真ん中は偶数の側に丸まる', since: 'python-02-round' },
      { code: 'import math', result: '', note: '数学の関数を使う準備', since: 'python-02-math' },
      { code: 'print(math.sqrt(16))', result: '4.0', note: '平方根', since: 'python-02-math' },
      { code: 'print(math.pi)', result: '3.141592653589793', note: '円周率（かっこは付けない）', since: 'python-02-math' },
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
      { code: 'numbers = [3, 7, 2]\nprint(numbers[0])', result: '3', note: 'インデックスは0から数える', since: 'python-04-index' },
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
        note: 'デフォルト値があれば省略できる',
        since: 'python-05-args',
      },
      {
        code: 'def price_with_tax(amount, rate=0.1):\n    return amount * (1 + rate)\n\nprint(price_with_tax(1000, rate=0.2))',
        result: '1200.0',
        note: '名前を書いて渡す（順番を問わない）',
        since: 'python-05-keyword',
      },
      {
        code: 'x = 10\n\ndef show():\n    x = 5\n\nshow()\nprint(x)',
        result: '10',
        note: '関数の中で付けた名前は外に出ない（スコープ）',
        since: 'python-05-scope',
      },
    ],
  },
  {
    key: 'errors',
    name: 'よく出るエラー',
    entries: [
      { code: 'NameError', result: '', note: '使った名前が定義されていない（綴りミスが多い）', since: 'python-06-syntax' },
      { code: 'SyntaxError', result: '', note: '文の形が読み取れない（: 忘れ・全角記号など）', since: 'python-06-syntax' },
      { code: 'IndexError', result: '', note: 'インデックスがリストや配列の範囲の外', since: 'python-06-read' },
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
        code: 'a = np.array([60, 70, 80])\nb = np.array([40, 55, 50])\nprint(a - b)',
        result: '[20 15 30]',
        note: '配列どうしは同じ位置の値で計算',
        since: 'python-07-array',
      },
      {
        code: 'scores = np.array([80, 70, 90])\nprint(scores.mean())',
        result: '80.0',
        note: '配列の値すべての平均',
        since: 'python-07-agg',
      },
      {
        code: 'scores = np.array([80, 70, 90])\nprint(scores.sum())\nprint(scores.max())\nprint(scores.min())',
        result: '240\n90\n70',
        note: '合計・最大・最小も同じ形',
        since: 'python-07-agg',
      },
      {
        code: 'scores = np.array([40, 90, 55, 70, 30])\nprint(scores[scores >= 60])',
        result: '[90 70]',
        note: '条件に合う値だけ取り出す',
        since: 'python-07-select',
      },
      {
        code: 'scores = np.array([40, 90, 55, 70, 30])\nprint(len(scores[scores >= 60]))',
        result: '2',
        note: '条件に合う値の個数を数える',
        since: 'python-07-select',
      },
      {
        code: 'scores = np.array([40, 90, 55, 70, 30])\nprint(scores[1:3])',
        result: '[90 55]',
        note: 'スライスで範囲を取り出す（終わりは含まない）',
        since: 'python-07-slice',
      },
      {
        code: 'scores = np.array([40, 90, 55, 70, 30])\nprint(scores[:3])\nprint(scores[2:])',
        result: '[40 90 55]\n[55 70 30]',
        note: '始まりを省くと先頭から、終わりを省くと最後まで',
        since: 'python-07-slice',
      },
      {
        code: 'table = []\ntable.append([80, 70, 90])\ntable.append([60, 50, 40])\nprint(np.array(table))',
        result: '[[80 70 90]\n [60 50 40]]',
        note: 'リストを並べたリストから2次元配列を作る',
        since: 'python-07-shape',
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
        note: '2次元でも配列全体の平均',
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
        note: 'sum・max・minにもaxisを付けられる',
        since: 'python-07-stats',
      },
      {
        code: 'print(np.round(np.array([81.66, 49.24]), 1))',
        result: '[81.7 49.2]',
        note: '配列の値をまとめて丸める',
        since: 'python-07-scores',
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
        code: 'scores = np.array([[80, 70, 90], [60, 50, 40]])\nprint(scores - scores.mean(axis=0))',
        result: '[[ 10.  10.  25.]\n [-10. -10. -25.]]',
        note: 'どの行からも同じ並びを引く（ブロードキャスト）',
        since: 'python-08-broadcast',
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
  {
    key: 'linalg',
    name: 'ベクトルと行列',
    entries: [
      {
        code: 'v = np.array([3, 4])\nprint(np.sqrt(np.sum(v ** 2)))',
        result: '5.0',
        note: 'ベクトルの長さ（2乗の和の平方根）',
        since: 'python-09-vector',
      },
      {
        code: 'a = np.array([80, 70])\nb = np.array([77, 74])\nprint(np.sqrt(np.sum((a - b) ** 2)))',
        result: '5.0',
        note: '2つのベクトルの距離（差の長さ）',
        since: 'python-09-vector',
      },
      {
        code: 'a = np.array([80, 70, 90])\nw = np.array([0.3, 0.3, 0.4])\nprint(a @ w)',
        result: '81.0',
        note: '内積（同じ位置どうし掛けて足す）',
        since: 'python-09-dot',
      },
      {
        code: 'a = np.array([80, 70, 90])\nw = np.array([0.3, 0.3, 0.4])\nprint(np.sum(a * w))',
        result: '81.0',
        note: '@ と同じ値になる',
        since: 'python-09-dot',
      },
      {
        code: 'scores = np.array([[80, 70, 90], [60, 50, 40]])\nw = np.array([0.3, 0.3, 0.4])\nprint(scores @ w)',
        result: '[81. 49.]',
        note: '行列とベクトルの積（各行とwの内積）',
        since: 'python-09-matvec',
      },
      {
        code: 'A = np.array([[1, 2], [3, 4]])\nB = np.array([[1, 0], [0, 2]])\nprint(A @ B)',
        result: '[[1 4]\n [3 8]]',
        note: '行列の積（左の行と右の列の内積）',
        since: 'python-09-matmul',
      },
      {
        code: 'A = np.array([[1, 2, 3], [4, 5, 6]])\nprint((A @ A.T).shape)',
        result: '(2, 2)',
        note: '(n, k) @ (k, m) は (n, m)。合わなければ .T で転置',
        since: 'python-09-shape',
      },
    ],
  },
  {
    key: 'slope',
    name: '傾きと微分',
    entries: [
      { code: 'print((80 - 65) / (6 - 3))', result: '5.0', note: '変化率（傾き）＝縦の変化÷横の変化', since: 'python-10-rate' },
      {
        code: 'def f(x):\n    return x ** 2\n\nh = 0.0001\nprint(round((f(3 + h) - f(3)) / h, 2))',
        result: '6.0',
        note: '微分を近似する（幅hを小さくした傾き）',
        since: 'python-10-derivative',
      },
      {
        code: 'def f(a, b):\n    return a ** 2 + 3 * b\n\nh = 0.0001\nprint(round((f(1 + h, 2) - f(1, 2)) / h, 2))',
        result: '2.0',
        note: '偏微分を近似する（aだけ動かし、bは止める）',
        since: 'python-10-partial',
      },
    ],
  },
  {
    key: 'probability',
    name: '確率と散らばり',
    entries: [
      {
        code: 'records = ["雨", "晴れ", "雨", "曇り"]\ncount = 0\nfor day in records:\n    if day == "雨":\n        count = count + 1\nprint(count / len(records))',
        result: '0.5',
        note: '当てはまる数÷全体の数（相対度数）',
        since: 'python-11-frequency',
      },
      {
        code: 'scores = np.array([7, 2, 1])\nprint(scores / np.sum(scores))',
        result: '[0.7 0.2 0.1]',
        note: '合計で割って分布にする（合計が1）',
        since: 'python-11-distribution',
      },
      { code: 'print(round(np.exp(1), 3))', result: '2.718', note: 'ネイピア数 e', since: 'python-11-exp' },
      {
        code: 'print(np.round(np.exp(np.array([1, -1, 2])), 2))',
        result: '[2.72 0.37 7.39]',
        note: '指数関数。どんな数も正の数になる',
        since: 'python-11-exp',
      },
      { code: 'print(1e-3)', result: '0.001', note: '10のマイナス3乗の書き方', since: 'python-11-log' },
      {
        code: 'print(round(np.log(2 * 3), 3))\nprint(round(np.log(2) + np.log(3), 3))',
        result: '1.792\n1.792',
        note: '対数は掛け算を足し算に変える',
        since: 'python-11-log',
      },
      { code: 'x = np.array([40, 70, 70, 100])\nprint(np.mean(x))', result: '70.0', note: 'x.mean() と同じ平均', since: 'python-11-spread' },
      {
        code: 'x = np.array([40, 70, 70, 100])\nprint(np.var(x))',
        result: '450.0',
        note: '分散（平均との差の2乗の平均）',
        since: 'python-11-spread',
      },
      {
        code: 'x = np.array([40, 70, 70, 100])\nprint(round(np.std(x), 1))',
        result: '21.2',
        note: '標準偏差（分散の平方根）',
        since: 'python-11-spread',
      },
      {
        code: 'x = np.array([40, 60, 80])\nz = (x - np.mean(x)) / np.std(x)\nprint(np.round(z, 2))',
        result: '[-1.22  0.    1.22]',
        note: '標準化（平均0・標準偏差1にそろえる）',
        since: 'python-11-scores',
      },
    ],
  },
  {
    key: 'regression',
    name: '予測と損失・勾配降下法',
    entries: [
      {
        code: 'def predict(x, a, b):\n    return a * x + b\n\nprint(predict(np.array([1, 2, 3]), 2, 1))',
        result: '[3 5 7]',
        note: '直線のモデルで全員分をまとめて予測する',
        since: 'python-12-model',
      },
      {
        code: 'pred = np.array([3, 5])\nactual = np.array([4, 7])\nprint(np.mean((pred - actual) ** 2))',
        result: '2.5',
        note: '平均二乗誤差（差の2乗の平均）',
        since: 'python-12-loss',
      },
      {
        code: 'def f(x):\n    return (x - 3) ** 2\n\nbest_x = 0.0\nfor x in np.linspace(0, 4, 9):\n    if f(x) < f(best_x):\n        best_x = x\nprint(best_x)',
        result: '3.0',
        note: '候補を全部試し、小さいものが出るたびに覚え直す',
        since: 'python-12-search',
      },
      {
        code: 'def f(x):\n    return (x - 3) ** 2\n\nx = 0\nh = 0.0001\nfor i in range(20):\n    slope = (f(x + h) - f(x)) / h\n    x = x - 0.3 * slope\nprint(round(x, 2))',
        result: '3.0',
        note: '勾配降下法（傾き×歩幅を引く、をくり返す）',
        since: 'python-13-descent',
      },
      {
        code: 'x = np.array([1.0, 2.0])\ny = np.array([3.0, 5.0])\npred = 1.0 * x + 0.0\nprint(np.mean(2 * (pred - y) * x))\nprint(np.mean(2 * (pred - y)))',
        result: '-8.0\n-5.0',
        note: '直線 a * x + b の、a と b の勾配（平均二乗誤差）',
        since: 'python-13-linear',
      },
      {
        code: 'hours = np.array([2, 3])\nsleep = np.array([6, 7])\nX = np.array([hours, sleep]).T\nprint(X)',
        result: '[[2 6]\n [3 7]]',
        note: '入力を並べて転置し、1人ぶんを1行にする',
        since: 'python-13-multi',
      },
      {
        code: 'X = np.array([[2, 6], [3, 7]])\nw = np.array([1, 10])\nprint(X @ w + 5)',
        result: '[67 78]',
        note: '入力が複数のときの予測 X @ w + b',
        since: 'python-13-multi',
      },
      {
        code: 'X = np.array([[1, 2], [3, 4]])\nerr = np.array([1, -1])\nprint(X.T @ err * 2 / len(err))',
        result: '[-2. -2.]',
        note: 'w の勾配 X.T @ (予測 - 答え) * 2 / n',
        since: 'python-13-multi',
      },
      {
        code: 'x = np.array([2.0, 4.0, 6.0])\nnew = 5.0\nprint(round((new - x.mean()) / x.std(), 2))',
        result: '0.61',
        note: '新しい値も、学習に使ったデータの平均・標準偏差で直す',
        since: 'python-13-standardize',
      },
    ],
  },
  {
    key: 'classify',
    name: '分類',
    entries: [
      {
        code: 'scores = np.array([45, 70, 60])\nprint((scores >= 60) * 1)',
        result: '[0 1 1]',
        note: '真偽に1を掛けて、1と0のラベルにする',
        since: 'python-14-label',
      },
      {
        code: 'def sigmoid(z):\n    return 1 / (1 + np.exp(-z))\n\nprint(sigmoid(0))',
        result: '0.5',
        note: 'シグモイド関数（0から1の間の確率に直す）',
        since: 'python-14-sigmoid',
      },
      {
        code: 'p = np.array([0.5, 0.01])\nprint(np.round(-np.log(p), 2))',
        result: '[0.69 4.61]',
        note: '交差エントロピー（p は正解に付けた確率）',
        since: 'python-14-entropy',
      },
      {
        code: 'y = np.array([1, 0])\np = np.array([0.8, 0.3])\nloss = -(y * np.log(p) + (1 - y) * np.log(1 - p))\nprint(np.round(loss, 3))',
        result: '[0.223 0.357]',
        note: '答えが1でも0でも使える交差エントロピー',
        since: 'python-14-logistic',
      },
      {
        code: 'X = np.array([[1.0, 2.0], [3.0, 4.0]])\ny = np.array([1, 0])\np = np.array([0.8, 0.3])\nprint(np.round(X.T @ (p - y) / len(y), 2))',
        result: '[0.35 0.4 ]',
        note: 'w の勾配 X.T @ (確率 - 答え) / n',
        since: 'python-14-logistic',
      },
    ],
  },
  {
    key: 'evaluate',
    name: '評価',
    entries: [
      {
        code: 'rng = np.random.default_rng(3)\nprint(rng.permutation(5))',
        result: '[4 2 1 3 0]',
        note: '種を決めて0〜4をランダムに並べる（何度実行しても同じ並び）',
        since: 'python-15-split',
      },
      {
        code: 'x = np.array([10, 20, 30, 40])\nprint(x[np.array([3, 0])])',
        result: '[40 10]',
        note: 'インデックスの配列で、複数の値をまとめて取り出す',
        since: 'python-15-split',
      },
      {
        code: 'x = np.array([0, 1, 2])\ny = np.array([1, 3, 5])\nprint(np.round(np.polyfit(x, y, 1), 2))',
        result: '[2. 1.]',
        note: 'データに合う次数1の曲線（直線）の係数',
        since: 'python-15-overfit',
      },
      {
        code: 'print(np.polyval(np.array([2, 1]), 3))',
        result: '7',
        note: '係数 [2, 1] の式 2x + 1 に 3 を入れる',
        since: 'python-15-overfit',
      },
      {
        code: 'pred = np.array([1, 0, 1, 1])\ny = np.array([1, 0, 0, 1])\nprint((pred == y).mean())',
        result: '0.75',
        note: '正解率（予想と答えが一致した割合）',
        since: 'python-15-accuracy',
      },
      {
        code: 'pred = np.array([1, 0, 1, 1])\ny = np.array([1, 0, 0, 1])\nprint(np.sum((pred == 1) & (y == 1)))',
        result: '2',
        note: '& は両方に当てはまるか。当たりの数を数える',
        since: 'python-15-confusion',
      },
    ],
  },
];

/** すべての分類の key（Exercise.astro の syntax プロパティの検査に使う）。 */
export const SYNTAX_CATEGORY_KEYS: string[] = SYNTAX_CATEGORIES.map((c) => c.key);
