/**
 * 第3部（機械学習1周目）の4つの動く図の共通部品。
 *
 *   1. Descent.astro  — 谷を下る点（第13章1・2節）
 *   2. FitLine.astro  — 直線が寄っていく（第13章3節）
 *   3. Boundary.astro — 境目が動く（第14章4・5節）
 *   4. Overfit.astro  — 学習用だけに合わせすぎる（第15章2節）
 *
 * データ・計算・SVG の組み方・時計（見えている間だけ動く）・止める動かすの
 * ボタンの絵は、ここに1つだけ置く。4つの部品はここを読むだけで、
 * 自分では計算しない（`design/spec/51-part3-data.md` と数がずれるのを防ぐため）。
 *
 * SVG は文字列で組む（Secant.astro の JSX ではなく、試作 p3-figures.html と同じやり方）。
 * ビルド時（Astro のフロントマター、Node）と、ブラウザの <script> の両方から、
 * 同じ関数を呼んで同じ文字列を作る。
 */

/* ============================================================
 * データ（design/spec/51-part3-data.md）
 * ============================================================ */
export const HOURS = [
  2.0, 3.0, 5.0, 6.0, 8.0, 9.0, 6.0, 6.5, 8.5, 5.5, 7.0, 8.0, 2.5, 0.5, 3.0, 3.0, 8.0, 8.5, 0.5, 4.5, 7.5, 1.5, 7.5,
  1.5, 4.5, 7.5, 3.0, 3.5, 3.0, 6.5,
];
export const SLEEP = [
  6.5, 7.0, 6.0, 6.5, 7.0, 5.5, 8.5, 6.5, 6.5, 6.5, 7.0, 6.5, 6.5, 8.5, 8.0, 8.0, 7.5, 7.0, 6.0, 8.5, 6.5, 5.0, 8.0,
  5.0, 8.0, 7.0, 5.0, 4.5, 6.5, 4.5,
];
export const SCORE = [
  45, 52, 65, 70, 82, 84, 63, 70, 85, 68, 70, 80, 44, 39, 62, 52, 85, 91, 33, 66, 80, 39, 77, 39, 72, 73, 52, 50, 49,
  77,
];
export const PASSED = SCORE.map((s) => (s >= 60 ? 1 : 0));
export const N = HOURS.length;

/* ============================================================
 * 小道具（数の書式・平均・標準偏差）
 * ============================================================ */
export const f1 = (v: number, d = 2): string => Number(v).toFixed(d);
export const mean = (a: readonly number[]): number => a.reduce((s, v) => s + v, 0) / a.length;
export const std = (a: readonly number[]): number => {
  const m = mean(a);
  return Math.sqrt(mean(a.map((v) => (v - m) ** 2)));
};

export function reducedMotion(): boolean {
  return typeof matchMedia === 'function' && matchMedia('(prefers-reduced-motion: reduce)').matches;
}

/* ============================================================
 * 描き方の小道具（Secant.astro とは別に、SVG を文字列で組む。試作と同じやり方）
 * ============================================================ */
export interface PlotBox {
  X: (x: number) => number;
  Y: (y: number) => number;
  w: number;
  h: number;
  pad: { l: number; r: number; t: number; b: number };
  xr: [number, number];
  yr: [number, number];
}

export function plot(
  w: number,
  h: number,
  xr: [number, number],
  yr: [number, number],
  pad: { l: number; r: number; t: number; b: number } = { l: 40, r: 12, t: 10, b: 30 },
): PlotBox {
  const X = (x: number) => pad.l + ((x - xr[0]) / (xr[1] - xr[0])) * (w - pad.l - pad.r);
  const Y = (y: number) => h - pad.b - ((y - yr[0]) / (yr[1] - yr[0])) * (h - pad.t - pad.b);
  return { X, Y, w, h, pad, xr, yr };
}

