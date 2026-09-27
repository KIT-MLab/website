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
import { fetchPublishStatus, type PublishStatus } from './publish-status';
// @ts-expect-error 部の表は .mjs 側に1つだけ置く（scripts/parts.mjs。chapters.ts と同じ理由）
import { PARTS } from '../../scripts/parts.mjs';

/** 準備中の章の鍵の印（20-platform.md 第20.1節）。今週の演習の鍵（weekly-list.ts）と同じ絵 */
const LOCK_SVG =
  '<svg class="wk-lock" viewBox="0 0 16 16" aria-hidden="true" focusable="false">' +
  '<path d="M4.5 7V5a3.5 3.5 0 0 1 7 0v2" fill="none" stroke="currentColor" stroke-width="1.3"/>' +
  '<rect x="3" y="7" width="10" height="7" rx="1" fill="none" stroke="currentColor" stroke-width="1.3"/>' +
  '</svg>';

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

/**
 * 準備中の章の見た目を塗る（20-platform.md 第20.1節）。
 *
 * 運営でない人には鍵の印を添え、節へのリンクを外す（文字だけにする）。運営・管理者には
 * 「準備中」の小さな札を添えるだけで、リンクはそのまま残す（中身まで見られるため）。
 */
function paintPublishLocks(status: PublishStatus): void {
  // paintLearnList は1回の読み込みで何度も呼ばれる（account.ts が /api/me の答えと、
  // 手元の進度を合わせたあとの2回、kit:account を鳴らすため）。呼ばれるたびに前回ぶんの
  // 印を消してから塗り直す。消さずに足すと、呼ばれた回数ぶん印が重なる
  document.querySelectorAll('.lp-lock, .lp-soon--sm').forEach((el) => el.remove());
  document.querySelectorAll<HTMLDetailsElement>('.lp-chap[data-chapter]').forEach((chapEl) => {
    const chapter = chapEl.dataset.chapter ?? '';
    if (status.publicChapters.has(chapter)) return;

    const name = chapEl.querySelector('.lp-chap__name');
    if (!name) return;

    if (status.staff) {
      const tag = document.createElement('span');
      tag.className = 'lp-soon lp-soon--sm';
      tag.textContent = '準備中';
      // .lp-chap__head は3列のグリッド。兄弟に足すと4つ目の列がはみ出るので、
      // 名前の中に足して同じ列に収める
      name.append(tag);
      return;
    }

    const lock = document.createElement('span');
    lock.className = 'lp-lock';
    lock.setAttribute('aria-label', '準備中');
    lock.innerHTML = LOCK_SVG;
    // .lp-chap__head は3列のグリッド。兄弟に足すと4つ目の列がはみ出るので、
    // 名前の中に足して同じ列に収める
    name.append(lock);

    // 節へのリンクを外す（文字だけにする）。中身は変えず、タグだけ <a> → <span>
    chapEl.querySelectorAll<HTMLAnchorElement>('.lp-secs a').forEach((a) => {
      const span = document.createElement('span');
      span.className = 'lp-secs__locked';
      span.textContent = a.textContent;
      a.replaceWith(span);
    });
  });
}

export async function paintLearnList(): Promise<void> {
  const sections = readSections();
  if (sections.length === 0) return;

  const status = await fetchPublishStatus();
  paintPublishLocks(status);

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

  // 運営でない人には、準備中の章の節を「次」にも「続きから」にも選ばない（第20.1節）
  const allowed = (chapter: string) => status.staff || status.publicChapters.has(chapter);

  // 教材の順で最初の、まだ済んでいない（かつ運営でなければ公開済みの章の）節。無ければ全部済み
  const nextIndex = sections.findIndex((s) => states[s.lessonId] !== 'done' && allowed(s.chapter));
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
  // allDone のときは最後の「開ける」節（運営でなければ公開済みの章のうち最後の節）を開く。
  // 1つも開ける節が無ければ（まだ何も公開していない）、SSR の既定（第0部・第0章）のままにする。
  const openable = sections.filter((s) => allowed(s.chapter));
  const target = allDone ? openable[openable.length - 1] : sections[nextIndex];
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
