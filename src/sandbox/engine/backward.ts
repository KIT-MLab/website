import { ACTIVATIONS } from './activations';
import type { ForwardTrace, Gradients, LayerGrad, Network, ParamShape } from './types';

/**
 * 逆伝播。順伝播の記録と「損失を出力で微分したもの」から、
 * 出力側の層から順に勾配を求める。
 * 各層に届いた da、活性化を逆に通した dz、重みの勾配 dw/db を
 * すべて残すので、表示側は層ごとに1ステップずつ描ける。
 */
export function backward(net: Network, trace: ForwardTrace, dOutput: number[]): Gradients {
  const layers: LayerGrad[] = new Array(net.layers.length);
  let da = dOutput;

  for (let li = net.layers.length - 1; li >= 0; li--) {
    const layer = net.layers[li];
    const { z, a } = trace.layers[li];
    const prev = li === 0 ? trace.input : trace.layers[li - 1].a;

    const dz = z.map((zv, o) => da[o] * ACTIVATIONS[layer.acts[o]].df(zv, a[o]));
    const dw = dz.map((d) => prev.map((p) => d * p));
    const db = dz;
    layers[li] = { da, dz, dw, db };

    /* 1つ手前の層へ渡す勾配。線の重みで配り直して足し合わせる */
    da = prev.map((_, i) => dz.reduce((s, d, o) => s + d * layer.w[o][i], 0));
  }

  return { dOutput, layers };
}

/** ネットと同じ形の 0 配列 */
export function zeroShape(net: Network): ParamShape {
  return net.layers.map((l) => ({ w: l.w.map((row) => row.map(() => 0)), b: l.b.map(() => 0) }));
}

/** acc += g * scale。バッチ内の勾配を平均するために使う */
export function accumulate(acc: ParamShape, g: Gradients, scale: number) {
  g.layers.forEach((lg, li) => {
    lg.dw.forEach((row, o) => row.forEach((v, i) => (acc[li].w[o][i] += v * scale)));
    lg.db.forEach((v, o) => (acc[li].b[o] += v * scale));
  });
}

/** 勾配全体の大きさ（L2 ノルム）。勾配爆発・消失の指標 */
export function gradNorm(shape: ParamShape): number {
  let s = 0;
  for (const l of shape) {
    for (const row of l.w) for (const v of row) s += v * v;
    for (const v of l.b) s += v * v;
  }
  return Math.sqrt(s);
}

/** 層ごとの勾配の大きさ。深い層で消える／膨らむのを見せる */
export function layerGradNorms(shape: ParamShape): number[] {
  return shape.map((l) => gradNorm([l]));
}
