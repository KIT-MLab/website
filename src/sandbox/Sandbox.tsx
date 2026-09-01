import { useMemo, useState } from 'react';
import { ACTIVATIONS, ACTIVATION_ORDER } from './engine/activations';
import { cloneNetwork, forward, LOGIC_INPUTS } from './engine/network';
import type { ActivationId, Network } from './engine/types';
import { STAGES } from './stages';
import { ActivationChart } from './views/ActivationChart';
import { DecisionPlane } from './views/DecisionPlane';
import { fmt } from './views/format';
import { Inspector } from './views/Inspector';
import { NetworkDiagram } from './views/NetworkDiagram';
import { TruthTable, type LogicRow } from './views/TruthTable';
import './sandbox.css';

type SliderProps = {
  label: string;
  value: number;
  min: number;
  max: number;
  onChange: (v: number) => void;
};

function Slider({ label, value, min, max, onChange }: SliderProps) {
  return (
    <label className="sb-slider">
      <span className="sb-slider__label">{label}</span>
      <input
        type="range"
        min={min}
        max={max}
        step={0.05}
        value={value}
        onChange={(e) => onChange(Number(e.target.value))}
      />
      <span className="sb-slider__value">{fmt(value)}</span>
    </label>
  );
}

export default function Sandbox() {
  const [stageIdx, setStageIdx] = useState(0);
  const [net, setNet] = useState<Network>(() => cloneNetwork(STAGES[0].initial));
  const [freeInput, setFreeInput] = useState<number[]>([1, 0]);
  const [selected, setSelected] = useState(3);

  const stage = STAGES[stageIdx];
  const layer = net.layers[0];
  const [w1, w2] = layer.w[0];
  const b = layer.b[0];
  const activation = ACTIVATIONS[layer.act];

  const goStage = (i: number) => {
    setStageIdx(i);
    setNet(cloneNetwork(STAGES[i].initial));
    setFreeInput([1, 0]);
    setSelected(3);
  };

  const edit = (mutate: (n: Network) => void) =>
    setNet((prev) => {
      const next = cloneNetwork(prev);
      mutate(next);
      return next;
    });

  const rows: LogicRow[] = useMemo(() => {
    if (stage.mode !== 'logic' || !stage.target) return [];
    return LOGIC_INPUTS.map((x, i) => {
      const t = forward(net, x);
      const a = t.output[0];
      return { x, z: t.layers[0].z[0], a, target: stage.target![i], ok: Math.abs(a - stage.target![i]) < 0.5 };
    });
  }, [net, stage]);

  const shownInput = stage.mode === 'logic' ? LOGIC_INPUTS[selected] : freeInput;
  const trace = forward(net, shownInput);
  const cleared = stage.mode === 'logic' && rows.length > 0 && rows.every((r) => r.ok);
  const has = (v: string) => stage.views.includes(v as never);

  return (
    <div className="sb">
      <nav className="sb-stages" aria-label="ステージ">
        {STAGES.map((s, i) => (
          <button
            key={s.id}
            type="button"
            className="sb-stages__btn"
            aria-pressed={i === stageIdx}
            onClick={() => goStage(i)}
          >
            <span className="sb-stages__no">{i + 1}</span>
            {s.title}
          </button>
        ))}
      </nav>

      <header className="sb-head">
        <h2 className="sb-head__title">
          <span className="sb-head__no">ステージ {stageIdx + 1}</span>
          {stage.title}
        </h2>
        <p className="sb-head__lead">{stage.lead}</p>
      </header>

      <div className="sb-grid">
        <section className="sb-panel sb-panel--controls">
          <h3 className="sb-panel__t">つまみ</h3>
          {stage.mode === 'free' && (
            <div className="sb-group">
              <p className="sb-group__t">入力</p>
              <Slider label="x₁" value={freeInput[0]} min={0} max={1} onChange={(v) => setFreeInput([v, freeInput[1]])} />
              <Slider label="x₂" value={freeInput[1]} min={0} max={1} onChange={(v) => setFreeInput([freeInput[0], v])} />
            </div>
          )}
          <div className="sb-group">
            <p className="sb-group__t">重みとバイアス</p>
            <Slider label="w₁" value={w1} min={-2} max={2} onChange={(v) => edit((n) => { n.layers[0].w[0][0] = v; })} />
            <Slider label="w₂" value={w2} min={-2} max={2} onChange={(v) => edit((n) => { n.layers[0].w[0][1] = v; })} />
            <Slider label="b" value={b} min={-2} max={2} onChange={(v) => edit((n) => { n.layers[0].b[0] = v; })} />
          </div>
          {!stage.lockActivation && (
            <div className="sb-group">
              <p className="sb-group__t">活性化関数</p>
              <div className="sb-acts">
                {ACTIVATION_ORDER.map((id) => (
                  <button
                    key={id}
                    type="button"
                    className="sb-acts__btn"
                    aria-pressed={layer.act === id}
                    onClick={() => edit((n) => { n.layers[0].act = id as ActivationId; })}
                  >
                    {ACTIVATIONS[id].label}
                  </button>
                ))}
              </div>
            </div>
          )}
          <button type="button" className="sb-reset" onClick={() => goStage(stageIdx)}>
            このステージを最初から
          </button>
        </section>

        {has('diagram') && (
          <section className="sb-panel">
            <h3 className="sb-panel__t">ネットワーク</h3>
            <NetworkDiagram net={net} trace={trace} inputLabels={['x₁', 'x₂']} />
            {stage.mode === 'logic' && (
              <p className="sb-panel__sub">
                入力 ({shownInput[0]}, {shownInput[1]}) を流したところ
              </p>
            )}
          </section>
        )}

        {has('activationChart') && (
          <section className="sb-panel">
            <h3 className="sb-panel__t">活性化関数の形</h3>
            <ActivationChart activation={activation} z={trace.layers[0].z[0]} a={trace.output[0]} />
          </section>
        )}

        {has('truthTable') && stage.target && (
          <section className="sb-panel">
            <h3 className="sb-panel__t">真理値表</h3>
            <TruthTable rows={rows} targetName={stage.targetName ?? ''} selected={selected} onSelect={setSelected} />
          </section>
        )}

        {has('plane') && (
          <section className="sb-panel">
            <h3 className="sb-panel__t">入力平面と境界線</h3>
            <DecisionPlane w1={w1} w2={w2} b={b} rows={rows} />
          </section>
        )}

        {has('inspector') && (
          <section className="sb-panel sb-panel--wide">
            <h3 className="sb-panel__t">計算の中身</h3>
            <Inspector net={net} trace={trace} inputLabels={['x₁', 'x₂']} />
          </section>
        )}
      </div>

      {cleared && (
        <div className="sb-note sb-note--ok">
          <p className="sb-note__t">できました</p>
          <p>{stage.reward}</p>
          {stageIdx < STAGES.length - 1 && (
            <button type="button" className="sb-next" onClick={() => goStage(stageIdx + 1)}>
              次のステージへ
            </button>
          )}
        </div>
      )}

      {stage.impossible && (
        <details className="sb-note sb-note--hint">
          <summary>どうしても合わないとき</summary>
          <p>
            合いません。このニューロンにできるのは、平面に<b>1本の直線</b>を引いて上と下に分けることだけです。
            XOR が1を出すべき点は (0,1) と (1,0)、0を出すべき点は (0,0) と (1,1)。
            対角に置かれた2点ずつを1本の直線で分けることはできません。
          </p>
          <p>
            これが1969年に指摘された単層パーセプトロンの限界で、ニューラルネットワーク研究が一度停滞する原因になりました。
            解決策は、ニューロンを<b>層として重ねる</b>こと。次のステージで作ります（準備中）。
          </p>
        </details>
      )}

      {stage.mode === 'free' && <div className="sb-note"><p>{stage.reward}</p></div>}
    </div>
  );
}
