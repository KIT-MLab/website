import { zeroShape } from './backward';
import type { Network, OptimizerId, OptimizerState, ParamShape, TrainConfig } from './types';

export type Optimizer = {
  id: OptimizerId;
  label: string;
  note: string;
};

export const OPTIMIZERS: Record<OptimizerId, Optimizer> = {
  sgd: {
    id: 'sgd',
    label: 'SGD',
    note: '傾きの向きに、学習率ぶんだけ進む。いちばん素朴。',
  },
  momentum: {
    id: 'momentum',
    label: 'Momentum',
    note: '前の歩みを速度として持ち越す。谷底で往復する揺れが減り、平らな所でも止まりにくい。',
  },
  adam: {
    id: 'adam',
    label: 'Adam',
    note: 'パラメータごとに歩幅を自動で調整する。大抵の場面で最初に試される定番。',
  },
};

export const OPTIMIZER_ORDER: OptimizerId[] = ['sgd', 'momentum', 'adam'];

const ADAM_EPS = 1e-8;

export function createOptimizerState(net: Network): OptimizerState {
  return { m: zeroShape(net), v: zeroShape(net), t: 0 };
}

/**
 * 勾配を使ってネットを1歩動かす。元のネットは触らず新しいものを返すので、
 * 履歴バーで過去の状態に戻れる。
 */
export function applyStep(
  net: Network,
  grad: ParamShape,
  state: OptimizerState,
  cfg: TrainConfig,
): { net: Network; state: OptimizerState } {
  const t = state.t + 1;
  const m = zeroShape(net);
  const v = zeroShape(net);

  const update = (g: number, li: number, key: 'w' | 'b', o: number, i: number): number => {
    const pm = key === 'w' ? state.m[li].w[o][i] : state.m[li].b[o];
    const pv = key === 'w' ? state.v[li].w[o][i] : state.v[li].b[o];
    let nm = pm;
    let nv = pv;
    let delta: number;

    switch (cfg.optimizer) {
      case 'sgd':
        delta = -cfg.lr * g;
        break;
      case 'momentum':
        nm = cfg.momentum * pm - cfg.lr * g;
        delta = nm;
        break;
      case 'adam': {
        nm = cfg.beta1 * pm + (1 - cfg.beta1) * g;
        nv = cfg.beta2 * pv + (1 - cfg.beta2) * g * g;
        const mh = nm / (1 - cfg.beta1 ** t);
        const vh = nv / (1 - cfg.beta2 ** t);
        delta = (-cfg.lr * mh) / (Math.sqrt(vh) + ADAM_EPS);
        break;
      }
    }

    if (key === 'w') {
      m[li].w[o][i] = nm;
      v[li].w[o][i] = nv;
    } else {
      m[li].b[o] = nm;
      v[li].b[o] = nv;
    }
    return delta;
  };

  const layers = net.layers.map((layer, li) => ({
    acts: [...layer.acts],
    w: layer.w.map((row, o) => row.map((wv, i) => wv + update(grad[li].w[o][i], li, 'w', o, i))),
    b: layer.b.map((bv, o) => bv + update(grad[li].b[o], li, 'b', o, 0)),
  }));

  return { net: { layers }, state: { m, v, t } };
}
