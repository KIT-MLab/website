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

/**
 * タイタニック演習の章（design/spec/53-ml-intro.md）。フォルダ名の並びで練習編2のあと・第9章の前に来る
 * （`08p-practice2` < `08q-mlintro` < `09-matrix`）。道具の台帳（検査16）と語の初出（検査18）はこの並びで見る。
 * 章の番号（第N章）を持たず、節を「タイタニック1」と呼ぶ。
 * 呼び方は src/lesson/chapters.ts の practiceSectionLabel と scripts/section-refs.mjs の sectionLabel。
 * フォルダ名と id は「機械学習の入口」と呼んでいたころのまま（本番の公開状態・進度・予想の行の鍵のため）。
 */
export const INTRO_CHAPTER = '08q-mlintro';

/**
 * プロジェクトの教材（`/learn/project/`。design/spec/53-ml-intro.md 第8節）の部。メンバーだけ。
 * 学習の一覧（PARTS）には入れない。部ごとに章を1つ持ち、その節を並べる。
 */
export const PROJECT_PARTS = [{ name: 'タイタニック演習', chapters: [INTRO_CHAPTER] }];

/**
 * メンバーだけの章（design/spec/53-ml-intro.md 第6節）。プロジェクトの教材の部の章。メンバーでない人には、
 * 公開していても節のページは1段落だけ、用語の検索の索引にも出さない。判定は src/lesson/chapters.ts の isMembersOnlyChapter。
 */
export const MEMBERS_ONLY_CHAPTERS = PROJECT_PARTS.flatMap((p) => p.chapters);

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
  { name: '第3部 機械学習', chapters: ['12-predict', '13-regression', '14-classify', '15-evaluate'] },
  { name: '第4部 深層学習', count: 4 },
  { name: '第5部 自分の環境', count: 2 },
  { name: '第6部 深層学習を式から', count: 5 },
  { name: '第7部 応用', count: 3 },
  { name: '第8部 総合', count: 1 },
];

/** 書いてある部（章のディレクトリを持つ部）だけ。プロジェクトの教材の部も後ろに含む（運営の教材の公開の画面・検査21 が使う）。 */
export function writtenParts() {
  return [...PARTS.filter((p) => Array.isArray(p.chapters)), ...PROJECT_PARTS];
}

/** 章のディレクトリ名から、それが属す部を探す。無ければ null。 */
export function partOfChapter(chapter) {
  return writtenParts().find((p) => p.chapters.includes(chapter)) ?? null;
}
