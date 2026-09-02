import { useId } from 'react';
import { forward } from '../engine/network';
import type { Dataset, Network } from '../engine/types';
import { CSS } from './palette';
import { fmt } from './format';

const W = 440;
const H = 300;
const PAD = 34;

type Props = {
  net: Network;
  data: Dataset;
  range: [number, number];
  valid: boolean;
  small?: boolean;
};

/** 1入力の回帰。点がデータ、線がいまのモデル */
export function FitCurve({ net, data, range, valid, small }: Props) {
  const clip = useId().replace(/:/g, '');
  const [lo, hi] = range;

  const N = small ? 41 : 141;
  const curve: number[] = [];
  if (valid) {
    for (let i = 0; i < N; i++) {
      curve.push(forward(net, [lo + ((hi - lo) * i) / (N - 1)]).output[0]);
    }
  }

  /* 縦軸はデータで決める。モデルが飛んでも軸は動かさない（見比べにくくなるため） */
  const ys = data.y.map((v) => v[0]);
  let ymin = Math.min(...ys);
  let ymax = Math.max(...ys);
  const pad = Math.max((ymax - ymin) * 0.25, 0.2);
  ymin -= pad;
  ymax += pad;

  const sx = (v: number) => PAD + ((v - lo) / (hi - lo)) * (W - PAD * 2);
  const sy = (v: number) => H - PAD - ((v - ymin) / (ymax - ymin)) * (H - PAD * 2);

  const path = curve
    .map((v, i) => `${i === 0 ? 'M' : 'L'}${sx(lo + ((hi - lo) * i) / (N - 1)).toFixed(1)},${sy(v).toFixed(1)}`)
    .join(' ');

  const zeroY = ymin < 0 && ymax > 0 ? sy(0) : null;
  const zeroX = lo < 0 && hi > 0 ? sx(0) : null;

  return (
    <svg className="sb-fit" viewBox={`0 0 ${W} ${H}`} preserveAspectRatio="xMidYMid meet" role="img" aria-label="当てはまりの図">
      <defs>
        <clipPath id={clip}>
          <rect x={PAD} y={PAD - 8} width={W - PAD * 2} height={H - PAD * 2 + 16} />
        </clipPath>
      </defs>

      <rect x={PAD} y={PAD - 8} width={W - PAD * 2} height={H - PAD * 2 + 16} fill="rgba(255,255,255,0.02)" />
      {zeroY !== null && <line x1={PAD} y1={zeroY} x2={W - PAD} y2={zeroY} stroke={CSS.line} strokeWidth={1} />}
      {zeroX !== null && <line x1={zeroX} y1={PAD - 8} x2={zeroX} y2={H - PAD + 8} stroke={CSS.line} strokeWidth={1} />}

      <g clipPath={`url(#${clip})`}>
        {data.x.map((p, i) => (
          <circle
            key={i}
            cx={sx(p[0])}
            cy={sy(data.y[i][0])}
            r={small ? 1.8 : 3.2}
            fill="none"
            stroke={CSS.text}
            strokeWidth={1.4}
            opacity={0.75}
          />
        ))}
        {valid && <path d={path} fill="none" stroke={CSS.model} strokeWidth={small ? 2 : 3} strokeLinejoin="round" />}
      </g>

      {!small && (
        <>
          <text className="sb-fit__ax" x={PAD} y={H - 12}>
            x {fmt(lo, 1)}
          </text>
          <text className="sb-fit__ax" x={W - PAD} y={H - 12} textAnchor="end">
            {fmt(hi, 1)}
          </text>
          <text className="sb-fit__ax" x={PAD - 6} y={PAD} textAnchor="end">
            {fmt(ymax, 1)}
          </text>
          <text className="sb-fit__ax" x={PAD - 6} y={H - PAD} textAnchor="end">
            {fmt(ymin, 1)}
          </text>
        </>
      )}
    </svg>
  );
}
