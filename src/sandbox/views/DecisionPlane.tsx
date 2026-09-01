import type { LogicRow } from './TruthTable';

const LO = -0.45;
const HI = 1.45;
const SIZE = 250;
const PAD = 30;

type Pt = [number, number];

/** w1x₁ + w2x₂ + b ≥ 0 の側を、表示範囲の矩形で切り取った多角形 */
function halfPlane(w1: number, w2: number, b: number): Pt[] {
  const g = (p: Pt) => w1 * p[0] + w2 * p[1] + b;
  const corners: Pt[] = [
    [LO, LO],
    [HI, LO],
    [HI, HI],
    [LO, HI],
  ];
  const out: Pt[] = [];
  for (let i = 0; i < 4; i++) {
    const a = corners[i];
    const c = corners[(i + 1) % 4];
    const ga = g(a);
    const gc = g(c);
    if (ga >= 0) out.push(a);
    if (ga >= 0 !== gc >= 0) {
      const t = ga / (ga - gc);
      out.push([a[0] + (c[0] - a[0]) * t, a[1] + (c[1] - a[1]) * t]);
    }
  }
  return out;
}

/** 境界線と表示範囲の交点2つ。線が範囲外なら null */
function boundary(w1: number, w2: number, b: number): [Pt, Pt] | null {
  const g = (p: Pt) => w1 * p[0] + w2 * p[1] + b;
  const corners: Pt[] = [
    [LO, LO],
    [HI, LO],
    [HI, HI],
    [LO, HI],
  ];
  const hits: Pt[] = [];
  for (let i = 0; i < 4; i++) {
    const a = corners[i];
    const c = corners[(i + 1) % 4];
    const ga = g(a);
    const gc = g(c);
    if (ga >= 0 !== gc >= 0) {
      const t = ga / (ga - gc);
      hits.push([a[0] + (c[0] - a[0]) * t, a[1] + (c[1] - a[1]) * t]);
    }
  }
  return hits.length >= 2 ? [hits[0], hits[1]] : null;
}

const sx = (v: number) => PAD + ((v - LO) / (HI - LO)) * (SIZE - PAD * 2);
const sy = (v: number) => SIZE - PAD - ((v - LO) / (HI - LO)) * (SIZE - PAD * 2);
const path = (pts: Pt[]) => pts.map((p) => `${sx(p[0])},${sy(p[1])}`).join(' ');

type Props = { w1: number; w2: number; b: number; rows: LogicRow[] };

export function DecisionPlane({ w1, w2, b, rows }: Props) {
  const region = halfPlane(w1, w2, b);
  const line = boundary(w1, w2, b);

  return (
    <div className="sb-plane">
      <svg viewBox={`0 0 ${SIZE} ${SIZE}`} role="img" aria-label="入力平面と決定境界">
        <rect x={sx(LO)} y={sy(HI)} width={sx(HI) - sx(LO)} height={sy(LO) - sy(HI)} fill="var(--color-paper)" />
        {region.length > 2 && <polygon points={path(region)} fill="var(--color-accent)" opacity={0.12} />}

        <line x1={sx(LO)} y1={sy(0)} x2={sx(HI)} y2={sy(0)} stroke="var(--color-ink-2)" strokeWidth={1} opacity={0.45} />
        <line x1={sx(0)} y1={sy(LO)} x2={sx(0)} y2={sy(HI)} stroke="var(--color-ink-2)" strokeWidth={1} opacity={0.45} />

        {line && (
          <line
            x1={sx(line[0][0])}
            y1={sy(line[0][1])}
            x2={sx(line[1][0])}
            y2={sy(line[1][1])}
            stroke="var(--color-accent)"
            strokeWidth={2.5}
          />
        )}

        {rows.map((r, i) => (
          <g key={i}>
            <circle
              cx={sx(r.x[0])}
              cy={sy(r.x[1])}
              r={9}
              fill={r.target === 1 ? 'var(--color-ink)' : 'var(--color-card)'}
              stroke="var(--color-ink)"
              strokeWidth={2}
            />
            {!r.ok && (
              <text className="sb-plane__ng" x={sx(r.x[0]) + 13} y={sy(r.x[1]) - 9}>
                ×
              </text>
            )}
            <text className="sb-plane__pt" x={sx(r.x[0])} y={sy(r.x[1]) + 24} textAnchor="middle">
              ({r.x[0]},{r.x[1]})
            </text>
          </g>
        ))}

        <text className="sb-axis" x={sx(HI)} y={sy(0) + 16} textAnchor="end">x₁</text>
        <text className="sb-axis" x={sx(0) - 8} y={sy(HI) + 8} textAnchor="end">x₂</text>
      </svg>
      <p className="sb-plane__legend">
        <span className="sb-plane__key sb-plane__key--on" />正解が1の点　
        <span className="sb-plane__key sb-plane__key--off" />正解が0の点　
        <span className="sb-plane__key sb-plane__key--zone" />ニューロンが1を出す側
      </p>
    </div>
  );
}
