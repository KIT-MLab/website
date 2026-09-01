import type { Activation } from '../engine/activations';
import { fmt } from './format';

const W = 260;
const H = 170;
const PAD = 26;
const ZMIN = -4;
const ZMAX = 4;

type Props = { activation: Activation; z: number; a: number };

export function ActivationChart({ activation, z, a }: Props) {
  const [ymin, ymax] = activation.range;
  const sx = (v: number) => PAD + ((v - ZMIN) / (ZMAX - ZMIN)) * (W - PAD * 2);
  const sy = (v: number) => H - PAD - ((v - ymin) / (ymax - ymin)) * (H - PAD * 2);

  // ステップ関数は不連続なので、線でつながないよう間隔を細かく取る
  const samples = Array.from({ length: 241 }, (_, i) => {
    const zz = ZMIN + ((ZMAX - ZMIN) * i) / 240;
    return `${sx(zz)},${sy(activation.f(zz))}`;
  }).join(' ');

  const zc = Math.min(Math.max(z, ZMIN), ZMAX);

  return (
    <div className="sb-actchart">
      <svg viewBox={`0 0 ${W} ${H}`} role="img" aria-label={`${activation.label}のグラフ`}>
        <line x1={PAD} y1={sy(0)} x2={W - PAD} y2={sy(0)} stroke="var(--color-ink-2)" strokeWidth={1} opacity={0.4} />
        <line x1={sx(0)} y1={PAD} x2={sx(0)} y2={H - PAD} stroke="var(--color-ink-2)" strokeWidth={1} opacity={0.4} />
        <polyline points={samples} fill="none" stroke="var(--color-ink)" strokeWidth={2} />
        <line x1={sx(zc)} y1={PAD} x2={sx(zc)} y2={H - PAD} stroke="var(--color-accent)" strokeWidth={1} strokeDasharray="3 3" />
        <circle cx={sx(zc)} cy={sy(Math.min(Math.max(a, ymin), ymax))} r={5} fill="var(--color-accent)" />
        <text className="sb-axis" x={W - PAD} y={sy(0) + 15} textAnchor="end">z</text>
        <text className="sb-axis" x={sx(0) - 6} y={PAD + 4} textAnchor="end">a</text>
      </svg>
      <p className="sb-actchart__formula">{activation.formula}</p>
      <p className="sb-actchart__note">{activation.note}</p>
      <p className="sb-actchart__now">
        いまの位置: z = {fmt(z, 3)} → a = {fmt(a, 3)}
      </p>
    </div>
  );
}
