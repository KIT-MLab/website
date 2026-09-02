import { useEffect, useRef } from 'react';
import { CSS } from './palette';

export type HistEntry = { step: number; loss: number };

type Props = {
  hist: HistEntry[];
  cursor: number;
  threshold: number;
  onScrub: (index: number) => void;
  disabled?: boolean;
};

const FLOOR = 1e-6;

/** 損失の曲線そのものが履歴バー。左右にドラッグするとその時点に戻る */
export function LossBar({ hist, cursor, threshold, onScrub, disabled }: Props) {
  const wrap = useRef<HTMLDivElement>(null);
  const canvas = useRef<HTMLCanvasElement>(null);
  const dragging = useRef(false);

  useEffect(() => {
    const el = canvas.current;
    const box = wrap.current;
    if (!el || !box) return;

    const draw = () => {
      const w = Math.max(1, Math.round(box.clientWidth));
      const h = Math.max(1, Math.round(box.clientHeight));
      const dpr = Math.min(window.devicePixelRatio || 1, 2);
      if (el.width !== w * dpr || el.height !== h * dpr) {
        el.width = w * dpr;
        el.height = h * dpr;
      }
      const ctx = el.getContext('2d');
      if (!ctx) return;
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      ctx.clearRect(0, 0, w, h);

      if (hist.length === 0) return;

      /* 損失は桁で変わるので対数で描く */
      const lg = (v: number) => Math.log10(Math.max(v, FLOOR));
      let lo = Infinity;
      let hi = -Infinity;
      for (const e of hist) {
        const v = lg(e.loss);
        if (v < lo) lo = v;
        if (v > hi) hi = v;
      }
      const tl = lg(threshold);
      lo = Math.min(lo, tl);
      hi = Math.max(hi, tl);
      if (hi - lo < 0.5) {
        const c = (hi + lo) / 2;
        lo = c - 0.25;
        hi = c + 0.25;
      }
      const px = (i: number) => (hist.length <= 1 ? w : (i / (hist.length - 1)) * w);
      const py = (v: number) => h - 3 - ((lg(v) - lo) / (hi - lo)) * (h - 8);

      /* しきい値の線。これより下に入ればクリア */
      ctx.strokeStyle = 'rgba(143,191,106,0.55)';
      ctx.setLineDash([4, 4]);
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.moveTo(0, py(threshold));
      ctx.lineTo(w, py(threshold));
      ctx.stroke();
      ctx.setLineDash([]);

      /* 曲線 */
      ctx.beginPath();
      ctx.moveTo(px(0), py(hist[0].loss));
      for (let i = 1; i < hist.length; i++) ctx.lineTo(px(i), py(hist[i].loss));
      ctx.strokeStyle = CSS.model;
      ctx.lineWidth = 1.6;
      ctx.stroke();

      ctx.lineTo(px(hist.length - 1), h);
      ctx.lineTo(px(0), h);
      ctx.closePath();
      ctx.fillStyle = 'rgba(240,193,75,0.12)';
      ctx.fill();

      /* いま見ている位置 */
      const cx = px(Math.min(cursor, hist.length - 1));
      ctx.strokeStyle = CSS.text;
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.moveTo(cx, 0);
      ctx.lineTo(cx, h);
      ctx.stroke();
      ctx.fillStyle = CSS.text;
      ctx.beginPath();
      ctx.arc(cx, py(hist[Math.min(cursor, hist.length - 1)].loss), 3, 0, Math.PI * 2);
      ctx.fill();
    };

    draw();
    const ro = new ResizeObserver(draw);
    ro.observe(box);
    return () => ro.disconnect();
    /* hist は中身を足していく配列なので、参照だけでなく長さも見ないと描き直さない */
  }, [hist, hist.length, cursor, threshold]);

  const pick = (e: React.PointerEvent) => {
    const box = wrap.current;
    if (!box || hist.length < 2 || disabled) return;
    const rect = box.getBoundingClientRect();
    const t = Math.min(Math.max((e.clientX - rect.left) / rect.width, 0), 1);
    onScrub(Math.round(t * (hist.length - 1)));
  };

  return (
    <div
      ref={wrap}
      className="sb-lossbar"
      data-disabled={disabled || undefined}
      onPointerDown={(e) => {
        if (disabled) return;
        dragging.current = true;
        (e.currentTarget as Element).setPointerCapture(e.pointerId);
        pick(e);
      }}
      onPointerMove={(e) => dragging.current && pick(e)}
      onPointerUp={() => (dragging.current = false)}
      onPointerCancel={() => (dragging.current = false)}
      role="slider"
      aria-label="学習の履歴"
      aria-valuemin={0}
      aria-valuemax={Math.max(0, hist.length - 1)}
      aria-valuenow={cursor}
      tabIndex={0}
    >
      <canvas ref={canvas} />
    </div>
  );
}
