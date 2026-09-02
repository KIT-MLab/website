import { useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import type { ActivationId, ForwardTrace, Network } from '../engine/types';
import { hits } from '../stages';
import { fmt } from './format';

/** 見出しカードに収まる短い名前 */
export const ACT_SHORT: Record<ActivationId, string> = {
  identity: '活性化なし',
  step: 'ステップ',
  sigmoid: 'シグモイド',
  tanh: 'tanh',
  relu: 'ReLU',
};

/* 重みとバイアスの上下限。押している間に出る縦目盛りの範囲がそのまま上下限になる。
   範囲はステージごとに変わる（序盤は ±1.5、AND 以降は ±3） */
export const W_RANGE_DEFAULT = 3;
export const W_STEP = 0.05;
/** 目盛りの高さ（画面px）。上下いっぱいで −range〜+range */
const GAUGE_H = 220;
/** 目盛りの刻み */
const TICK_STEP = 0.25;

const COL_GAP = 152;
const ROW_GAP = 48;
const R = 15;
const HEAD_Y = 12;
const HEAD_H = 38;
const NODE_TOP = 96;
/** 出題の箱 */
const BOX_W = 56;
const BOX_H = 26;

type Drag = { kind: 'w' | 'b'; li: number; o: number; i: number; y: number; from: number };
type Gauge = { left: number; top: number; value: number; label: string; flip: boolean };

/** 1点ずつ出す出題。入力と目標を箱で見せ、合否で色と動きを変える */
export type Cue = {
  inputs: number[];
  target: number;
  state: 'wait' | 'pass' | 'fail';
  /** 変わるたびに演出をやり直すための番号 */
  nonce: number;
};

type Props = {
  net: Network;
  trace: ForwardTrace | null;
  inDim: number;
  inputLabels: string[];
  selected: number;
  small?: boolean;
  canAdjust?: boolean;
  /** false ならバイアスは動かせない（丸を押しても目盛りが出ない） */
  canBias?: boolean;
  canPlace?: boolean;
  canNodes?: boolean;
  maxLayers?: number;
  /** 縦目盛りの範囲（±この値） */
  wRange?: number;
  /** チュートリアル中に触れてよい要素。null なら全部触れる */
  gate?: string[] | null;
  /** いま指さしている要素。光らせるだけで、触れるかどうかは gate が決める */
  point?: string[] | null;
  /** あれば入力の左と出力の右に箱を出す */
  cue?: Cue | null;
  onSelect?: (li: number) => void;
  /** 重みを絶対値で置く（上下限は ±wRange） */
  onWeight?: (li: number, o: number, i: number, value: number) => void;
  onBias?: (li: number, o: number, value: number) => void;
  onInsert?: (gap: number) => void;
  onRemove?: (li: number) => void;
  onNodes?: (li: number, delta: number) => void;
  onHover?: (text: string | null) => void;
  /** 掴んでいる間だけ true。判定を止めるのに使う */
  onDrag?: (active: boolean) => void;
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
  canBias = true,
  canPlace,
  canNodes,
  maxLayers,
  wRange,
  gate,
  point,
  cue,
  onSelect,
  onWeight,
  onBias,
  onInsert,
  onRemove,
  onNodes,
  onHover,
  onDrag,
}: Props) {
  const drag = useRef<Drag | null>(null);
  const [gauge, setGauge] = useState<Gauge | null>(null);

  /* window のハンドラは張りっぱなしなので、呼ぶ先は毎回いまのものを見る */
  const cb = useRef({ onWeight, onBias, onDrag });
  cb.current = { onWeight, onBias, onDrag };

  /* 目盛りの範囲。そのまま値の上下限になる */
  const wMax = wRange ?? W_RANGE_DEFAULT;
  const wMin = -wMax;
  const clampW = (v: number) => Math.min(wMax, Math.max(wMin, v));
  const snapW = (v: number) => Number((Math.round(clampW(v) / W_STEP) * W_STEP).toFixed(2));
  /** 値 → 目盛りの中での上からの位置（px） */
  const gaugeY = (v: number) => ((wMax - v) / (wMax - wMin)) * GAUGE_H;
  const ticks = Array.from({ length: Math.round((wMax - wMin) / TICK_STEP) + 1 }, (_, i) =>
    Number((wMin + i * TICK_STEP).toFixed(2)),
  );

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
  const boxes = !small && !!cue;

  const rows = Math.max(3, ...counts);
  const bandH = rows * ROW_GAP;
  const height = NODE_TOP + bandH + 20;
  const left = 62 + (boxes ? 56 : 0);
  const x = (col: number) => left + col * COL_GAP;
  /* 右端に要る余白: 見出しカードの半分 / 「＋」の列 / 目標の箱 */
  const width = x(cols - 1) + Math.max(66, placing ? 136 : 46, boxes ? 91 : 0);
  /* 列が少ないうちは大きく描く。詰まってきたら等倍寄りに戻す */
  const zoom = cols <= 2 ? 2.2 : cols === 3 ? 1.8 : 1.5;

  const gapX = (gp: number) => x(gp) + COL_GAP / 2;
  const y = (col: number, i: number) => NODE_TOP + bandH / 2 + (i - (counts[col] - 1) / 2) * ROW_GAP;

  const nodeName = (col: number, i: number) =>
    col === 0 ? inputLabels[i] ?? `x${i + 1}` : col === cols - 1 ? (counts[col] > 1 ? `出力${i + 1}` : '出力') : `h${i + 1}`;

  const edgeCount = net.layers.reduce((s, l) => s + l.w.length * l.w[0].length, 0);
  const showWeightLabels = !small && edgeCount <= 16;

  /* -------------------- 押している間だけ出る縦目盛り -------------------- */

  const begin = (e: React.PointerEvent, d: Omit<Drag, 'y' | 'from'>, value: number, label: string) => {
    if (!adjusting) return;
    e.preventDefault();
    try {
      (e.currentTarget as Element).setPointerCapture(e.pointerId);
    } catch {
      /* 捕捉できなくても window の pointermove で追える */
    }
    drag.current = { ...d, y: e.clientY, from: clampW(value) };
    /* 右端では左側に出す（値の札のぶんまで見込む） */
    const flip = e.clientX + 180 > window.innerWidth;
    setGauge({
      left: flip ? e.clientX - 118 : e.clientX + 6,
      top: Math.min(Math.max(e.clientY - gaugeY(clampW(value)), 30), window.innerHeight - GAUGE_H - 12),
      value: clampW(value),
      label,
      flip,
    });
    onDrag?.(true);
  };

  useEffect(() => {
    if (!gauge) return;
    const move = (e: PointerEvent) => {
      const d = drag.current;
      if (!d) return;
      const raw = d.from + ((d.y - e.clientY) * (wMax - wMin)) / GAUGE_H;
      const v = snapW(raw);
      setGauge((cur) => (cur && cur.value === v ? cur : cur && { ...cur, value: v }));
      if (d.kind === 'w') cb.current.onWeight?.(d.li, d.o, d.i, v);
      else cb.current.onBias?.(d.li, d.o, v);
    };
    const end = () => {
      drag.current = null;
      setGauge(null);
      cb.current.onDrag?.(false);
    };
    window.addEventListener('pointermove', move);
    window.addEventListener('pointerup', end);
    window.addEventListener('pointercancel', end);
    return () => {
      window.removeEventListener('pointermove', move);
      window.removeEventListener('pointerup', end);
      window.removeEventListener('pointercancel', end);
    };
    /* 目盛りが出ている間だけ張る。位置と値は ref と関数更新で追う */
  }, [gauge !== null]);

  /* -------------------- 層の見出し -------------------- */

  const header = (col: number) => {
    const li = col - 1;
    const isInput = col === 0;
    const isOut = col === cols - 1 && !isInput;
    /* 中間層が1つだけなら番号を付けない */
    const title = isInput ? '入力層' : isOut ? '出力層' : cols - 2 <= 1 ? '中間層' : `中間層${col}`;
    const sub = isInput
      ? Array.from({ length: inDim }, (_, i) => inputLabels[i] ?? `x${i + 1}`).join(' ')
      : `${counts[col]}個・${ACT_SHORT[net.layers[li].act]}`;
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

  /* -------------------- 出題の箱 -------------------- */

  const cueBoxes = () => {
    if (!boxes || !cue) return null;
    const capY = Math.min(y(0, 0), y(cols - 1, 0)) - 24;
    const box = (cx: number, cy: number, text: string, key: string) => (
      <g key={key}>
        <rect x={cx - BOX_W / 2} y={cy - BOX_H / 2} width={BOX_W} height={BOX_H} rx={7} />
        <text className="sb-cue__v" x={cx} y={cy + 5} textAnchor="middle">
          {text}
        </text>
      </g>
    );
    const inX = x(0) - R - 30 - BOX_W / 2;
    const outX = x(cols - 1) + R + 12 + BOX_W / 2;
    return (
      <g className="sb-cue" data-state={cue.state} key={`cue-${cue.nonce}`}>
        <text className="sb-cue__cap" x={inX} y={capY} textAnchor="middle">
          入力
        </text>
        <text className="sb-cue__cap" x={outX} y={capY} textAnchor="middle">
          出力
        </text>
        {cue.inputs.slice(0, inDim).map((v, i) => box(inX, y(0, i), fmt(v, 1), `ci${i}`))}
        {box(outX, y(cols - 1, 0), fmt(cue.target, 2), 'ct')}
      </g>
    );
  };

  return (
    <>
      <svg
        className={`sb-nd ${adjusting ? 'sb-nd--adjust' : ''}`}
        width={width * zoom}
        height={height * zoom}
        viewBox={`0 0 ${width} ${height}`}
        preserveAspectRatio="xMidYMid meet"
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
                      onPointerDown={(e) =>
                        begin(e, { kind: 'w', li, o, i }, w, `${nodeName(li, i)} → ${nodeName(li + 1, o)} の重み`)
                      }
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
            /* バイアスが未解禁の間は掴めない。鍵印を添えて分かるようにする */
            const locked = col > 0 && !canBias;
            return (
              <g key={`n${col}-${i}`}>
                {col > 0 && lit(id) && <circle className="sb-nd__pt" cx={x(col)} cy={y(col, i)} r={R + 7} strokeWidth={4} />}
                <circle
                  cx={x(col)}
                  cy={y(col, i)}
                  r={R}
                  fill={fill(v)}
                  className={`sb-nd__node ${col > 0 && adjusting && !locked ? 'sb-nd__node--drag' : ''} ${
                    locked ? 'sb-nd__node--locked' : ''
                  }`}
                  style={col > 0 ? dead(id) : undefined}
                  onPointerDown={
                    col > 0 && !locked
                      ? (e) => begin(e, { kind: 'b', li: col - 1, o: i, i: 0 }, bias ?? 0, `${nodeName(col, i)} のバイアス`)
                      : undefined
                  }
                  onMouseEnter={
                    small
                      ? undefined
                      : () =>
                          onHover?.(
                            bias === null
                              ? `${nodeName(col, i)} = ${fmt(v, 3)}`
                              : locked
                                ? `${nodeName(col, i)} の出力 ${fmt(v, 3)} ／ バイアスは ${bias ? fmt(bias, 2) : '0'} で固定`
                                : `${nodeName(col, i)} の出力 ${fmt(v, 3)} ／ バイアス ${fmt(bias, 3)}`,
                          )
                  }
                  onMouseLeave={small ? undefined : () => onHover?.(null)}
                />
                {locked && !small && (
                  <g className="sb-nd__lock" pointerEvents="none">
                    <path
                      d={`M ${x(col) - 3.2} ${y(col, i) + R + 8} v -2.6 a 3.2 3.2 0 0 1 6.4 0 v 2.6`}
                      fill="none"
                    />
                    <rect x={x(col) - 5.4} y={y(col, i) + R + 7} width={10.8} height={7.6} rx={1.6} />
                    <text className="sb-nd__lockT" x={x(col)} y={y(col, i) + R + 26} textAnchor="middle">
                      バイアス {bias ? fmt(bias, 2) : '0'} で固定
                    </text>
                  </g>
                )}
                {rows <= 6 && !small && (
                  <text
                    className={`sb-nd__val ${boxes && col === cols - 1 ? 'sb-nd__val--fine' : ''}`}
                    x={x(col)}
                    y={y(col, i) + 4}
                    textAnchor="middle"
                  >
                    {/* 出題中は目標と見比べるので、出力だけ小数第2位まで出す */}
                    {fmt(v, boxes && col === cols - 1 ? 2 : 1)}
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

        {cueBoxes()}

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

      {gauge &&
        typeof document !== 'undefined' &&
        createPortal(
          <div className="sb-gauge" style={{ left: gauge.left, top: gauge.top, height: GAUGE_H }}>
            <span className="sb-gauge__cap" data-flip={gauge.flip || undefined}>
              {gauge.label}
            </span>
            <div className="sb-gauge__track">
              {ticks.map((v) => (
                <i
                  key={v}
                  className="sb-gauge__tick"
                  data-zero={v === 0 || undefined}
                  data-major={Number.isInteger(v) || undefined}
                  style={{ top: gaugeY(v) }}
                />
              ))}
              <i className="sb-gauge__knob" style={{ top: gaugeY(gauge.value) }} />
            </div>
            <span className="sb-gauge__end" style={{ top: -1 }}>
              +{wMax}
            </span>
            <span className="sb-gauge__end" style={{ top: GAUGE_H - 12 }}>
              −{wMax}
            </span>
            <span className="sb-gauge__zero" style={{ top: gaugeY(0) - 7 }}>
              0
            </span>
            <span className="sb-gauge__val" style={{ top: gaugeY(gauge.value) - 11 }}>
              {gauge.value.toFixed(2)}
            </span>
          </div>,
          document.body,
        )}
    </>
  );
}
