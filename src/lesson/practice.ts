/**
 * 練習問題集（20-platform.md 第25.5節）の画面が共有する小さな関数と型。
 *
 * 問題そのもの（★の段・札の名前・判定）は build:tests が src/generated/lesson-data.json の
 * `practice` に書き出す（scripts/build-tests.mjs）。話題の見出しや教材の節は content collection
 * `practice` の frontmatter が持つ。一覧・話題のページ・今週のページの3か所がここを読む。
 */

export type PracticeProblem = { id: string; level: number; name: string };

type GenPracticeSet = {
  exerciseIds?: string[];
  exercises?: Record<string, { level?: number; name?: string }>;
};

/** 話題（組）の id から、問題を画面の順（= ★の段の順。検査で並びを守らせている）に返す。 */
export function practiceProblems(generated: unknown, setId: string): PracticeProblem[] {
  const set = ((generated as { practice?: Record<string, GenPracticeSet> }).practice ?? {})[setId];
  if (!set) return [];
  return (set.exerciseIds ?? []).map((id) => ({
    id,
    level: Number(set.exercises?.[id]?.level ?? 0),
    name: String(set.exercises?.[id]?.name ?? ''),
  }));
}

/** 話題のページの URL。`/learn/practice/01-python/print/` */
export function practiceHref(chapter: string, topic: string): string {
  return `/learn/practice/${chapter}/${topic}/`;
}

function escapeHtml(text: string): string {
  return text.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}

/** 話題の見出しを HTML にする。`…` で囲んだところだけコードの字にする（それ以外は文字のまま）。 */
export function topicTitleHtml(title: string): string {
  return escapeHtml(title).replace(/`([^`]+)`/g, '<code>$1</code>');
}

/** 見出しを地の文だけにする（`<title>` や札の aria 用）。 */
export function topicTitleText(title: string): string {
  return title.replace(/`([^`]+)`/g, '$1');
}
