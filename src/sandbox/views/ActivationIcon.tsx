import { ACTIVATIONS } from '../engine/activations';
import type { ActivationId } from '../engine/types';

const ZMIN = -4;
const ZMAX = 4;

/**
 * 活性化関数の小さな形。ノードの脇の印にも、選択肢のボタンにも使う。
 * 「ReLU」という名前ではなく、この形そのもので選べるようにするための部品。
 */
export function ActivationIcon({ id, w = 28, h = 18 }: { id: ActivationId; w?: number; h?: number }) {
  const a = ACTIVATIONS[id];
  const [ymin, ymax] = a.range;
  const pad = Math.min(3, w * 0.08, h * 0.08);
  const sx = (v: number) => pad + ((v - ZMIN) / (ZMAX - ZMIN)) * (w - pad * 2);
  const sy = (v: number) => h - pad - ((v - ymin) / (ymax - ymin)) * (h - pad * 2);
  const pts = Array.from({ length: 33 }, (_, i) => {
    const z = ZMIN + ((ZMAX - ZMIN) * i) / 32;
    return `${sx(z).toFixed(1)},${sy(a.f(z)).toFixed(1)}`;
  }).join(' ');
  return (
    <svg className="sb-actic" viewBox={`0 0 ${w} ${h}`} width={w} height={h} aria-hidden="true">
      <polyline points={pts} fill="none" stroke="currentColor" strokeWidth={1.6} strokeLinejoin="round" strokeLinecap="round" />
    </svg>
  );
}
