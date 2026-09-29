/**
 * スライドの配線（design/spec/53-ml-intro.md 第10節）。部品は src/components/lesson/Slides.astro。
 *
 * - **置き場所**: 幅1280px以上では右の欄（用語を検索の欄 .term-panel__in）のいちばん上へ移す。
 *   それより狭い画面では本文の上の段（#kit-slides-band）に置いたまま。幅が変われば行き来する
 * - **運営**: 「前へ」「次へ」で POST /api/slides。見ているメンバー全員の画面が切り替わる
 * - **メンバー**: 運営がいま進めていれば（live）その1枚に合わせる。GET /api/slides を**画面が見えている間だけ
 *   1.5秒ごと**に読み直し、裏に回ったら止める（予想ボードの src/lesson/guess.ts と同じ）。自分で前へ・次へを
 *   押すと合わせるのをやめ、「いまの頁に戻る」を出す。運営が3時間動かしていなければ（live でない）、
 *   合わせずに自由にめくる（印も出さない）
 * - **同じ番号が返ってきたら何もしない**（人の図を描き直さない）
 * - ←・→ のキーは、スライドの欄にフォーカスがあるときだけ効く（ページのスクロールや入力を奪わない）
 *
 * 人数はこのファイルに書かない。部品が HTML に埋めたもの（メンバー・運営にだけ描かれる）を読む。
 */

type PictoGroup = { name: string; n: number; s: number; cells: number[] };
type PictoStep = { reveal: boolean; groups: PictoGroup[] };
/** 地図の段。船の位置（図の幅・高さに対する %）と、進んだ道・まだの道（SVG の path の d） */
type MapStep = { x: string; y: string; done: string; rest: string; sink: boolean };
type Payload = {
  deck: string;
  count: number;
  staff: boolean;
  cells: { n: number; s: number }[];
  picto: (PictoStep | null)[];
  map?: (MapStep | null)[];
};

const POLL_MS = 1500;
const WIDE = '(min-width: 1280px)';
/** 人の形どうしのすき間と、組と組の間 */
const GAP = 2;
const ROW_GAP = 14;
/** この幅から、ラベルを列の左に置く（それより狭ければ列の上） */
const SIDE_MIN = 480;

function personSvg(w: number, h: number): string {
  return `<svg width="${w}" height="${h}" viewBox="0 0 20 30" aria-hidden="true"><circle class="kit-picto__b" cx="10" cy="6" r="4.6"/><path class="kit-picto__b" d="M3.4 28.5V17.5c0-4.1 2.9-6.6 6.6-6.6s6.6 2.5 6.6 6.6v11z"/></svg>`;
}

/** 38.38… → "38.4" */
function pct(s: number, n: number): string {
  return (Math.round((s / n) * 1000) / 10).toFixed(1);
}

let wired = false;

