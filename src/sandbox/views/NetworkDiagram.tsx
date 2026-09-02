import { useRef } from 'react';
import type { ActivationId, ForwardTrace, Network } from '../engine/types';
import { hits } from '../stages';
import { fmt } from './format';

/** 見出しカードに収まる短い名前 */
export const ACT_SHORT: Record<ActivationId, string> = {
  identity: 'なし',
  step: 'ステップ',
  sigmoid: 'シグモイド',
  tanh: 'tanh',
  relu: 'ReLU',
};

const COL_GAP = 152;
const ROW_GAP = 48;
const R = 15;
const HEAD_Y = 12;
const HEAD_H = 38;
const NODE_TOP = 96;

type Drag = { kind: 'w' | 'b'; li: number; o: number; i: number; y: number };

type Props = {
  net: Network;
  trace: ForwardTrace | null;
  inDim: number;
  inputLabels: string[];
  selected: number;
  small?: boolean;
  canAdjust?: boolean;
  canPlace?: boolean;
  canNodes?: boolean;
  maxLayers?: number;
  /** チュートリアル中に触れてよい要素。null なら全部触れる */
  gate?: string[] | null;
  /** いま指さしている要素。光らせるだけで、触れるかどうかは gate が決める */
  point?: string[] | null;
  onSelect?: (li: number) => void;
  onWeight?: (li: number, o: number, i: number, delta: number) => void;
  onBias?: (li: number, o: number, delta: number) => void;
  onInsert?: (gap: number) => void;
  onRemove?: (li: number) => void;
  onNodes?: (li: number, delta: number) => void;
  onHover?: (text: string | null) => void;
};

/** 値の大きさを塗りの濃さに。正なら橙、負なら青緑 */
function fill(v: number) {
  const alpha = Math.min(Math.abs(v), 1.5) / 1.5;
  return v >= 0 ? `rgba(224,138,60,${alpha * 0.8})` : `rgba(74,163,154,${alpha * 0.8})`;
}

