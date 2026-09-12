/**
 * 第0章だけ: 課題を1問ずつ出す（20-platform.md 第11.7節）。
 *
 * 本文（.mdx）には <Exercise> が縦に並んだまま書かれる。書き手は特別な書き方をしない。
 * 包む側で、続けて並んだ課題を1つの束にして、通っていない最初の1問だけを見せる。
 *
 *   ・1問通ると、その場が次の問題に入れ替わる。通った問題は消す。戻る道は作らない
 *   ・いま何問目か・全部で何問かを、その場に出す。札は増やさない（第10.6節）ので
 *     コードのキャプションと同じ素地の小さな文字にする
 *   ・全部通ったら「この節の練習は終わりです」を出す
 *   ・通った問題は開き直しても飛ばす。判断は進度の記録（store）だけを見て決める
 *
 * 束にするのは**続けて並んだ**課題だけである。「やってみる」に置く1問（第11.6節）は
 * 前後に本文が入るので1つきりの束になり、この仕組みは効かない。そこは読んでから
 * 説明に進む1問なので、入れ替える相手がいない。
 *
 * この関数が動くのは .lesson-body に data-exq が付いた節だけ。第1章以降の節では
 * 何もせずに戻る（Python の章は縦に並べたまま。第11.7節）。
 */
import { getProgressStore } from './store/progress';

type Queue = {
  items: HTMLElement[];
  count: HTMLParagraphElement;
  done: HTMLParagraphElement;
};

function countText(total: number, at: number): string {
  return `${total}問中 ${at + 1}問目`;
}

export function setupExerciseQueue(): void {
  const body = document.querySelector<HTMLElement>('.lesson-body[data-exq]');
  if (!body) return;

  // 続けて並んだ <Exercise> を1つの束にする
  const groups: HTMLElement[][] = [];
  for (const el of Array.from(body.querySelectorAll<HTMLElement>('section.kit-ex'))) {
    const last = groups[groups.length - 1];
    if (last && last[last.length - 1].nextElementSibling === el) last.push(el);
    else groups.push([el]);
  }

  const queues: Queue[] = [];
  for (const items of groups) {
    if (items.length < 2) continue;
    const count = document.createElement('p');
    count.className = 'kit-exq__count';
    // 進度を読む前の見え方を、CSS だけで伏せてある状態（1問目が見えている）に合わせる
    count.textContent = countText(items.length, 0);
    items[0].querySelector('.kit-ex__in')?.prepend(count);

    const done = document.createElement('p');
    done.className = 'kit-exq__done';
    done.textContent = 'この節の練習は終わりです';
    done.hidden = true;
    items[items.length - 1].after(done);

    queues.push({ items, count, done });
  }

  if (queues.length === 0) {
    body.dataset.exq = 'on';
    return;
  }

  const store = getProgressStore();

  async function paint(): Promise<void> {
    for (const q of queues) {
      const states = await Promise.all(q.items.map((el) => store.exerciseResult(el.id)));
      const at = states.findIndex((s) => !s.passed);
      if (at < 0) {
        for (const el of q.items) el.hidden = true;
        q.done.hidden = false;
        continue;
      }
      q.items.forEach((el, i) => {
        el.hidden = i !== at;
      });
      q.done.hidden = true;
      q.count.textContent = countText(q.items.length, at);
      const home = q.items[at].querySelector('.kit-ex__in');
      if (home && q.count.parentElement !== home) home.prepend(q.count);
    }
    body.dataset.exq = 'on';
  }

  void paint();
  // 採点で1問通ると ExerciseBox が投げる（節の一覧の塗り直しと同じ合図）
  window.addEventListener('kit:progress', () => void paint());
}
