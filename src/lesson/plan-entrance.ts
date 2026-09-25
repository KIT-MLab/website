/**
 * `/learn/` の先頭、今週の演習の段の上に置く「次回」の入口（20-platform.md 第21.1節）。
 *
 * このページは事前生成なので、メンバーかどうか・次回がどれかは、ブラウザから
 * `/api/plan/next` を読んで分かる（今週の演習の入口 `weekly-list.ts` と同じ考え方。第19.4節）。
 * メンバーでない人・ログインしていない人・次回が無い（全部の回が終わった）人には
 * `next` が `null` で返るので、段は隠れたまま。
 */
type NextPlan = {
  no: string;
  date: string;
  until?: string;
  dateLabel: string;
  title: string;
  goal: string;
};

async function fetchNext(): Promise<NextPlan | null> {
  try {
    const res = await fetch('/api/plan/next');
    if (!res.ok) return null;
    const data = (await res.json()) as { next?: NextPlan | null };
    return data.next ?? null;
  } catch {
    return null;
  }
}

export async function paintPlanEntrance(): Promise<void> {
  const section = document.getElementById('pl-entrance');
  if (!section) return;

  const next = await fetchNext();
  if (!next) {
    section.hidden = true;
    return;
  }

  const title = section.querySelector<HTMLElement>('#pl-entrance-title');
  const goal = section.querySelector<HTMLElement>('#pl-entrance-goal');
  if (title) title.textContent = `${next.dateLabel}${next.title}`;
  if (goal) {
    goal.textContent = next.goal;
    goal.hidden = next.goal === '';
  }
  section.hidden = false;
}