export function axes(P: PlotBox, xt: readonly number[], yt: readonly number[], xl?: string): string {
  let s = '';
  for (const t of yt) {
    s +=
      `<line class="kit-p3__grid" x1="${P.pad.l}" x2="${P.w - P.pad.r}" y1="${P.Y(t)}" y2="${P.Y(t)}"/>` +
      `<text class="kit-p3__tick" x="${P.pad.l - 6}" y="${P.Y(t) + 4}" text-anchor="end">${t}</text>`;
  }
  for (const t of xt) {
    s += `<text class="kit-p3__tick" x="${P.X(t)}" y="${P.h - P.pad.b + 16}" text-anchor="middle">${t}</text>`;
  }
  s += `<line class="kit-p3__axis" x1="${P.pad.l}" x2="${P.w - P.pad.r}" y1="${P.h - P.pad.b}" y2="${P.h - P.pad.b}"/>`;
  if (xl) s += `<text class="kit-p3__tick" x="${P.w - P.pad.r}" y="${P.h - 2}" text-anchor="end">${xl}</text>`;
  return s;
}

export function clip(prefix: string, P: PlotBox): { id: string; def: string } {
  const id = `${prefix}-clip`;
  return {
    id,
    def: `<clipPath id="${id}"><rect x="${P.pad.l}" y="${P.pad.t}" width="${P.w - P.pad.l - P.pad.r}" height="${P.h - P.pad.t - P.pad.b}"/></clipPath>`,
  };
}

export const svgWrap = (w: number, h: number, inner: string, label: string): string =>
  `<svg viewBox="0 0 ${w} ${h}" role="img" aria-label="${label}" xmlns="http://www.w3.org/2000/svg">${inner}</svg>`;

export const pathOf = (pts: readonly (readonly [number, number])[]): string =>
  pts.map((p, i) => (i ? 'L' : 'M') + p[0].toFixed(1) + ' ' + p[1].toFixed(1)).join(' ');

/** 点と予測（直線・曲線）の差を表す縦線。灰色は --l-ink-2 を薄くしたもの（CSS の .kit-p3__resid） */
export const residLine = (P: PlotBox, x: number, y: number, yhat: number): string =>
  `<line class="kit-p3__resid" x1="${P.X(x).toFixed(1)}" y1="${P.Y(y).toFixed(1)}" x2="${P.X(x).toFixed(1)}" y2="${P.Y(yhat).toFixed(1)}"/>`;

/* ============================================================
 * 1. 谷を下る点（Descent.astro）
 * ============================================================ */
export const VALLEY_F = (x: number): number => (x - 3) ** 2 + 1;
export const VALLEY_DF = (x: number): number => 2 * (x - 3);
export const DESCENT_LRS: { lr: number; name: string }[] = [
  { lr: 0.05, name: '0.05（小さい）' },
  { lr: 0.3, name: '0.3（ちょうどよい）' },
  { lr: 1.05, name: '1.05（大きすぎる）' },
];
export const DESCENT_STEPS = 20;
export const DESCENT_PLOT = plot(300, 220, [-3, 9], [0, 34], { l: 30, r: 8, t: 8, b: 26 });

export function gdPath(lr: number, steps: number = DESCENT_STEPS): number[] {
  const xs = [0];
  for (let i = 0; i < steps; i++) xs.push(xs[i] - lr * VALLEY_DF(xs[i]));
  return xs;
}

export function drawValley(P: PlotBox, xs: readonly number[], k: number, prefix: string): string {
  const c = clip(prefix, P);
  let s = c.def + axes(P, [-2, 0, 2, 4, 6, 8], [0, 10, 20, 30], 'x');
  const cur: [number, number][] = [];
  for (let x = P.xr[0]; x <= P.xr[1] + 1e-9; x += 0.05) cur.push([P.X(x), P.Y(Math.min(VALLEY_F(x), P.yr[1] + 5))]);
  s += `<g clip-path="url(#${c.id})"><path class="kit-p3__curve" d="${pathOf(cur)}"/>`;
  const tr = xs.slice(0, k + 1).map((x) => [P.X(x), P.Y(VALLEY_F(x))] as [number, number]);
  s += `<path class="kit-p3__trail" d="${pathOf(tr)}"/>`;
  for (let i = 0; i < k; i++) {
    s += `<circle class="kit-p3__ghost" cx="${P.X(xs[i]).toFixed(1)}" cy="${P.Y(VALLEY_F(xs[i])).toFixed(1)}" r="3.5"/>`;
  }
  const x = xs[k];
  const inside = x >= P.xr[0] && x <= P.xr[1] && VALLEY_F(x) <= P.yr[1];
  if (inside) s += `<circle class="kit-p3__now" cx="${P.X(x).toFixed(1)}" cy="${P.Y(VALLEY_F(x)).toFixed(1)}" r="6"/>`;
  s += `</g>`;
  if (!inside) {
    s += `<text class="kit-p3__out" x="${P.w / 2}" y="${P.pad.t + 16}" text-anchor="middle">図の外へ出た（x = ${f1(x, 1)}）</text>`;
  }
  return s;
}

