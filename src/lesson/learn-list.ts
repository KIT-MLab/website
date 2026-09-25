/**
 * `/learn/` の進み具合を塗る（20-platform.md 第17章）。
 *
 * SSR は「まだ何も進めていない」姿（部0・章0だけ開き、最初の節が「次」）で出す。
 * ここでは手元の進度（getProgressStore()）を読み、実際の姿に塗り直す。
 *
 * 数えるのは課題（<Exercise>）の数。節の数ではない（第17.2節。1問通すごとに動いて見えるため）。
 */
import { chapterTitle } from './chapters';
import { getProgressStore } from './store/progress';
// @ts-expect-error 部の表は .mjs 側に1つだけ置く（scripts/parts.mjs。chapters.ts と同じ理由）
import { PARTS } from '../../scripts/parts.mjs';

type LearnSection = {
  href: string;
  lessonId: string;
  chapter: string;
  label: string;
  title: string;
  minutes: number;
  exerciseIds: string[];
};

type WrittenPart = { name: string; chapters: string[] };

const DATA_ID = 'kit-learn-data';

function readSections(): LearnSection[] {
  const el = document.getElementById(DATA_ID);
  if (!el?.textContent) return [];
  try {
    const data = JSON.parse(el.textContent);
    return Array.isArray(data) ? (data as LearnSection[]) : [];
  } catch {
    return [];
  }
}

/** `data-*` の値として使うための、素朴な CSS エスケープ。 */
function esc(value: string): string {
  return typeof CSS !== 'undefined' && typeof CSS.escape === 'function' ? CSS.escape(value) : value.replace(/["\\]/g, '\\$&');
}

function setMeter(el: Element | null, done: number, total: number): void {
  if (!el) return;
  const pct = total > 0 ? Math.round((done / total) * 100) : 0;
  const finished = total > 0 && done === total;
  el.classList.toggle('is-done', finished);
  const fill = el.querySelector<HTMLElement>('.lp-meter__fill');
  if (fill) fill.style.width = `${pct}%`;
  const pctEl = el.querySelector('.lp-meter__pct');
  if (pctEl) pctEl.textContent = finished ? `✓ ${pct}%` : `${pct}%`;
  const cnt = el.querySelector('.lp-meter__cnt');
  if (cnt) cnt.textContent = `${done}/${total}問`;
}

export async function paintLearnList(): Promise<void> {
  const sections = readSections();
  if (sections.length === 0) return;

  const store = getProgressStore();
  const lessonIds = [...new Set(sections.map((s) => s.lessonId))];
  const states = await store.lessonStates(lessonIds);

  // 課題ごとの通過数（節ではなく問題の数で数える）
  const doneById = new Map<string, number>();
  await Promise.all(
    sections.map(async (s) => {
      const results = await Promise.all(s.exerciseIds.map((id) => store.exerciseResult(id)));
      doneById.set(s.lessonId, results.filter((r) => r.passed).length);
    }),
  );

  // 教材の順で最初の、まだ済んでいない節。無ければ全部済み
  const nextIndex = sections.findIndex((s) => states[s.lessonId] !== 'done');
  const anyDone = sections.some((s) => states[s.lessonId] === 'done');
  const allDone = nextIndex === -1;

  // --- 節の行の印 ---
  for (const [i, s] of sections.entries()) {
    const li = document.querySelector<HTMLElement>(`.lp-secs li[data-lesson-id="${esc(s.lessonId)}"]`);
    if (!li) continue;
    const done = states[s.lessonId] === 'done';
    const isNext = i === nextIndex;
    li.classList.toggle('is-done', done);
    li.classList.toggle('is-next', isNext);
    const mark = li.querySelector('[data-state]');
    if (mark) mark.textContent = done ? '済' : isNext ? '次' : '未';
  }

  // --- 章ごとの集計とメーター ---
  const chapterTotals = new Map<string, { done: number; total: number }>();
  for (const s of sections) {
    const t = chapterTotals.get(s.chapter) ?? { done: 0, total: 0 };
    t.total += s.exerciseIds.length;
    t.done += doneById.get(s.lessonId) ?? 0;
    chapterTotals.set(s.chapter, t);
  }
  for (const [chapter, t] of chapterTotals) {
    setMeter(document.querySelector(`[data-meter-chapter="${esc(chapter)}"]`), t.done, t.total);
  }

  // --- 部ごとの集計とメーター ---
  const writtenParts = (PARTS as Array<{ name: string; chapters?: string[]; count?: number }>).filter(
    (p): p is WrittenPart => Array.isArray(p.chapters),
  );
  writtenParts.forEach((part, pi) => {
    let done = 0;
    let total = 0;
    for (const chapter of part.chapters) {
      const t = chapterTotals.get(chapter);
      if (t) {
        done += t.done;
        total += t.total;
      }
    }
    setMeter(document.querySelector(`[data-meter-part="${pi}"]`), done, total);
  });

  // --- 開いておくのは、次の節を含む部と章だけ（第17.1節） ---
  const target = sections[allDone ? sections.length - 1 : nextIndex];
  if (target) {
    const partIndex = writtenParts.findIndex((p) => p.chapters.includes(target.chapter));
    document.querySelectorAll<HTMLDetailsElement>('.lp-part[data-part]').forEach((el) => {
      el.open = Number(el.dataset.part) === partIndex;
    });
    document.querySelectorAll<HTMLDetailsElement>('.lp-chap[data-chapter]').forEach((el) => {
      el.open = el.dataset.chapter === target.chapter;
    });
  }

  // --- 続きから（第17.3節） ---
  const resume = document.getElementById('learn-resume');
  if (resume) {
    if (allDone) {
      resume.hidden = true;
    } else {
      resume.hidden = false;
      const t = sections[nextIndex];
      const kind = document.getElementById('learn-resume-kind');
      if (kind) kind.textContent = anyDone ? '続きから' : 'はじめから';
      const title = document.getElementById('learn-resume-title');
      if (title) title.textContent = `${t.label} ${t.title}`;
      const where = document.getElementById('learn-resume-where');
      if (where) where.textContent = `${chapterTitle(t.chapter)} ・ 目安 ${t.minutes} 分`;
      const link = document.getElementById('learn-resume-link') as HTMLAnchorElement | null;
      if (link) link.href = t.href;
    }
  }
}
