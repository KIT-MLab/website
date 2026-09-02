import { useRef } from 'react';
import type { ToolId } from '../objectives';
import type { ForwardTrace, Network } from '../engine/types';
import { fmt } from './format';

const COL_GAP = 180;
const ROW_GAP = 100;
const R = 22;

/** 値の大きさを塗りの濃さに。正なら朱、負なら墨 */
function fill(v: number) {
  const alpha = Math.min(Math.abs(v), 1) * 0.75;
  return v >= 0 ? `rgba(179, 64, 42, ${alpha})` : `rgba(35, 35, 35, ${alpha})`;
}

type Drag = { kind: 'w' | 'b'; li: number; o: number; i: number; y: number };

type Props = {
  net: Network;
  trace: ForwardTrace;
  tool: ToolId;
  small?: boolean;
  onWeight?: (li: number, o: number, i: number, delta: number) => void;
  onBias?: (li: number, o: number, delta: number) => void;
  onHover?: (text: string | null) => void;
  onAddHidden?: () => void;
  onRemoveHidden?: (o: number) => void;
};

export function NetworkDiagram({
  net,
  trace,
  tool,
  small,
  onWeight,
  onBias,
  onHover,
  onAddHidden,
  onRemoveHidden,
}: Props) {
  const drag = useRef<Drag | null>(null);

  const counts = [trace.input.length, ...net.layers.map((l) => l.b.length)];
  const values = [trace.input, ...trace.layers.map((l) => l.a)];
  const hiddenCount = net.layers.length > 1 ? counts[1] : 0;

  const placing = tool === 'place' && !small && net.layers.length > 1;
  const adjusting = tool === 'adjust' && !small;
  const rows = Math.max(...counts, placing ? hiddenCount + 1 : 0);

  const width = 100 + (counts.length - 1) * COL_GAP;
  const height = Math.max(190, rows * ROW_GAP + 60);
  const x = (col: number) => 50 + col * COL_GAP;
  const y = (col: number, i: number) => height / 2 - 6 + (i - (counts[col] - 1) / 2) * ROW_GAP;

  const nodeName = (col: number, i: number) =>
    col === 0 ? `x${i + 1}` : col === counts.length - 1 ? '出力' : `h${i + 1}`;

  const begin = (e: React.PointerEvent, d: Omit<Drag, 'y'>) => {
    if (!adjusting) return;
    e.preventDefault();
    try {
      (e.currentTarget as Element).setPointerCapture(e.pointerId);
    } catch {
      /* ポインタが捕捉できない場合でも、svg 側の pointermove で追える */
    }
    drag.current = { ...d, y: e.clientY };
  };

  const move = (e: React.PointerEvent) => {
    const d = drag.current;
    if (!d) return;
    const delta = (d.y - e.clientY) * 0.012;
    d.y = e.clientY;
    if (d.kind === 'w') onWeight?.(d.li, d.o, d.i, delta);
    else onBias?.(d.li, d.o, delta);
  };

  const end = () => {
    drag.current = null;
  };

  return (
    <svg
      className={`sb-diagram ${adjusting ? 'sb-diagram--adjust' : ''}`}
      viewBox={`0 0 ${width} ${height}`}
      preserveAspectRatio="xMidYMid meet"
      onPointerMove={move}
      onPointerUp={end}
      onPointerCancel={end}
      role="img"
      aria-label="ニューラルネットワークの図"
    >
      {net.layers.map((layer, li) =>
        layer.w.map((row, o) =>
          row.map((w, i) => {
            const x1 = x(li);
            const y1 = y(li, i);
            const x2 = x(li + 1);
            const y2 = y(li + 1, o);
            /* 交差する線どうしでラベルがぶつからないよう、入力ごとに置く位置をずらす。
               交点は必ず線の中ほどなので、そこを避けて手前と奥に振り分ける */
            const t = 0.25 + (i / Math.max(1, row.length - 1)) * 0.4;
            const mx = x1 + (x2 - x1) * t;
            const my = y1 + (y2 - y1) * t;
            const from = nodeName(li, i);
            const to = nodeName(li + 1, o);
            return (
              <g key={`e${li}-${o}-${i}`}>
                <line
                  x1={x1 + R}
                  y1={y1}
                  x2={x2 - R}
                  y2={y2}
                  stroke={w >= 0 ? 'var(--color-accent)' : 'var(--color-ink)'}
                  strokeWidth={Math.min(0.8 + Math.abs(w) * 2.4, 8)}
                  strokeLinecap="round"
                  opacity={Math.abs(w) < 0.02 ? 0.18 : 0.85}
                />
                {!small && (
                  <line
                    className="sb-diagram__hit"
                    x1={x1 + R}
                    y1={y1}
                    x2={x2 - R}
                    y2={y2}
                    strokeWidth={16}
                    onPointerDown={(e) => begin(e, { kind: 'w', li, o, i })}
                    onMouseEnter={() => onHover?.(`${from} → ${to} の重み ${fmt(w)}`)}
                    onMouseLeave={() => onHover?.(null)}
                  />
                )}
                <rect x={mx - 21} y={my - 10} width={42} height={19} rx={3} fill="var(--color-card)" />
                <text className="sb-diagram__w" x={mx} y={my + 4} textAnchor="middle">
                  {fmt(w)}
                </text>
              </g>
            );
          }),
        ),
      )}

      {counts.map((n, col) =>
        Array.from({ length: n }, (_, i) => {
          const bias = col > 0 ? net.layers[col - 1].b[i] : null;
          return (
            <g key={`n${col}-${i}`}>
              <circle
                cx={x(col)}
                cy={y(col, i)}
                r={R}
                fill={fill(values[col][i])}
                stroke="var(--color-line)"
                strokeWidth={1.5}
                className={col > 0 && !small ? 'sb-diagram__node' : undefined}
                onPointerDown={col > 0 ? (e) => begin(e, { kind: 'b', li: col - 1, o: i, i: 0 }) : undefined}
                onMouseEnter={
                  small
                    ? undefined
                    : () =>
                        onHover?.(
                          bias === null
                            ? `入力 ${nodeName(col, i)} = ${fmt(values[col][i])}`
                            : `${nodeName(col, i)} の出力 ${fmt(values[col][i])} / バイアス ${fmt(bias)}`,
                        )
                }
                onMouseLeave={small ? undefined : () => onHover?.(null)}
              />
              <text className="sb-diagram__label" x={x(col)} y={y(col, i) - R - 10} textAnchor="middle">
                {nodeName(col, i)}
              </text>
              <text className="sb-diagram__val" x={x(col)} y={y(col, i) + R + 18} textAnchor="middle">
                {fmt(values[col][i])}
              </text>
              {bias !== null && (
                <text className="sb-diagram__b" x={x(col)} y={y(col, i) + R + 33} textAnchor="middle">
                  b {fmt(bias)}
                </text>
              )}
              {placing && col === 1 && hiddenCount > 1 && (
                <g
                  className="sb-diagram__place"
                  onClick={() => onRemoveHidden?.(i)}
                  role="button"
                  aria-label={`${nodeName(col, i)} を外す`}
                >
                  <circle cx={x(col) + R - 2} cy={y(col, i) - R + 2} r={9} fill="var(--color-card)" stroke="var(--color-line)" />
                  <text x={x(col) + R - 2} y={y(col, i) - R + 6} textAnchor="middle" className="sb-diagram__placeMark">
                    −
                  </text>
                </g>
              )}
            </g>
          );
        }),
      )}

      {placing && hiddenCount < 4 && (
        <g
          className="sb-diagram__place"
          onClick={() => onAddHidden?.()}
          role="button"
          aria-label="中間ノードを足す"
        >
          <circle
            cx={x(1)}
            cy={y(1, counts[1] - 1) + ROW_GAP}
            r={R - 3}
            fill="none"
            stroke="var(--color-accent)"
            strokeWidth={1.5}
            strokeDasharray="4 4"
          />
          <text x={x(1)} y={y(1, counts[1] - 1) + ROW_GAP + 7} textAnchor="middle" className="sb-diagram__placeMark">
            ＋
          </text>
        </g>
      )}
    </svg>
  );
}
