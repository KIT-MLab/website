/**
 * `/learn/` の先頭に置く「今週の演習」の段（20-platform.md 第19.4節）。
 *
 * このページは事前生成なので、メンバーかどうか・どの回が公開されているかは
 * ブラウザから `/api/weekly` を読んで分かる（メンバーの入口と同じ考え方。第13.2節）。
 * メンバーでない人・ログインしていない人には `sets` が空で返るので、段は隠れたまま。
 *
 * 公開済みの回は、進み具合を**手元の進度**（getProgressStore().exerciseResult）から
 * 出す。棒と百分率だけで、分数（1/4）は出さない（第19.4節の指摘）。
 * 未公開の回は日付と範囲だけを見せ、鍵の印（インライン SVG）を付ける。
 */
import { getProgressStore } from './store/progress';

type WeeklySet = {
  id: string;
  date: string;
  title: string;
  published: boolean;
  exerciseIds: string[];
};

const LOCK_SVG =
  '<svg class="wk-lock" viewBox="0 0 16 16" aria-hidden="true" focusable="false">' +
  '<path d="M4.5 7V5a3.5 3.5 0 0 1 7 0v2" fill="none" stroke="currentColor" stroke-width="1.3"/>' +
  '<rect x="3" y="7" width="10" height="7" rx="1" fill="none" stroke="currentColor" stroke-width="1.3"/>' +
  '</svg>';

/** `9/29` のような短い日付（20-platform.md 第19.4節の表示にならい、月日だけ）。 */
function shortDate(iso: string): string {
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(iso);
  if (!m) return iso;
  return `${Number(m[2])}/${Number(m[3])}`;
}

async function fetchSets(): Promise<WeeklySet[]> {
  try {
    const res = await fetch('/api/weekly');
    if (!res.ok) return [];
    const data = (await res.json()) as { sets?: WeeklySet[] };
    return Array.isArray(data.sets) ? data.sets : [];
  } catch {
    return [];
  }
}

function buildMeter(pct: number, finished: boolean): HTMLElement {
  const meter = document.createElement('span');
  meter.className = finished ? 'wk-meter is-done' : 'wk-meter';
  meter.innerHTML =
    '<span class="wk-meter__track"><span class="wk-meter__fill" style="width:0%"></span></span>' +
    '<span class="wk-meter__pct"></span>';
  const fill = meter.querySelector<HTMLElement>('.wk-meter__fill');
  if (fill) fill.style.width = `${pct}%`;
  const pctEl = meter.querySelector('.wk-meter__pct');
  if (pctEl) pctEl.textContent = finished ? `✓ ${pct}%` : `${pct}%`;
  return meter;
}

export async function paintWeeklyList(): Promise<void> {
  const section = document.getElementById('wk-entrance');
  const rowsEl = document.getElementById('wk-rows');
  if (!section || !rowsEl) return;

  const sets = await fetchSets();
  if (sets.length === 0) {
    section.hidden = true;
    return;
  }

  const store = getProgressStore();
  rowsEl.replaceChildren();

  for (const set of sets) {
    const row = document.createElement('div');
    row.className = set.published ? 'wk-row' : 'wk-row wk-row--locked';

    const d = document.createElement('span');
    d.className = 'wk-row__d';
    d.textContent = shortDate(set.date);
    row.append(d);

    if (set.published) {
      const a = document.createElement('a');
      a.className = 'wk-row__t';
      a.href = `/learn/weekly/${encodeURIComponent(set.id)}/`;
      a.textContent = set.title;
      row.append(a);

      const total = set.exerciseIds.length;
      let done = 0;
      if (total > 0) {
        const results = await Promise.all(set.exerciseIds.map((id) => store.exerciseResult(id)));
        done = results.filter((r) => r.passed).length;
      }
      const pct = total > 0 ? Math.round((done / total) * 100) : 0;
      row.append(buildMeter(pct, total > 0 && done === total));
    } else {
      const t = document.createElement('span');
      t.className = 'wk-row__t wk-row__t--locked';
      t.textContent = set.title;
      row.append(t);

      const lock = document.createElement('span');
      lock.className = 'wk-row__lock';
      lock.innerHTML = LOCK_SVG;
      row.append(lock);
    }

    rowsEl.append(row);
  }

  section.hidden = false;
}