/* ============================================================
 * 2. 直線が寄っていく（FitLine.astro）
 * ============================================================ */
export const FITLINE_LR = 0.02;
export const FITLINE_STEPS = 1000;
export interface FitStep {
  i: number;
  a: number;
  b: number;
}
export const FITLINE_HIST: FitStep[] = (() => {
  let a = 0;
  let b = 0;
  const H: FitStep[] = [{ i: 0, a, b }];
  for (let i = 1; i <= FITLINE_STEPS; i++) {
    let ga = 0;
    let gb = 0;
    for (let j = 0; j < N; j++) {
      const e = a * HOURS[j] + b - SCORE[j];
      ga += e * HOURS[j];
      gb += e;
    }
    a -= (FITLINE_LR * ga * 2) / N;
    b -= (FITLINE_LR * gb * 2) / N;
    H.push({ i, a, b });
  }
  return H;
})();
/** 見せる回。3・4回目は変化が小さく分かりにくいので飛ばす（50-part3-curriculum.md 第5節） */
export const FITLINE_SHOW = [0, 1, 2, 5, 10, 20, 50, 100, 200, 500, 1000];
export const FITLINE_PLOT = plot(720, 330, [0, 10], [0, 100]);
export const FITLINE_MEASURE = 1600;
export const FITLINE_MOVE = 900;

export function mse(a: number, b: number): number {
  let s = 0;
  for (let j = 0; j < N; j++) s += (a * HOURS[j] + b - SCORE[j]) ** 2;
  return s / N;
}

/** ゆっくり動くための緩急（cubic ease-in-out） */
export function easeInOut(u: number): number {
  return u < 0.5 ? 2 * u * u : 1 - (-2 * u + 2) ** 2 / 2;
}

export function drawFitLine(P: PlotBox, a: number, b: number, phase: 1 | 2, label: string, prefix: string): string {
  const c = clip(prefix, P);
  let s =
    c.def +
    axes(P, [0, 2, 4, 6, 8, 10], [0, 20, 40, 60, 80, 100], '勉強時間（時間）') +
    `<text class="kit-p3__tick" x="${P.pad.l + 4}" y="${P.pad.t + 12}">点数</text><g clip-path="url(#${c.id})">`;
  if (phase === 1) HOURS.forEach((h, j) => { s += residLine(P, h, SCORE[j], a * h + b); });
  s += `<line class="kit-p3__cur" x1="${P.X(0).toFixed(1)}" y1="${P.Y(b).toFixed(1)}" x2="${P.X(10).toFixed(1)}" y2="${P.Y(10 * a + b).toFixed(1)}"/>`;
  s += HOURS.map((h, j) => `<circle class="kit-p3__pt" cx="${P.X(h).toFixed(1)}" cy="${P.Y(SCORE[j]).toFixed(1)}" r="4"/>`).join('');
  s += '</g>';
  s += `<text class="kit-p3__label" x="${P.w - P.pad.r - 4}" y="${P.pad.t + 14}" text-anchor="end">${label}</text>`;
  return s;
}

/* ============================================================
 * 3. 境目が動く（Boundary.astro）
 * ============================================================ */
