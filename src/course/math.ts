import { backward } from '../sandbox/engine/backward';
import { initNetwork } from '../sandbox/engine/init';
import { forward } from '../sandbox/engine/network';
import { createOptimizerState } from '../sandbox/engine/optimizers';
import { uniform } from '../sandbox/engine/random';
import { DEFAULT_CONFIG, datasetLoss, trainStep } from '../sandbox/engine/trainer';
import type { Dataset, Network, OptimizerState } from '../sandbox/engine/types';

export const fixed = (n: number, digits = 3) => Number.isFinite(n) ? n.toFixed(digits) : '計算範囲外';
export const XOR: Dataset = { x: [[0, 0], [0, 1], [1, 0], [1, 1]], y: [[0], [1], [1], [0]] };
export const LINE: Dataset = { x: [[-1], [1]], y: [[-2], [2]] };
export const scalarNet = (w: number): Network => ({ layers: [{ w: [[w]], b: [0], acts: ['identity'] }] });
export const lineLoss = (w: number) => datasetLoss(scalarNet(w), LINE, 'mse');

export function gradientWalk(w: number, lr: number, count: number): number[] {
  const result: number[] = [];
  for (let i = 0; i < count; i++) {
    const g = 2 * (w - 2);
    const next = w - lr * g;
    if (!Number.isFinite(next) || Math.abs(next) > 30) break;
    w = next;
    result.push(w);
  }
  return result;
}

export function backwardExample(w2 = 0.5) {
  const net: Network = { layers: [{ w: [[0.5]], b: [0], acts: ['relu'] }, { w: [[w2]], b: [0], acts: ['identity'] }] };
  const trace = forward(net, [1]);
  const loss = (trace.output[0] - 1) ** 2;
  const grad = backward(net, trace, [2 * (trace.output[0] - 1)]);
  // この小実験は2本の重みの更新だけを見せる。バイアスは0に固定。
  const updated: Network = { layers: net.layers.map((l, i) => ({ ...l, w: [[l.w[0][0] - 0.1 * grad.layers[i].dw[0][0]]] })) };
  return { net, trace, loss, grad, updated, afterLoss: (forward(updated, [1]).output[0] - 1) ** 2 };
}

/** 同じ点の重複を避け、軸の近くを除いた4象限を均等に用意する。 */
export function quadrantData(n: number, seed: number): Dataset {
  const data: Dataset = { x: [], y: [] };
  let rng = seed;
  for (let i = 0; i < n; i++) {
    let a: number, b: number;
    [a, rng] = uniform(rng, 0.3, 1);
    [b, rng] = uniform(rng, 0.3, 1);
    if (i % 4 < 2) a = -a;
    if (i % 2 === 0) b = -b;
    data.x.push([a, b]);
    data.y.push([a * b < 0 ? 1 : 0]);
  }
  return data;
}
export const SPLITS = { train: quadrantData(48, 103), validation: quadrantData(24, 911), test: quadrantData(24, 2026) };
export const accuracy = (net: Network, data: Dataset) => data.x.filter((x, i) => (forward(net, x).output[0] >= 0.5 ? 1 : 0) === data.y[i][0]).length / data.x.length;
export type TrainingRun = { net: Network; opt: OptimizerState; rng: number; steps: number; losses: number[]; validationLosses: number[]; error: boolean };
export function newRun(hidden: number, data: Dataset, validation?: Dataset): TrainingRun {
  const { net, rng } = initNetwork(hidden ? { sizes: [2, hidden, 1], acts: ['tanh', 'sigmoid'] } : { sizes: [2, 1], acts: ['sigmoid'] }, 'xavier', 77);
  return { net, rng, opt: createOptimizerState(net), steps: 0, losses: [datasetLoss(net, data, 'bce')], validationLosses: validation ? [datasetLoss(net, validation, 'bce')] : [], error: false };
}
export function advanceRun(run: TrainingRun, data: Dataset, lr: number, count: number, validation?: Dataset): TrainingRun {
  let { net, opt, rng, steps } = run;
  const losses = [...run.losses], validationLosses = [...run.validationLosses];
  for (let i = 0; i < count && steps < 3000; i++) {
    const next = trainStep(net, data, { ...DEFAULT_CONFIG, optimizer: 'adam', lr, loss: 'bce' }, opt, rng);
    const loss = datasetLoss(next.net, data, 'bce');
    if (!Number.isFinite(loss)) return { ...run, error: true };
    net = next.net; opt = next.opt; rng = next.rng; steps++;
    if (steps % 10 === 0) {
      losses.push(loss);
      if (validation) validationLosses.push(datasetLoss(net, validation, 'bce'));
    }
  }
  return { net, opt, rng, steps, losses, validationLosses, error: false };
}

