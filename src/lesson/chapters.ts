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
  '05-function': '第5章 まとめて名前を付ける',
  '06-error': '第6章 エラーを読む',
  '07-array': '第7章 数をまとめて扱う',
};

export function chapterTitle(chapter: string): string {
  return CHAPTER_TITLES[chapter] ?? chapter.replace(/^\d+-/, '');
}

/** 節の URL。ディレクトリ名が章、ファイル名が節（20-platform.md 第2.1節）。 */
export function lessonHref(entryId: string): string {
  return `/learn/lesson/${entryId}/`;
}
