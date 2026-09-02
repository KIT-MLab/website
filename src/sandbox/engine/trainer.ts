import { accumulate, backward, zeroShape } from './backward';
import { LOSSES } from './losses';
import { forward } from './network';
import { applyStep } from './optimizers';
import { sampleIndices, type RngState } from './random';
import type { Dataset, Gradients, LossId, Network, OptimizerState, ParamShape, TrainConfig } from './types';

/** データ全体に対する損失の平均 */
export function datasetLoss(net: Network, data: Dataset, loss: LossId): number {
  const L = LOSSES[loss];
  let s = 0;
  for (let i = 0; i < data.x.length; i++) s += L.f(forward(net, data.x[i]).output, data.y[i]);
  return s / data.x.length;
}

/**
 * 指定した点についての勾配を平均する。
 * 点ごとの逆伝播の記録も返すので、「この1点の勾配が層をどう遡るか」を描ける。
 */
export function batchGradient(
  net: Network,
  data: Dataset,
  loss: LossId,
  indices: number[],
): { loss: number; grad: ParamShape; perSample: Gradients[] } {
  const L = LOSSES[loss];
  const grad = zeroShape(net);
  const perSample: Gradients[] = [];
  let total = 0;

  for (const i of indices) {
    const trace = forward(net, data.x[i]);
    total += L.f(trace.output, data.y[i]);
    const g = backward(net, trace, L.df(trace.output, data.y[i]));
    perSample.push(g);
    accumulate(grad, g, 1 / indices.length);
  }

  return { loss: total / indices.length, grad, perSample };
}

export type StepResult = {
  net: Network;
  opt: OptimizerState;
  rng: RngState;
  /** このステップで使った点の番号 */
  indices: number[];
  /** 更新前のネットでの、使った点の損失 */
  loss: number;
  /** 使った点で平均した勾配（更新に使ったもの） */
  grad: ParamShape;
};

/** 学習を1歩進める。入力はすべてそのまま、結果は新しいオブジェクトで返す */
export function trainStep(
  net: Network,
  data: Dataset,
  cfg: TrainConfig,
  opt: OptimizerState,
  rng: RngState,
): StepResult {
  let indices: number[];
  let nextRng = rng;
  if (cfg.batch === null || cfg.batch >= data.x.length) {
    indices = data.x.map((_, i) => i);
  } else {
    [indices, nextRng] = sampleIndices(rng, data.x.length, cfg.batch);
  }

  const { loss, grad } = batchGradient(net, data, cfg.loss, indices);
  const stepped = applyStep(net, grad, opt, cfg);
  return { net: stepped.net, opt: stepped.state, rng: nextRng, indices, loss, grad };
}

export const DEFAULT_CONFIG: TrainConfig = {
  loss: 'mse',
  optimizer: 'sgd',
  lr: 0.05,
  batch: null,
  momentum: 0.9,
  beta1: 0.9,
  beta2: 0.999,
};
