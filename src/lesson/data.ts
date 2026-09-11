/**
 * 節の画面が使うデータ。
 *
 * 課題の期待値（expect）はビルド時に模範解答を走らせて作る（20-platform.md 第4.2節）。
 * 生成物は src/generated/lesson-data.json。模範解答そのものはブラウザに渡さない。
 *
 * 節のページは、自分の節の分だけを <script type="application/json" id="kit-lesson-data">
 * に入れて出す。島（<Run> や <Exercise>）はそこから読む。
 */

export type Test =
  | { kind: 'stdout'; stdin?: string; expect: string }
  | { kind: 'call'; fn: string; args: unknown[]; expect: unknown };

/** <Mistake> の中身。採点の応答で使う（第4.3節） */
export type MistakeData = {
  id: string;
  /** 実際に出るエラーメッセージ。前方一致で照合する */
  error: string;
  /** 原因と直し方 */
  fix: string;
};

export type ExerciseData = {
  id: string;
  kind: 'trace' | 'modify' | 'build';
  tests: Test[];
  /** 段階的に出すヒント。0〜3個 */
  hints: string[];
  /** この課題で当てはめる「よくある間違い」の id */
  mistakes: string[];
  /** 問題文で禁じた書き方。提出コードの文字列検査に使う（第4.4節） */
  forbid: string[];
};

export type LessonData = {
  lessonId: string;
  title: string;
  exerciseIds: string[];
  exercises: Record<string, ExerciseData>;
  mistakes: MistakeData[];
};

export const LESSON_DATA_ELEMENT_ID = 'kit-lesson-data';

let cached: LessonData | null = null;

export function getLessonData(): LessonData | null {
  if (cached) return cached;
  if (typeof document === 'undefined') return null;
  const el = document.getElementById(LESSON_DATA_ELEMENT_ID);
  if (!el?.textContent) return null;
  try {
    cached = JSON.parse(el.textContent) as LessonData;
    return cached;
  } catch {
    return null;
  }
}

export function getExerciseData(id: string): ExerciseData | null {
  return getLessonData()?.exercises[id] ?? null;
}
