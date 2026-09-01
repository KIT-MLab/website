import type { Network } from './engine/types';

/** ステージごとに出す窓。進むにつれて増えていく */
export type ViewId = 'diagram' | 'inspector' | 'activationChart' | 'truthTable' | 'plane';

export type Stage = {
  id: string;
  title: string;
  /** 何をするステージなのかの説明 */
  lead: string;
  views: ViewId[];
  initial: Network;
  /** free = 入力もつまみで動かす / logic = 入力は0と1の4パターン固定 */
  mode: 'free' | 'logic';
  lockActivation: boolean;
  /** logic モードのときの正解。[00, 01, 10, 11] の順 */
  target?: number[];
  targetName?: string;
  /** 単層では達成できないステージ（XOR） */
  impossible?: boolean;
  /** クリアしたとき、または達成不能を確かめたときに出す文 */
  reward: string;
};

const oneNeuron = (w1: number, w2: number, b: number, act: Network['layers'][0]['act']): Network => ({
  layers: [{ w: [[w1, w2]], b: [b], act }],
});

export const STAGES: Stage[] = [
  {
    id: 'neuron',
    title: 'ニューロンを1個、手で動かす',
    lead:
      'ニューロンがやっているのは、入力ひとつひとつに重みを掛けて、全部足して、最後にバイアスを足すこと。それだけです。つまみを動かして、出てくる数がどう変わるか見てください。',
    views: ['diagram', 'inspector'],
    initial: oneNeuron(0.5, 0.5, 0, 'identity'),
    mode: 'free',
    lockActivation: true,
    reward: '重みは「その入力をどれだけ重視するか」、バイアスは「何もなくても最初からどれだけ傾いているか」を表しています。',
  },
  {
    id: 'activation',
    title: '活性化関数を通す',
    lead:
      '加重和をそのまま出すと、出力はどこまでも大きくなります。そこで最後に関数をひとつ通す。これを活性化関数といいます。切り替えて、出力の形がどう変わるか見てください。',
    views: ['diagram', 'inspector', 'activationChart'],
    initial: oneNeuron(0.5, 0.5, 0, 'step'),
    mode: 'free',
    lockActivation: false,
    reward: 'ステップ関数を選ぶと、ニューロンは0か1かを答えるようになります。次のステージではこれで論理回路を作ります。',
  },
  {
    id: 'and',
    title: 'AND をつくる',
    lead:
      '入力を0か1に限ると、組み合わせは4通りしかありません。両方が1のときだけ1を出すように、重みとバイアスを調整してください。右の平面に出ている線が、いまニューロンが引いている境界です。',
    views: ['diagram', 'truthTable', 'plane'],
    initial: oneNeuron(0.5, 0.5, 0, 'step'),
    mode: 'logic',
    lockActivation: true,
    target: [0, 0, 0, 1],
    targetName: 'AND（両方1のときだけ1）',
    reward:
      'ニューロンがやっていたのは、4つの点を1本の直線で切り分けることでした。重みが線の向きを、バイアスが線の位置を決めています。',
  },
  {
    id: 'or',
    title: 'OR をつくる',
    lead:
      '今度は、どちらか一方でも1なら1を出すようにしてください。AND のときと線がどう違うかに注目してください。',
    views: ['diagram', 'truthTable', 'plane'],
    initial: oneNeuron(0.5, 0.5, -1.2, 'step'),
    mode: 'logic',
    lockActivation: true,
    target: [0, 1, 1, 1],
    targetName: 'OR（どちらかが1なら1）',
    reward: '線の向きは AND とほぼ同じで、位置だけがずれました。つまりバイアスを動かしただけです。',
  },
  {
    id: 'xor',
    title: 'XOR に挑む',
    lead:
      '最後に XOR です。どちらか一方だけが1のときに1、両方0でも両方1でも0。同じ要領でやってみてください。',
    views: ['diagram', 'truthTable', 'plane'],
    initial: oneNeuron(0.5, 0.5, -0.7, 'step'),
    mode: 'logic',
    lockActivation: true,
    target: [0, 1, 1, 0],
    targetName: 'XOR（どちらか一方だけが1のとき1）',
    impossible: true,
    reward: '',
  },
];
