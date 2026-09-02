import type { Shape } from './engine/init';
import { LOGIC_INPUTS } from './engine/network';
import { gaussian, uniform, type RngState } from './engine/random';
import type { Dataset, LossId } from './engine/types';

/** プレイヤーが使える操作。ステージを進むと増える */
export type OpId =
  | 'place'
  | 'nodes'
  | 'activation'
  | 'weights'
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
  train: '学習させる',
  lr: '学習率',
  optimizer: 'オプティマイザ',
  loss: '損失関数',
  init: '重みの初期化',
  data: 'データをいじる',
  batch: 'バッチ',
};

/** お題の種類。主役の窓の描き方が変わる */
export type TaskKind = 'reg1' | 'reg2' | 'cls2' | 'logic';

export type DataOpts = { n: number; noise: number; seed: number };

export type Stage = {
  id: string;
  no: number;
  title: string;
  /** 常時1行で出す目標 */
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
  /** 初期構成 */
  start: Shape;
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

const SQ = (v: number): [number, number][] => [
  [-v, v],
  [-v, v],
];

/* ------------------------------------------------------------------ */
/* ステージ列。操作は累積で増える                                       */
/* ------------------------------------------------------------------ */

export const STAGES: Stage[] = [
  {
    id: 'mean',
    no: 1,
    title: '2つの数の平均',
    goal: '入力2つの平均 (x₁+x₂)/2 を出す',
    help: 'まだ層が1つもなく、入力が出力に繋がっていません。図の「＋」で層を1つ置き、右の「つまみ」か線のドラッグで重みを合わせてください。答えは重み 0.5 と 0.5、バイアス 0 です。',
    kind: 'reg2',
    inputLabels: ['x₁', 'x₂'],
    range: SQ(1),
    data: reg2((a, b) => (a + b) / 2, SQ(1)),
    dataDefaults: { n: 80, noise: 0, seed: 7 },
    threshold: 0.004,
    judgeLoss: 'mse',
    unlocks: ['place', 'weights'],
    start: { sizes: [2], acts: [] },
  },
  {
    id: 'and',
    no: 2,
    title: 'AND',
    goal: '両方が 1 のときだけ 1 を出す',
    help: '足し算だけでは 0/1 のはっきりした答えは作れません。活性化関数を「ステップ」にすると、加重和が 0 以上かどうかで 0 か 1 かに切り替わります。重み 1・1、バイアス −1.5 あたりを試してください。',
    kind: 'logic',
    inputLabels: ['x₁', 'x₂'],
    range: [
      [-0.6, 1.6],
      [-0.6, 1.6],
    ],
    data: logic([0, 0, 0, 1]),
    dataDefaults: { n: 4, noise: 0, seed: 1 },
    threshold: 0.02,
    judgeLoss: 'mse',
    unlocks: ['activation'],
    start: { sizes: [2, 1], acts: ['identity'] },
  },
  {
    id: 'xor',
    no: 3,
    title: 'XOR',
    goal: '一方だけが 1 のとき 1 を出す',
    help: '1本の直線ではこの4点を分けられません。図の入力と出力のあいだの「＋」で層をもう1つ置き、ノード2つで「どちらか1以上」と「両方1」を作り、その差を取ります。',
    kind: 'logic',
    inputLabels: ['x₁', 'x₂'],
    range: [
      [-0.6, 1.6],
      [-0.6, 1.6],
    ],
    data: logic([0, 1, 1, 0]),
    dataDefaults: { n: 4, noise: 0, seed: 1 },
    threshold: 0.02,
    judgeLoss: 'mse',
    unlocks: ['nodes'],
    start: { sizes: [2, 1], acts: ['step'] },
  },
  {
    id: 'line',
    no: 4,
    title: '直線に当てる',
    goal: 'ノイズの乗った直線 y = 2x − 1 に当てはめる',
    help: 'ここからは手で置かずに機械にやらせます。▶ を押すと、損失（外れ具合）が小さくなる向きに重みが少しずつ動きます。下のバーは損失の推移で、左右にドラッグすると途中の状態に戻れます。',
    kind: 'reg1',
    inputLabels: ['x'],
    range: [[-1, 1]],
    data: reg1((x) => 2 * x - 1, -1, 1),
    dataDefaults: { n: 60, noise: 0.1, seed: 12 },
    threshold: 0.014,
    judgeLoss: 'mse',
    unlocks: ['train'],
    start: { sizes: [1, 1], acts: ['identity'] },
  },
  {
    id: 'square',
    no: 5,
    title: '放物線',
    goal: 'y = x² に当てはめる',
    help: '直線をいくら重ねても直線にしかなりません。曲げるには活性化関数（tanh など）を挟んだ層が要ります。学習率は1歩の大きさです。小さすぎると進まず、大きすぎると暴れます。',
    kind: 'reg1',
    inputLabels: ['x'],
    range: [[-1, 1]],
    data: reg1((x) => x * x, -1, 1),
    dataDefaults: { n: 60, noise: 0, seed: 3 },
    threshold: 0.002,
    judgeLoss: 'mse',
    unlocks: ['lr'],
    start: { sizes: [1, 1], acts: ['identity'] },
  },
  {
    id: 'sin',
    no: 6,
    title: '波',
    goal: 'y = sin x に当てはめる（パラメータ 40 個以内）',
    help: '上下する波はノードをそれなりに使います。ただし今回は部品数に上限があるので、層を厚くするより、オプティマイザを Adam にして歩幅を自動調整させるほうが早く届きます。',
    kind: 'reg1',
    inputLabels: ['x'],
    range: [[-Math.PI, Math.PI]],
    data: reg1(Math.sin, -Math.PI, Math.PI),
    dataDefaults: { n: 80, noise: 0, seed: 5 },
    threshold: 0.004,
    judgeLoss: 'mse',
    limits: { maxParams: 40 },
    unlocks: ['optimizer'],
    start: { sizes: [1, 4, 1], acts: ['tanh', 'identity'] },
  },
  {
    id: 'abs',
    no: 7,
    title: '折れ線',
    goal: 'y = |x| に当てはめる（層は2つまで）',
    help: '角のある形は tanh のような滑らかな関数だと苦手です。ReLU は負を 0 にするだけの折れ線なので、2つ組み合わせるとちょうど |x| になります。初期化のしかたでも収束の速さが変わります。',
    kind: 'reg1',
    inputLabels: ['x'],
    range: [[-1, 1]],
    data: reg1(Math.abs, -1, 1),
    dataDefaults: { n: 60, noise: 0, seed: 9 },
    threshold: 0.00002,
    judgeLoss: 'mse',
    limits: { maxLayers: 2 },
    unlocks: ['loss', 'init'],
    start: { sizes: [1, 4, 1], acts: ['tanh', 'identity'] },
  },
  {
    id: 'mul',
    no: 8,
    title: 'かけ算',
    goal: 'z = x · y に当てはめる',
    help: 'かけ算は足し算の重ね合わせでは作れないので、そこそこの大きさの中間層が要ります。データの点数やノイズを変えると、少ない点では表面がでたらめに歪むのが見えます。',
    kind: 'reg2',
    inputLabels: ['x', 'y'],
    range: SQ(1),
    data: reg2((a, b) => a * b, SQ(1)),
    dataDefaults: { n: 120, noise: 0, seed: 21 },
    threshold: 0.001,
    judgeLoss: 'mse',
    unlocks: ['data'],
    start: { sizes: [2, 4, 1], acts: ['tanh', 'identity'] },
  },
  {
    id: 'circle',
    no: 9,
    title: '円の内と外',
    goal: '円の内側と外側を分ける',
    help: '分類では出力を「1 である確率」とみなします。出力層の活性化をシグモイドにして、損失を交差エントロピーにするのが定石です。バッチを小さくすると1歩が軽くなり、歩数を稼げます。',
    kind: 'cls2',
    inputLabels: ['x₁', 'x₂'],
    range: SQ(1.5),
    data: cls2((a, b) => (a * a + b * b < 1 ? 1 : 0), SQ(1.5)),
    dataDefaults: { n: 160, noise: 0.02, seed: 33 },
    threshold: 0.03,
    judgeLoss: 'bce',
    unlocks: ['batch'],
    start: { sizes: [2, 4, 1], acts: ['tanh', 'sigmoid'] },
  },
  {
    id: 'spiral',
    no: 10,
    title: '渦巻き',
    goal: '2本の渦を分ける',
    help: '最後のお題です。層の数・ノード数・活性化・オプティマイザ・学習率・バッチ、全部使えます。深くすると表現力は上がりますが学習は不安定になります。組み方に正解は1つではありません。',
    kind: 'cls2',
    inputLabels: ['x₁', 'x₂'],
    range: SQ(1.3),
    data: spiral,
    dataDefaults: { n: 160, noise: 0.02, seed: 44 },
    threshold: 0.08,
    judgeLoss: 'bce',
    unlocks: [],
    start: { sizes: [2, 8, 8, 1], acts: ['tanh', 'tanh', 'sigmoid'] },
  },
];

/** ステージ n までで使えるようになっている操作 */
export function opsUpTo(index: number): Set<OpId> {
  const s = new Set<OpId>();
  for (let i = 0; i <= index && i < STAGES.length; i++) STAGES[i].unlocks.forEach((o) => s.add(o));
  return s;
}

export const ALL_OPS: OpId[] = Object.keys(OP_LABEL) as OpId[];
