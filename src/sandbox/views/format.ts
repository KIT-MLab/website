/** 表示用の数値整形。桁が揺れて見えないよう固定小数にする */
export const fmt = (n: number, digits = 2) => {
  const s = n.toFixed(digits);
  return s === (-0).toFixed(digits) ? (0).toFixed(digits) : s;
};

/** 符号付きで表示（式の展開に使う） */
export const signed = (n: number, digits = 2) => (n < 0 ? `− ${fmt(-n, digits)}` : `+ ${fmt(n, digits)}`);
