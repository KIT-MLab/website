/**
 * 課題の呼び方（20-platform.md 第8.4節・第8.6節）。
 *
 * **画面に課題の id をそのまま出さない。** `python-01-print-b1` と書かれても、読む側には
 * 何問目のことか分からない。学習者が画面で見ているのと同じ呼び方にそろえる。
 *
 *   「printで値を表示する」の4問目（演習問題）
 *
 * ここに置いてあるのは、**段の名前の表が散らばらないようにするため**である。
 * 以前は Exercise.astro・ask.ts・staff-data.ts の3か所に同じ表があり、段の名前を
 * 変えると3か所を直す必要があった。この module は何も import しないので、
 * ブラウザで動く側からも、Worker で動く側からも読める。
 */

/** 内部の呼び名 → 画面に出す札（10-lesson-and-writing.md 第3章・第10.6節）。 */
export const STAGE: Record<string, string> = {
  trace: '例題',
  modify: '練習問題',
  build: '演習問題',
  type: '練習問題',
  choose: '確認問題',
};

type GenLesson = { title?: string; exerciseIds?: string[]; exercises?: Record<string, { kind?: string }> };

export type ExercisePlace = { lessonId: string; lessonTitle: string; at: number; stage: string };

/** src/generated/lesson-data.json から、課題の id → 何問目・どの段 を作る。 */
export function exercisePlaces(generated: unknown): Map<string, ExercisePlace> {
  const out = new Map<string, ExercisePlace>();
  const lessons = (generated as { lessons?: Record<string, GenLesson> }).lessons ?? {};
  for (const [lessonId, data] of Object.entries(lessons)) {
    (data.exerciseIds ?? []).forEach((exerciseId, i) => {
      const kind = data.exercises?.[exerciseId]?.kind ?? '';
      out.set(exerciseId, { lessonId, lessonTitle: data.title ?? '', at: i + 1, stage: STAGE[kind] ?? '' });
    });
  }
  return out;
}

/** 「4問目（演習問題）」。引けなければ id をそのまま返す。何も出さないとどの課題か分からなくなる。 */
export function exerciseLabel(place: ExercisePlace | undefined, exerciseId: string): string {
  if (!place) return exerciseId;
  return place.stage ? `${place.at}問目（${place.stage}）` : `${place.at}問目`;
}