export const MH = mean(HOURS);
export const SH = std(HOURS);
export const MS = mean(SLEEP);
export const SS = std(SLEEP);
export const Z1 = HOURS.map((h) => (h - MH) / SH);
export const Z2 = SLEEP.map((s) => (s - MS) / SS);
export const sigmoid = (z: number): number => 1 / (1 + Math.exp(-z));
export interface BoundaryStep {
  i: number;
  w1: number;
  w2: number;
  b: number;
}
export const BOUNDARY_LR = 0.5;
export const BOUNDARY_STEPS = 300;
export const BOUNDARY_HIST: BoundaryStep[] = (() => {
  let w1 = 0;
  let w2 = 0;
  let b = 0;
  const H: BoundaryStep[] = [{ i: 0, w1, w2, b }];
  for (let i = 1; i <= BOUNDARY_STEPS; i++) {
    let g1 = 0;
    let g2 = 0;
    let gb = 0;
    for (let j = 0; j < N; j++) {
      const e = sigmoid(w1 * Z1[j] + w2 * Z2[j] + b) - PASSED[j];
      g1 += e * Z1[j];
      g2 += e * Z2[j];
      gb += e;
    }
    w1 -= (BOUNDARY_LR * g1) / N;
    w2 -= (BOUNDARY_LR * g2) / N;
    b -= (BOUNDARY_LR * gb) / N;
    H.push({ i, w1, w2, b });
  }
  return H;
})();
export function crossEntropy(H: BoundaryStep): number {
  let s = 0;
  for (let j = 0; j < N; j++) {
    const p = sigmoid(H.w1 * Z1[j] + H.w2 * Z2[j] + H.b);
    s -= PASSED[j] ? Math.log(p) : Math.log(1 - p);
  }
  return s / N;
}
export function boundaryHits(H: BoundaryStep): number {
  let hit = 0;
  for (let j = 0; j < N; j++) {
    const guess = sigmoid(H.w1 * Z1[j] + H.w2 * Z2[j] + H.b) >= 0.5 ? 1 : 0;
    if (guess === PASSED[j]) hit++;
  }
  return hit;
}
export const BOUNDARY_SHOW = [0, 1, 2, 3, 5, 8, 12, 20, 30, 50, 80, 120, 200, 300];
export const BOUNDARY_PLOT = plot(720, 360, [0, 10], [4, 9]);

function contourLine(P: PlotBox, H: BoundaryStep, p: number): string {
  if (Math.abs(H.w2) < 1e-9) return '';
  const L = Math.log(p / (1 - p));
  const pts: [number, number][] = [];
  for (const h of [P.xr[0], P.xr[1]]) {
    const z1 = (h - MH) / SH;
    const z2 = (L - H.b - H.w1 * z1) / H.w2;
    pts.push([P.X(h), P.Y(z2 * SS + MS)]);
  }
  return `<line class="kit-p3__boundary" x1="${pts[0][0].toFixed(1)}" y1="${pts[0][1].toFixed(1)}" x2="${pts[1][0].toFixed(1)}" y2="${pts[1][1].toFixed(1)}"/>`;
}

export function drawBoundary(P: PlotBox, H: BoundaryStep, prefix: string): string {
  const c = clip(prefix, P);
  let s = c.def + `<g clip-path="url(#${c.id})">`;
  const cw = 0.25;
  const ch = 0.125;
  for (let h = 0; h < 10; h += cw) {
    for (let sl = 4; sl < 9; sl += ch) {
      const p = sigmoid(H.w1 * ((h + cw / 2 - MH) / SH) + H.w2 * ((sl + ch / 2 - MS) / SS) + H.b);
      const cls = p >= 0.5 ? 'kit-p3__cell-ai' : 'kit-p3__cell-shu';
      s +=
        `<rect class="${cls}" x="${P.X(h).toFixed(1)}" y="${P.Y(sl + ch).toFixed(1)}" ` +
        `width="${(P.X(h + cw) - P.X(h) + 0.5).toFixed(1)}" height="${(P.Y(sl) - P.Y(sl + ch) + 0.5).toFixed(1)}" ` +
        `fill-opacity="${(Math.abs(p - 0.5) * 0.5).toFixed(3)}"/>`;
    }
  }
  s += '</g>';
  s +=
    axes(P, [0, 2, 4, 6, 8, 10], [4, 5, 6, 7, 8, 9], '勉強時間（時間）') +
    `<text class="kit-p3__tick" x="${P.pad.l + 4}" y="${P.pad.t + 12}">睡眠時間（時間）</text>`;
  s += `<g clip-path="url(#${c.id})">` + contourLine(P, H, 0.5) + '</g>';
  HOURS.forEach((h, j) => {
    const x = P.X(h);
    const y = P.Y(SLEEP[j]);
    s += PASSED[j]
      ? `<circle class="kit-p3__pass" cx="${x.toFixed(1)}" cy="${y.toFixed(1)}" r="5"/>`
      : `<path class="kit-p3__fail" d="M${(x - 4.5).toFixed(1)} ${(y - 4.5).toFixed(1)} L${(x + 4.5).toFixed(1)} ${(y + 4.5).toFixed(1)} M${(x + 4.5).toFixed(1)} ${(y - 4.5).toFixed(1)} L${(x - 4.5).toFixed(1)} ${(y + 4.5).toFixed(1)}"/>`;
  });
  return s;
}

