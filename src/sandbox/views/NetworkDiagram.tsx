import type { ForwardTrace, Network } from '../engine/types';
import { fmt } from './format';

const COL_GAP = 170;
const ROW_GAP = 96;
const R = 21;

/** 値の大きさを 0〜0.75 の塗り濃度に変換。正なら朱、負なら墨 */
function fill(v: number) {
  const alpha = Math.min(Math.abs(v), 1) * 0.75;
  return v >= 0 ? `rgba(179, 64, 42, ${alpha})` : `rgba(35, 35, 35, ${alpha})`;
}

type Props = { net: Network; trace: ForwardTrace; inputLabels: string[] };

export function NetworkDiagram({ net, trace, inputLabels }: Props) {
  const counts = [trace.input.length, ...net.layers.map((l) => l.b.length)];
  const values = [trace.input, ...trace.layers.map((l) => l.a)];

  const width = 90 + (counts.length - 1) * COL_GAP;
  const height = Math.max(150, Math.max(...counts) * ROW_GAP + 46);
  const x = (col: number) => 45 + col * COL_GAP;
  const y = (col: number, i: number) => height / 2 - 8 + (i - (counts[col] - 1) / 2) * ROW_GAP;

  return (
    <svg className="sb-diagram" viewBox={`0 0 ${width} ${height}`} role="img" aria-label="ニューラルネットワークの図">
      {net.layers.map((layer, li) =>
        layer.w.map((row, o) =>
          row.map((w, i) => {
            const x1 = x(li);
            const y1 = y(li, i);
            const x2 = x(li + 1);
            const y2 = y(li + 1, o);
            const mx = x1 + (x2 - x1) * 0.42;
            const my = y1 + (y2 - y1) * 0.42;
            return (
              <g key={`e${li}-${o}-${i}`}>
                <line
                  x1={x1 + R}
                  y1={y1}
                  x2={x2 - R}
                  y2={y2}
                  stroke={w >= 0 ? 'var(--color-accent)' : 'var(--color-ink)'}
                  strokeWidth={Math.min(0.8 + Math.abs(w) * 2.4, 7)}
                  strokeLinecap="round"
                  opacity={Math.abs(w) < 0.02 ? 0.18 : 0.85}
                />
                <rect x={mx - 20} y={my - 9} width={40} height={17} rx={3} fill="var(--color-card)" />
                <text className="sb-diagram__w" x={mx} y={my + 3} textAnchor="middle">
                  {fmt(w)}
                </text>
              </g>
            );
          }),
        ),
      )}

      {counts.map((n, col) =>
        Array.from({ length: n }, (_, i) => (
          <g key={`n${col}-${i}`}>
            <circle cx={x(col)} cy={y(col, i)} r={R} fill={fill(values[col][i])} stroke="var(--color-line)" strokeWidth={1.5} />
            <text className="sb-diagram__label" x={x(col)} y={y(col, i) - R - 9} textAnchor="middle">
              {col === 0 ? inputLabels[i] : col === counts.length - 1 ? '出力' : `h${i + 1}`}
            </text>
            <text className="sb-diagram__val" x={x(col)} y={y(col, i) + R + 17} textAnchor="middle">
              {fmt(values[col][i])}
            </text>
          </g>
        )),
      )}

      {net.layers.map((layer, li) =>
        layer.b.map((b, o) => (
          <text key={`b${li}-${o}`} className="sb-diagram__b" x={x(li + 1)} y={y(li + 1, o) + R + 32} textAnchor="middle">
            バイアス {fmt(b)}
          </text>
        )),
      )}
    </svg>
  );
}
