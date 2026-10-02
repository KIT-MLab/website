/**
 * 節の冒頭に「この節の書き方」の表（<SectionSyntax>）を差し込む remark プラグイン
 * （DECISIONS.md「書き方のまとめ（2026-09-27）」。2026-10-02 に「説明」の終わりから冒頭へ移した。
 * 利用者の判断: せっかくまとめてあるのに、節のどこにあるかを探すのが面倒）。
 *
 * 書き手に表の置き場所を書かせないため、本文の要素マーカー（parse-lesson.mjs）を目印にする。
 *   1. `{/* 困る例 *\/}` の直前（節の題のすぐ下）
 *   2. それが無ければ、本文の最初（frontmatter と import の次）
 *
 * 見るのは src/content/lessons の .mdx だけ（今週の演習・練習問題集には差し込まない）。
 * 差し込むのは節の id を渡した <SectionSyntax id="…" /> だけで、行があるかどうかは部品が
 * 決める（行が無ければ何も描かない）。部品は節の画面（src/pages/learn/lesson/[...id].astro）が
 * components として渡す。
 */
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { join, resolve } from 'node:path';

const ROOT = fileURLToPath(new URL('..', import.meta.url));
const LESSONS_DIR = resolve(join(ROOT, 'src', 'content', 'lessons')).replace(/\\/g, '/').toLowerCase();

const isMarker = (node, name) =>
  node.type === 'mdxFlowExpression' && typeof node.value === 'string' && node.value.replace(/\s+/g, '') === `/*${name}*/`;

/** 節の id。Astro が渡す frontmatter を先に見て、無ければファイルから読む */
function lessonId(file) {
  const fm = file.data?.astro?.frontmatter;
  if (fm && typeof fm.id === 'string') return fm.id;
  try {
    const m = /^id:\s*(\S+)/m.exec(readFileSync(file.path, 'utf8'));
    return m ? m[1].replace(/^['"]|['"]$/g, '') : null;
  } catch {
    return null;
  }
}

export default function remarkSectionSyntax() {
  return (tree, file) => {
    const path = file.path ? resolve(file.path).replace(/\\/g, '/').toLowerCase() : '';
    if (!path.startsWith(LESSONS_DIR + '/') || !path.endsWith('.mdx')) return;
    const id = lessonId(file);
    if (!id) return;

    const node = {
      type: 'mdxJsxFlowElement',
      name: 'SectionSyntax',
      attributes: [{ type: 'mdxJsxAttribute', name: 'id', value: id }],
      children: [],
    };
    const kids = tree.children;
    let at = kids.findIndex((n) => isMarker(n, '困る例'));
    if (at < 0) at = kids.findIndex((n) => n.type !== 'yaml' && n.type !== 'mdxjsEsm');
    if (at < 0) at = kids.length;
    kids.splice(at, 0, node);
  };
}
