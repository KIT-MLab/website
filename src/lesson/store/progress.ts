/**
 * 進度と提出の記録。
 *
 * 20-platform.md 第6章では D1 に置く。いまはまだアカウントが無いので localStorage に置く。
 * 画面側はこの ProgressStore だけを見る。D1 に移すときは実装を差し替えるだけで済むよう、
 * 読み書きはすべて Promise で返す。
 */

export type LessonState = 'none' | 'opened' | 'done';

export type Submission = {
  lessonId: string;
  exerciseId: string;
  /** 提出したコードそのまま。先生が読むので整形しない（第8.4節） */
  code: string;
  passed: boolean;
  /** 落ちたテストの番号。0始まり。通ったときは null */
  failedTest: number | null;
  /** 'NameError' など。エラーが出なかったときは null */
  errorType: string | null;
  at: number;
};

export type ExerciseResult = {
  passed: boolean;
  /** 落ちた回数。ヒントを出す判断に使う（第4.3節） */
  fails: number;
};

export interface ProgressStore {
  /** 節を開いた */
  openLesson(lessonId: string): Promise<void>;
  /** 節の課題を全部通した */
  finishLesson(lessonId: string): Promise<void>;
  lessonStates(lessonIds: string[]): Promise<Record<string, LessonState>>;
  /** 採点を1回走らせたら必ず呼ぶ */
  recordSubmission(submission: Submission): Promise<void>;
  exerciseResult(exerciseId: string): Promise<ExerciseResult>;
}

type Saved = {
  lessons: Record<string, { state: LessonState; openedAt: number; doneAt: number | null }>;
  exercises: Record<string, { passed: boolean; fails: number }>;
  submissions: Submission[];
};

const KEY = 'kit-lesson-progress-v1';
const MAX_SUBMISSIONS = 200;

function read(): Saved {
  const empty: Saved = { lessons: {}, exercises: {}, submissions: [] };
  if (typeof localStorage === 'undefined') return empty;
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) return empty;
    const parsed = JSON.parse(raw) as Partial<Saved>;
    return {
      lessons: parsed.lessons ?? {},
      exercises: parsed.exercises ?? {},
      submissions: parsed.submissions ?? [],
    };
  } catch {
    return empty;
  }
}

function write(saved: Saved): void {
  if (typeof localStorage === 'undefined') return;
  try {
    localStorage.setItem(KEY, JSON.stringify(saved));
  } catch {
    /* 容量超過や保存禁止のときは黙って諦める。学習そのものは続けられる */
  }
}

class LocalProgressStore implements ProgressStore {
  async openLesson(lessonId: string): Promise<void> {
    const saved = read();
    const current = saved.lessons[lessonId];
    if (!current) saved.lessons[lessonId] = { state: 'opened', openedAt: Date.now(), doneAt: null };
    write(saved);
  }

  async finishLesson(lessonId: string): Promise<void> {
    const saved = read();
    const current = saved.lessons[lessonId] ?? { state: 'opened' as LessonState, openedAt: Date.now(), doneAt: null };
    saved.lessons[lessonId] = { ...current, state: 'done', doneAt: current.doneAt ?? Date.now() };
    write(saved);
  }

  async lessonStates(lessonIds: string[]): Promise<Record<string, LessonState>> {
    const saved = read();
    const out: Record<string, LessonState> = {};
    for (const id of lessonIds) out[id] = saved.lessons[id]?.state ?? 'none';
    return out;
  }

  async recordSubmission(submission: Submission): Promise<void> {
    const saved = read();
    saved.submissions.push(submission);
    if (saved.submissions.length > MAX_SUBMISSIONS) {
      saved.submissions = saved.submissions.slice(-MAX_SUBMISSIONS);
    }
    const current = saved.exercises[submission.exerciseId] ?? { passed: false, fails: 0 };
    saved.exercises[submission.exerciseId] = {
      passed: current.passed || submission.passed,
      fails: submission.passed ? current.fails : current.fails + 1,
    };
    write(saved);
  }

  async exerciseResult(exerciseId: string): Promise<ExerciseResult> {
    const saved = read();
    return saved.exercises[exerciseId] ?? { passed: false, fails: 0 };
  }
}

let store: ProgressStore = new LocalProgressStore();

export function getProgressStore(): ProgressStore {
  return store;
}

/** D1 の実装に差し替えるための口。 */
export function setProgressStore(next: ProgressStore): void {
  store = next;
}
