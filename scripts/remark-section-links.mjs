/**
 * 本文中の「第N章M節」を、その節へのリンクに変える remark プラグイン（20-platform.md 第15.2節）。
 *
 * リンク・インラインコード・コードブロックの中は見ない。行き先が無い参照はそのまま文字で
 * 残す（scripts/check-lessons.mjs の検査20 が落とす）。<Exercise>・<Mistake> の本文（JSX の
 * 子）も普通の mdast の文章として現れるので、ここを通れば自動でリンクになる。
 *
 * 採点画面の Inline（src/lesson/ui/shared.tsx）で出す文章（ヒント・よくある間違いの直し方）は
 * MDX を通らないので、ここではリンクにならない。あちらは scripts/build-tests.mjs が書き出す
 * src/generated/section-refs.json を読んで、同じ形を自分でリンクにする。
 */
import { fileURLToPath } from 'node:url';
import { join } from 'node:path';
import { visit } from 'unist-util-visit';
import { buildSectionRefs, sectionHref } from './section-refs.mjs';

const ROOT = fileURLToPath(new URL('..', import.meta.url));
const LESSONS_DIR = join(ROOT, 'src', 'content', 'lessons');

const SECTION_RE = /第(\d+)章(\d+)節/g;
const SKIP_PARENTS = new Set(['link', 'linkReference', 'inlineCode', 'code']);

export default function remarkSectionLinks() {
  // 節の置き場所は起動時に一度だけ読む（ファイルごとに読み直さない）
  const refs = buildSectionRefs(LESSONS_DIR);

  return (tree) => {
    visit(tree, 'text', (node, index, parent) => {
      if (!parent || index === null || index === undefined) return;
      if (SKIP_PARENTS.has(parent.type)) return;

      SECTION_RE.lastIndex = 0;
      const matches = [...node.value.matchAll(SECTION_RE)];
      if (matches.length === 0) return;

      const newNodes = [];
      let last = 0;
      for (const m of matches) {
        const at = m.index ?? 0;
        if (at > last) newNodes.push({ type: 'text', value: node.value.slice(last, at) });
        const entry = refs[`${Number(m[1])}-${Number(m[2])}`];
        if (entry) {
          newNodes.push({
            type: 'link',
            url: sectionHref(entry),
            children: [{ type: 'text', value: m[0] }],
            data: { hProperties: { className: ['kit-lessonlink'] } },
          });
        } else {
          // 行き先が無い。文字のまま残し、検査20 に見つけさせる
          newNodes.push({ type: 'text', value: m[0] });
        }
        last = at + m[0].length;
      }
      if (last < node.value.length) newNodes.push({ type: 'text', value: node.value.slice(last) });

      parent.children.splice(index, 1, ...newNodes);
      return index + newNodes.length;
    });
  };
}
