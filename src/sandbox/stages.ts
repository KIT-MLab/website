import { ACTIVATION_ORDER } from './engine/activations';
import type { Shape } from './engine/init';
import { forward, LOGIC_INPUTS } from './engine/network';
import { gaussian, uniform, type RngState } from './engine/random';
import type { ActivationId, Dataset, LossId, Network } from './engine/types';

/** プレイヤーが使える操作。ステージを進むと増える */
export type OpId =
  | 'place'
  | 'nodes'
  | 'activation'
  | 'weights'
  | 'bias'
  | 'knob'
  | 'train'
  | 'lr'
  | 'optimizer'
  | 'loss'
  | 'init'
  | 'data'
  | 'batch';

export const OP_LABEL: Record<OpId, string> = {
  place: '層を置く',
  nodes: 'ノード数',
  activation: '活性化関数',
  weights: '重みを手で置く',
  bias: 'バイアスを手で置く',
  knob: '右のつまみ',
  train: '学習させる',
  lr: '学習率',
  optimizer: 'オプティマイザ',
  loss: '損失関数',
  init: '重みの初期化',
  data: 'データをいじる',
  batch: 'バッチ',
};

/** 見せられる窓。ステージごとに解禁済みのものだけ出す */
export type ViewId = 'fit' | 'network' | 'actchart' | 'truth' | 'grad';

export const VIEW_LABEL: Record<ViewId, string> = {
  fit: '当てはまり',
  network: 'ネットワーク',
  actchart: '活性化関数',
  truth: '真理値表',
  grad: '勾配の大きさ',
};

/** お題の種類。主役の窓の描き方が変わる */
export type TaskKind = 'reg1' | 'reg2' | 'cls2' | 'logic';

export type DataOpts = { n: number; noise: number; seed: number };

/* ------------------------------------------------------------------ */
/* チュートリアル。1手ずつ指示し、値が動いたら次へ                       */
/* ------------------------------------------------------------------ */

export type TutCtx = {
  /** いまのネット */
  net: Network;
  /** この手に入った時点のネット */
  base: Network;
  /** 選ばれている層 */
  selected: number;
  /** 目標の数値をすでに満たしているか */
  cleared: boolean;
  /** この手に入ってから進んだ学習の歩数 */
  steps: number;
  /** 履歴バーを引きずったか */
  scrubbed: boolean;
  /** いまの塗る筆（活性化の選択を締め付けるステップの判定に使う） */
  paintId: ActivationId | null;
};

/**
 * 1手ぶんの指示。
 * targets はハイライトして触れるようにする要素の名前。
 * `e:層:出力:入力` = 線 / `n:層:出力` = ノード / `h:層` = 層の見出し /
 * `a:層:出力` = ノード脇の活性化の印 / `knob` = つまみ / `play` `hist` `plus` `nodes` = 道具。
 * 末尾が `*` なら前方一致。
 */
export type TutStep = { say: string; targets: string[]; done: (c: TutCtx) => boolean };

/**
 * 1点ずつ合わせさせる出題（ステージ1・2）。
 * 手で確率的勾配降下法をやることになるので、あとの「▶ を押す」の伏線になる。
 * 判定はドラッグ中には走らない。指を離すか、新しい問題が出たときに予約する。
 */
export type Ticker = {
  /** これ以下のずれなら合格 */
  tol: number;
  /** 揺れる時間（ms） */
  shake: number;
  /** この回数だけ落とすとヒントを1行出す */
  hintAfter: number;
  hint: string;
};

/**
 * 予約から判定までの間。700 → 700 → 600 → 500 → 400 → 300 → 200 → 100 → 以降100ms固定。
 * streak は連続で通した数（これから出す問題の前に何回連続で通ったか）。
 */
export const judgeDelay = (streak: number) => (streak <= 1 ? 700 : Math.max(100, 700 - 100 * (streak - 1)));

const wOf = (n: Network, li: number, o: number, i: number) => n.layers[li]?.w?.[o]?.[i] ?? 0;

/** その値がこの手のあいだに eps 以上動いたか */
const movedW = (c: TutCtx, li: number, o: number, i: number, eps = 0.2) =>
  Math.abs(wOf(c.net, li, o, i) - wOf(c.base, li, o, i)) >= eps;

