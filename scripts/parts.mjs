/**
 * 部の一覧（20-platform.md 第17.1節）。
 *
 * `/learn/` の一覧（部→章→節）と、章のディレクトリが必ずどれか1つの部に入っていることを
 * 見る検査21（scripts/check-lessons.mjs）が、同じ表を読む。**表は1つだけ**（重複させない）。
 *
 * src/lesson/chapters.ts（Astro のページ）と scripts/check-lessons.mjs（.mjs の検査）の
 * 両方から import する。TypeScript の型検査はどこでも走っていない
 * （design/HANDOFF.md 第5章）ので、.ts から .mjs を読むだけで足りる。
 */

/**
 * @typedef {{ name: string, chapters: string[], totalChapters?: number } | { name: string, count: number }} Part
 *
 * totalChapters は、部分的に書けた部（例: 第3部）が計画している章数。省略時は
 * chapters.length（＝全部書けている）。書いてある章だけを chapters に並べつつ、
 * 一覧では計画どおりの章数を示すための最小限の足し場（src/pages/learn/index.astro）。
 */

/** @type {Part[]} */
export const PARTS = [
  { name: '第0部 準備', chapters: ['00-start'] },
  {
    name: '第1部 Python',
    chapters: [
      '01-python',
      '02-numbers',
      '03-branch',
      '04-loop',
      '04p-practice1',
      '05-function',
      '06-error',
      '07-array',
      '08-table',
      '08p-practice2',
    ],
  },
  { name: '第2部 数学の基礎', chapters: ['09-matrix', '10-slope', '11-probability'] },
  { name: '第3部 機械学習', chapters: ['12-predict', '13-regression', '14-classify'], totalChapters: 4 },
  { name: '第4部 深層学習', count: 4 },
  { name: '第5部 自分の環境', count: 2 },
  { name: '第6部 深層学習を式から', count: 5 },
  { name: '第7部 応用', count: 3 },
  { name: '第8部 総合', count: 1 },
];

/** 書いてある部（章のディレクトリを持つ部）だけ。 */
export function writtenParts() {
  return PARTS.filter((p) => Array.isArray(p.chapters));
}

/** 章のディレクトリ名から、それが属す部を探す。無ければ null。 */
export function partOfChapter(chapter) {
  return writtenParts().find((p) => p.chapters.includes(chapter)) ?? null;
}