/* ============================================================
 * 4. 学習用だけに合わせすぎる（Overfit.astro）
 * ============================================================ */
/** np.random.default_rng(50).permutation(30) の並び。先頭6人が学習用（51-part3-data.md 第2節） */
export const OVERFIT_PERM = [
  18, 8, 5, 9, 20, 24, 15, 28, 12, 17, 14, 4, 6, 19, 11, 27, 23, 7, 3, 2, 16, 10, 1, 29, 26, 0, 25, 22, 21, 13,
];
export const OVERFIT_TR = OVERFIT_PERM.slice(0, 6);
export const OVERFIT_TE = OVERFIT_PERM.slice(6);

/** 学習用に、損失が最小の多項式を当てる（np.polyfit と同じ答え）。x は 10 で割ってから解く（正規方程式） */
export function polyfit(xs: readonly number[], ys: readonly number[], d: number): (x: number) => number {
  const m = d + 1;
  const A: number[][] = [];
  for (let r = 0; r < m; r++) A.push(new Array(m + 1).fill(0));
  for (let i = 0; i < xs.length; i++) {
    const u = xs[i] / 10;
    const pw: number[] = [];
    for (let k = 0; k <= 2 * d; k++) pw.push(u ** k);
    for (let r = 0; r < m; r++) {
      for (let c = 0; c < m; c++) A[r][c] += pw[r + c];
      A[r][m] += pw[r] * ys[i];
    }
  }
  for (let c = 0; c < m; c++) {
    let p = c;
    for (let r = c + 1; r < m; r++) if (Math.abs(A[r][c]) > Math.abs(A[p][c])) p = r;
    [A[c], A[p]] = [A[p], A[c]];
    for (let r = 0; r < m; r++) {
      if (r === c) continue;
      const f = A[r][c] / A[c][c];
      for (let k = c; k <= m; k++) A[r][k] -= f * A[c][k];
    }
  }
  const co = A.map((row, r) => row[m] / row[r]);
  return (x: number) => co.reduce((s, v, k) => s + v * (x / 10) ** k, 0);
}

export const OVERFIT_DEG = [1, 3, 5];
export interface OverfitFit {
  d: number;
  f: (x: number) => number;
  tr: number;
  te: number;
}
export const OVERFIT_FITS: OverfitFit[] = OVERFIT_DEG.map((d) => {
  const f = polyfit(
    OVERFIT_TR.map((i) => HOURS[i]),
    OVERFIT_TR.map((i) => SCORE[i]),
    d,
  );
  const L = (idx: readonly number[]) => mean(idx.map((i) => (f(HOURS[i]) - SCORE[i]) ** 2));
  return { d, f, tr: L(OVERFIT_TR), te: L(OVERFIT_TE) };
});
export const OVERFIT_PLOT = plot(300, 230, [0, 10], [0, 110], { l: 30, r: 8, t: 8, b: 26 });
export const OVERFIT_PHASE = 1800;

/** 「学習用の損失 …」の下に「テスト用の損失 …」を添える（① のときは空行のまま高さをそろえる） */
export function overfitMiniHtml(F: OverfitFit, showTest: boolean): string {
  const te = showTest ? `テスト用の損失 ${f1(F.te, 1)}` : '&nbsp;';
  return `学習用の損失 ${f1(F.tr, 1)}<br><span class="kit-p3__te">${te}</span>`;
}