export function NetworkDiagram({
  net,
  trace,
  inDim,
  inputLabels,
  selected,
  small,
  canAdjust,
  canPlace,
  canNodes,
  maxLayers,
  gate,
  point,
  onSelect,
  onWeight,
  onBias,
  onInsert,
  onRemove,
  onNodes,
  onHover,
}: Props) {
  const drag = useRef<Drag | null>(null);

  const g = gate ?? null;
  /** その要素をいま触ってよいか */
  const live = (id: string) => hits(g, id);
  /** いま指さしているか（チュートリアル中だけ光る） */
  const p = point ?? null;
  const lit = (id: string) => !small && p !== null && hits(p, id);
  const dead = (id: string) => (live(id) ? undefined : ({ pointerEvents: 'none' } as const));

  const counts = [inDim, ...net.layers.map((l) => l.b.length)];
  const cols = counts.length;
  const values: number[][] = trace
    ? [trace.input, ...trace.layers.map((l) => l.a)]
    : counts.map((n) => Array.from({ length: n }, () => 0));

  const placing = !!canPlace && !small;
  const adjusting = !!canAdjust && !small;
  const roomForLayer = maxLayers === undefined || net.layers.length < maxLayers;

  const rows = Math.max(3, ...counts);
  const bandH = rows * ROW_GAP;
  const height = NODE_TOP + bandH + 20;
  const tail = placing ? COL_GAP * 0.75 : 24;
  /* 見出しカードが右端で切れないよう、最後の列のぶんを見込む */
  const width = Math.max(84 + (cols - 1) * COL_GAP + tail, 62 + (cols - 1) * COL_GAP + 66);
  /* 列が少ないうちは大きく描く。詰まってきたら等倍寄りに戻す */
  const zoom = cols <= 2 ? 2.2 : cols === 3 ? 1.8 : 1.5;

  const x = (col: number) => 62 + col * COL_GAP;
  const gapX = (gp: number) => x(gp) + COL_GAP / 2;
  const y = (col: number, i: number) => NODE_TOP + bandH / 2 + (i - (counts[col] - 1) / 2) * ROW_GAP;

  const nodeName = (col: number, i: number) =>
    col === 0 ? inputLabels[i] ?? `x${i + 1}` : col === cols - 1 ? (counts[col] > 1 ? `出力${i + 1}` : '出力') : `h${i + 1}`;

  const edgeCount = net.layers.reduce((s, l) => s + l.w.length * l.w[0].length, 0);
  const showWeightLabels = !small && edgeCount <= 16;

  const begin = (e: React.PointerEvent, d: Omit<Drag, 'y'>) => {
    if (!adjusting) return;
    e.preventDefault();
    try {
      (e.currentTarget as Element).setPointerCapture(e.pointerId);
    } catch {
      /* 捕捉できなくても svg の pointermove で追える */
    }
    drag.current = { ...d, y: e.clientY };
  };

  const move = (e: React.PointerEvent) => {
    const d = drag.current;
    if (!d) return;
    const delta = (d.y - e.clientY) * 0.014;
    d.y = e.clientY;
    if (d.kind === 'w') onWeight?.(d.li, d.o, d.i, delta);
    else onBias?.(d.li, d.o, delta);
  };

  const end = () => {
    drag.current = null;
  };

  const header = (col: number) => {
    const li = col - 1;
    const isInput = col === 0;
    const isOut = col === cols - 1 && !isInput;
    const title = isInput ? '入力' : isOut ? '出力' : `層${col}`;
    const sub = isInput ? `${inDim}` : `${counts[col]} · ${ACT_SHORT[net.layers[li].act]}`;
    const w = 116;
    const cx = x(col);
    const sel = !isInput && selected === li;
    const id = `h:${li}`;
    return (
      <g key={`h${col}`}>
        {!isInput && lit(id) && (
          <rect className="sb-nd__pt" x={cx - w / 2 - 5} y={HEAD_Y - 5} width={w + 10} height={HEAD_H + 10} rx={7} />
        )}
        <rect
          className="sb-nd__head"
          data-sel={sel || undefined}
          x={cx - w / 2}
          y={HEAD_Y}
          width={w}
          height={HEAD_H}
          rx={4}
          style={isInput ? undefined : dead(id)}
          onClick={isInput || small ? undefined : () => onSelect?.(li)}
        />
        <text className="sb-nd__headT" x={cx - w / 2 + 9} y={HEAD_Y + 15}>
          {title}
        </text>
        <text className="sb-nd__headS" x={cx - w / 2 + 9} y={HEAD_Y + 30}>
          {sub}
        </text>
        {placing && !isInput && net.layers.length > 1 && (
          <g
            className="sb-nd__mini"
            style={dead('plus')}
            onClick={() => onRemove?.(li)}
            role="button"
            aria-label={`${title}を外す`}
          >
            <rect x={cx + w / 2 - 20} y={HEAD_Y + 4} width={16} height={16} rx={3} />
            <text x={cx + w / 2 - 12} y={HEAD_Y + 16} textAnchor="middle">
              ×
            </text>
          </g>
        )}
        {!small && canNodes && !isInput && !isOut && (
          <g className="sb-nd__nodes" style={dead('nodes')}>
            <g className="sb-nd__mini" onClick={() => onNodes?.(li, -1)} role="button" aria-label="ノードを減らす">
              <rect x={cx - 34} y={HEAD_Y + HEAD_H + 6} width={18} height={18} rx={3} />
              <text x={cx - 25} y={HEAD_Y + HEAD_H + 19} textAnchor="middle">
                −
              </text>
            </g>
            <g className="sb-nd__mini" onClick={() => onNodes?.(li, 1)} role="button" aria-label="ノードを増やす">
              <rect x={cx + 16} y={HEAD_Y + HEAD_H + 6} width={18} height={18} rx={3} />
              <text x={cx + 25} y={HEAD_Y + HEAD_H + 19} textAnchor="middle">
                ＋
              </text>
            </g>
          </g>
        )}
      </g>
    );
  };

  return (
    <svg
      className={`sb-nd ${adjusting ? 'sb-nd--adjust' : ''}`}
      width={width * zoom}
      height={height * zoom}
      viewBox={`0 0 ${width} ${height}`}
      preserveAspectRatio="xMidYMid meet"
      onPointerMove={move}
      onPointerUp={end}
      onPointerCancel={end}
      role="img"
      aria-label="ネットワークの図"
    >
      {net.layers.map((layer, li) =>
        layer.w.map((row, o) =>
          row.map((w, i) => {
            const id = `e:${li}:${o}:${i}`;
            const x1 = x(li);
            const y1 = y(li, i);
            const x2 = x(li + 1);
            const y2 = y(li + 1, o);
            const t = 0.28 + (i / Math.max(1, row.length - 1)) * 0.34;
            const mx = x1 + (x2 - x1) * t;
            const my = y1 + (y2 - y1) * t;
            return (
              <g key={`e${li}-${o}-${i}`}>
                {lit(id) && (
                  <line className="sb-nd__pt" x1={x1 + R} y1={y1} x2={x2 - R} y2={y2} strokeWidth={13} strokeLinecap="round" />
                )}
                <line
                  x1={x1 + R}
                  y1={y1}
                  x2={x2 - R}
                  y2={y2}
                  stroke={w >= 0 ? 'var(--sb-pos)' : 'var(--sb-neg)'}
                  strokeWidth={Math.min(0.6 + Math.abs(w) * 1.8, 6)}
                  strokeLinecap="round"
                  opacity={Math.abs(w) < 0.02 ? 0.15 : 0.8}
                />
                {!small && (
                  <line
                    className="sb-nd__hit"
                    x1={x1 + R}
                    y1={y1}
                    x2={x2 - R}
                    y2={y2}
                    strokeWidth={14}
                    style={dead(id)}
                    onPointerDown={(e) => begin(e, { kind: 'w', li, o, i })}
                    onMouseEnter={() => onHover?.(`${nodeName(li, i)} → ${nodeName(li + 1, o)} の重み ${fmt(w, 3)}`)}
                    onMouseLeave={() => onHover?.(null)}
                  />
                )}
                {showWeightLabels && (
                  <>
                    <rect x={mx - 19} y={my - 9} width={38} height={17} rx={3} className="sb-nd__wbg" />
                    <text className="sb-nd__w" x={mx} y={my + 4} textAnchor="middle">
                      {fmt(w)}
                    </text>
                  </>
                )}
              </g>
            );
          }),
        ),
      )}

      {counts.map((n, col) =>
        Array.from({ length: n }, (_, i) => {
          const bias = col > 0 ? net.layers[col - 1].b[i] : null;
          const v = values[col][i];
          const id = `n:${col - 1}:${i}`;
          return (
            <g key={`n${col}-${i}`}>
              {col > 0 && lit(id) && <circle className="sb-nd__pt" cx={x(col)} cy={y(col, i)} r={R + 7} strokeWidth={4} />}
              <circle
                cx={x(col)}
                cy={y(col, i)}
                r={R}
                fill={fill(v)}
                className={`sb-nd__node ${col > 0 && adjusting ? 'sb-nd__node--drag' : ''}`}
                style={col > 0 ? dead(id) : undefined}
                onPointerDown={col > 0 ? (e) => begin(e, { kind: 'b', li: col - 1, o: i, i: 0 }) : undefined}
                onMouseEnter={
                  small
                    ? undefined
                    : () =>
                        onHover?.(
                          bias === null
                            ? `${nodeName(col, i)} = ${fmt(v, 3)}`
                            : `${nodeName(col, i)} の出力 ${fmt(v, 3)} ／ バイアス ${fmt(bias, 3)}`,
                        )
                }
                onMouseLeave={small ? undefined : () => onHover?.(null)}
              />
              {rows <= 6 && !small && (
                <text className="sb-nd__val" x={x(col)} y={y(col, i) + 4} textAnchor="middle">
                  {fmt(v, 1)}
                </text>
              )}
              {col === 0 && !small && (
                <text className="sb-nd__inl" x={x(col) - R - 8} y={y(col, i) + 4} textAnchor="end">
                  {inputLabels[i] ?? `x${i + 1}`}
                </text>
              )}
            </g>
          );
        }),
      )}

      {counts.map((_, col) => header(col))}

      {placing &&
        roomForLayer &&
        Array.from({ length: net.layers.length + 1 }, (_, gp) => (
          <g
            key={`g${gp}`}
            className={`sb-nd__ins ${lit('plus') ? 'sb-nd__ins--lit' : ''}`}
            style={dead('plus')}
            onClick={() => onInsert?.(gp)}
            role="button"
            aria-label={`ここに層を置く（${gp + 1}番目）`}
          >
            <circle cx={gapX(gp)} cy={NODE_TOP + bandH / 2} r={15} />
            <text x={gapX(gp)} y={NODE_TOP + bandH / 2 + 6} textAnchor="middle">
              ＋
            </text>
          </g>
        ))}

      {net.layers.length === 0 && (
        <text className="sb-nd__empty" x={width / 2} y={height - 8} textAnchor="middle">
          層がありません。「＋」で1つ置いてください
        </text>
      )}
    </svg>
  );
}
