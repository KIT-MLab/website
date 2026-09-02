import type { Shape } from './engine/init';
import { forward, LOGIC_INPUTS } from './engine/network';
import { gaussian, uniform, type RngState } from './engine/random';
import type { Dataset, LossId, Network } from './engine/types';

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

/** 見せられる窓。ステージごとに解禁済みのものだけ出す */
export type ViewId = 'fit' | 'network' | 'calc' | 'actchart' | 'truth' | 'grad';

export const VIEW_LABEL: Record<ViewId, string> = {
  fit: '当てはまり',
  network: 'ネットワーク',
  calc: '計算の中身',
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
};

/**
 * 1手ぶんの指示。
 * targets はハイライトして触れるようにする要素の名前。
 * `e:層:出力:入力` = 線 / `n:層:出力` = ノード / `h:層` = 層の見出し /
 * `act` = 活性化 / `knob` = つまみ / `play` `hist` `plus` `nodes` = 道具。
 * 末尾が `*` なら前方一致。
 */
export type TutStep = { say: string; targets: string[]; done: (c: TutCtx) => boolean };

const wOf = (n: Network, li: number, o: number, i: number) => n.layers[li]?.w?.[o]?.[i] ?? 0;
const bOf = (n: Network, li: number, o: number) => n.layers[li]?.b?.[o] ?? 0;

/** その値がこの手のあいだに eps 以上動いたか */
const movedW = (c: TutCtx, li: number, o: number, i: number, eps = 0.2) =>
  Math.abs(wOf(c.net, li, o, i) - wOf(c.base, li, o, i)) >= eps;
