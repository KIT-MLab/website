/**
 * 問題の「解いた」印と進み具合の棒を、手元の進度（getProgressStore()）から塗る。
 * 練習問題集の一覧（20-platform.md 第25.5節「解いたら緑」）と今週のページ（第25.4節）が使う。
 *
 * ページ側（サーバで組んだ HTML）は次の印を置くだけでよい。
 *   - `data-ex-id="<課題のid>"`: 通していれば `is-done` を付ける（札）
 *   - `data-ex-ids="<id> <id> …"`: 棒。中の `[data-fill]` の幅・`[data-pct]` の百分率・
 *     `[data-cnt]` の「通した数/問題の数」を塗り、全部通したら `is-done` を付ける
 * ログインしていれば、手元の進度はサーバの進度と合わせたもの（第6.1節）。
 */
import { getProgressStore } from './store/progress';

export async function paintPracticeProgress(): Promise<void> {
  const store = getProgressStore();
  const chips = Array.from(document.querySelectorAll<HTMLElement>('[data-ex-id]'));
  const meters = Array.from(document.querySelectorAll<HTMLElement>('[data-ex-ids]'));
  const idsOf = (el: HTMLElement) => (el.dataset.exIds ?? '').split(' ').filter((s) => s !== '');

  const ids = new Set<string>();
  for (const el of chips) ids.add(el.dataset.exId ?? '');
  for (const el of meters) idsOf(el).forEach((id) => ids.add(id));
  ids.delete('');

  const passed = new Set<string>();
  await Promise.all(
    [...ids].map(async (id) => {
      if ((await store.exerciseResult(id)).passed) passed.add(id);
    }),
  );

  for (const el of chips) el.classList.toggle('is-done', passed.has(el.dataset.exId ?? ''));
  for (const el of meters) {
    const list = idsOf(el);
    const done = list.filter((id) => passed.has(id)).length;
    const pct = list.length > 0 ? Math.round((done / list.length) * 100) : 0;
    const finished = list.length > 0 && done === list.length;
    el.classList.toggle('is-done', finished);
    const fill = el.querySelector<HTMLElement>('[data-fill]');
    if (fill) fill.style.width = `${pct}%`;
    const pctEl = el.querySelector('[data-pct]');
    if (pctEl) pctEl.textContent = finished ? `✓ ${pct}%` : `${pct}%`;
    const cnt = el.querySelector('[data-cnt]');
    if (cnt) cnt.textContent = `${done}/${list.length}問`;
  }
}