const trainX = [-1, -.86, -.71, -.57, -.43, -.29, -.14, 0, .14, .29, .43, .57, .71, .86, 1];
const offsets = [.12, -.12, .15, -.1, .1, -.18, .13, -.12, .17, -.1, .11, -.18, .12, -.08, .1];
export const curveTrain = trainX.map((x, i) => [x, x * x + offsets[i]] as [number, number]);
export const curveValidation = Array.from({ length: 40 }, (_, i) => { const x = -.975 + i * 1.95 / 39; return [x, x * x + .015 * Math.sin(i * 11)] as [number, number]; });
const mse = (pairs: [number, number][], predict: (x: number) => number) => pairs.reduce((sum, [x, y]) => sum + (predict(x) - y) ** 2, 0) / pairs.length;

/** ReLUの折れ目を固定し、出力重みをリッジ回帰で求める小実験。 */
export function fitCurve(knots: number, lambda: number) {
  const features = (x: number) => [1, x, ...Array.from({ length: knots }, (_, i) => Math.max(0, x - (-.95 + 1.9 * i / Math.max(1, knots - 1))))];
  const rows = curveTrain.map(([x]) => features(x));
  const p = rows[0].length;
  const matrix = Array.from({ length: p }, (_, j) => Array.from({ length: p + 1 }, (_, k) => k === p
    ? rows.reduce((s, r, i) => s + r[j] * curveTrain[i][1], 0) / rows.length
    : rows.reduce((s, r) => s + r[j] * r[k], 0) / rows.length + (j === k ? (j === 0 ? 1e-9 : lambda + 1e-9) : 0)));
  for (let col = 0; col < p; col++) {
    let pivot = col;
    for (let row = col + 1; row < p; row++) if (Math.abs(matrix[row][col]) > Math.abs(matrix[pivot][col])) pivot = row;
    [matrix[col], matrix[pivot]] = [matrix[pivot], matrix[col]];
    const div = matrix[col][col];
    for (let k = col; k <= p; k++) matrix[col][k] /= div;
    for (let row = 0; row < p; row++) if (row !== col) {
      const f = matrix[row][col];
      for (let k = col; k <= p; k++) matrix[row][k] -= f * matrix[col][k];
    }
  }
  const weights = matrix.map((row) => row[p]);
  const predict = (x: number) => features(x).reduce((s, v, i) => s + v * weights[i], 0);
  return { weights, predict, trainLoss: mse(curveTrain, predict), validationLoss: mse(curveValidation, predict) };
}

export const BATCH_DATA = { x: [-1, -.75, -.5, -.25, .25, .5, .75, 1], y: [-1.6, -1.8, -.6, -.8, .8, .6, 1.8, 1.6] };
export function batchEpoch(start: number, size: number) {
  let w = start;
  const history: { w: number; indices: number[]; gradient: number }[] = [];
  // 固定の混ぜた順序。比較ではバッチサイズだけを変える。
  const order = [0, 7, 2, 5, 1, 6, 3, 4];
  for (let i = 0; i < order.length; i += size) {
    const indices = order.slice(i, i + size);
    const gradient = indices.reduce((sum, j) => sum + 2 * (w * BATCH_DATA.x[j] - BATCH_DATA.y[j]) * BATCH_DATA.x[j], 0) / indices.length;
    w -= .1 * gradient;
    history.push({ w, indices, gradient });
  }
  return history;
}

export const FILTERS = { vertical: [[-1, 0, 1], [-1, 0, 1], [-1, 0, 1]], horizontal: [[-1, -1, -1], [0, 0, 0], [1, 1, 1]] };
export const pixelPattern = (axis: 'vertical' | 'horizontal') => Array.from({ length: 25 }, (_, i) => axis === 'vertical' ? (i % 5 >= 2 ? 1 : 0) : (i >= 10 ? 1 : 0));
export function convolve(pixels: number[], filter: number[][]) {
  return Array.from({ length: 9 }, (_, i) => {
    const row = Math.floor(i / 3), col = i % 3;
    return filter.reduce((sum, line, y) => sum + line.reduce((s, w, x) => s + w * pixels[(row + y) * 5 + col + x], 0), 0);
  });
}
export function attention(query: number[]) {
  const keys = [[1, 0], [0, 1], [.5, .5]];
  const values = [[1, 0], [0, 1], [.5, .5]];
  const scores = keys.map((k) => (query[0] * k[0] + query[1] * k[1]) / Math.sqrt(2));
  const exp = scores.map((s) => Math.exp(s - Math.max(...scores)));
  const sum = exp.reduce((s, v) => s + v, 0);
  const weights = exp.map((v) => v / sum);
  const output = [0, 1].map((j) => values.reduce((s, v, i) => s + weights[i] * v[j], 0));
  return { keys, values, scores, weights, output };
}