const bOf = (n: Network, li: number, o: number) => n.layers[li]?.b?.[o] ?? 0;

/** バイアスがこの手のあいだに eps 以上動いたか */
const movedB = (c: TutCtx, li: number, o: number, eps = 0.15) =>
  Math.abs(bOf(c.net, li, o) - bOf(c.base, li, o)) >= eps;

/** 中間層の2ノードが「どちらか1以上」と「両方1」になっているか（順番は問わない） */
function xorHiddenReady(net: Network): boolean {
  if (net.layers.length < 2 || net.layers[0].b.length !== 2) return false;
  const pat = [0, 1].map((k) => LOGIC_INPUTS.map((x) => (forward(net, x).layers[0].a[k] >= 0.5 ? 1 : 0)).join(''));
  const or = '0111';
  const and = '0001';
  return (pat[0] === or && pat[1] === and) || (pat[0] === and && pat[1] === or);
}

export type Stage = {
  id: string;
  no: number;
  title: string;
  /** 上部に大きく出す目標 */
  goal: string;
  /** 「?」で開く本文 */
  help: string;
  kind: TaskKind;
  inputLabels: string[];
  /** 各入力の範囲。主役の窓の軸に使う */
  range: [number, number][];
  data: (opts: DataOpts) => Dataset;
  dataDefaults: DataOpts;
  /** この損失以下でクリア */
  threshold: number;
  judgeLoss: LossId;
  limits?: { maxParams?: number; maxLayers?: number };
  /** このステージに来たときに増える操作 */
  unlocks: OpId[];
  /** このステージで見せてよい窓。先頭が主役 */
  views: ViewId[];
  /** 押している間に出る縦目盛りの範囲（±この値）。省略すると 3 */
  wRange?: number;
  /** 初期構成 */
  start: Shape;
  /** 1手ずつの指示。空なら目標だけ出す */
  tutorial: TutStep[];
  /** あれば「1点ずつ合わせる」進行にする。クリアはデータを一周 */
  ticker?: Ticker;
  /** 活性化の選択画面に出す選択肢。省略すると全部（そのステージで初めて出す道具だけに絞るときに使う） */
  activationChoices?: ActivationId[];
  /** 入力平面の背景にうっすら見せる、正解となる分離線（w1・w2・b）。単層で線形分離できるお題だけに持たせる */
  logicHint?: [number, number, number];
};

/* ------------------------------------------------------------------ */
/* データの作り方。種が同じなら毎回同じ点が出る                          */
/* ------------------------------------------------------------------ */

/** 1入力の回帰。x は等間隔、y にだけノイズを乗せる */
function reg1(f: (x: number) => number, lo: number, hi: number) {
  return ({ n, noise, seed }: DataOpts): Dataset => {
    let rng: RngState = seed;
    const x: number[][] = [];
    const y: number[][] = [];
    for (let i = 0; i < n; i++) {
      const xv = lo + (hi - lo) * (n === 1 ? 0.5 : i / (n - 1));
      let g: number;
      [g, rng] = gaussian(rng);
      x.push([xv]);
      y.push([f(xv) + g * noise]);
    }
    return { x, y };
  };
}

/** 2入力の回帰。点は範囲の中に散らす */
function reg2(f: (a: number, b: number) => number, r: [number, number][]) {
  return ({ n, noise, seed }: DataOpts): Dataset => {
    let rng: RngState = seed;
    const x: number[][] = [];
    const y: number[][] = [];
    for (let i = 0; i < n; i++) {
      let a: number;
      let b: number;
      let g: number;
      [a, rng] = uniform(rng, r[0][0], r[0][1]);
      [b, rng] = uniform(rng, r[1][0], r[1][1]);
      [g, rng] = gaussian(rng);
      x.push([a, b]);
      y.push([f(a, b) + g * noise]);
    }
    return { x, y };
  };
}

