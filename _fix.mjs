import { readFileSync, writeFileSync } from 'node:fs';
const edit = (f, pairs) => { const raw = readFileSync(f, 'utf8'); const crlf = raw.includes('\r\n'); let s = raw.split('\r\n').join('\n'); for (const [a, b] of pairs) { if (!s.includes(a)) throw new Error(f + ': ' + a.slice(0, 30)); s = s.replace(a, b); } writeFileSync(f, crlf ? s.split('\n').join('\r\n') : s); };
edit('scripts/remark-section-syntax.mjs', [
  [' * 節の「説明」の終わりに「この節の書き方」の表（<SectionSyntax>）を差し込む remark プラグイン\n * （DECISIONS.md「書き方のまとめ（2026-09-27）」）。',
   ' * 節の冒頭に「この節の書き方」の表（<SectionSyntax>）を差し込む remark プラグイン\n * （DECISIONS.md「書き方のまとめ（2026-09-27）」。2026-10-02 に「説明」の終わりから冒頭へ移した。\n * 利用者の判断: せっかくまとめてあるのに、節のどこにあるかを探すのが面倒）。'],
  [' *   1. `{/* 課題 *\/}` の直前（「説明」の終わり）\n *   2. それが無ければ、最初の <Exercise> の直前\n *   3. それも無ければ `{/* つながり *\/}` の直前\n *   4. どれも無ければ本文の最後',
   ' *   1. `{/* 困る例 *\/}` の直前（節の題のすぐ下）\n *   2. それが無ければ、本文の最初（frontmatter と import の次）'],
  ["const isExercise = (node) => node.type === 'mdxJsxFlowElement' && node.name === 'Exercise';\n\n", ''],
  ["    let at = kids.findIndex((n) => isMarker(n, '課題'));\n    if (at < 0) at = kids.findIndex(isExercise);\n    if (at < 0) at = kids.findIndex((n) => isMarker(n, 'つながり'));\n    if (at < 0) at = kids.length;\n",
   "    let at = kids.findIndex((n) => isMarker(n, '困る例'));\n    if (at < 0) at = kids.findIndex((n) => n.type !== 'yaml' && n.type !== 'mdxjsEsm');\n    if (at < 0) at = kids.length;\n"],
]);
edit('src/components/lesson/SectionSyntax.astro', [
  [' * 各節の「説明」の終わり（「課題」の直前）に、その節で教えた書き方を「書き方｜結果｜説明」で並べる。', ' * 各節の冒頭（節の題のすぐ下。2026-10-02 に「説明」の終わりから移した）に、その節で教える書き方を「書き方｜結果｜説明」で並べる。'],
]);
edit('src/lesson/syntax-list.ts', [[' * 同じデータから、各節の説明のあとの「この節の書き方」の表も作る', ' * 同じデータから、各節の冒頭の「この節の書き方」の表も作る']]);
edit('design/reviews/_cross.md', [['- 各節の説明のあとの**「この節の書き方」の表**', '- 各節の冒頭の**「この節の書き方」の表**']]);
