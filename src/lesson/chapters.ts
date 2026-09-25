// @ts-expect-error 部の表は .mjs 側に1つだけ置く（scripts/parts.mjs）。TypeScript の型検査は
// どこでも走っていない（design/HANDOFF.md 第5章）ので、.mjs をそのまま読む
import { PARTS as PARTS_RAW, partOfChapter as partOfChapterRaw, writtenParts as writtenPartsRaw } from '../../scripts/parts.mjs';

/** 部（20-platform.md 第17.1節）。書いてある部は chapters、準備中の部は count を持つ。 */
export type Part = { name: string; chapters: string[] } | { name: string; count: number };

export const PARTS: Part[] = PARTS_RAW;
export const writtenParts: () => Extract<Part, { chapters: string[] }>[] = writtenPartsRaw;
export const partOfChapter: (chapter: string) => Extract<Part, { chapters: string[] }> | null = partOfChapterRaw;

/**
 * 章の表示名。
 *
 * 仕様書（00-overview.md 第2.2節）は部と章数を決めているが、章の題は決めていない。
 * 決まったものからここに足す。無いものはディレクトリ名から作る。
 */
export const CHAPTER_TITLES: Record<string, string> = {
  '00-start': '第0章 パソコンの操作',
  '01-python': '第1章 Python を書きはじめる',
  '02-numbers': '第2章 数と計算',
  '03-branch': '第3章 場合で分ける',
  '04-loop': '第4章 繰り返す',
  '04p-practice1': '練習編1',
  '05-function': '第5章 まとめて名前を付ける',
  '06-error': '第6章 エラーを読む',
  '07-array': '第7章 数をまとめて扱う',
  '08-table': '第8章 表の形を扱う',
  '09-matrix': '第9章 ベクトルと行列',
  '10-slope': '第10章 変化率と傾き',
  '11-probability': '第11章 確率の初歩',
};

export function chapterTitle(chapter: string): string {
  const practice = practiceNo(chapter);
  return CHAPTER_TITLES[chapter] ?? (practice !== null ? `練習編${practice}` : chapter.replace(/^\d+-/, ''));
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

/**
 * 練習編の節の呼び方。章の中の n 番目（1から）の節を「練習1-2」と呼ぶ（第15.1節）。
 * 練習編でなければ null。ほかの章の呼び方（「7.2」「第7章2節」）は画面ごとに違うので、呼ぶ側が作る。
 */
export function practiceSectionLabel(chapter: string, n: number): string | null {
  const practice = practiceNo(chapter);
  return practice !== null ? `練習${practice}-${n}` : null;
}

/** 節の URL。ディレクトリ名が章、ファイル名が節（20-platform.md 第2.1節）。 */
export function lessonHref(entryId: string): string {
  return `/learn/lesson/${entryId}/`;
}
