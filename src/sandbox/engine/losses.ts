import type { LossId } from './types';

export type Loss = {
  id: LossId;
  label: string;
  formula: string;
  /** 1つの点についての損失。出力が複数あれば平均 */
  f: (pred: number[], target: number[]) => number;
  /** 損失を出力で微分したもの。逆伝播の出発点になる */
  df: (pred: number[], target: number[]) => number[];
  note: string;
};

/* 交差エントロピーで log(0) にならないよう出力を挟む */
const EPS = 1e-7;
const clip = (p: number) => Math.min(Math.max(p, EPS), 1 - EPS);

export const LOSSES: Record<LossId, Loss> = {
  mse: {
    id: 'mse',
    label: '二乗誤差',
    formula: 'L = (a − y)²',
    f: (p, t) => p.reduce((s, v, i) => s + (v - t[i]) ** 2, 0) / p.length,
    df: (p, t) => p.map((v, i) => (2 * (v - t[i])) / p.length),
    note: 'ずれを二乗する。大きく外した点ほど強く効く。回帰の基本。',
  },
  mae: {
    id: 'mae',
    label: '絶対誤差',
    formula: 'L = |a − y|',
    f: (p, t) => p.reduce((s, v, i) => s + Math.abs(v - t[i]), 0) / p.length,
    df: (p, t) => p.map((v, i) => Math.sign(v - t[i]) / p.length),
    note: 'ずれの絶対値。外れ値に引きずられにくいが、傾きが一定なので終盤で細かく寄せにくい。',
  },
  bce: {
    id: 'bce',
    label: '交差エントロピー',
    formula: 'L = −[y log a + (1−y) log(1−a)]',
    f: (p, t) =>
      p.reduce((s, v, i) => {
        const q = clip(v);
        return s - (t[i] * Math.log(q) + (1 - t[i]) * Math.log(1 - q));
      }, 0) / p.length,
    df: (p, t) =>
      p.map((v, i) => {
        const q = clip(v);
        return (q - t[i]) / (q * (1 - q)) / p.length;
      }),
    note: '出力を「1である確率」とみなして採点する。分類でシグモイド出力と組み合わせる。',
  },
};

export const LOSS_ORDER: LossId[] = ['mse', 'mae', 'bce'];
