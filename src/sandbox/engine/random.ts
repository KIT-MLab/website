/**
 * 種から決まる乱数（mulberry32）。状態を数値1つで持ち、
 * 「次の値」と「次の状態」を返す純粋関数にしてある。
 * 履歴バーで過去に戻ったとき、同じ乱数列をやり直せるようにするため。
 */
export type RngState = number;

export function nextRandom(state: RngState): [number, RngState] {
  const s = (state + 0x6d2b79f5) | 0;
  let t = s;
  t = Math.imul(t ^ (t >>> 15), t | 1);
  t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
  return [((t ^ (t >>> 14)) >>> 0) / 4294967296, s];
}

/** [lo, hi) の一様乱数 */
export function uniform(state: RngState, lo: number, hi: number): [number, RngState] {
  const [u, s] = nextRandom(state);
  return [lo + (hi - lo) * u, s];
}

/** 平均0・標準偏差1 の正規乱数（Box–Muller） */
export function gaussian(state: RngState): [number, RngState] {
  const [u1, s1] = nextRandom(state);
  const [u2, s2] = nextRandom(s1);
  return [Math.sqrt(-2 * Math.log(Math.max(u1, 1e-12))) * Math.cos(2 * Math.PI * u2), s2];
}

/** 0..n-1 から k 個を重複なく選ぶ（部分 Fisher–Yates） */
export function sampleIndices(state: RngState, n: number, k: number): [number[], RngState] {
  const idx = Array.from({ length: n }, (_, i) => i);
  let s = state;
  for (let i = 0; i < Math.min(k, n); i++) {
    const [u, ns] = nextRandom(s);
    s = ns;
    const j = i + Math.floor(u * (n - i));
    [idx[i], idx[j]] = [idx[j], idx[i]];
  }
  return [idx.slice(0, Math.min(k, n)), s];
}