export function setupSlides(): void {
  if (wired) return;
  const root = document.querySelector<HTMLElement>('[data-slides]');
  const raw = root?.querySelector('script[data-slides-json]')?.textContent;
  if (!root || !raw) return;
  wired = true;
  const data = JSON.parse(raw) as Payload;
  const count = data.count;
  const staff = data.staff;

  const sections = Array.from(root.querySelectorAll<HTMLElement>('[data-slide], [data-slide-note]'));
  const map = root.querySelector<HTMLElement>('[data-map]');
  const figure = root.querySelector<HTMLElement>('[data-picto]')!;
  const stage = root.querySelector<HTMLElement>('[data-picto-stage]')!;
  const noEl = root.querySelector<HTMLElement>('[data-slides-no]');
  const prevBtn = root.querySelector<HTMLButtonElement>('[data-slides-prev]');
  const nextBtn = root.querySelector<HTMLButtonElement>('[data-slides-next]');
  const backBtn = root.querySelector<HTMLButtonElement>('[data-slides-back]');
  const stateEl = root.querySelector<HTMLElement>('[data-slides-state]');
  const msgEl = root.querySelector<HTMLElement>('[data-slides-msg]');
  const toggle = root.querySelector<HTMLButtonElement>('.kit-slides__toggle');

  // ---------------------------------------------------------------- 置き場所

  const band = document.getElementById('kit-slides-band');
  const dock = document.querySelector<HTMLElement>('.term-panel__in');
  const wide = window.matchMedia(WIDE);
  const place = () => {
    const target = wide.matches && dock ? dock : band;
    if (target && root.parentElement !== target) target.prepend(root);
  };
  wide.addEventListener('change', place);
  place();

  toggle?.addEventListener('click', () => {
    const closed = root.classList.toggle('is-closed');
    toggle.setAttribute('aria-expanded', String(!closed));
    const word = toggle.querySelector('[data-slides-word]');
    if (word) word.textContent = closed ? '開く' : '閉じる';
  });

  // ---------------------------------------------------------------- 人の図

  /* 人の形は組（性別と等級のセル）ごとに約10人で1つ（四捨五入）。どの段でも同じ形を動かすので、
     最初に1回だけ作る。セルの中では生き残った人を先に並べる */
  const icons: { cell: number; surv: boolean }[] = [];
  data.cells.forEach((c, cell) => {
    const k = Math.round(c.n / 10);
    const ks = Math.round(c.s / 10);
    for (let i = 0; i < k; i++) icons.push({ cell, surv: i < ks });
  });
  const iconEls = icons.map((ic) => {
    const el = document.createElement('div');
    el.className = ic.surv ? 'kit-picto__ic is-s' : 'kit-picto__ic';
    el.setAttribute('aria-hidden', 'true');
    stage.appendChild(el);
    return el;
  });

  let step: PictoStep | null = null;
  /** 段の組ごとの人の形の並び（生き残った人を左に寄せる） */
  let order: number[][] = [];
  let labels: HTMLElement[] = [];
  let iconW = 0;
  let lastW = 0;

  function buildLabels(st: PictoStep): void {
    for (const l of labels) l.remove();
    labels = st.groups.map((g) => {
      const el = document.createElement('div');
      el.className = 'kit-picto__gl';
      const name = document.createElement('b');
      name.textContent = g.name;
      const nums = document.createElement('span');
      nums.textContent = st.reveal ? `${g.n}人 · 生存 ${g.s}人（${pct(g.s, g.n)}%）` : `${g.n}人`;
      el.append(name, ' ', nums);
      stage.appendChild(el);
      return el;
    });
    order = st.groups.map((g) => {
      const mine = icons.map((ic, i) => ({ ic, i })).filter(({ ic }) => g.cells.includes(ic.cell));
      return [...mine.filter(({ ic }) => ic.surv), ...mine.filter(({ ic }) => !ic.surv)].map(({ i }) => i);
    });
  }

  /** 並べる。ラベルは組の列と縦の位置をそろえ、重ならないように実際の高さを測ってから置く */
  function layout(animate: boolean): void {
    if (!step) return;
    const W = stage.clientWidth;
    lastW = W;
    if (W === 0) return; // 閉じている・隠れている。見えたときに ResizeObserver がもう一度呼ぶ

    const iw = W < 260 ? 9 : W < 360 ? 11 : W < 560 ? 13 : 15;
    const ih = Math.round(iw * 1.5);
    if (iw !== iconW) {
      iconW = iw;
      for (const el of iconEls) el.innerHTML = personSvg(iw, ih);
    }

    const side = W >= SIDE_MIN;
    let labelW = W;
    let x0 = 0;
    if (side) {
      for (const l of labels) l.style.width = 'max-content';
      const natural = Math.max(...labels.map((l) => l.getBoundingClientRect().width));
      labelW = Math.min(Math.ceil(natural) + 1, Math.floor(W * 0.42));
      x0 = labelW + 14;
    }
    for (const l of labels) l.style.width = `${labelW}px`;

    const cell = iw + GAP;
    const per = Math.max(1, Math.floor((W - x0 + GAP) / cell));
    const pos: [number, number][] = icons.map(() => [0, 0]);
    let y = 0;
    step.groups.forEach((_, gi) => {
      const members = order[gi];
      const lines = Math.max(1, Math.ceil(members.length / per));
      const iconsH = lines * (ih + GAP) - GAP;
      const lh = labels[gi].offsetHeight;
      let top: number;
      let labelTop: number;
      if (side) {
        const h = Math.max(lh, iconsH);
        labelTop = y + (h - lh) / 2;
        top = y + (h - iconsH) / 2;
        y += h + ROW_GAP;
      } else {
        labelTop = y;
        top = y + lh + 4;
        y = top + iconsH + ROW_GAP;
      }
      labels[gi].style.top = `${Math.round(labelTop)}px`;
      members.forEach((ic, k) => {
        pos[ic] = [x0 + (k % per) * cell, Math.round(top + Math.floor(k / per) * (ih + GAP))];
      });
    });

    if (!animate) stage.classList.add('is-still');
    stage.style.height = `${Math.max(0, y - ROW_GAP)}px`;
    iconEls.forEach((el, i) => {
      el.style.transform = `translate(${pos[i][0]}px, ${pos[i][1]}px)`;
    });
    if (!animate) {
      void stage.offsetHeight;
      stage.classList.remove('is-still');
    }
  }

  new ResizeObserver(() => {
    if (step && stage.clientWidth !== lastW) layout(false);
  }).observe(stage);

  // ---------------------------------------------------------------- 地図

  /** 地図の1枚を出す。地図の1枚から地図の1枚へ移るときだけ船を動かす（ほかの1枚からは動かさずに置く） */
  function showMap(m: MapStep | null): void {
    if (!map) return;
    if (!m) {
      map.hidden = true;
      return;
    }
    const fromMap = !map.hidden;
    map.hidden = false;
    if (!fromMap) map.classList.add('is-still');
    map.querySelector('[data-map-done]')?.setAttribute('d', m.done);
    map.querySelector('[data-map-rest]')?.setAttribute('d', m.rest);
    for (const el of map.querySelectorAll<HTMLElement>('[data-map-sink]')) el.hidden = !m.sink;
    const ship = map.querySelector<HTMLElement>('[data-map-ship]');
    if (ship) {
      ship.style.left = m.x;
      ship.style.top = m.y;
    }
    if (!fromMap) {
      void map.offsetHeight;
      map.classList.remove('is-still');
    }
  }

  // ---------------------------------------------------------------- 1枚を出す

  let shown = -1;

  function show(i: number): void {
    const target = Math.min(Math.max(0, i), count - 1);
    if (target === shown) return; // 同じ1枚なら何もしない（描き直さない）
    const fromPicto = step !== null && !figure.hidden;
    shown = target;
    for (const s of sections) s.hidden = Number(s.dataset.slide ?? s.dataset.slideNote) !== target;
    if (noEl) noEl.textContent = `${target + 1} / ${count}`;
    if (prevBtn) prevBtn.disabled = target === 0;
    if (nextBtn) nextBtn.disabled = target === count - 1;

    showMap(data.map?.[target] ?? null);

    const st = data.picto[target] ?? null;
    if (!st) {
      figure.hidden = true;
      step = null;
      return;
    }
    figure.hidden = false;
    figure.classList.toggle('is-plain', !st.reveal);
    step = st;
    buildLabels(st);
    layout(fromPicto);
  }

  show(0);

  // ---------------------------------------------------------------- 運営に合わせる

  let server = { index: 0, live: false };
  let known = false;
  let following = false;

  function paintFollow(): void {
    if (staff) return;
    // 読み直しのたびに呼ばれるので、変わったときだけ書く
    const live = server.live;
    const text = live && following ? '運営の画面に合わせて表示しています。' : '';
    if (stateEl && stateEl.textContent !== text) stateEl.textContent = text;
    const hideBack = !(live && !following);
    if (backBtn && backBtn.hidden !== hideBack) backBtn.hidden = hideBack;
  }

  function say(text: string): void {
    if (msgEl) msgEl.textContent = text;
  }

  /* 運営の書き込みは順に送る。送っている間と、送る前に出た読み直しの答えは使わない
     （速く2回押したとき、古い番号に一度戻って見えないように） */
  let pending = 0;
  let seq = 0;
  let chain: Promise<void> = Promise.resolve();

  function push(index: number): void {
    pending++;
    seq++;
    chain = chain
      .then(async () => {
        const res = await fetch('/api/slides', {
          method: 'POST',
          headers: { 'content-type': 'application/json' },
          body: JSON.stringify({ deck: data.deck, index }),
        });
        const body = (await res.json().catch(() => ({}))) as { error?: string };
        if (!res.ok) {
          say(body.error ?? '送れませんでした。');
          return;
        }
        server = { index, live: true };
        say('');
      })
      .catch(() => say('送れませんでした。もう一度押してください。'))
      .finally(() => {
        pending--;
      });
  }

  function go(delta: number): void {
    const target = Math.min(Math.max(0, shown + delta), count - 1);
    if (target === shown) return;
    if (staff) {
      show(target);
      push(target);
      return;
    }
    if (server.live) following = false;
    show(target);
    paintFollow();
  }

  prevBtn?.addEventListener('click', () => go(-1));
  nextBtn?.addEventListener('click', () => go(1));
  backBtn?.addEventListener('click', () => {
    following = true;
    show(server.index);
    paintFollow();
    void refresh();
  });

  root.addEventListener('keydown', (e) => {
    if (e.key !== 'ArrowLeft' && e.key !== 'ArrowRight') return;
    if (e.altKey || e.ctrlKey || e.metaKey || e.shiftKey) return;
    const t = e.target as HTMLElement | null;
    if (t?.closest('input, textarea, select, [contenteditable]')) return;
    e.preventDefault();
    go(e.key === 'ArrowLeft' ? -1 : 1);
  });

  // ---------------------------------------------------------------- 読み直し

  let timer: number | null = null;
  let loading = false;
  let stopped = false;

  async function refresh(): Promise<void> {
    if (loading || stopped) return;
    loading = true;
    const startSeq = seq;
    try {
      const res = await fetch(`/api/slides?deck=${encodeURIComponent(data.deck)}`, { cache: 'no-store' });
      const body = (await res.json().catch(() => ({}))) as { index?: number; live?: boolean; error?: string };
      if (!res.ok || typeof body.index !== 'number') {
        // ログアウトした・章が準備中に戻ったなど。読み直しても変わらないので止める
        if (res.status === 401 || res.status === 403 || res.status === 404) {
          stopped = true;
          stopPolling();
          say(body.error ?? '読み込めませんでした。');
        }
        return;
      }
      const live = body.live === true;
      if (staff) {
        if (pending > 0 || seq !== startSeq) return;
        server = { index: body.index, live };
        // ほかの運営が動かしたときも合わせる。進めていなければ、手元の1枚のまま
        if (live) show(body.index);
        return;
      }
      // 運営が進め始めた（または開いたときに進めていた）ら合わせる。自分でめくっている人は、戻るまでそのまま
      const started = live && (!known || !server.live);
      server = { index: body.index, live };
      known = true;
      if (started) following = true;
      if (!live) following = false;
      if (following) show(body.index);
      paintFollow();
    } catch {
      /* 通信が切れたときは次の読み直しで */
    } finally {
      loading = false;
    }
  }

  function startPolling(): void {
    if (timer !== null || stopped) return;
    timer = window.setInterval(() => void refresh(), POLL_MS);
  }

  function stopPolling(): void {
    if (timer === null) return;
    window.clearInterval(timer);
    timer = null;
  }

  document.addEventListener('visibilitychange', () => {
    if (document.visibilityState === 'visible') {
      void refresh();
      startPolling();
    } else {
      stopPolling();
    }
  });

  if (document.visibilityState === 'visible') {
    void refresh();
    startPolling();
  }
}
