/**
 * 第0章だけ: 課題を1問ずつ出す（20-platform.md 第11.7節）。
 *
 * 本文（.mdx）には <Exercise> が縦に並んだまま書かれる。書き手は特別な書き方をしない。
 * 包む側で、続けて並んだ課題を1つの束にして、通っていない最初の1問だけを見せる。
 *
 *   ・1問通ると、その場が次の問題に入れ替わる
 *     （入れ替えは ExerciseBox が覆いを出してから合図を投げる。第12.1節）
 *   ・「← 前の問題」「次の問題 →」で行き来できる（2026-09-24、利用者の指示）。
 *     先へは、いま解いている問題までしか進めない。飛ばして先へ行けると1問ずつ出す意味が無くなる
 *   ・いま何問目か・全部で何問かを、その場に出す。札は増やさない（第10.6節）ので
 *     コードのキャプションと同じ素地の小さな文字にする
 *   ・全部通ったら、最後の問題の箱を覆ったまま残し、その下に
 *     「この節の練習は終わりです」を出す（第12.1節。箱は消さない）
 *   ・通った問題は開き直しても飛ばす。判断は進度の記録（store）だけを見て決める
 *
 * 束にするのは**続けて並んだ**課題だけである。「やってみる」に置く1問（第11.6節）は
 * 前後に本文が入るので、1問きりの束になる。入れ替える相手がいないので何問目かの表示も
 * 終わりの1行も出さない。
 *
 * 1問きりの束は、**開き直したときにだけ隠す**。隠さないと、覆いと印が付いたまま節の
 * 先頭に残り、まだ答えていないのに印が出ているように見える（第12.1節）。
 * ただし**通したその場では隠さない**。束の中の問題には入れ替わる相手がいるが、
 * こちらには無いので、消えると「困る例」の次がいきなり「説明」になり、自分が何をしたかの
 * 跡が消える。第12.1節が「急に箱が消えて文字だけが出ると分からない」と決めたそのものである。
 *
 * この関数が動くのは .lesson-body に data-exq が付いた節だけ。第1章以降の節では
 * 何もせずに戻る（Python の章は縦に並べたまま。第11.7節）。
 */
import { getProgressStore } from './store/progress';

type Queue = {
  items: HTMLElement[];
  /** 1問きりの束（「やってみる」の1問）には付けない。入れ替える相手がいないため */
  count: HTMLParagraphElement | null;
  done: HTMLParagraphElement | null;
  /** 行き来の2つのボタン。1問きりの束には付けない */
  prev: HTMLButtonElement | null;
  next: HTMLButtonElement | null;
  /** いま見せている問題。進んだ先（front）より先には行かない */
  view: number;
  /** 通っていない最初の問題。全部通ったら最後の問題 */
  front: number;
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
    if (items.length < 2) {
      // 「やってみる」に置く1問（第11.6節）。表示は何も足さず、通ったら隠すだけ
      queues.push({ items, count: null, done: null, prev: null, next: null, view: 0, front: 0 });
      continue;
    }
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

    const nav = document.createElement('p');
    nav.className = 'kit-exq__nav';
    const prev = document.createElement('button');
    prev.type = 'button';
    prev.className = 'kit-btn';
    prev.textContent = '← 前の問題';
    const next = document.createElement('button');
    next.type = 'button';
    next.className = 'kit-btn';
    next.textContent = '次の問題 →';
    nav.append(prev, next);
    done.before(nav);

    const q: Queue = { items, count, done, prev, next, view: 0, front: 0 };
    prev.addEventListener('click', () => show(q, q.view - 1));
    next.addEventListener('click', () => show(q, q.view + 1));
    queues.push(q);
  }

  if (queues.length === 0) {
    body.dataset.exq = 'on';
    return;
  }

  const store = getProgressStore();
  /** 最初の塗りかどうか。1問きりの束を隠すのは、このときだけ */
  let first = true;

  async function paint(): Promise<void> {
    for (const q of queues) {
      const states = await Promise.all(q.items.map((el) => store.exerciseResult(el.id)));
      const miss = states.findIndex((s) => !s.passed);
      if (!q.count || !q.done) {
        // 1問きりの束は、開き直したときにだけ隠す（第12.1節）。
        // 通したその場で消すと、入れ替わる相手がいないので跡が詰まる
        if (first) q.items[0].hidden = miss < 0;
        continue;
      }
      // 全部通しても箱は消さない。最後の問題を覆ったまま残す（第12.1節）。
      // 急に箱が消えて文字だけが出ると、何が起きたのか分からないため
      q.front = miss < 0 ? q.items.length - 1 : miss;
      q.done.hidden = miss >= 0;
      // 塗り直すのは、はじめと1問通ったとき。どちらも進んだ先の問題を見せる
      show(q, q.front);
    }
    body.dataset.exq = 'on';
    first = false;
  }

  /** 束の中の i 問目を見せる。進んだ先より先と、0より前には行かない */
  function show(q: Queue, i: number): void {
    if (!q.count) return;
    q.view = Math.max(0, Math.min(i, q.front));
    q.items.forEach((el, k) => {
      el.hidden = k !== q.view;
    });
    q.count.textContent = countText(q.items.length, q.view);
    const home = q.items[q.view].querySelector('.kit-ex__in');
    if (home && q.count.parentElement !== home) home.prepend(q.count);
    if (q.prev) q.prev.hidden = q.view === 0;
    if (q.next) q.next.hidden = q.view >= q.front;
  }

  void paint();
  // 採点で1問通ると ExerciseBox が投げる（節の一覧の塗り直しと同じ合図）
  window.addEventListener('kit:progress', () => void paint());
}
