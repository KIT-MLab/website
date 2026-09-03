import { createPortal } from 'react-dom';
import { ACTIVATIONS } from '../engine/activations';
import type { ActivationId } from '../engine/types';

const ZMIN = -4;
const ZMAX = 4;
/** グラフ1枚の座標系。実際の描画サイズはセルいっぱいまで CSS で拡大される */
const GW = 420;
const GH = 260;
const PAD_L = 46;
const PAD_R = 14;
const PAD_T = 14;
const PAD_B = 34;

const XTICKS = [-4, -2, 0, 2, 4];

type Props = {
  open: boolean;
  choices: ActivationId[];
  onPick: (id: ActivationId) => void;
  onClose: () => void;
};

/** 1つぶんの、軸の数字まで正確に描いた大きなグラフ */
function Graph({ id }: { id: ActivationId }) {
  const a = ACTIVATIONS[id];
  const [ymin, ymax] = a.range;
  const sx = (v: number) => PAD_L + ((v - ZMIN) / (ZMAX - ZMIN)) * (GW - PAD_L - PAD_R);
  const sy = (v: number) => GH - PAD_B - ((v - ymin) / (ymax - ymin)) * (GH - PAD_T - PAD_B);

  const pts = Array.from({ length: 161 }, (_, i) => {
    const z = ZMIN + ((ZMAX - ZMIN) * i) / 160;
    return `${sx(z).toFixed(1)},${sy(a.f(z)).toFixed(1)}`;
  }).join(' ');

  return (
    <svg className="sb-actpick__graph" viewBox={`0 0 ${GW} ${GH}`} preserveAspectRatio="xMidYMid meet" aria-hidden="true">
      {/* 目盛り線 */}
      {XTICKS.map((v) => (
        <line key={`gx${v}`} x1={sx(v)} y1={PAD_T} x2={sx(v)} y2={GH - PAD_B} className="sb-actpick__gridline" />
      ))}
      {a.ticksY.map((v) => (
        <line key={`gy${v}`} x1={PAD_L} y1={sy(v)} x2={GW - PAD_R} y2={sy(v)} className="sb-actpick__gridline" />
      ))}
      {/* 0 の軸は太く */}
      <line x1={sx(0)} y1={PAD_T} x2={sx(0)} y2={GH - PAD_B} className="sb-actpick__axis" />
      <line x1={PAD_L} y1={sy(0)} x2={GW - PAD_R} y2={sy(0)} className="sb-actpick__axis" />

      {/* 目盛りの数字 */}
      {XTICKS.map((v) => (
        <text key={`tx${v}`} className="sb-actpick__tick" x={sx(v)} y={GH - PAD_B + 20} textAnchor="middle">
          {v}
        </text>
      ))}
      {a.ticksY.map((v) => (
        <text key={`ty${v}`} className="sb-actpick__tick" x={PAD_L - 8} y={sy(v) + 5} textAnchor="end">
          {v}
        </text>
      ))}
      <text className="sb-actpick__axlabel" x={GW - PAD_R} y={GH - PAD_B + 20} textAnchor="end">
        z
      </text>
      <text className="sb-actpick__axlabel" x={PAD_L - 8} y={PAD_T + 4} textAnchor="end">
        a
      </text>

      <polyline points={pts} fill="none" className="sb-actpick__curve" />
    </svg>
  );
}

/**
 * 活性化関数の選択画面。全画面を覆い、大きな枠でそれぞれの形を正確なグラフで見せる。
 * 選ぶとこの画面は閉じ、選んだ活性化が「塗る」筆になる（Sandbox.tsx 側で状態を持つ）。
 */
export function ActivationPicker({ open, choices, onPick, onClose }: Props) {
  if (!open || typeof document === 'undefined') return null;

  const n = choices.length;
  const cols = n === 3 ? 3 : n <= 2 ? Math.max(1, n) : n <= 4 ? 2 : 3;

  return createPortal(
    <div className="sb-actpick" role="dialog" aria-modal="true" aria-label="活性化関数を選ぶ">
      <div className="sb-actpick__head">
        <h2>活性化関数を選ぶ</h2>
        <p>選ぶとカーソルが塗る状態になります。ノードをクリックすると、その活性化になります</p>
        <button type="button" className="sb-btn" onClick={onClose}>
          閉じる（Esc）
        </button>
      </div>
      <div className="sb-actpick__grid" style={{ gridTemplateColumns: `repeat(${cols}, 1fr)` }}>
        {choices.map((id) => {
          const a = ACTIVATIONS[id];
          return (
            <button key={id} type="button" className="sb-actpick__cell" onClick={() => onPick(id)}>
              <Graph id={id} />
              <span className="sb-actpick__name">{a.label}</span>
              <span className="sb-actpick__formula">{a.formula}</span>
            </button>
          );
        })}
      </div>
    </div>,
    document.body,
  );
}
