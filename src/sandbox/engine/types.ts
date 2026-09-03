/** 活性化関数の識別子 */
export type ActivationId = 'identity' | 'step' | 'sigmoid' | 'tanh' | 'relu';

/** 全結合層。w[出力番号][入力番号]。acts はノードごとの活性化で、b と同じ長さ */
export type Layer = {
  w: number[][];
  b: number[];
  acts: ActivationId[];
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

/** 損失関数の識別子 */
export type LossId = 'mse' | 'mae' | 'bce';

/** オプティマイザの識別子 */
export type OptimizerId = 'sgd' | 'momentum' | 'adam';

/**
 * 1層分の勾配。逆伝播を層ごとに1ステップずつ見せるため、
 * 重みの勾配 dw/db だけでなく、その層に「届いた」勾配 da と
 * 活性化を逆に通した後の dz も残す。
 */
export type LayerGrad = {
  da: number[];
  dz: number[];
  dw: number[][];
  db: number[];
};

/** 逆伝播の記録。layers は順伝播と同じ順（入力側が 0） */
export type Gradients = {
  /** 損失を出力で微分したもの。逆伝播の出発点 */
  dOutput: number[];
  layers: LayerGrad[];
};

/** 学習データ。x[i], y[i] が i 番目の点 */
export type Dataset = { x: number[][]; y: number[][] };

/** 学習の設定。UI の「つまみ」がそのまま対応する */
export type TrainConfig = {
  loss: LossId;
  optimizer: OptimizerId;
  lr: number;
  /** null なら全データを毎回使う（バッチ学習） */
  batch: number | null;
  momentum: number;
  beta1: number;
  beta2: number;
};

/** オプティマイザが持ち越す量。ネットと同じ形の配列 */
export type ParamShape = { w: number[][]; b: number[] }[];

export type OptimizerState = {
  /** 速度（Momentum）または1次モーメント（Adam） */
  m: ParamShape;
  /** 2次モーメント（Adam のみ使う） */
  v: ParamShape;
  /** これまでに踏んだステップ数（Adam のバイアス補正用） */
  t: number;
};
