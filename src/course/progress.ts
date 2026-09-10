import { EXPLANATIONS, LESSONS } from './curriculum';
export const STORAGE_KEY = 'kit-deep-learning-course-v1';
export type AnswerRecord = { first: number; last: number; attempts: number; solved: boolean };
export type LessonRecord = { experienced: boolean; answers: Record<string, AnswerRecord> };
export type Progress = { version: 1; current: string; lessons: Record<string, LessonRecord>; explanations: { text: string; reviewed: boolean }[] };
export const emptyProgress = (): Progress => ({ version: 1, current: LESSONS[0].id, lessons: {}, explanations: EXPLANATIONS.map(() => ({ text: '', reviewed: false })) });
export const lessonRecord = (p: Progress, id: string): LessonRecord => p.lessons[id] ?? { experienced: false, answers: {} };
export const questionCount = (p: Progress, id: string) => Object.values(lessonRecord(p, id).answers).filter((a) => a.solved).length;
export const isComplete = (p: Progress, id: string) => lessonRecord(p, id).experienced && questionCount(p, id) === LESSONS.find((s) => s.id === id)?.questions.length;
export function parseProgress(raw: string | null): Progress {
  const p = emptyProgress();
  if (!raw) return p;
  const saved = JSON.parse(raw);
  if (!saved || saved.version !== 1) throw new Error('Unknown progress version');
  if (LESSONS.some((s) => s.id === saved.current)) p.current = saved.current;
  for (const lesson of LESSONS) {
    const record = saved.lessons?.[lesson.id];
    if (!record || typeof record !== 'object') continue;
    const answers: Record<string, AnswerRecord> = {};
    for (const q of lesson.questions) {
      const a = record.answers?.[q.id];
      const valid = (v: unknown) => Number.isInteger(v) && Number(v) >= 0 && Number(v) < q.choices.length;
      if (a && valid(a.first) && valid(a.last) && Number.isInteger(a.attempts) && a.attempts > 0) answers[q.id] = { first: a.first, last: a.last, attempts: Math.min(a.attempts, 10000), solved: a.solved === true };
    }
    p.lessons[lesson.id] = { experienced: record.experienced === true, answers };
  }
  p.explanations = EXPLANATIONS.map((_, i) => { const item = saved.explanations?.[i]; const text = typeof item?.text === 'string' ? item.text.slice(0, 4000) : ''; return { text, reviewed: !!text.trim() && item?.reviewed === true }; });
  if (p.lessons.explain) p.lessons.explain.experienced = p.explanations.every((e) => e.reviewed && e.text.trim());
  return p;
}
export function saveAnswer(p: Progress, lessonId: string, questionId: string, choice: number): Progress {
  const q = LESSONS.find((s) => s.id === lessonId)?.questions.find((q) => q.id === questionId);
  if (!q || !Number.isInteger(choice) || choice < 0 || choice >= q.choices.length) return p;
  const record = lessonRecord(p, lessonId), old = record.answers[questionId];
  const answer: AnswerRecord = { first: old?.first ?? choice, last: choice, attempts: (old?.attempts ?? 0) + 1, solved: old?.solved === true || choice === q.answer };
  return { ...p, lessons: { ...p.lessons, [lessonId]: { ...record, answers: { ...record.answers, [questionId]: answer } } } };
}