/** 2入力の分類。ノイズは点の位置を揺らす */
function cls2(f: (a: number, b: number) => number, r: [number, number][]) {
  return ({ n, noise, seed }: DataOpts): Dataset => {
    let rng: RngState = seed;
    const x: number[][] = [];
    const y: number[][] = [];
    for (let i = 0; i < n; i++) {
      let a: number;
      let b: number;
      let g1: number;
      let g2: number;
      [a, rng] = uniform(rng, r[0][0], r[0][1]);
      [b, rng] = uniform(rng, r[1][0], r[1][1]);
      const label = f(a, b);
      [g1, rng] = gaussian(rng);
      [g2, rng] = gaussian(rng);
      x.push([a + g1 * noise, b + g2 * noise]);
      y.push([label]);
    }
    return { x, y };
  };
}

/** 渦巻き。2本の腕がそれぞれ別のクラス */
function spiral({ n, noise, seed }: DataOpts): Dataset {
  let rng: RngState = seed;
  const x: number[][] = [];
  const y: number[][] = [];
  const m = Math.max(2, Math.floor(n / 2));
  for (let k = 0; k < 2; k++) {
    for (let i = 0; i < m; i++) {
      const t = i / (m - 1);
      const r = 0.15 + 0.95 * t;
      const ang = t * 2.4 * Math.PI + k * Math.PI;
      let g1: number;
      let g2: number;
      [g1, rng] = gaussian(rng);
      [g2, rng] = gaussian(rng);
      x.push([r * Math.cos(ang) + g1 * noise, r * Math.sin(ang) + g2 * noise]);
      y.push([k]);
    }
  }
  return { x, y };
}

/** 論理回路。入力は4通り固定、ノイズも点数も関係ない */
function logic(targets: number[]) {
  return (): Dataset => ({ x: LOGIC_INPUTS.map((p) => [...p]), y: targets.map((v) => [v]) });
}

/**
 * ステージ1・2で1点ずつ出す12点。正の値・小数第1位で、
 * 大きい値と小さい値を混ぜてある（重みが少しずれていると大きい値の点で落ちる）。
 */
const MEAN_POINTS: [number, number][] = [
  [0.4, 0.6],
  [1.2, 0.8],
  [0.3, 1.5],
  [1.7, 0.5],
  [0.9, 0.9],
  [1.8, 1.6],
  [0.2, 1.0],
  [1.4, 0.3],
  [0.7, 1.7],
  [1.5, 1.1],
  [0.6, 0.2],
  [1.1, 1.4],
];

const meanData = (): Dataset => ({
  x: MEAN_POINTS.map((p) => [...p]),
  y: MEAN_POINTS.map(([a, b]) => [(a + b) / 2]),
});

/** 平均より 0.5 だけ大きい数。重みだけでは一周できないので、バイアスの出番になる */
const offsetData = (): Dataset => ({
  x: MEAN_POINTS.map((p) => [...p]),
  y: MEAN_POINTS.map(([a, b]) => [(a + b) / 2 + 0.5]),
});

const SQ = (v: number): [number, number][] => [
  [-v, v],
  [-v, v],
];

const LOGIC_RANGE: [number, number][] = [
  [-0.6, 1.6],
  [-0.6, 1.6],
];

/* ------------------------------------------------------------------ */
/* ステージ列。操作は累積で増える                                       */
/* ------------------------------------------------------------------ */

