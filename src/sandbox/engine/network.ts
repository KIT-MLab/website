import { ACTIVATIONS } from './activations';
import type { ForwardTrace, LayerTrace, Network } from './types';

/**
 * 順伝播。各層の z と a をすべて記録して返す。
 * 表示側が内部を覗けるように、途中経過を捨てないのがこの関数の役目。
 */
export function forward(net: Network, input: number[]): ForwardTrace {
  const layers: LayerTrace[] = [];
  let a = input;

  for (const layer of net.layers) {
    const f = ACTIVATIONS[layer.act].f;
    const z = layer.b.map((bias, o) =>
      layer.w[o].reduce((sum, weight, i) => sum + weight * a[i], bias),
    );
    const next = z.map(f);
    layers.push({ z, a: next });
    a = next;
  }

  return { input, layers, output: a };
}

/** 論理回路ステージで使う入力の4パターン */
export const LOGIC_INPUTS: [number, number][] = [
  [0, 0],
  [0, 1],
  [1, 0],
  [1, 1],
];

export function cloneNetwork(net: Network): Network {
  return { layers: net.layers.map((l) => ({ w: l.w.map((row) => [...row]), b: [...l.b], act: l.act })) };
}
