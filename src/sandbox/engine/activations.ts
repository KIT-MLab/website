import type { ActivationId } from './types';

export type Activation = {
  id: ActivationId;
  label: string;
  formula: string;
  f: (z: number) => number;
  /** 出力の表示レンジ。グラフの縦軸に使う */
  range: [number, number];
  note: string;
};

const sigmoid = (z: number) => 1 / (1 + Math.exp(-z));

export const ACTIVATIONS: Record<ActivationId, Activation> = {
  identity: {
    id: 'identity',
    label: 'なし（そのまま）',
    formula: 'a = z',
    f: (z) => z,
    range: [-2, 2],
    note: '加重和をそのまま出す。これだけを何段重ねても、結局1本の直線しか作れない。',
  },
  step: {
    id: 'step',
    label: 'ステップ',
    formula: 'a = (z ≥ 0) ? 1 : 0',
    f: (z) => (z >= 0 ? 1 : 0),
    range: [-0.2, 1.2],
    note: '0か1かをはっきり出す。論理回路を作るならこれ。ただし段差しかないので、後で出てくる「傾きを見て学習する」ができない。',
  },
  sigmoid: {
    id: 'sigmoid',
    label: 'シグモイド',
    formula: 'a = 1 / (1 + e⁻ᶻ)',
    f: sigmoid,
    range: [-0.2, 1.2],
    note: 'ステップの角を取って滑らかにしたもの。0〜1に収まり、どこでも傾きがあるので学習できる。',
  },
  tanh: {
    id: 'tanh',
    label: 'tanh',
    formula: 'a = tanh(z)',
    f: Math.tanh,
    range: [-1.2, 1.2],
    note: 'シグモイドを −1〜1 に広げた形。中心が0なので扱いやすい。',
  },
  relu: {
    id: 'relu',
    label: 'ReLU',
    formula: 'a = max(0, z)',
    f: (z) => Math.max(0, z),
    range: [-0.5, 2],
    note: '負なら0、正ならそのまま。単純だが深い層でよく効くので、いまの主流。',
  },
};

export const ACTIVATION_ORDER: ActivationId[] = ['identity', 'step', 'sigmoid', 'tanh', 'relu'];
