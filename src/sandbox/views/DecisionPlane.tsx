import { useEffect, useRef } from 'react';
import { forward } from '../engine/network';
import type { Network } from '../engine/types';
import type { LogicRow } from './TruthTable';

const LO = -0.6;
const HI = 1.6;
const SIZE = 280;

type Pt = [number, number];

const sx = (v: number) => ((v - LO) / (HI - LO)) * SIZE;
const sy = (v: number) => ((HI - v) / (HI - LO)) * SIZE;

/** 単層のときだけ引ける、w1x₁ + w2x₂ + b = 0 の直線 */
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

type Props = { net: Network; rows: LogicRow[]; small?: boolean };

export function DecisionPlane({ net, rows, small }: Props) {
  const ref = useRef<HTMLCanvasElement>(null);
  const n = small ? 64 : 168;

  /* 出力が1になる領域を総当たりで塗る。層が増えて境界が曲がっても同じ描き方で済む */
  useEffect(() => {
    const canvas = ref.current;
    const ctx = canvas?.getContext('2d');
    if (!canvas || !ctx) return;
    const img = ctx.createImageData(n, n);
    for (let j = 0; j < n; j++) {
      for (let i = 0; i < n; i++) {
        const x1 = LO + ((HI - LO) * (i + 0.5)) / n;
        const x2 = HI - ((HI - LO) * (j + 0.5)) / n;
        const a = Math.min(Math.max(forward(net, [x1, x2]).output[0], 0), 1);
        const p = (j * n + i) * 4;
        img.data[p] = 179;
        img.data[p + 1] = 64;
        img.data[p + 2] = 42;
        img.data[p + 3] = Math.round(a * 48);
      }
    }
    ctx.putImageData(img, 0, 0);
  }, [net, n]);

  const single = net.layers.length === 1;
  const line = single ? boundary(net.layers[0].w[0][0], net.layers[0].w[0][1], net.layers[0].b[0]) : null;

  return (
    <div className="sb-plane">
      <canvas ref={ref} width={n} height={n} aria-hidden="true" />
      <svg viewBox={`0 0 ${SIZE} ${SIZE}`} role="img" aria-label="入力平面と決定境界">
        <line x1={0} y1={sy(0)} x2={SIZE} y2={sy(0)} stroke="var(--color-ink-2)" strokeWidth={1} opacity={0.4} />
        <line x1={sx(0)} y1={0} x2={sx(0)} y2={SIZE} stroke="var(--color-ink-2)" strokeWidth={1} opacity={0.4} />

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
              r={small ? 7 : 10}
              fill={r.target === 1 ? 'var(--color-ink)' : 'var(--color-card)'}
              stroke="var(--color-ink)"
              strokeWidth={2}
            />
            {!r.ok && !small && (
              <text className="sb-plane__ng" x={sx(r.x[0]) + 14} y={sy(r.x[1]) - 8}>
                ×
              </text>
            )}
            {!small && (
              <text className="sb-plane__pt" x={sx(r.x[0])} y={sy(r.x[1]) + 25} textAnchor="middle">
                ({r.x[0]},{r.x[1]})
              </text>
            )}
          </g>
        ))}

        {!small && (
          <>
            <text className="sb-axis" x={SIZE - 6} y={sy(0) + 15} textAnchor="end">
              x₁
            </text>
            <text className="sb-axis" x={sx(0) - 8} y={14} textAnchor="end">
              x₂
            </text>
          </>
        )}
      </svg>
    </div>
  );
}
