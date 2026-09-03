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
 * 手で確率的勾配降下をやることになるので、あとの「▶ を押す」の伏線になる。
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
  {
    id: 'xor',
    no: 4,
    title: 'XOR',
    goal: '片方だけが 1 のとき 1 を出す',
    help: '1本の直線ではこの4点を分けられません。だから中間層に2つのノードを置いてあります。h1 に「どちらか1以上（OR）」、h2 に「両方1（AND）」を作り、出力で OR − AND を取ると片方だけが1のときに 1 が出ます。',
    kind: 'logic',
    inputLabels: ['x₁', 'x₂'],
    range: LOGIC_RANGE,
    data: logic([0, 1, 1, 0]),
    dataDefaults: { n: 4, noise: 0, seed: 1 },
    threshold: 0.02,
    judgeLoss: 'mse',
    unlocks: [],
    views: ['network', 'truth', 'fit'],
    start: { sizes: [2, 2, 1], acts: ['step', 'step'] },
    activationChoices: ['identity', 'step'],
    tutorial: [
      {
        say: '「中間層」の見出しを押すと、その層が選ばれます',
        targets: ['h:0'],
        done: (c) => c.selected === 0,
      },
      {
        say: 'h1 を「どちらか1以上」、h2 を「両方1」にしてください',
        targets: ['e:0:*', 'n:0:*', 'knob', 'h:0'],
        done: (c) => xorHiddenReady(c.net),
      },
      {
        say: '「出力層」の見出しを押し、h1 − h2 になるよう線を組んでください',
        targets: ['e:1:*', 'n:1:*', 'knob', 'h:1'],
        done: (c) => c.cleared,
      },
    ],
  },
  {
    id: 'line',
    no: 5,
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
    views: ['fit', 'network'],
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
    no: 6,
    title: '放物線',
    goal: '曲線 y = x² に当てる',
    help: '直線をいくら重ねても直線にしかなりません。曲げるには、活性化関数を挟んだ層が要ります。図の「＋」で層を置けます。',
    kind: 'reg1',
    inputLabels: ['x'],
    range: [[-1, 1]],
    data: reg1((x) => x * x, -1, 1),
    dataDefaults: { n: 60, noise: 0, seed: 3 },
    threshold: 0.002,
    judgeLoss: 'mse',
    unlocks: ['place', 'nodes'],
    views: ['fit', 'network'],
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
        say: '左のツールバーの「活性化関数」から選び、置いた層のノードに塗ってください（「活性化なし」のままだと直線のままです）',
        targets: ['tool:act', 'n:*'],
        done: (c) => c.net.layers.some((l) => l.acts.some((a) => a !== 'identity')),
      },
      { say: 'もう一度 ▶ で学習させてください', targets: ['play', 'hist'], done: (c) => c.cleared },
    ],
  },
  {
    id: 'sin',
    no: 7,
    title: '波',
    goal: '波 y = sin x に当てる（パラメータ 40 個以内）',
    help: '上下する波はノードをそれなりに使います。ただし今回は部品数に上限があるので、層を厚くする以外の手も探してみてください。歩幅（学習率）やオプティマイザを変えると、進み方が変わります。',
    kind: 'reg1',
    inputLabels: ['x'],
    range: [[-Math.PI, Math.PI]],
    data: reg1(Math.sin, -Math.PI, Math.PI),
    dataDefaults: { n: 80, noise: 0, seed: 5 },
    threshold: 0.004,
    judgeLoss: 'mse',
    limits: { maxParams: 40 },
    unlocks: ['optimizer', 'lr', 'knob'],
    views: ['fit', 'network', 'actchart', 'grad'],
    start: { sizes: [1, 4, 1], acts: ['tanh', 'identity'] },
    tutorial: [],
  },
  {
    id: 'abs',
    no: 8,
    title: '折れ線',
    goal: '折れ線 y = |x| に当てる（層は2つまで）',
    help: '角のある形は tanh のような滑らかな関数だと苦手です。ReLU は負を 0 にするだけの折れ線です。初期化のしかたでも収束の速さが変わります。',
    kind: 'reg1',
    inputLabels: ['x'],
    range: [[-1, 1]],
    data: reg1(Math.abs, -1, 1),
    dataDefaults: { n: 60, noise: 0, seed: 9 },
    threshold: 0.00002,
    judgeLoss: 'mse',
    limits: { maxLayers: 2 },
    unlocks: ['loss', 'init'],
    views: ['fit', 'network', 'actchart', 'grad'],
    start: { sizes: [1, 4, 1], acts: ['tanh', 'identity'] },
    tutorial: [],
  },
  {
    id: 'mul',
    no: 9,
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
    views: ['fit', 'network', 'actchart', 'grad'],
    start: { sizes: [2, 4, 1], acts: ['tanh', 'identity'] },
    tutorial: [],
  },
  {
    id: 'circle',
    no: 10,
    title: '円',
    goal: '円の内と外を分ける',
    help: '分類では出力を「1 である確率」とみなします。バッチを小さくすると1歩が軽くなり、歩数を稼げます。',
    kind: 'cls2',
    inputLabels: ['x₁', 'x₂'],
    range: SQ(1.5),
    data: cls2((a, b) => (a * a + b * b < 1 ? 1 : 0), SQ(1.5)),
    dataDefaults: { n: 160, noise: 0.02, seed: 33 },
    threshold: 0.03,
    judgeLoss: 'bce',
    unlocks: ['batch'],
    views: ['fit', 'network', 'actchart', 'grad'],
    start: { sizes: [2, 4, 1], acts: ['tanh', 'sigmoid'] },
    tutorial: [],
  },
  {
    id: 'spiral',
    no: 11,
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
    views: ['fit', 'network', 'actchart', 'grad'],
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

/** 活性化の選択画面に出す選択肢。ステージが絞っていなければ全部 */
export const activationChoicesFor = (s: Stage): ActivationId[] => s.activationChoices ?? ACTIVATION_ORDER;

/** targets の書き方（末尾 `*` は前方一致）に当てはまるか */
export function hits(targets: string[] | null, id: string): boolean {
  if (!targets) return true;
  return targets.some((t) => (t.endsWith('*') ? id.startsWith(t.slice(0, -1)) : t === id));
}
