import { useEffect, useRef } from 'react';
import { forward } from '../engine/network';
import type { Dataset, Network } from '../engine/types';
import { CSS, diverge, rgbStr } from './palette';

const SIZE = 300;

type Props = {
  net: Network;
  data: Dataset;
  range: [number, number][];
  mode: 'reg2' | 'cls2';
  valid: boolean;
  small?: boolean;
};

/** 2入力。面をしらみつぶしに塗り、その上にデータ点を重ねる */
export function FitPlane({ net, data, range, mode, valid, small }: Props) {
  const ref = useRef<HTMLCanvasElement>(null);
  const n = small ? 46 : 132;

  const [x0, x1] = range[0];
  const [y0, y1] = range[1];

  /* 回帰は目標値の大きさで色の幅を決める。分類は 0〜1 固定 */
  const scale =
    mode === 'cls2' ? 1 : Math.max(0.2, ...data.y.map((v) => Math.abs(v[0])));

  useEffect(() => {
    const canvas = ref.current;
    const ctx = canvas?.getContext('2d');
    if (!canvas || !ctx) return;
    const img = ctx.createImageData(n, n);
    for (let j = 0; j < n; j++) {
      for (let i = 0; i < n; i++) {
        const a = x0 + ((x1 - x0) * (i + 0.5)) / n;
        const b = y1 - ((y1 - y0) * (j + 0.5)) / n;
        const out = valid ? forward(net, [a, b]).output[0] : 0;
        const t = mode === 'cls2' ? out * 2 - 1 : out / scale;
        const c = diverge(t);
        const p = (j * n + i) * 4;
        img.data[p] = c[0];
        img.data[p + 1] = c[1];
        img.data[p + 2] = c[2];
        img.data[p + 3] = 255;
      }
    }
    ctx.putImageData(img, 0, 0);
  }, [net, n, mode, scale, valid, x0, x1, y0, y1]);

  const sx = (v: number) => ((v - x0) / (x1 - x0)) * SIZE;
  const sy = (v: number) => ((y1 - v) / (y1 - y0)) * SIZE;

  const r = small ? 2.4 : 5;

  return (
    <div className="sb-plane">
      <canvas ref={ref} width={n} height={n} aria-hidden="true" />
      <svg viewBox={`0 0 ${SIZE} ${SIZE}`} role="img" aria-label="入力平面">
        {data.x.map((p, i) => {
          const tv = data.y[i][0];
          const t = mode === 'cls2' ? tv * 2 - 1 : tv / scale;
          return (
            <circle
              key={i}
              cx={sx(p[0])}
              cy={sy(p[1])}
              r={r}
              fill={rgbStr(diverge(t * 1.35))}
              stroke={CSS.text}
              strokeWidth={small ? 0.7 : 1}
            />
          );
        })}
      </svg>
    </div>
  );
}
