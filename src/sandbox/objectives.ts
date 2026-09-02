import { forward, LOGIC_INPUTS } from './engine/network';
import type { Network } from './engine/types';

/* ------------------------------------------------------------------
 * 解禁できるもの。ステージではなく、目標を達成すると増えていく部品・道具・窓。
 * ------------------------------------------------------------------ */

export type PartId = 'weight' | 'bias' | 'activation' | 'layer2';
export type ToolId = 'inspect' | 'adjust' | 'place';
export type ViewId = 'network' | 'calc' | 'actchart' | 'truth' | 'plane';

export const PARTS: { id: PartId; label: string; help: string }[] = [
  {
    id: 'weight',
    label: '重み',
    help: 'その入力をどれだけ重視するか。掛け算の係数です。図では線の太さが大きさ、色が符号（朱が正、墨が負）。',
  },
  {
    id: 'bias',
    label: 'バイアス',
    help: '入力が何もなくても最初からどれだけ傾いているか。入力平面では境界線を平行移動させます。',
  },
  {
    id: 'activation',
    label: '活性化関数',
    help: '加重和を最後に通す関数。これがないと、何段重ねても結局1本の直線しか作れません。',
  },
  {
    id: 'layer2',
    label: '2層目',
    help: 'ニューロンを層として重ねる。1本の直線では分けられないものが分けられるようになります。',
  },
];

export const TOOLS: { id: ToolId; label: string; help: string }[] = [
  { id: 'inspect', label: '観察', help: 'ノードや線にカーソルを合わせると、その値が下に出ます。' },
  { id: 'adjust', label: '調整', help: '線を上下にドラッグすると重みが、ノードを上下にドラッグするとバイアスが変わります。' },
  { id: 'place', label: '設置', help: '中間層のノードを足したり外したりできます。' },
];

export const VIEWS: { id: ViewId; label: string }[] = [
  { id: 'network', label: 'ネットワーク' },
  { id: 'calc', label: '計算の中身' },
  { id: 'actchart', label: '活性化関数' },
  { id: 'truth', label: '真理値表' },
  { id: 'plane', label: '入力平面' },
];

/* ------------------------------------------------------------------
 * 目標。常に1つだけ提示し、達成すると次へ進んで何かが解禁される。
 * ------------------------------------------------------------------ */

export type Grant = { parts?: PartId[]; tools?: ToolId[]; views?: ViewId[] };

export type Objective = {
  id: string;
  text: string;
  help: string;
  check: (net: Network) => boolean;
  grant: Grant;
  done: string;
  /** 真理値表と入力平面で採点する目標出力。未設定なら採点しない */
  target?: number[];
  /** 単層では達成できない目標。[?] から先へ進める */
  giveUp?: { label: string; grant: Grant; done: string };
};

const outputs = (net: Network) => LOGIC_INPUTS.map((x) => forward(net, x).output[0]);

const matches = (net: Network, target: number[]) =>
  outputs(net).every((a, i) => Math.abs(a - target[i]) < 0.5);

export const INITIAL_NET: Network = {
  layers: [{ w: [[0.2, 0.2]], b: [0], act: 'identity' }],
};

export const OBJECTIVES: Objective[] = [
  {
    id: 'raise',
    text: '入力が (1, 1) のとき、出力を 1.00 以上にする',
    help: '出力は「w₁ × x₁ + w₂ × x₂ + バイアス」です。右のつまみで重みかバイアスを大きくしてください。',
    check: (net) => forward(net, [1, 1]).output[0] >= 1,
    grant: { parts: ['activation'], tools: ['adjust'], views: ['actchart'] },
    done: '活性化関数と、線を直接ドラッグする「調整」が使えるようになりました',
  },
  {
    id: 'step',
    text: '活性化関数をステップに切り替える',
    help: 'ステップ関数は、加重和が0以上なら1、そうでなければ0を出します。出力が0か1だけになります。',
    check: (net) => net.layers[net.layers.length - 1].act === 'step',
    grant: { views: ['truth', 'plane'] },
    done: '真理値表と入力平面が見えるようになりました',
  },
  {
    id: 'and',
    text: '両方が1のときだけ1を出す（AND）',
    help: '入力平面を見てください。4つの点のうち右上の (1,1) だけを線の内側に入れれば達成です。',
    target: [0, 0, 0, 1],
    check: (net) => matches(net, [0, 0, 0, 1]),
    grant: {},
    done: 'ニューロンは4つの点を1本の直線で切り分けていました',
  },
  {
    id: 'or',
    text: 'どちらかが1なら1を出す（OR）',
    help: '今度は左下の (0,0) だけを線の外に出します。線の向きは AND とほぼ同じで、位置だけが違います。',
    target: [0, 1, 1, 1],
    check: (net) => matches(net, [0, 1, 1, 1]),
    grant: {},
    done: '線の向きは重みが、位置はバイアスが決めています',
  },
  {
    id: 'xor',
    text: '一方だけが1のとき1を出す（XOR）',
    help: 'これは、いまのニューロン1個では達成できません。1本の直線で分けられるのは線の片側だけですが、XOR が1を出すべき (0,1) と (1,0) は対角に離れています。解決策はニューロンを層として重ねることです。',
    target: [0, 1, 1, 0],
    check: () => false,
    grant: {},
    done: '',
    giveUp: {
      label: '2層目を解禁する',
      grant: { parts: ['layer2'], tools: ['place'] },
      done: '2層目と「設置」が使えるようになりました',
    },
  },
  {
    id: 'xor2',
    text: '2層目を使って XOR をつくる',
    help: 'さきほど作った AND と OR を組み合わせます。中間ノードの片方を OR に、もう片方を AND にして、出力を「OR であって AND ではない」にすれば XOR です。出力側は OR からの重みを正に、AND からの重みを負にしてください。',
    target: [0, 1, 1, 0],
    check: (net) => net.layers.length > 1 && matches(net, [0, 1, 1, 0]),
    grant: {},
    done: 'ここまでが第1章です。損失と自動学習は準備中',
  },
];