export function drawOverfit(P: PlotBox, F: OverfitFit, showTest: boolean, prefix: string): string {
  const c = clip(prefix, P);
  /* 小さな図では軸の名前が目盛りの数に重なるので、名前は凡例に書く（Overfit.astro） */
  let s = c.def + axes(P, [0, 2, 4, 6, 8, 10], [0, 20, 40, 60, 80, 100]) + `<g clip-path="url(#${c.id})">`;
  OVERFIT_TR.forEach((i) => { s += residLine(P, HOURS[i], SCORE[i], F.f(HOURS[i])); });
  if (showTest) OVERFIT_TE.forEach((i) => { s += residLine(P, HOURS[i], SCORE[i], F.f(HOURS[i])); });
  const pts: [number, number][] = [];
  for (let h = 0.3; h <= 9.7; h += 0.05) pts.push([P.X(h), P.Y(Math.max(-40, Math.min(160, F.f(h))))]);
  s += `<path class="kit-p3__cur" d="${pathOf(pts)}"/></g>`;
  if (showTest) {
    OVERFIT_TE.forEach((i) => {
      s += `<circle class="kit-p3__pt-te" cx="${P.X(HOURS[i]).toFixed(1)}" cy="${P.Y(SCORE[i]).toFixed(1)}" r="4"/>`;
    });
  }
  OVERFIT_TR.forEach((i) => {
    s += `<circle class="kit-p3__pt-tr" cx="${P.X(HOURS[i]).toFixed(1)}" cy="${P.Y(SCORE[i]).toFixed(1)}" r="5"/>`;
  });
  return s;
}

/* ============================================================
 * 動かす・止める（見えている間だけ動く。20-platform.md 第16.4節と同じ考え）
 * ============================================================ */
export interface TickerHandle {
  isPlaying: () => boolean;
  setPlaying: (on: boolean) => void;
  toggle: () => void;
}

/**
 * 止める・動かすのボタンと、見えている間だけ進む時計をまとめて面倒を見る。
 * onTick は「動いていてよいコマ」だけ、経過ミリ秒（最大100）を添えて呼ばれる。
 * IntersectionObserver が一度でも知らせてきたらそれに従い、来ない環境
 * （描画していない枠）ではタブが見えているかだけで決める。1コマは
 * requestAnimationFrame と 50ms の時計の先に来たほうで進める。
 */
export function setupTicker(opts: {
  root: Element;
  btn: HTMLButtonElement;
  onTick: (dtMs: number) => void;
  initialPlaying?: boolean;
}): TickerHandle {
  let playing = opts.initialPlaying ?? !reducedMotion();
  let ioSeen = false;
  let ioVisible = false;
  let raf = 0;
  let timer = 0;
  let last = 0;

  function paint() {
    const word = playing ? '止める' : '動かす';
    opts.btn.dataset.playing = String(playing);
    opts.btn.setAttribute('aria-label', word);
    opts.btn.title = word;
  }

  const running = () => playing && document.visibilityState === 'visible' && (ioSeen ? ioVisible : true);

  function frame(now: number) {
    raf = 0;
    const dt = Math.min(now - last, 100);
    last = now;
    opts.onTick(dt);
    update();
  }

  function request() {
    raf = requestAnimationFrame((now) => {
      clearTimeout(timer);
      frame(now);
    });
    timer = window.setTimeout(() => {
      cancelAnimationFrame(raf);
      frame(performance.now());
    }, 50);
  }

  function update() {
    if (running()) {
      if (!raf) {
        last = performance.now();
        request();
      }
    } else if (raf) {
      cancelAnimationFrame(raf);
      clearTimeout(timer);
      raf = 0;
    }
  }

  function setPlaying(on: boolean) {
    playing = on;
    paint();
    update();
  }

  opts.btn.addEventListener('click', () => setPlaying(!playing));
  document.addEventListener('visibilitychange', update);
  if ('IntersectionObserver' in window) {
    new IntersectionObserver((entries) => {
      ioSeen = true;
      ioVisible = entries[entries.length - 1].isIntersecting;
      update();
    }).observe(opts.root);
  }

  paint();
  update();

  return { isPlaying: () => playing, setPlaying, toggle: () => setPlaying(!playing) };
}

/** つまみに触ったら自動は止め、手で動かせるようにする（Secant.astro と同じ） */
export function wireRange(range: HTMLInputElement, ticker: TickerHandle, onScrub: (v: number) => void): void {
  const grab = () => {
    if (ticker.isPlaying()) ticker.setPlaying(false);
  };
  range.addEventListener('pointerdown', grab);
  range.addEventListener('keydown', grab);
  range.addEventListener('input', () => {
    grab();
    onScrub(Number(range.value));
  });
}
