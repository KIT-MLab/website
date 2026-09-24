/**
 * <Secant>（傾きの図。20-platform.md 第16章）の式の表と尺度。
 *
 * 部品の中（ビルド時に図を組む側）と、ブラウザで h を動かす側の両方がここを読む。
 * 2か所に書き写すと、片方だけ直したときに線と表の値が静かにずれるため。
 *
 * 本文から任意の式は受けない（eval を使わない）。第10章で使う式だけを、
 * 導関数と一緒にここへ並べる。新しい式が要るときは、この表に1行足す。
 */

export interface SecantFn {
  /** 図の中と凡例に出す名前 */
  label: string;
  f: (x: number) => number;
  /** 導関数。接線の傾きに使う */
  df: (x: number) => number;
}

export const SECANT_FNS: Record<string, SecantFn> = {
  'x**2': { label: 'y = x²', f: (x) => x * x, df: (x) => 2 * x },
  'x**3': { label: 'y = x³', f: (x) => x * x * x, df: (x) => 3 * x * x },
  'x**2 - 4*x + 5': { label: 'y = x² − 4x + 5', f: (x) => x * x - 4 * x + 5, df: (x) => 2 * x - 4 },
};

/** 幅 h の動く範囲。2 から 0.01 まで */
export const H_MAX = 2;
export const H_MIN = 0.01;
/** 表に積む h。動いた h がこの値を通ったときに1行ずつ積む（第16.1節） */
export const H_MARKS = [2, 1, 0.5, 0.1, 0.01];

/** 2点（x0 と x0 + h）を結ぶ直線の傾き */
export const slopeOf = (fn: SecantFn, x0: number, h: number) => (fn.f(x0 + h) - fn.f(x0)) / h;

/** 図の大きさ（viewBox の単位）。狭い画面では本文の幅に縮む */
export const W = 560;
export const H = 360;
/** 左と下は目盛りの数字の分。狭い画面では数字を大きくする（lesson.css）ので、その大きさで取る */
export const M = { l: 46, r: 14, t: 12, b: 34 };

export interface Scale {
  sx: (x: number) => number;
  sy: (y: number) => number;
  /** 横の位置（viewBox の単位）から x を戻す */
  xOf: (px: number) => number;
  xmin: number;
  xmax: number;
  ymin: number;
  ymax: number;
}

/** 尺度は1つ。線・目盛り・名前・マウスの位置はすべてこれを通す */
export function makeScale(xmin: number, xmax: number, ymin: number, ymax: number): Scale {
  const pw = W - M.l - M.r;
  const ph = H - M.t - M.b;
  return {
    sx: (x) => M.l + ((x - xmin) / (xmax - xmin)) * pw,
    sy: (y) => H - M.b - ((y - ymin) / (ymax - ymin)) * ph,
    xOf: (px) => xmin + ((px - M.l) / pw) * (xmax - xmin),
    xmin,
    xmax,
    ymin,
    ymax,
  };
}

/** 表と凡例の数の書き方。傾きは小数4桁にそろえる（6.100000000000012 を 6.1000 に） */
export const fmtSlope = (s: number) => s.toFixed(4);
/** 目盛りや x0 のように、余計な0を付けない書き方 */
export const fmtNum = (v: number) => String(Number(v.toFixed(4)));
/** つまみの横に出す h */
export const fmtH = (h: number) => (h >= 0.1 ? h.toFixed(2) : h.toFixed(3));
