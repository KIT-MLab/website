import type { ActivationId } from './types';

export type Activation = {
  id: ActivationId;
  label: string;
  formula: string;
  f: (z: number) => number;
  /** 微分 da/dz。a を渡すのは sigmoid/tanh が a だけで書けるため */
  df: (z: number, a: number) => number;
  /** 出力の表示レンジ。グラフの縦軸に使う */
  range: [number, number];
  /** 縦軸に打つ目盛りの値。正確な数字を出すため、抽象化せず個別に持たせる */
  ticksY: number[];
  note: string;
};

const sigmoid = (z: number) => 1 / (1 + Math.exp(-z));

export const ACTIVATIONS: Record<ActivationId, Activation> = {
  identity: {
    id: 'identity',
    label: 'なし（そのまま）',
    formula: 'a = z',
    f: (z) => z,
    df: () => 1,
    range: [-2, 2],
    ticksY: [-2, -1, 0, 1, 2],
    note: '加重和をそのまま出す。これだけを何段重ねても、結局1本の直線しか作れない。',
  },
  step: {
    id: 'step',
    label: 'ステップ',
    formula: 'z ≥ 0 なら 1、z < 0 なら 0',
    f: (z) => (z >= 0 ? 1 : 0),
    df: () => 0,
    range: [-0.2, 1.2],
    ticksY: [0, 1],
    note: '0か1かをはっきり出す。論理回路を作るならこれ。ただし段差しかない（傾きが常に0）ので、勾配で学習できない。',
  },
  sigmoid: {
    id: 'sigmoid',
    label: 'シグモイド',
    formula: 'a = 1 / (1 + e⁻ᶻ)',
    f: sigmoid,
    df: (_z, a) => a * (1 - a),
    range: [-0.2, 1.2],
    ticksY: [0, 0.5, 1],
    note: 'ステップの角を取って滑らかにしたもの。0〜1に収まり、どこでも傾きがあるので学習できる。',
  },
  tanh: {
    id: 'tanh',
    label: 'tanh',
    formula: 'a = tanh(z)',
    f: Math.tanh,
    df: (_z, a) => 1 - a * a,
    range: [-1.2, 1.2],
    ticksY: [-1, -0.5, 0, 0.5, 1],
    note: 'シグモイドを −1〜1 に広げた形。中心が0なので扱いやすい。',
  },
  relu: {
    id: 'relu',
    label: 'ReLU',
    formula: 'z > 0 なら z、z ≤ 0 なら 0',
    f: (z) => Math.max(0, z),
    df: (z) => (z > 0 ? 1 : 0),
    range: [-0.5, 2],
    ticksY: [0, 1, 2],
    note: '負なら0、正ならそのまま。単純だが深い層でよく効くので、いまの主流。',
  },
};

export const ACTIVATION_ORDER: ActivationId[] = ['identity', 'step', 'sigmoid', 'tanh', 'relu'];