export const STAGES: Stage[] = [
  {
    id: 'mean',
    no: 1,
    title: '平均',
    goal: '2つの数の平均を出す',
    help: '左の箱が入ってくる数、右の箱がそのとき出したい数（2つの平均）です。線を押さえて上下に動かすと、その入力を何倍するか（重み）が変わります。動かせるのは線2本だけです。1点ごとに合わせていくと、どの点でも合う置き方が1つだけあることに気づくはずです。2本の線を同じ太さにするあたりから探してください。',
    kind: 'reg2',
    inputLabels: ['x₁', 'x₂'],
    range: [
      [0, 2],
      [0, 2],
    ],
    data: meanData,
    dataDefaults: { n: 12, noise: 0, seed: 7 },
    threshold: 0.004,
    judgeLoss: 'mse',
    unlocks: ['weights'],
    views: ['network'],
    wRange: 1.5,
    start: { sizes: [2, 1], acts: ['identity'] },
    tutorial: [
      {
        say: 'x₁ から出ている線を押したまま、上下に動かしてみてください',
        targets: ['e:0:0:0'],
        done: (c) => movedW(c, 0, 0, 0),
      },
    ],
    ticker: {
      tol: 0.05,
      shake: 400,
      hintAfter: 8,
      hint: '2本の線を同じくらいにすると、どの点でも合うかもしれません',
    },
  },
  {
    id: 'offset',
    no: 2,
    title: 'バイアス',
    goal: '平均より 0.5 大きい数を出す',
    help: '出したい数が、前より 0.5 だけ大きくなりました。線（重み）は入ってくる数を何倍するかを決めるだけなので、線をどう置いても、小さい入力の点と大きい入力の点を同時には当てられません。丸には最後に足す数（バイアス）があります。出力の丸を押したまま上下に動かすと、それが変わります。',
    kind: 'reg2',
    inputLabels: ['x₁', 'x₂'],
    range: [
      [0, 2],
      [0, 2],
    ],
    data: offsetData,
    dataDefaults: { n: 12, noise: 0, seed: 7 },
    threshold: 0.004,
    judgeLoss: 'mse',
    unlocks: ['bias'],
    views: ['network'],
    wRange: 1.5,
    start: { sizes: [2, 1], acts: ['identity'] },
    tutorial: [
      {
        say: '出力の丸を押したまま、上下に動かしてみてください',
        targets: ['n:0:0'],
        done: (c) => movedB(c, 0, 0),
      },
    ],
    ticker: {
      tol: 0.05,
      shake: 400,
      hintAfter: 8,
      hint: '線だけでは全部の点には合いません。丸のほうも動かしてみてください',
    },
  },
  {
    id: 'and',
    no: 3,
    title: 'AND',
    goal: '両方が 1 のときだけ 1 を出す',
    help: '足し算だけでは 0 か 1 かのはっきりした答えは作れません。活性化関数を「ステップ」にすると、加重和が 0 以上かどうかで 0 と 1 に切り替わります。両方が 1 のときだけ加重和が 0 を超えるように、重みとバイアスを探ってみてください。',
    kind: 'logic',
    inputLabels: ['x₁', 'x₂'],
    range: LOGIC_RANGE,
    data: logic([0, 0, 0, 1]),
    dataDefaults: { n: 4, noise: 0, seed: 1 },
    threshold: 0.02,
    judgeLoss: 'mse',
    unlocks: ['activation'],
    views: ['network', 'truth', 'fit'],
    start: { sizes: [2, 1], acts: ['identity'] },
    activationChoices: ['identity', 'step'],
    logicHint: [1, 1, -1.5],
    tutorial: [
      {
        say: '左のツールバーの「活性化関数」を押し、「ステップ」を選んでください',
        targets: ['tool:act'],
        done: (c) => c.paintId === 'step',
      },
      {
        say: '出力の丸をクリックして、ステップを塗ってください',
        targets: ['n:0:*'],
        done: (c) => c.net.layers[0]?.acts.every((a) => a === 'step') ?? false,
      },
      {
        say: '0 か 1 かで出るようになりました。線と丸を動かして、真理値表を全部緑にしてください',
        targets: ['e:0:*', 'n:0:*', 'knob'],
        done: (c) => c.cleared,
      },
    ],
  },
];

/** ステージ n までで使えるようになっている操作 */
export function opsUpTo(index: number): Set<OpId> {
  const s = new Set<OpId>();
  for (let i = 0; i <= index && i < STAGES.length; i++) STAGES[i].unlocks.forEach((o) => s.add(o));
  return s;
}

export const ALL_OPS: OpId[] = Object.keys(OP_LABEL) as OpId[];

/** 活性化の選択画面に出す選択肢。ステージが絞っていなければ全部 */
export const activationChoicesFor = (s: Stage): ActivationId[] => s.activationChoices ?? ACTIVATION_ORDER;

/** targets の書き方（末尾 `*` は前方一致）に当てはまるか */
export function hits(targets: string[] | null, id: string): boolean {
  if (!targets) return true;
  return targets.some((t) => (t.endsWith('*') ? id.startsWith(t.slice(0, -1)) : t === id));
}