const movedB = (c: TutCtx, li: number, o: number, eps = 0.2) =>
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
  /** 初期構成 */
  start: Shape;
  /** 1手ずつの指示。空なら目標だけ出す */
  tutorial: TutStep[];
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
    help: '入力2つを足して2で割る、つまり (x₁ + x₂) ÷ 2 です。線の太さがその入力を何倍するか（重み）、丸が最後に足す下駄（バイアス）です。重みを両方 0.5、バイアスを 0 にすると平均になります。',
    kind: 'reg2',
    inputLabels: ['x₁', 'x₂'],
    range: SQ(1),
    data: reg2((a, b) => (a + b) / 2, SQ(1)),
    dataDefaults: { n: 80, noise: 0, seed: 7 },
    threshold: 0.004,
    judgeLoss: 'mse',
    unlocks: ['weights'],
    views: ['network'],
    start: { sizes: [2, 1], acts: ['identity'] },
    tutorial: [
      {
        say: 'x₁ から出ている線を、上にドラッグしてみてください',
        targets: ['e:0:0:0'],
        done: (c) => movedW(c, 0, 0, 0),
      },
      {
        say: '出力の数字が変わりました。x₂ の線も動かしてみてください',
        targets: ['e:0:0:1'],
        done: (c) => movedW(c, 0, 0, 1),
      },
      {
        say: '出力の丸を上下にドラッグすると、最後に足すバイアスが変わります',
        targets: ['n:0:0'],
        done: (c) => movedB(c, 0, 0),
      },
      {
        say: '右の「つまみ」で 2本の線を 0.5、バイアスを 0 にすると平均になります',
        targets: ['e:0:*', 'n:0:*', 'knob'],
        done: (c) => c.cleared,
      },
    ],
  },
  {
    id: 'and',
    no: 2,
    title: 'AND',
    goal: '両方が 1 のときだけ 1 を出す',
    help: '足し算だけでは 0 か 1 かのはっきりした答えは作れません。活性化関数を「ステップ」にすると、加重和が 0 以上かどうかで 0 と 1 に切り替わります。重み 1・1、バイアス −1.5 あたりを試してください。',
    kind: 'logic',
    inputLabels: ['x₁', 'x₂'],
    range: LOGIC_RANGE,
    data: logic([0, 0, 0, 1]),
    dataDefaults: { n: 4, noise: 0, seed: 1 },
    threshold: 0.02,
    judgeLoss: 'mse',
    unlocks: ['activation'],
    views: ['network', 'truth', 'fit', 'calc'],
    start: { sizes: [2, 1], acts: ['identity'] },
    tutorial: [
      {
        say: '右の「活性化」から「ステップ」を選んでください',
        targets: ['act'],
        done: (c) => c.net.layers[0]?.act === 'step',
      },
      {
        say: '0 か 1 かで出るようになりました。線と丸を動かして表を全部 ○ にしてください',
        targets: ['e:0:*', 'n:0:*', 'knob'],
        done: (c) => c.cleared,
      },
    ],
  },
  {
    id: 'xor',
    no: 3,
    title: 'XOR',
    goal: '片方だけが 1 のとき 1 を出す',
    help: '1本の直線ではこの4点を分けられません。だから中間の層を2つ挟んであります。h1 に「どちらか1以上（OR）」、h2 に「両方1（AND）」を作り、出力で OR − AND を取ると片方だけが1のときに 1 が出ます。',
    kind: 'logic',
    inputLabels: ['x₁', 'x₂'],
    range: LOGIC_RANGE,
    data: logic([0, 1, 1, 0]),
    dataDefaults: { n: 4, noise: 0, seed: 1 },
    threshold: 0.02,
    judgeLoss: 'mse',
    unlocks: [],
    views: ['network', 'truth', 'fit', 'calc'],
    start: { sizes: [2, 2, 1], acts: ['step', 'step'] },
    tutorial: [
      {
        say: '「層1」の見出しを押すと、その層のつまみが右に出ます',
        targets: ['h:0'],
        done: (c) => c.selected === 0,
      },
      {
        say: 'h1 を「どちらか1以上」、h2 を「両方1」にしてください',
        targets: ['e:0:*', 'n:0:*', 'knob', 'h:0'],
        done: (c) => xorHiddenReady(c.net),
      },
      {
        say: '「出力」の見出しを押し、h1 − h2 になるよう線を組んでください',
        targets: ['e:1:*', 'n:1:*', 'knob', 'h:1'],
        done: (c) => c.cleared,
      },
    ],
  },
  {
    id: 'line',
    no: 4,
    title: '直線',
    goal: '点の並びに直線を当てる',
    help: 'ここからは手で置かずに機械にやらせます。▶ を押すと、外れ具合（損失）が小さくなる向きに重みが少しずつ動きます。下のバーは損失の推移で、左右にドラッグすると途中の状態に戻れます。',
    kind: 'reg1',
    inputLabels: ['x'],
    range: [[-1, 1]],
    data: reg1((x) => 2 * x - 1, -1, 1),
    dataDefaults: { n: 60, noise: 0.1, seed: 12 },
    threshold: 0.014,
    judgeLoss: 'mse',
    unlocks: ['train'],
    views: ['fit', 'network', 'calc'],
    start: { sizes: [1, 1], acts: ['identity'] },
    tutorial: [
      { say: '▶ を押してください', targets: ['play'], done: (c) => c.steps > 0 },
      {
        say: '線がひとりでに点へ寄っていきます。しばらく眺めてください',
        targets: ['play'],
        done: (c) => c.steps >= 120,
      },
      {
        say: '下の損失の曲線を左右にドラッグすると、途中の状態に戻せます',
        targets: ['hist'],
        done: (c) => c.scrubbed,
      },
      { say: '▶ で最後まで学習させてください', targets: ['play', 'hist'], done: (c) => c.cleared },
    ],
  },
  {
    id: 'square',
    no: 5,
    title: '放物線',
    goal: '曲線 y = x² に当てる',
    help: '直線をいくら重ねても直線にしかなりません。曲げるには、活性化関数（tanh など）を挟んだ層が要ります。図の「＋」で層を置き、その層の活性化を tanh にしてから学習させてください。',
    kind: 'reg1',
    inputLabels: ['x'],
    range: [[-1, 1]],
    data: reg1((x) => x * x, -1, 1),
    dataDefaults: { n: 60, noise: 0, seed: 3 },
    threshold: 0.002,
    judgeLoss: 'mse',
    unlocks: ['place', 'nodes'],
    views: ['fit', 'network', 'calc'],
    start: { sizes: [1, 1], acts: ['identity'] },
    tutorial: [
      {
        say: 'まず ▶ で学習させてください。直線にしか当たりません',
        targets: ['play'],
        done: (c) => c.steps >= 200,
      },
      {
        say: '図の「＋」を押して、層をもう1つ置いてください',
        targets: ['plus'],
        done: (c) => c.net.layers.length >= 2,
      },
      {
        say: '置いた層の活性化を tanh にしてください',
        targets: ['act'],
        done: (c) => c.net.layers.some((l) => l.act === 'tanh'),
      },
      { say: 'もう一度 ▶ で学習させてください', targets: ['play', 'hist'], done: (c) => c.cleared },
    ],
  },
  {
    id: 'sin',
    no: 6,
    title: '波',
    goal: '波 y = sin x に当てる（パラメータ 40 個以内）',
    help: '上下する波はノードをそれなりに使います。ただし今回は部品数に上限があるので、層を厚くするより、オプティマイザを Adam にして歩幅を自動調整させるほうが早く届きます。',
    kind: 'reg1',
    inputLabels: ['x'],
    range: [[-Math.PI, Math.PI]],
    data: reg1(Math.sin, -Math.PI, Math.PI),
    dataDefaults: { n: 80, noise: 0, seed: 5 },
    threshold: 0.004,
    judgeLoss: 'mse',
    limits: { maxParams: 40 },
    unlocks: ['optimizer', 'lr'],
    views: ['fit', 'network', 'calc', 'actchart', 'grad'],
    start: { sizes: [1, 4, 1], acts: ['tanh', 'identity'] },
    tutorial: [],
  },
  {
    id: 'abs',
    no: 7,
    title: '折れ線',
    goal: '折れ線 y = |x| に当てる（層は2つまで）',
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
    views: ['fit', 'network', 'calc', 'actchart', 'grad'],
    start: { sizes: [1, 4, 1], acts: ['tanh', 'identity'] },
    tutorial: [],
  },
  {
    id: 'mul',
    no: 8,
    title: 'かけ算',
    goal: 'z = x · y に当てる',
    help: 'かけ算は足し算の重ね合わせでは作れないので、そこそこの大きさの中間層が要ります。データの点数やノイズを変えると、少ない点では表面がでたらめに歪むのが見えます。',
    kind: 'reg2',
    inputLabels: ['x', 'y'],
    range: SQ(1),
    data: reg2((a, b) => a * b, SQ(1)),
    dataDefaults: { n: 120, noise: 0, seed: 21 },
    threshold: 0.001,
    judgeLoss: 'mse',
    unlocks: ['data'],
    views: ['fit', 'network', 'calc', 'actchart', 'grad'],
    start: { sizes: [2, 4, 1], acts: ['tanh', 'identity'] },
    tutorial: [],
  },
  {
    id: 'circle',
    no: 9,
    title: '円',
    goal: '円の内と外を分ける',
    help: '分類では出力を「1 である確率」とみなします。出力層の活性化をシグモイドにして、損失を交差エントロピーにするのが定石です。バッチを小さくすると1歩が軽くなり、歩数を稼げます。',
    kind: 'cls2',
    inputLabels: ['x₁', 'x₂'],
    range: SQ(1.5),
    data: cls2((a, b) => (a * a + b * b < 1 ? 1 : 0), SQ(1.5)),
    dataDefaults: { n: 160, noise: 0.02, seed: 33 },
    threshold: 0.03,
    judgeLoss: 'bce',
    unlocks: ['batch'],
    views: ['fit', 'network', 'calc', 'actchart', 'grad'],
    start: { sizes: [2, 4, 1], acts: ['tanh', 'sigmoid'] },
    tutorial: [],
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
    views: ['fit', 'network', 'calc', 'actchart', 'grad'],
    start: { sizes: [2, 8, 8, 1], acts: ['tanh', 'tanh', 'sigmoid'] },
    tutorial: [],
  },
];

/** ステージ n までで使えるようになっている操作 */
export function opsUpTo(index: number): Set<OpId> {
  const s = new Set<OpId>();
  for (let i = 0; i <= index && i < STAGES.length; i++) STAGES[i].unlocks.forEach((o) => s.add(o));
  return s;
}

export const ALL_OPS: OpId[] = Object.keys(OP_LABEL) as OpId[];

/** targets の書き方（末尾 `*` は前方一致）に当てはまるか */
export function hits(targets: string[] | null, id: string): boolean {
  if (!targets) return true;
  return targets.some((t) => (t.endsWith('*') ? id.startsWith(t.slice(0, -1)) : t === id));
}
