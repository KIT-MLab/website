/**
 * サンドボックス専用の色。canvas は CSS 変数を読めないので、
 * 数値としてここに一本化し、sandbox.css の変数と同じ値を持たせている。
 */
export const RGB = {
  /** 正の重み・クラス1・高い値 */
  pos: [224, 138, 60] as const,
  /** 負の重み・クラス0・低い値 */
  neg: [74, 163, 154] as const,
  /** 図の下地 */
  ground: [32, 31, 29] as const,
  paper: [232, 228, 220] as const,
};

export const CSS = {
  pos: 'rgb(224,138,60)',
  neg: 'rgb(74,163,154)',
  model: '#f0c14b',
  text: '#e8e4dc',
  dim: '#9c968b',
  line: '#403d38',
};

const mix = (a: readonly number[], b: readonly number[], t: number) =>
  a.map((v, i) => Math.round(v + (b[i] - v) * t));

/** −1〜1 を 青緑↔地色↔橙 に写す。回帰の面と分類の領域で共通 */
export function diverge(t: number): number[] {
  const u = Math.min(Math.max(t, -1), 1);
  return u >= 0 ? mix(RGB.ground, RGB.pos, u) : mix(RGB.ground, RGB.neg, -u);
}

export const rgbStr = (c: number[]) => `rgb(${c[0]},${c[1]},${c[2]})`;
