import { gaussian, uniform, type RngState } from './random';
import type { ActivationId, Network } from './types';

export type InitId = 'zero' | 'small' | 'xavier' | 'he' | 'large';

export type Init = { id: InitId; label: string; note: string };

export const INITS: Record<InitId, Init> = {
  zero: {
    id: 'zero',
    label: 'すべて0',
    note: '全部0から始める。同じ層のノードが全員同じ動きをするので、いくつ並べても1つぶんの働きしかしない。',
  },
  small: {
    id: 'small',
    label: '小さくばらつかせる',
    note: '−0.5〜0.5 の一様乱数。手で置くのに近い、素朴な初期値。',
  },
  xavier: {
    id: 'xavier',
    label: 'Xavier',
    note: '入出力の数に合わせて幅を決める。シグモイドや tanh 向け。',
  },
  he: {
    id: 'he',
    label: 'He',
    note: 'Xavier の ReLU 向け版。ReLU が半分を捨てるぶん、少し大きめに振る。',
  },
  large: {
    id: 'large',
    label: '大きくばらつかせる',
    note: '標準偏差 3 の正規乱数。わざと大きくして、勾配が膨れ上がる様子を見るためのもの。',
  },
};

export const INIT_ORDER: InitId[] = ['zero', 'small', 'xavier', 'he', 'large'];

/** 層の並びの指定。sizes[0] が入力数、以降が各層のノード数。
    acts は層ごとに1つ（新しく作る層のノードは全部これで揃える）。
    ノードごとに変えるのは作った後、Layer.acts を個別に書き換える */
export type Shape = { sizes: number[]; acts: ActivationId[] };

/** 指定の形と初期化でネットを作る。種が同じなら同じネットになる */
export function initNetwork(shape: Shape, init: InitId, seed: RngState): { net: Network; rng: RngState } {
  let rng = seed;
  const draw = (fanIn: number, fanOut: number): number => {
    let v: number;
    switch (init) {
      case 'zero':
        return 0;
      case 'small':
        [v, rng] = uniform(rng, -0.5, 0.5);
        return v;
      case 'xavier': {
        const lim = Math.sqrt(6 / (fanIn + fanOut));
        [v, rng] = uniform(rng, -lim, lim);
        return v;
      }
      case 'he':
        [v, rng] = gaussian(rng);
        return v * Math.sqrt(2 / fanIn);
      case 'large':
        [v, rng] = gaussian(rng);
        return v * 3;
    }
  };

  const layers = shape.acts.map((act, li) => {
    const fanIn = shape.sizes[li];
    const fanOut = shape.sizes[li + 1];
    return {
      acts: Array.from({ length: fanOut }, () => act),
      w: Array.from({ length: fanOut }, () => Array.from({ length: fanIn }, () => draw(fanIn, fanOut))),
      b: Array.from({ length: fanOut }, () => 0),
    };
  });

  return { net: { layers }, rng };
}

export function paramCount(net: Network): number {
  return net.layers.reduce((s, l) => s + l.w.length * l.w[0].length + l.b.length, 0);
}
