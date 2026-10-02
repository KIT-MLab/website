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
 * 章の番号（第N章）を持たず、節を「タイタニック1」と呼ぶ（呼び方は下の PROJECT_CHAPTERS）。
 * ここはタイタニック演習だけの仕組み（スライド・規則の正解率ランキングなど）が指す。
 * メンバーだけの章ならどれでも、という所は PROJECT_CHAPTERS / MEMBERS_ONLY_CHAPTERS を見る。
 * フォルダ名と id は「機械学習の入口」と呼んでいたころのまま（本番の公開状態・進度・予想の行の鍵のため）。
 */
export const INTRO_CHAPTER = '08q-mlintro';

/**
 * メンバーだけの章の表（design/spec/53-ml-intro.md 第8節・56-tools-curriculum.md 第5節 A）。**1行が1つの章**。
 * プロジェクトの教材のページ（`/learn/project/`）には、この順に章ごとに1つの見出しで並ぶ。
 *
 * - chapter: 章のフォルダ名。フォルダ名の並びで検査16・18 が「教えたか」を見るので、置く場所に気をつける
 * - name: ページに出す見出し（章の名前・部の名前を兼ねる）
 * - label / space: 節の呼び方の頭と、番号との間に空白を入れるか（「タイタニック1」「pandas 1」）。
 *   本文にこの形で書くと、その節へのリンクになる（scripts/section-refs.mjs の SECTION_REF_RE）
 *
 * 章を足すときはここに1行足すだけ。節が1つも無い章は、プロジェクトの教材のページに見出しを出さない。
 * 新しい章の節は、最初は準備中（section_status に行が無い）。
 */
export const PROJECT_CHAPTERS = [
  { chapter: INTRO_CHAPTER, name: 'タイタニック演習', label: 'タイタニック', space: false },
  { chapter: '15q-pandas', name: 'pandas', label: 'pandas', space: true },
  { chapter: '15r-sklearn', name: 'scikit-learn', label: 'scikit-learn', space: true },
  { chapter: '15s-titanic', name: 'Kaggle に提出', label: 'Kaggle', space: true },
];

/** メンバーだけの章なら、その表の行。そうでなければ null */
export function projectChapter(chapter) {
  return PROJECT_CHAPTERS.find((c) => c.chapter === chapter) ?? null;
}

/** 表の行から、節の呼び方の番号より前の部分（「タイタニック」「pandas 」） */
function labelHead(c) {
  return c.space ? `${c.label} ` : c.label;
}

/** メンバーだけの章の n 番目（1から）の節の呼び方（「タイタニック2」「pandas 2」）。メンバーだけの章でなければ null */
export function projectSectionLabel(chapter, n) {
  const c = projectChapter(chapter);
  return c ? `${labelHead(c)}${n}` : null;
}

/**
 * 本文の中の、メンバーだけの章の節への参照（「タイタニック2」「pandas 2」）の正規表現の元。
 * 当たりは2つの組: 呼び方の頭（「pandas 」）と番号。scripts/section-refs.mjs と src/lesson/ui/shared.tsx が
 * ほかの形とつないで使う（このファイルは画面からも読むので node: を import しない）。
 *
 * ふつうの文の「pandas」「Kaggle」（ライブラリ・サービスの名前）を誤ってリンクにしないよう、名前・空白・数字が
 * 続くときだけ当てる。そのうえで英字の名前は、前に英数字が続くとき（「geopandas 1」）、番号が3桁以上のとき
 * （「Kaggle 2024」）、番号のあとに数字か「.」が続くとき（「pandas 2.2」のような版の番号）も当てない。
 * 「タイタニック2」の当たり方は前のまま（前後を見ない）。
 */
const escapeRe = (s) => s.replace(/[.*+?^${}()|[\]\\-]/g, '\\$&');
const KANA_HEADS = PROJECT_CHAPTERS.filter((c) => !/^[A-Za-z]/.test(c.label)).map((c) => escapeRe(labelHead(c)));
const ASCII_HEADS = PROJECT_CHAPTERS.filter((c) => /^[A-Za-z]/.test(c.label)).map((c) => escapeRe(labelHead(c)));
export const PROJECT_REF_SOURCE =
  `(${[...KANA_HEADS, ...(ASCII_HEADS.length > 0 ? [`(?<![A-Za-z0-9_-])(?:${ASCII_HEADS.join('|')})`] : [])].join('|')})` +
  `(\\d+)(?:(?<=(?:${KANA_HEADS.join('|') || '(?!)'})\\d+)|(?<=[A-Za-z] \\d{1,2})(?![\\d.]))`;

/**
 * プロジェクトの教材（`/learn/project/`）の部。メンバーだけ。上の表から作る（1つの章が1つの部）。
 * 学習の一覧（PARTS）には入れない。
 */
export const PROJECT_PARTS = PROJECT_CHAPTERS.map((c) => ({ name: c.name, chapters: [c.chapter] }));

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
