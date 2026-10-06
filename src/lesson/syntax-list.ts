/**
 * 構文の一覧（20-platform.md 第22.1節）。
 *
 * 今週の演習の問題のページの右の欄に出す早見表のデータ。分類ごとに「書き方・結果・短い説明」を
 * 並べ、分類の最後にその書き方を扱う節（`since`）へのリンクを出す（呼び出し側 = weekly-syntax.ts）。
 * 同じデータから、各節の冒頭の「この節の書き方」の表も作る（`since` がその節の行だけ。
 * src/components/lesson/SectionSyntax.astro。DECISIONS.md「書き方のまとめ（2026-09-27）」）。
 *
 * **2026-10-06 から、行は「本文で教えた書き方」だけでなく、その節の話題で調べに戻ったとき役に立つ書き方も載せる**
 * （代表の決定。design/reviews/home-audit-2026-10-06.md）。基本は本文で文付きで教え、それ以外はこの表にだけ置く。
 * 表に載せた書き方は「教えた」と数え、その節より後の課題の答えに使ってよい（taught.mjs もそう数える）。
 * `code` を `py`（numpy 入り）で実際に実行し、
 * `result` がその通りの出力になることを確かめてある（確かめ方は design/HANDOFF.md の引き継ぎに書く
 * 代わりに、このファイルを作った作業のやり取りに残す）。分類名は Python の言葉そのまま（第22.1節）。
 * numpy の行は `import numpy as np` を済ませた前提で書く（`import numpy as np` の行を除く）。
 * pandas の行は `import pandas as pd` と `df = pd.read_csv("train.csv")` を済ませた前提で書く（numpy の行と同じ形。この2つの行そのものを除く）。
 * scikit-learn の行は、行のコードに `from sklearn… import …` と、使うモデルや小さな `X`・`y` を含める。
 * 表の `df` を使う行（`X = df[…]`）は、pandas の行と同じ前提で、`df` の用意は書かない。
 *
 * `since` は、その書き方をはじめて教える節の frontmatter の `id`。**節の表に出る場所でもある。**
 * その話題のホーム（体系的に教える節）が `since` より後にあるときや、後の章で軽く触れるときは、
 * その節の id を `also` に並べると、その節の表にも同じ行が出る（今週の演習の範囲と taught.mjs は `since` だけを見る）。今週の演習の画面（src/pages/learn/weekly/[id].astro）が、
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
  /** `since` の節のほかに、この行を「この節の書き方」の表に出す節の id（ホームの節・軽く触れる節） */
  also?: string[];
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
      { code: 'print(2 + 3)', result: '5', note: '足し算', since: 'python-01-print', also: ['python-02-operators'] },
      { code: 'print(7 - 2)', result: '5', note: '引き算', since: 'python-01-print', also: ['python-02-operators'] },
      { code: 'print(4 * 3)', result: '12', note: '掛け算', since: 'python-01-print', also: ['python-02-operators'] },
      { code: 'print(7 / 2)', result: '3.5', note: '割り算（答えは小数。詳しくは第2章1節）', since: 'python-01-print', also: ['python-02-operators'] },
      { code: 'print(9 / 3)', result: '3.0', note: '割り切れても答えは float', since: 'python-02-int-float' },
      { code: 'print(1 + 2.5)', result: '3.5', note: '整数と小数を混ぜると float になる', since: 'python-02-int-float' },
      { code: 'print(0.1 + 0.2)', result: '0.30000000000000004', note: 'float は近似の値なので、わずかにずれる', since: 'python-02-int-float' },
      { code: 'print(7 // 2)', result: '3', note: '割った商（小数点以下を切り捨て）', since: 'python-02-operators' },
      { code: 'print(7 % 2)', result: '1', note: '割った余り', since: 'python-02-operators' },
      { code: 'print(7 ** 2)', result: '49', note: 'べき乗（7の2乗）', since: 'python-02-operators' },
      { code: 'print(2 ** 0.5)', result: '1.4142135623730951', note: '0.5乗は平方根', since: 'python-02-operators' },
      { code: 'print(10 ** -3)', result: '0.001', note: '右の数が負のときは逆数になる（答えは float）', since: 'python-02-operators' },
      { code: 'x = 5\nprint(-x)', result: '-5', note: '変数の前に - を付けると、符号が反対になる', since: 'python-02-operators' },
      { code: 'print(5 / 0)', result: 'ZeroDivisionError: division by zero', note: '0では割れない。// と % も同じ', since: 'python-02-operators', also: ['python-06-type'] },
      { code: 'print((1 + 2) * 3)', result: '9', note: 'かっこの中が先', since: 'python-02-precedence' },
      { code: 'print(8 / 4 / 2)', result: '1.0', note: '同じ順位は左から順に計算する（** だけは右から）', since: 'python-02-precedence' },
      { code: 'print(2 ** 3 ** 2)', result: '512', note: '** だけは右から計算する', since: 'python-02-precedence' },
      { code: 'print(-2 ** 2)', result: '-4', note: '符号の - より ** が先。(-2) ** 2 は 4', since: 'python-02-precedence' },
    ],
  },
  {
    key: 'print',
    name: 'print文',
    entries: [
      { code: 'print(5)', result: '5', note: '値を1行に表示', since: 'python-01-print' },
      { code: 'print(5)  # 5を表示', result: '5', note: '# から行の終わりまでは実行されない（メモ書き）', since: 'python-01-print' },
      { code: 'print("合計", 5)', result: '合計 5', note: 'コンマで並べると空白でつながる', since: 'python-01-print' },
      { code: 'print("合計", 5, "円")', result: '合計 5 円', note: 'いくつでも並べられる', since: 'python-01-print' },
      { code: 'print()', result: '（空の行が1行出る）', note: '何も渡さず空の行を出す', since: 'python-01-print' },
    ],
  },
  {
    key: 'string',
    name: '文字列',
    entries: [
      {
        code: 'print("合計" + str(5) + "円")',
        result: '合計5円',
        note: '文字列どうしを+でつなぐ。数はstr()で',
        since: 'python-01-fstring',
      },
      { code: 'print("3" + "4")', result: '34', note: '文字列の + はつなぐだけ（足し算にならない）', since: 'python-01-fstring' },
      { code: 'print("=" * 10)', result: '==========', note: '文字列を繰り返す', since: 'python-01-fstring' },
      { code: 'x = 5\nprint(f"合計{x}円")', result: '合計5円', note: '{}の中に変数や式を書ける', since: 'python-01-fstring' },
      { code: "print('赤')", result: '赤', note: "' で囲んでも同じ文字列", since: 'python-01-fstring' },
      { code: 'print(len("こんにちは"))', result: '5', note: '文字列の文字の数', since: 'python-04-index' },
    ],
  },
  {
    key: 'variable',
    name: '変数',
    entries: [
      { code: 'price = 100\nprint(price + 50)', result: '150', note: '名前に値を結び付けて使う', since: 'python-01-variable' },
      { code: 'a = 1\na = 3\nprint(a)', result: '3', note: '入れ直すと前の値は残らない', since: 'python-01-variable' },
      { code: 'a = 1\na = a + 10\nprint(a)', result: '11', note: 'いまの値をもとに入れ直す', since: 'python-01-variable' },
      { code: 'total_price = 120\nprint(total_price)', result: '120', note: '名前は英字・数字・_。数字で始めない', since: 'python-01-variable' },
      { code: 'a, b = 3, 5\nprint(a, b)', result: '3 5', note: '名前も値もコンマで並べて、一度に入れる', since: 'python-01-variable' },
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
      { code: 'name = input("名前は？")\nprint("こんにちは", name)', result: '名前は？こんにちは 佐藤（入力が佐藤のとき）', note: '質問の文も出力に入る（課題では書かない）', since: 'python-01-input-basic' },
      { code: 'print(int("5") + 1)', result: '6', note: '整数に直す', since: 'python-01-input' },
      { code: 'print(float("2.5"))', result: '2.5', note: '小数に直す', since: 'python-02-int-float' },
      { code: 'print(int(7.9))', result: '7', note: '小数を整数に（切り捨て）', since: 'python-02-int-float' },
      { code: 'print(type(2.5))', result: "<class 'float'>", note: '値の型を調べる', since: 'python-02-int-float' },
      { code: 'print(float(3))', result: '3.0', note: '整数を小数に', since: 'python-02-int-float' },
      { code: 'print(int("2.5"))', result: "ValueError: invalid literal for int() with base 10: '2.5'", note: '小数の文字列は int() で直せない。float() を使う', since: 'python-02-int-float' },
      { code: 'print(2.5e3)', result: '2500.0', note: '2.5×10の3乗の書き方', since: 'python-02-int-float' },
      { code: 'print(1e-3)', result: '0.001', note: '10のマイナス3乗の書き方', since: 'python-02-int-float', also: ['python-11-log'] },
    ],
  },
  {
    key: 'round-math',
    name: 'round と math',
    entries: [
      { code: 'print(round(3.14159, 2))', result: '3.14', note: '小数第2位まで丸める', since: 'python-02-round' },
            { code: 'print(round(2.7))', result: '3', note: '桁数を省略すると整数に丸める', since: 'python-02-round' },
      { code: 'print(round(2.5))', result: '2', note: 'ちょうど真ん中は偶数の側に丸まる', since: 'python-02-round' },
      { code: 'print(round(0.1 + 0.2, 2))', result: '0.3', note: '0.1 + 0.2 のずれは、丸めると見えなくなる', since: 'python-02-round' },
      { code: 'print(f"{2.5:.2f}")', result: '2.50', note: '末尾の0も残して、小数第2位まで表示する', since: 'python-02-round' },
      { code: 'import math', result: '', note: '数学の関数を使う準備', since: 'python-02-math' },
      { code: 'print(math.sqrt(16))', result: '4.0', note: '平方根', since: 'python-02-math' },
      { code: 'print(math.pi)', result: '3.141592653589793', note: '円周率（かっこは付けない）', since: 'python-02-math' },
      { code: 'print(math.floor(2.7))', result: '2', note: '切り捨て（小さいほうの整数）', since: 'python-02-math' },
      { code: 'print(math.ceil(7 / 3))', result: '3', note: '切り上げ（何箱いるか、など）', since: 'python-02-math' },
      { code: 'print(math.e)', result: '2.718281828459045', note: 'ネイピア数 e（かっこは付けない）', since: 'python-02-math' },
      { code: 'print(math.exp(1))', result: '2.718281828459045', note: 'e の x 乗（意味は第11章3節）', since: 'python-02-math' },
      { code: 'print(math.log(math.e))', result: '1.0', note: '自然対数（底は e。第11章4節）', since: 'python-02-math' },
      { code: 'print(math.log10(1000))', result: '3.0', note: '底が10の対数', since: 'python-02-math' },
      { code: 'print(math.sin(math.pi / 2))', result: '1.0', note: '三角関数。角度はラジアン', since: 'python-02-math' },
      { code: 'print(abs(-3))', result: '3', note: '絶対値。import は要らない（math ではない）', since: 'python-02-math' },
      { code: 'from math import sqrt\nprint(sqrt(16))', result: '4.0', note: 'sqrt だけを読み込むと、math. を付けずに使える', since: 'python-02-math' },
    ],
  },
  {
    key: 'compare',
    name: '比較演算子と論理演算子',
    entries: [
      { code: 'print(7 > 5)', result: 'True', note: 'より大きい', since: 'python-03-if' },
      { code: 'print(7 < 5)', result: 'False', note: 'より小さい', since: 'python-03-if' },
      { code: 'print(5 >= 5)', result: 'True', note: '以上', since: 'python-03-if' },
      { code: 'print(5 <= 3)', result: 'False', note: '以下', since: 'python-03-if' },
      { code: 'print(5 == 5)', result: 'True', note: '等しい', since: 'python-03-if' },
      { code: 'print(5 != 5)', result: 'False', note: '等しくない', since: 'python-03-if' },
      { code: 'print("雨" == "雨")', result: 'True', note: '文字列も == で比べられる', since: 'python-03-if' },
      { code: 'print(8 % 2 == 0)', result: 'True', note: '割り切れるかは、余りが0かで調べる', since: 'python-03-else' },
      { code: 'print(60 >= 60 and 60 < 80)', result: 'True', note: 'and は両方成り立つとき', since: 'python-03-andor' },
      { code: 'print(60 < 0 or 60 > 100)', result: 'False', note: 'or はどちらか一方でも成り立つとき', since: 'python-03-andor' },
      { code: 'print(not (60 >= 60))', result: 'False', note: 'not は条件を反転させる', since: 'python-03-andor' },
      { code: 'print(10 >= 10 and (50 >= 60 or 90 >= 80))', result: 'True', note: 'and と or を混ぜるときは () でまとめる', since: 'python-03-andor' },
      { code: 'print(60 <= 72 < 80)', result: 'True', note: '範囲に入っているかは、比較を続けて書いても調べられる', since: 'python-03-andor' },
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
      {
        code: 'score = 75\nif score >= 60:\n    if score >= 80:\n        print("優")\n    else:\n        print("合格")',
        result: '合格',
        note: 'ifの中にifを書くこともできる',
        since: 'python-03-andor',
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
      { code: 'total = 0\nfor i in range(1, 4):\n    total = total + i\nprint(total)', result: '6', note: '繰り返しながら足していく', since: 'python-04-for' },
      { code: 'for i in range(0, 10, 3):\n    print(i)', result: '0\n3\n6\n9', note: '3つ目はきざみ', since: 'python-04-for' },
      { code: 'for i in range(3, 0, -1):\n    print(i)', result: '3\n2\n1', note: 'きざみを負にすると減っていく', since: 'python-04-for' },
      { code: 'total = 0\ntotal += 5\ntotal += 3\nprint(total)', result: '8', note: 'total = total + 5 の短い書き方', since: 'python-04-for' },
      { code: 'for a in range(1, 3):\n    for b in range(1, 3):\n        print(a, b)', result: '1 1\n1 2\n2 1\n2 2', note: '外側が1回進むごとに、内側を全部回る', since: 'python-04-for', also: ['python-12-search'] },
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
      {
        code: 'count = 0\nline = input()\nwhile line != "終わり":\n    count = count + 1\n    line = input()\nprint(count)',
        result: '2（入力が a・b・終わり の3行のとき）',
        note: '終わりの行が来るまで読み続ける',
        since: 'python-04-while',
      },
      {
        code: 'count = 0\nwhile True:\n    count = count + 1\n    if count == 3:\n        break\nprint(count)',
        result: '3',
        note: 'break で繰り返しを途中で抜ける',
        since: 'python-04-while',
      },
      {
        code: 'for i in range(1, 5):\n    if i % 2 == 0:\n        continue\n    print(i)',
        result: '1\n3',
        note: 'continue でその回の残りを飛ばし、次の回へ進む',
        since: 'python-04-while',
      },
    ],
  },
  {
    key: 'list',
    name: 'リスト',
    entries: [
      { code: 'print([3, 7, 2])', result: '[3, 7, 2]', note: '値をまとめて持つ', since: 'python-04-list' },
      { code: 'largest = 3\nfor value in [7, 2, 9]:\n    if value > largest:\n        largest = value\nprint(largest)', result: '9', note: 'いまの最大を覚えておき、大きい値が出たら入れ直す', since: 'python-04-list' },
      { code: 'numbers = [int(input()), int(input()), int(input())]\nprint(numbers)', result: '[3, 7, 2]（入力が3・7・2の3行のとき）', note: '入力の3行をリストにまとめて読む', since: 'python-04-list' },
      { code: 'numbers = [3, 7, 2]\nprint(numbers[0])', result: '3', note: 'インデックスは0から数える', since: 'python-04-index' },
      { code: 'numbers = [3, 7, 2]\nprint(len(numbers))', result: '3', note: '値の数を調べる', since: 'python-04-index' },
      { code: 'numbers = [3, 7, 2]\nfor i in range(len(numbers)):\n    print(numbers[i])', result: '3\n7\n2', note: 'インデックスに変数を書いて、順に取り出す', since: 'python-04-index' },
      { code: 'numbers = [3, 7, 2, 9]\nprint(numbers[-1])', result: '9', note: '負のインデックスは後ろから数える', since: 'python-04-index' },
      { code: 'numbers = [3, 7, 2, 9, 4]\nprint(numbers[1:3])', result: '[7, 2]', note: '範囲で取り出す（終わりは含まない。詳しくは第7章4節）', since: 'python-04-index' },
      { code: 'numbers = []\nnumbers.append(3)\nnumbers.append(7)\nprint(numbers)', result: '[3, 7]', note: '空のリストを作り、値を足していく', since: 'python-04-append' },
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
      { code: 'numbers = [3, 7, 2]\nnumbers[1] = 10\nprint(numbers)', result: '[3, 10, 2]', note: '位置を指定して、値を入れ替える', since: 'python-04-append' },
      { code: 'numbers = [3, 7, 2]\nnumbers.insert(1, 5)\nprint(numbers)', result: '[3, 5, 7, 2]', note: '位置を指定して、値を挿入する', since: 'python-04-append' },
      { code: 'numbers = [3, 7, 2]\nprint(numbers.pop())\nprint(numbers)', result: '2\n[3, 7]', note: '末尾の値を取り除いて、その値を返す', since: 'python-04-append' },
      { code: 'numbers = [3, 7, 2]\nnumbers.sort()\nprint(numbers)', result: '[2, 3, 7]', note: 'リストそのものを小さい順に並べ替える', since: 'python-04-append' },
      { code: 'numbers = [3, 7, 2]\nprint(sorted(numbers))\nprint(numbers)', result: '[2, 3, 7]\n[3, 7, 2]', note: '並べ替えた新しいリストを作る（元は変わらない）', since: 'python-04-append' },
      { code: 'numbers = [3, 7, 2]\nprint(sum(numbers))\nprint(max(numbers))\nprint(min(numbers))', result: '12\n7\n2', note: '合計・最大・最小', since: 'python-04-append' },
      { code: 'print(max(3, 7))', result: '7', note: '数を並べて渡してもよい', since: 'python-04-append' },
      { code: 'print(7 in [3, 7, 2])', result: 'True', note: '値がリストに入っているか', since: 'python-04-append' },
      { code: 'print(5 not in [3, 7, 2])', result: 'True', note: '値がリストに入っていないか', since: 'python-04-append' },
      { code: 'print([1, 2] + [3])', result: '[1, 2, 3]', note: 'リストどうしを+でつなぐ', since: 'python-04-append' },
    ],
  },
  {
    key: 'dict',
    name: '辞書',
    entries: [
      { code: 'price = {"りんご": 120, "みかん": 80}\nprint(price)', result: "{'りんご': 120, 'みかん': 80}", note: 'キーと値の組を並べて、辞書を作る', since: 'python-04-dict' },
      { code: 'price = {"りんご": 120, "みかん": 80}\nprint(price["みかん"])', result: '80', note: 'キーを指定して、値を取り出す', since: 'python-04-dict' },
      { code: 'price = {"りんご": 120}\nprice["ぶどう"] = 300\nprice["りんご"] = 130\nprint(price)', result: "{'りんご': 130, 'ぶどう': 300}", note: '新しいキーなら足され、あるキーなら値が入れ替わる', since: 'python-04-dict' },
      { code: 'price = {"りんご": 120}\nprint("りんご" in price)', result: 'True', note: 'キーがあるかを調べる', since: 'python-04-dict' },
      { code: 'price = {"りんご": 120, "みかん": 80}\nfor name in price:\n    print(name, price[name])', result: 'りんご 120\nみかん 80', note: 'キーを順に取り出す', since: 'python-04-dict' },
      { code: 'price = {"りんご": 120}\nprint(price["ぶどう"])', result: "KeyError: 'ぶどう'", note: '無いキーを指定すると止まる', since: 'python-04-dict', also: ['python-06-type'] },
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
        code: 'def show(x):\n    print(x)\n\nresult = show(5)\nprint(result)',
        result: '5\nNone',
        note: 'returnの無い関数の結果は None（何も無いことを表す値）',
        since: 'python-05-return',
      },
      {
        code: 'def check(x):\n    if x < 0:\n        return "負"\n    return "0以上"\n\nprint(check(-3))',
        result: '負',
        note: '途中でreturnすると、そこで関数は終わる',
        since: 'python-05-return',
      },
      {
        code: 'def divide(a, b):\n    return a // b, a % b\n\nq, r = divide(7, 2)\nprint(q, r)',
        result: '3 1',
        note: 'コンマで並べて複数の値を返し、コンマで並べた変数で受け取る',
        since: 'python-05-return',
      },
      {
        code: 'def divide(a, b):\n    return a // b, a % b\n\nprint(divide(7, 2))',
        result: '(3, 1)',
        note: '2つに分けずにそのまま使うと、(3, 1) のように（ ）で囲んだ組（タプル）になる',
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
      {
        code: 'x = 10\ndef show():\n    print(x)\n\nshow()',
        result: '10',
        note: '外で作った名前は、中から読める',
        since: 'python-05-scope',
      },
      {
        code: 'total = 100\n\ndef apply_discount():\n    total = total - 20\n    print(total)\n\napply_discount()',
        result: "UnboundLocalError: cannot access local variable 'total' where it is not associated with a value",
        note: '中で入れる名前は、外の値を読めない',
        since: 'python-05-scope',
      },
    ],
  },
  {
    key: 'errors',
    name: 'よく出るエラー',
    entries: [
      { code: 'print(total)', result: "NameError: name 'total' is not defined", note: '使った名前が定義されていない（綴りミスが多い）', since: 'python-06-syntax' },
      { code: 'if 5 > 3\n    print("合格")', result: "SyntaxError: expected ':'", note: '文の形が読み取れない（: 忘れ・全角記号など）', since: 'python-06-syntax' },
      { code: 'if 5 > 3:\nprint("合格")', result: "IndentationError: expected an indented block after 'if' statement on line 1", note: 'インデントが合っていない（SyntaxErrorの仲間）', since: 'python-06-syntax' },
      { code: 'print("合計" + 5)', result: 'TypeError: can only concatenate str (not "int") to str', note: '型が合わない操作（文字列+数など）', since: 'python-06-type' },
      { code: 'print(int("5円"))', result: "ValueError: invalid literal for int() with base 10: '5円'", note: '型は合っているが値が変換できない', since: 'python-06-type' },
      { code: 'numbers = [3, 7, 2]\nprint(numbers[3])', result: 'IndexError: list index out of range', note: 'リストに無い位置のインデックスを指定した', since: 'python-06-type', also: ['python-04-index'] },
      { code: 'numbers = [3, 7]\nnumbers.add(5)', result: "AttributeError: 'list' object has no attribute 'add'", note: 'その値に無いメソッドを呼んだ（綴りミスが多い）', since: 'python-06-type' },
      { code: 'import maths', result: "ModuleNotFoundError: No module named 'maths'", note: '読み込もうとしたモジュールが無い（綴りミスが多い）', since: 'python-06-type' },
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
        note: '値ごとにまとめて計算する',
        since: 'python-07-array',
      },
      {
        code: 'a = np.array([60, 70, 80])\nb = np.array([40, 55, 50])\nprint(a - b)',
        result: '[20 15 30]',
        note: '配列どうしは同じ位置の値で計算',
        since: 'python-07-array',
      },
      { code: 'print(np.array([1, 2, 3]) ** 2)', result: '[1 4 9]', note: '2乗も値ごと', since: 'python-07-array' },
      { code: 'print(np.array([3, 4]) / 2)', result: '[1.5 2. ]', note: '割り算の答えは小数の配列', since: 'python-07-array' },
      { code: 'print(np.sqrt(np.array([4, 9, 16])))', result: '[2. 3. 4.]', note: '平方根も値ごと', since: 'python-07-array' },
      { code: 'print(np.abs(np.array([3, -2, 0])))', result: '[3 2 0]', note: '絶対値も値ごと', since: 'python-07-array' },
      {
        code: 'print(np.round(np.exp(np.array([0, 1])), 3))',
        result: '[1.    2.718]',
        note: 'e の累乗（意味は第11章3節）',
        since: 'python-07-array',
      },
      {
        code: 'print(np.round(np.log(np.array([1, 10])), 3))',
        result: '[0.    2.303]',
        note: '対数（意味は第11章4節）',
        since: 'python-07-array',
      },
      {
        code: 'print(np.maximum(np.array([-2, 0, 3]), 0))',
        result: '[0 0 3]',
        note: '各値と0を比べて、大きいほう',
        since: 'python-07-array',
      },
      {
        code: 'print(np.array([1.5, 2.7]).astype(int))',
        result: '[1 2]',
        note: '小数を切り捨てて整数の配列に',
        since: 'python-07-array',
      },
      {
        code: 'print(np.round(np.array([81.66, 49.24]), 1))',
        result: '[81.7 49.2]',
        note: '配列の値をまとめて丸める',
        since: 'python-07-array',
        also: ['python-07-scores'],
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
        code: 's = np.array([80, 70, 90])\nprint(np.mean(s))',
        result: '80.0',
        note: 's.mean() と同じ。np.sum・np.max・np.min も同じ形',
        since: 'python-07-agg',
        also: ['python-11-spread'],
      },
      {
        code: 'p = np.array([300, 120, 450, 120])\nprint(p.argmax())\nprint(p.argmin())',
        result: '2\n1',
        note: '最大・最小の値がある位置。同じ値が複数あれば、前のほうの位置',
        since: 'python-07-agg',
      },
      { code: 'print(np.sort(np.array([55, 90, 40])))', result: '[40 55 90]', note: '小さい順に並べる', since: 'python-07-agg' },
      {
        code: 'print(np.argsort(np.array([55, 90, 40])))',
        result: '[2 0 1]',
        note: '小さい順に並べたときの元の位置',
        since: 'python-07-agg',
      },
      {
        code: 'scores = np.array([40, 90, 55, 70, 30])\nprint(scores[scores >= 60])',
        result: '[90 70]',
        note: '条件に合う値だけ取り出す',
        since: 'python-07-select',
      },
      {
        code: 'pred = np.array([1, 0, 1, 1])\ny = np.array([1, 0, 0, 1])\nprint(pred == y)',
        result: '[ True  True False  True]',
        note: '配列どうしを比べると、True と False の配列になる',
        since: 'python-07-select',
      },
      {
        code: 'pred = np.array([1, 0, 1, 1])\ny = np.array([1, 0, 0, 1])\nprint(pred != y)',
        result: '[False False  True False]',
        note: '違う位置が True になる',
        since: 'python-07-select',
      },
      {
        code: 's = np.array([40, 90, 55, 70, 30])\nprint((s >= 60).sum())',
        result: '2',
        note: '条件に合う個数（True を1として足す）',
        since: 'python-07-select',
      },
      {
        code: 's = np.array([40, 90, 55, 70, 30])\nprint(len(s[s >= 60]))',
        result: '2',
        note: '条件に合う値を取り出して、その個数を数えても同じ',
        since: 'python-07-select',
      },
      {
        code: 's = np.array([40, 90, 55, 70, 30])\nprint((s >= 60).mean())',
        result: '0.4',
        note: 'True の割合（正解率もこの形）',
        since: 'python-07-select',
      },
      {
        code: 's = np.array([40, 90, 55, 70, 30])\nprint((s >= 50) & (s < 80))',
        result: '[False False  True  True False]',
        note: '両方が True の位置だけ True',
        since: 'python-07-select',
      },
      {
        code: 's = np.array([40, 90, 55, 70, 30])\nprint(s[(s >= 50) & (s < 80)])',
        result: '[55 70]',
        note: '2つの条件の両方を満たす値。それぞれの条件を ( ) で囲む',
        since: 'python-07-select',
      },
      {
        code: 's = np.array([40, 90, 55, 70, 30])\nprint(s[(s < 40) | (s >= 90)])',
        result: '[90 30]',
        note: '2つの条件のどちらかを満たす値。それぞれの条件を ( ) で囲む',
        since: 'python-07-select',
      },
      {
        code: 's = np.array([40, 90, 55, 70, 30])\nprint((s >= 60) * 1)',
        result: '[0 1 0 1 0]',
        note: 'True と False を1と0の整数にする',
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
      { code: 'scores = np.array([40, 90, 55, 70, 30])\nk = 2\nprint(scores[:k])', result: '[40 90]', note: '始まりや終わりには変数も書ける', since: 'python-07-slice' },
      {
        code: 's = np.array([40, 90, 55, 70, 30])\nprint(s[np.array([4, 0])])',
        result: '[30 40]',
        note: '位置を並べて、複数の値をまとめて取り出す',
        since: 'python-07-slice',
        also: ['python-15-split'],
      },
      {
        code: 'table = []\ntable.append([80, 70, 90])\ntable.append([60, 50, 40])\nprint(np.array(table))',
        result: '[[80 70 90]\n [60 50 40]]',
        note: 'リストを並べたリストから2次元配列を作る',
        since: 'python-07-shape',
      },
      {
        code: 'a = np.array([2, 3])\nb = np.array([6, 7])\nprint(np.array([a, b]))',
        result: '[[2 3]\n [6 7]]',
        note: '1次元の配列を並べて2次元に（1つが1行）',
        since: 'python-07-shape',
      },
      {
        code: 'scores = np.array([[80, 70, 90], [60, 50, 40]])\nprint(scores.shape)',
        result: '(2, 3)',
        note: '行数と列数を調べる',
        since: 'python-07-shape',
      },
      {
        code: 't = np.array([[80, 70, 90], [60, 50, 40]])\nprint(len(t))',
        result: '2',
        note: '2次元では行の数（1次元なら値の個数）',
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
        code: 't = np.array([[80, 70, 90], [60, 50, 40]])\nprint(np.mean(t, axis=0))',
        result: '[70. 60. 65.]',
        note: '関数の形でも axis を付けられる',
        since: 'python-07-stats',
      },
      {
        code: 't = np.array([[80, 70, 90], [60, 50, 40]])\nprint(t.argmax(axis=1))',
        result: '[2 0]',
        note: '行ごとの、最大の値の位置',
        since: 'python-07-stats',
      },
      { code: 'table = []\nfor i in range(2):\n    table.append([int(input()), int(input()), int(input())])\nprint(np.array(table))', result: '[[80 70 90]\n [60 50 40]]（入力が80・70・90・60・50・40の6行のとき）', note: '入力から1人ぶんずつ読んで、2次元配列を作る', since: 'python-07-scores' },
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
        code: 't = np.array([[80, 70, 90], [60, 50, 40]])\nw = np.array([0.5, 1, 2])\nprint(t * w)',
        result: '[[ 40.  70. 180.]\n [ 30.  50.  80.]]',
        note: '引き算以外（+ * /）も、どの行にも同じ並びを使う',
        since: 'python-08-broadcast',
      },
      {
        code: 't2 = np.array([[80, 70, 90], [60, 50, 40]])\nprint(t2 / t2.max(axis=0))',
        result: '[[1.         1.         1.        ]\n [0.75       0.71428571 0.44444444]]',
        note: '列ごとの最大で割る',
        since: 'python-08-broadcast',
      },
      {
        code: 't = np.array([[80, 70, 90], [60, 50, 40]])\nw = np.array([1, 2])\nprint(t * w)',
        result: 'ValueError: operands could not be broadcast together with shapes (2,3) (2,)',
        note: '並びの長さが列の数と違うとエラー',
        since: 'python-08-broadcast',
      },
      {
        code: 'flat = np.array([80, 70, 90, 60, 50, 40])\nprint(flat.reshape(2, 3))',
        result: '[[80 70 90]\n [60 50 40]]',
        note: '並び順のまま形を変える',
        since: 'python-08-reshape',
      },
      {
        code: 'ages = np.array([22, 30, 31])\nprint(ages.reshape(3, 1).shape)',
        result: '(3, 1)',
        note: '1列の2次元にする（あとの章でよく使う形）',
        since: 'python-08-reshape',
      },
      {
        code: 'ages = np.array([22, 30, 31])\nprint(ages.reshape(-1, 1))',
        result: '[[22]\n [30]\n [31]]',
        note: '-1 の所は、全体の値の個数から自動で決まる',
        since: 'python-08-reshape',
      },
      {
        code: 't = np.array([[80, 70, 90], [60, 50, 40]])\nm = t.mean(axis=1)\nprint(t - m.reshape(-1, 1))',
        result: '[[  0. -10.  10.]\n [ 10.   0. -10.]]',
        note: '人ごとの平均を各行から引く。1列の形にすると、行ごとに違う値を引ける',
        since: 'python-08-reshape',
      },
      {
        code: 'print(np.arange(0, 3, 0.5))',
        result: '[0.  0.5 1.  1.5 2.  2.5]',
        note: '始まり・終わり・きざみで並びを作る',
        since: 'python-08-range',
      },
      { code: 'print(np.arange(5))', result: '[0 1 2 3 4]', note: '0から4まで、1ずつ', since: 'python-08-range' },
      {
        code: 'print(np.linspace(0, 2, 5))',
        result: '[0.  0.5 1.  1.5 2. ]',
        note: '個数を指定して等間隔に並べる',
        since: 'python-08-range',
      },
      {
        code: 'for x in np.linspace(0, 1, 3):\n    print(x)',
        result: '0.0\n0.5\n1.0',
        note: '配列も for 文で取り出せる',
        since: 'python-08-range',
      },
      { code: 'print(np.zeros(3))', result: '[0. 0. 0.]', note: '0を指定した個数だけ並べる', since: 'python-08-range' },
      { code: 'print(np.ones(3))', result: '[1. 1. 1.]', note: '1を指定した個数だけ並べる', since: 'python-08-range' },
      {
        code: 'print(np.zeros((2, 3)))',
        result: '[[0. 0. 0.]\n [0. 0. 0.]]',
        note: '行数と列数を指定して、0の2次元配列',
        since: 'python-08-range',
      },
      {
        code: 'rng = np.random.default_rng(3)\nprint(rng.permutation(5))',
        result: '[4 2 1 3 0]',
        note: '種を決めて0〜4をランダムに並べる（同じ種で作り直せば同じ並び）',
        since: 'python-08-range',
        also: ['python-15-split'],
      },
      {
        code: 'x = np.array([10, 20, 30, 40, 50])\nrng = np.random.default_rng(3)\nprint(x[rng.permutation(5)])',
        result: '[50 30 20 40 10]',
        note: 'permutation で作った位置の並びで、配列の順を混ぜる（第7章4節）',
        since: 'python-08-range',
      },
      {
        code: 'rng = np.random.default_rng(3)\nprint(rng.integers(1, 7, 5))',
        result: '[5 1 2 2 2]',
        note: '1以上7未満の整数を5個（さいころ5回ぶん）',
        since: 'python-08-range',
      },
      {
        code: 'rng = np.random.default_rng(3)\nprint(np.round(rng.normal(0, 1, 3), 2))',
        result: '[ 2.04 -2.56  0.42]',
        note: '平均0・標準偏差1の乱数（標準偏差は第11章）',
        since: 'python-08-range',
      },
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
      {
        code: 'print(round(np.log(2 * 3), 3))\nprint(round(np.log(2) + np.log(3), 3))',
        result: '1.792\n1.792',
        note: '対数は掛け算を足し算に変える',
        since: 'python-11-log',
      },
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
        since: 'python-14-entropy',
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
        note: '& は両方が True の位置だけ True。np.sum で True の個数を数える',
        since: 'python-15-confusion',
      },
    ],
  },
  {
    key: 'pandas',
    name: 'pandas',
    entries: [
      { code: 'import pandas as pd', result: '', note: '表の形のデータを扱う pandas を、pd という名前で使う準備', since: 'python-15q-read' },
      { code: 'df = pd.read_csv("train.csv")\nprint(len(df))', result: '891', note: 'CSV のファイルを読み込んで、表（データフレーム）にする。len は行の数で、ここでは乗客の数', since: 'python-15q-read' },
      { code: 'print(df.head(3))', result: '   PassengerId  Survived  Pclass  ...     Fare Cabin  Embarked\n0            1         0       3  ...   7.2500   NaN         S\n1            2         1       1  ...  71.2833   C85         C\n2            3         1       3  ...   7.9250   NaN         S\n\n[3 rows x 12 columns]', note: '表の最初の3行。数を省くと5行。列が多いと、途中の列が ... で省かれる', since: 'python-15q-read' },
      { code: 'print(df["Survived"].sum())', result: '342', note: '列の合計。Survived は、生き残った人が 1 なので、合計が生き残った人数になる', since: 'python-15q-read' },
      { code: 'print(df["Survived"].mean())', result: '0.3838383838383838', note: '列の平均。1 と 0 の列なら、1 の割合になる', since: 'python-15q-read' },
      { code: 'print(df["SibSp"].max())', result: '8', note: '列の最大値（一緒に乗ったきょうだい・夫婦の数のいちばん多い値）', since: 'python-15q-read' },
      { code: 'print(df.shape)', result: '(891, 12)', note: '表の行数と列数。numpy の配列の shape と同じ', since: 'python-15q-read' },
      { code: 'print(list(df.columns))', result: "['PassengerId', 'Survived', 'Pclass', 'Name', 'Sex', 'Age', 'SibSp', 'Parch', 'Ticket', 'Fare', 'Cabin', 'Embarked']", note: '列の名前を、リストにして並べる', since: 'python-15q-read' },
      { code: 'print(df["Age"].describe())', result: 'count    714.000000\nmean      29.699118\nstd       14.526497\nmin        0.420000\n25%       20.125000\n50%       28.000000\n75%       38.000000\nmax       80.000000\nName: Age, dtype: float64', note: '個数・平均・最小・最大などを一度に出す。count は、欠けた値を除いた個数', since: 'python-15q-read' },
      { code: 'print(df["Age"].min())', result: '0.42', note: '列の最小値（年齢のいちばん低い値）。欠けた値は飛ばして求める', since: 'python-15q-read' },
      { code: 'print(df["Age"].median())', result: '28.0', note: '中央値（小さい順に並べたときの真ん中の値）', since: 'python-15q-read' },
      { code: 'print(df[["Pclass", "Age"]].head(3))', result: '   Pclass   Age\n0       3  22.0\n1       1  38.0\n2       3  26.0', note: '列の名前のリストを書くと、その列だけの表を取り出せる（[ ] は2組）', since: 'python-15q-read', also: ['python-15r-features'] },
      { code: 'print(df["Age"].std())', result: '14.526497332334042', note: '標準偏差（第11章5節）。np.std とは割る数が違うので、同じデータでも値が少し違う', since: 'python-15q-read' },
      { code: 'women = df[df["Sex"] == "female"]\nprint(len(women))', result: '314', note: '条件に合う行だけの表を取り出す。len で、その人数', since: 'python-15q-select' },
      { code: 'print(len(df[(df["Pclass"] == 3) & (df["Sex"] == "female")]))', result: '144', note: '2つの条件の両方を満たす行。それぞれの条件を ( ) で囲む', since: 'python-15q-select' },
      { code: 'print(len(df[(df["Pclass"] == 1) | (df["Pclass"] == 2)]))', result: '400', note: '2つの条件のどちらかを満たす行。それぞれの条件を ( ) で囲む', since: 'python-15q-select' },
      { code: 'print(len(df[~(df["Sex"] == "female")]))', result: '577', note: '~ を付けると条件を反転する（女性でない行）', since: 'python-15q-select' },
      { code: 'print(len(df[df["Embarked"].isin(["C", "Q"])]))', result: '245', note: '列の値が、リストのどれかに当たる行（港が C か Q の人）', since: 'python-15q-select' },
      { code: 'print(df["Pclass"].value_counts())', result: 'Pclass\n3    491\n1    216\n2    184\nName: count, dtype: int64', note: '値ごとの人数を、多い順に出す', since: 'python-15q-select' },
      { code: 'print(df.groupby("Sex")["Survived"].mean())', result: 'Sex\nfemale    0.742038\nmale      0.188908\nName: Survived, dtype: float64', note: '組ごとの平均を一度に出す（性別ごとの、生き残った割合）', since: 'python-15q-select' },
      { code: 'print(df["Fare"].sort_values(ascending=False).head(3))', result: '258    512.3292\n737    512.3292\n679    512.3292\nName: Fare, dtype: float64', note: '大きい順に並べて、上の3つを出す（ascending=False が大きい順。省くと小さい順）', since: 'python-15q-select' },
      { code: 'print(df.loc[0, "Name"])', result: 'Braund, Mr. Owen Harris', note: '行の番号と列の名前を指定して、1つの値を取り出す', since: 'python-15q-select' },
      { code: 'print(df["Age"].isna().sum())', result: '177', note: '欠けた値（NaN）の数。isna は、欠けた所が True の列を返す', since: 'python-15q-missing' },
      { code: 'print(df.isna().sum())', result: 'PassengerId      0\nSurvived         0\nPclass           0\nName             0\nSex              0\nAge            177\nSibSp            0\nParch            0\nTicket           0\nFare             0\nCabin          687\nEmbarked         2\ndtype: int64', note: '表に使うと、列ごとの欠けた値の数が出る', since: 'python-15q-missing' },
      { code: 'df["Age"] = df["Age"].fillna(df["Age"].mean())\nprint(df["Age"].isna().sum())', result: '0', note: '欠けた値を平均で埋め、df["Age"] に入れ直す', since: 'python-15q-missing' },
      { code: 'print(df["Age"].isnull().sum())', result: '177', note: 'isna と同じ（名前が違うだけ）', since: 'python-15q-missing' },
      { code: 'print(df["Age"].notna().sum())', result: '714', note: '欠けていない値の数', since: 'python-15q-missing' },
      { code: 'print(len(df.dropna(subset=["Age"])))', result: '714', note: '年齢が欠けた行を捨てた表の、行の数。捨てた表を使うときは df = … と入れ直す', since: 'python-15q-missing' },
      { code: 'print(len(df.dropna()))', result: '183', note: 'どこか1つでも欠けた行を捨てる。Cabin が欠けた人が多いので、残るのは183人まで大きく減る', since: 'python-15q-missing' },
      { code: 'df["Age"] = df["Age"].fillna(df["Age"].median())\nprint(df["Age"].isna().sum())', result: '0', note: '平均のかわりに、中央値で埋める', since: 'python-15q-missing' },
      { code: 'df = df.drop(columns=["Cabin"])\nprint(len(df.columns))', result: '11', note: '列を消した表を返す。表そのものは変わらないので、df = で入れ直す', since: 'python-15q-missing' },
      { code: 'df["Family"] = df["SibSp"] + df["Parch"]\nprint(df["Family"].head(3))', result: '0    1\n1    1\n2    0\nName: Family, dtype: int64', note: '列どうしの計算で、新しい列を作る（同じ行どうしを足す）', since: 'python-15q-missing' },
      { code: 'df["Sex"] = df["Sex"].map({"male": 0, "female": 1})\nprint(df["Sex"].head(3))', result: '0    0\n1    1\n2    1\nName: Sex, dtype: int64', note: '辞書にしたがって、列の値を置き換える。df["Sex"] = で入れ直す', since: 'python-15q-encode' },
      { code: 'print(df["Embarked"].map({"S": 0, "C": 1}).isna().sum())', result: '79', note: '辞書に無い値は、欠けた値になる（"Q" の77人と、もとから欠けた2人）', since: 'python-15q-encode' },
      { code: 'print(df["Embarked"].replace({"S": 0, "C": 1}).head(6).tolist())', result: "[0, 1, 0, 0, 0, 'Q']", note: 'map と似るが、辞書に無い値（Q）はそのまま残る', since: 'python-15q-encode' },
      { code: 'print(df["Embarked"].nunique())', result: '3', note: '値の種類の数（欠けた値は数えない）', since: 'python-15q-encode' },
      { code: 'print(pd.get_dummies(df["Embarked"]).head(3))', result: '       C      Q      S\n0  False  False   True\n1   True  False  False\n2  False  False   True', note: '値ごとに列を作り、その行の値の列だけ True にする', since: 'python-15q-encode' },
    ],
  },
  {
    key: 'sklearn',
    name: 'scikit-learn',
    entries: [
      { code: 'from sklearn.tree import DecisionTreeClassifier', result: '', note: 'scikit-learn（モジュールの名前は sklearn）から、決定木のモデルを持ってくる', since: 'python-15r-fit' },
      { code: 'from sklearn.tree import DecisionTreeClassifier\nX = [[10], [16], [18], [30], [40]]\ny = [1, 1, 0, 1, 0]\nmodel = DecisionTreeClassifier(max_depth=1)\nmodel.fit(X, y)\nprint(model.predict([[12], [40]]))', result: '[1 0]', note: 'fit で X（1人が1行の2次元）と答え y から学習し、predict で新しい人の答えを予測する', since: 'python-15r-fit' },
      { code: 'from sklearn.tree import DecisionTreeClassifier\nX = [[10], [16], [18], [30], [40]]\ny = [1, 1, 0, 1, 0]\nmodel = DecisionTreeClassifier(max_depth=1)\nmodel.fit(X, y)\nprint(model.score(X, y))', result: '0.8', note: '分類のモデルでは正解率。(model.predict(X) == y).mean() と同じ（回帰のモデルでは別の物差しを返す）', since: 'python-15r-fit' },
      { code: 'from sklearn.tree import DecisionTreeClassifier\nX = [[10], [16], [18], [30], [40]]\ny = [1, 1, 0, 1, 0]\nmodel = DecisionTreeClassifier(max_depth=1)\nmodel.fit(X, y)\nprint(model.predict_proba([[12], [40]]))', result: '[[0.         1.        ]\n [0.66666667 0.33333333]]', note: '人ごとに、答えが 0 の確率と 1 の確率を出す（各行の合計が1）', since: 'python-15r-fit' },
      { code: 'from sklearn.tree import DecisionTreeClassifier, export_text\nX = [[10], [16], [18], [30], [40]]\ny = [1, 1, 0, 1, 0]\nmodel = DecisionTreeClassifier(max_depth=1)\nmodel.fit(X, y)\nprint(export_text(model, feature_names=["age"]))', result: '|--- age <= 17.00\n|   |--- class: 1\n|--- age >  17.00\n|   |--- class: 0', note: '決定木が選んだ境目を、文字で見る（ここでは age が 17 以下かどうか）', since: 'python-15r-fit' },
      { code: 'from sklearn.ensemble import RandomForestClassifier\nX = [[10], [16], [18], [30], [40]]\ny = [1, 1, 0, 1, 0]\nmodel = RandomForestClassifier(n_estimators=100, random_state=0)\nmodel.fit(X, y)\nprint(model.predict([[12], [40]]))', result: '[1 0]', note: '決定木を100本作って多数決する。fit と predict の使い方は決定木と同じ', since: 'python-15r-fit' },
      { code: 'from sklearn.linear_model import LogisticRegression\nX = df[["Pclass", "Age"]]\ny = df["Survived"]\nmodel = LogisticRegression(max_iter=1000)\nmodel.fit(X, y)', result: 'ValueError: Input X contains NaN.', note: '欠けた値（NaN）がある列を入れると止まる。先に埋めてから使う', since: 'python-15r-fit' },
      { code: 'from sklearn.linear_model import LinearRegression\nX = [[1], [2], [3]]\ny = [3, 5, 7]\nmodel = LinearRegression()\nmodel.fit(X, y)\nprint(model.predict([[4]]))', result: '[9.]', note: '数を当てる（回帰）モデル。fit と predict の使い方は同じ', since: 'python-15r-fit' },
      { code: 'from sklearn.tree import DecisionTreeRegressor\nX = [[1], [2], [3], [4], [5], [6]]\ny = [10, 12, 30, 32, 50, 54]\nmodel = DecisionTreeRegressor(max_depth=2, random_state=0)\nmodel.fit(X, y)\nprint(model.predict([[2.5], [6]]))', result: '[11. 54.]', note: '回帰の決定木。同じ組の答えの平均を、予測にする', since: 'python-15r-fit' },
      { code: 'from sklearn.tree import DecisionTreeClassifier\nX = df[["Pclass", "Fare"]]\ny = df["Survived"]\nmodel = DecisionTreeClassifier(max_depth=2, random_state=0)\nmodel.fit(X, y)\nprint(model.feature_importances_)', result: '[0.7223429 0.2776571]', note: '列ごとに、木の分け方にどれだけ使われたかを、X の列の順に出す。合計が1で、0 の列は使われていない', since: 'python-15r-features' },
      { code: 'from sklearn.model_selection import train_test_split\nX = df[["Pclass", "Fare"]]\ny = df["Survived"]\nX_train, X_test, y_train, y_test = train_test_split(X, y, test_size=0.2, random_state=0)\nprint(len(X_train), len(X_test))', result: '712 179', note: 'X と y を、訓練データとテストデータに分ける。返す4つの順は X_train・X_test・y_train・y_test', since: 'python-15r-split' },
      { code: 'from sklearn.metrics import accuracy_score\nprint(accuracy_score([1, 0, 1, 1], [1, 0, 0, 1]))', result: '0.75', note: '正解率。第1引数が答え、第2引数が予測', since: 'python-15r-split' },
      { code: 'from sklearn.tree import DecisionTreeClassifier\nfrom sklearn.model_selection import cross_val_score\nX = df[["Pclass", "Fare"]]\ny = df["Survived"]\nmodel = DecisionTreeClassifier(max_depth=3, random_state=0)\nprint(cross_val_score(model, X, y, cv=5))', result: '[0.64804469 0.67977528 0.71348315 0.73595506 0.70224719]', note: '訓練データとテストデータの分け方を変えて、5回測る。5つの正解率が出る', since: 'python-15r-split' },
      { code: 'from sklearn.metrics import mean_squared_error\nprint(mean_squared_error([3, 5, 2], [2, 5, 4]))', result: '1.6666666666666667', note: '誤差の2乗の平均（第12章2節の損失）。数を当てるときの物差し。第1引数が答え、第2引数が予測', since: 'python-15r-split' },
      { code: 'from sklearn.metrics import mean_absolute_error\nprint(mean_absolute_error([3, 5, 2], [2, 5, 4]))', result: '1.0', note: '誤差の大きさ（プラスかマイナスかは無視した値）の平均', since: 'python-15r-split' },
      { code: 'from sklearn.metrics import roc_auc_score\nprint(roc_auc_score([0, 0, 1, 1], [0.1, 0.4, 0.35, 0.8]))', result: '0.75', note: '確率で順位を付けて測る物差し。第2引数は確率で、model.predict_proba(X)[:, 1] のように、1の列だけを渡す。1 が満点で、0.5 は当てずっぽう', since: 'python-15r-split' },
      { code: 'from sklearn.tree import DecisionTreeClassifier\nX = df[["Pclass", "Fare"]]\ny = df["Survived"]\nmodel = DecisionTreeClassifier(max_depth=3, random_state=0)\nmodel.fit(X, y)\nprint(model.get_depth())', result: '3', note: '深さの上限を3にする。random_state を決めると、毎回同じ木になる。get_depth() は、できた木の深さ', since: 'python-15r-depth' },
      { code: 'from sklearn.tree import DecisionTreeClassifier\nX = df[["Pclass", "Fare"]]\ny = df["Survived"]\nmodel = DecisionTreeClassifier(max_depth=None, random_state=0)\nmodel.fit(X, y)\nprint(model.get_depth())', result: '20', note: '制限なし（None は第5章2節）。できた木は、深さ20まで伸びた', since: 'python-15r-depth' },
    ],
  },
];

/** すべての分類の key（Exercise.astro の syntax プロパティの検査に使う）。 */
export const SYNTAX_CATEGORY_KEYS: string[] = SYNTAX_CATEGORIES.map((c) => c.key);
