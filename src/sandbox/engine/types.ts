/** 活性化関数の識別子 */
export type ActivationId = 'identity' | 'step' | 'sigmoid' | 'tanh' | 'relu';

/** 全結合層。w[出力番号][入力番号] */
export type Layer = {
  w: number[][];
  b: number[];
  act: ActivationId;
};

export type Network = { layers: Layer[] };

/** 1層分の途中経過。z = 加重和（活性化前）、a = 活性化後 */
export type LayerTrace = { z: number[]; a: number[] };

/**
 * 順伝播の記録。中身を見せるのがサンドボックスの目的なので、
 * 出力だけでなく各層の途中の値をすべて残す。
 * 表示側はこの記録を描くだけで、計算をやり直さない。
 */
export type ForwardTrace = {
  input: number[];
  layers: LayerTrace[];
  output: number[];
};
