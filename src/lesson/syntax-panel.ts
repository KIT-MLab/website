/**
 * 構文の一覧の開閉（20-platform.md 第22.1節）。
 *
 * 問題ごとの「構文の一覧」ボタン（src/lesson/ui/ExerciseBox.tsx）は、React の外にあるこの欄に
 * 直接触れないので、window の CustomEvent（kit:syntax-open）で伝える。受け取ったら、該当する
 * 分類を開いて枠を付ける。絞るのは分類までで、中の行はいつも広く並んだまま（第22.1節）。
 * ほかの分類は閉じたまま残す。別の問題のボタンを押すと、枠は置き換わる（前のを消してから塗る）。
 */

export type SyntaxOpenDetail = { keys: string[] };

export function setupSyntaxPanel(): void {
  const panel = document.getElementById('kit-syntax-panel');
  if (!panel) return;

  function openCategories(keys: string[]): void {
    const cats = Array.from(panel!.querySelectorAll<HTMLDetailsElement>('.syn-cat'));
    let first: HTMLDetailsElement | null = null;
    for (const cat of cats) {
      const hit = keys.includes(cat.dataset.cat ?? '');
      cat.classList.toggle('is-hl', hit);
      if (hit) {
        cat.open = true;
        if (!first) first = cat;
      }
    }
    if (!first) return;
    // 幅1280px以上は欄がその場に固定されているので、欄の中だけでスクロールする。
    // それより狭い画面では欄が問題の下にあるので、ページごと運ぶ（第22.1節）
    if (window.matchMedia('(min-width: 1280px)').matches) {
      first.scrollIntoView({ block: 'nearest' });
    } else {
      first.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
  }

  window.addEventListener('kit:syntax-open', (e) => {
    const detail = (e as CustomEvent<SyntaxOpenDetail>).detail;
    if (detail?.keys) openCategories(detail.keys);
  });
}
