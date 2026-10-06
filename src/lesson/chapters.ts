// @ts-expect-error 部の表は .mjs 側に1つだけ置く（scripts/parts.mjs）。TypeScript の型検査は
// どこでも走っていない（design/HANDOFF.md 第5章）ので、.mjs をそのまま読む
import { INTRO_CHAPTER as INTRO_CHAPTER_RAW, MEMBERS_ONLY_CHAPTERS, PARTS as PARTS_RAW, PROJECT_PARTS as PROJECT_PARTS_RAW, PROJECT_REF_SOURCE as PROJECT_REF_SOURCE_RAW, partOfChapter as partOfChapterRaw, projectChapter, projectSectionLabel, writtenParts as writtenPartsRaw } from '../../scripts/parts.mjs';

/**
 * 部（20-platform.md 第17.1節）。書いてある部は chapters、準備中の部は count を持つ。
 * 部分的に書けた部（例: 第3部）は chapters に書けた章だけを並べ、totalChapters に
 * 計画している章数を書く（省略時は chapters.length と同じ、つまり全部書けている）。
 */
export type Part = { name: string; chapters: string[]; totalChapters?: number } | { name: string; count: number };

export const PARTS: Part[] = PARTS_RAW;
/** プロジェクトの教材（/learn/project/。design/spec/53-ml-intro.md 第8節）の部。メンバーだけ */
export const PROJECT_PARTS: { name: string; chapters: string[] }[] = PROJECT_PARTS_RAW;
/** タイタニック演習の章（design/spec/53-ml-intro.md）。表は scripts/parts.mjs に1つだけ置く */
export const INTRO_CHAPTER: string = INTRO_CHAPTER_RAW;
/** 本文の中の、メンバーだけの章の節への参照（「タイタニック2」「pandas 2」）の正規表現の元。組は呼び方の頭と番号 */
export const PROJECT_REF_SOURCE: string = PROJECT_REF_SOURCE_RAW;
export const writtenParts: () => Extract<Part, { chapters: string[] }>[] = writtenPartsRaw;
export const partOfChapter: (chapter: string) => Extract<Part, { chapters: string[] }> | null = partOfChapterRaw;

/**
 * 章の表示名。
 *
 * 仕様書（00-overview.md 第2.2節）は部と章数を決めているが、章の題は決めていない。
 * 決まったものからここに足す。無いものはディレクトリ名から作る。
 * 2026-10-06 代表の選択で、章の題は目次のような名詞（その章で覚える Python の言葉や分野の名前）にした
 * （DECISIONS.md「章と節の題の付け方」、design/reviews/titles-audit-2026-10-06.md）。
 */
export const CHAPTER_TITLES: Record<string, string> = {
  '00-start': '第0章 パソコンの操作',
  '01-python': '第1章 print・input・変数',
  '02-numbers': '第2章 演算子・数の型・math',
  '03-branch': '第3章 if 文による条件分岐',
  '04-loop': '第4章 for・while・リスト・辞書',
  '04p-practice1': '練習編1（第1〜4章）',
  '05-function': '第5章 関数',
  '06-error': '第6章 エラーを読む',
  '07-array': '第7章 numpy の配列',
  '08-table': '第8章 numpy の2次元配列と形',
  '08p-practice2': '練習編2（第1〜8章）',
  '08q-mlintro': 'タイタニック演習',
  '09-matrix': '第9章 ベクトルと行列',
  '10-slope': '第10章 傾きと微分',
  '11-probability': '第11章 確率・対数・標準偏差',
  '12-predict': '第12章 予測のモデルと損失',
  '13-regression': '第13章 勾配降下法と線形回帰',
  '14-classify': '第14章 分類とロジスティック回帰',
  '15-evaluate': '第15章 評価と過学習',
};

export function chapterTitle(chapter: string): string {
  const practice = practiceNo(chapter);
  return CHAPTER_TITLES[chapter] ?? projectChapter(chapter)?.name ?? (practice !== null ? `練習編${practice}` : chapter.replace(/^\d+-/, ''));
}

/**
 * 練習編の章か（20-platform.md 第15.1節）。`04p-practice1` のように、前の章の番号のあとに p が付く。
 * 練習編なら何番目の練習編かを返す。そうでなければ null。
 * 同じ形を scripts/check-lessons.mjs（PRACTICE_CHAPTER）も見ている。
 */
export function practiceNo(chapter: string): number | null {
  const m = /^\d\dp-practice(\d+)$/.exec(chapter);
  return m ? Number(m[1]) : null;
}

/** メンバーだけの章か（design/spec/53-ml-intro.md 第6節）。表は scripts/parts.mjs の MEMBERS_ONLY_CHAPTERS。 */
export function isMembersOnlyChapter(chapter: string): boolean {
  return (MEMBERS_ONLY_CHAPTERS as string[]).includes(chapter);
}

/**
 * 章の番号を持たない章の節の呼び方。章の中の n 番目（1から）の節を、練習編は「練習1-2」
 * （第15.1節）、メンバーだけの章は「タイタニック2」「pandas 2」と呼ぶ（design/spec/53-ml-intro.md 第2節。
 * 呼び方の頭は scripts/parts.mjs の PROJECT_CHAPTERS）。
 * どちらでもなければ null。ほかの章の呼び方（「7.2」「第7章2節」）は画面ごとに違うので、呼ぶ側が作る。
 * 同じ呼び方を scripts/section-refs.mjs の sectionLabel も作る。
 */
export function practiceSectionLabel(chapter: string, n: number): string | null {
  const project = projectSectionLabel(chapter, n);
  if (project !== null) return project;
  const practice = practiceNo(chapter);
  return practice !== null ? `練習${practice}-${n}` : null;
}

/** 節の URL。ディレクトリ名が章、ファイル名が節（20-platform.md 第2.1節）。 */
export function lessonHref(entryId: string): string {
  return `/learn/lesson/${entryId}/`;
}
