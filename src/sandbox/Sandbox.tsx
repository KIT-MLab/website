import { useEffect, useMemo, useState } from 'react';
import { ACTIVATIONS, ACTIVATION_ORDER } from './engine/activations';
import { cloneNetwork, forward, LOGIC_INPUTS } from './engine/network';
import type { ActivationId, Network } from './engine/types';
import {
  INITIAL_NET,
  OBJECTIVES,
  PARTS,
  TOOLS,
  VIEWS,
  type Grant,
  type PartId,
  type ToolId,
  type ViewId,
} from './objectives';
import { ActivationChart } from './views/ActivationChart';
import { DecisionPlane } from './views/DecisionPlane';
import { fmt } from './views/format';
import { Inspector } from './views/Inspector';
import { NetworkDiagram } from './views/NetworkDiagram';
import { TruthTable, type LogicRow } from './views/TruthTable';
import './sandbox.css';

type Unlocked = { parts: PartId[]; tools: ToolId[]; views: ViewId[] };

const START: Unlocked = { parts: ['weight', 'bias'], tools: ['inspect'], views: ['network', 'calc'] };

const label = (id: ViewId) => VIEWS.find((v) => v.id === id)!.label;

export default function Sandbox() {
  const [net, setNet] = useState<Network>(() => cloneNetwork(INITIAL_NET));
  const [objIdx, setObjIdx] = useState(0);
  const [unlocked, setUnlocked] = useState<Unlocked>(START);
  const [off, setOff] = useState<ViewId[]>([]);
  const [tool, setTool] = useState<ToolId>('inspect');
  const [main, setMain] = useState<ViewId>('network');
  const [row, setRow] = useState(3);
  const [hover, setHover] = useState<string | null>(null);
  const [flash, setFlash] = useState<string | null>(null);
  const [help, setHelp] = useState<{ title: string; body: string; action?: () => void; actionLabel?: string } | null>(null);

  const objective = OBJECTIVES[objIdx] as (typeof OBJECTIVES)[number] | undefined;
  const target = objective?.target ?? OBJECTIVES[OBJECTIVES.length - 1].target;
  const shown = unlocked.views.filter((v) => !off.includes(v));
  const last = net.layers[net.layers.length - 1];

  const grant = (g: Grant) =>
    setUnlocked((u) => ({
      parts: [...new Set([...u.parts, ...(g.parts ?? [])])],
      tools: [...new Set([...u.tools, ...(g.tools ?? [])])],
      views: [...new Set([...u.views, ...(g.views ?? [])])],
    }));

  /* 目標を満たしたら自動で次へ進み、部品や窓が増える */
  useEffect(() => {
    if (!objective || !objective.check(net)) return;
    grant(objective.grant);
    setFlash(objective.done);
    setObjIdx((i) => i + 1);
  }, [net, objIdx]);

  useEffect(() => {
    if (!flash) return;
    const t = setTimeout(() => setFlash(null), 6000);
    return () => clearTimeout(t);
  }, [flash]);

  /* 主役の窓を消したら、残っている窓に移す */
  useEffect(() => {
    if (!shown.includes(main) && shown.length > 0) setMain(shown[0]);
  }, [shown.join(','), main]);

  const edit = (mutate: (n: Network) => void) =>
    setNet((prev) => {
      const next = cloneNetwork(prev);
      mutate(next);
      return next;
    });

  const clamp = (v: number) => Math.min(2, Math.max(-2, Math.round(v * 100) / 100));

  const rows: LogicRow[] = useMemo(
    () =>
      LOGIC_INPUTS.map((x, i) => {
        const t = forward(net, x);
        const a = t.output[0];
        const tg = target ? target[i] : null;
        return {
          x,
          z: t.layers[t.layers.length - 1].z[0],
          a,
          target: tg,
          ok: tg === null ? null : Math.abs(a - tg) < 0.5,
        };
      }),
    [net, target],
  );

  const trace = forward(net, LOGIC_INPUTS[row]);

  const addLayer = () =>
    setNet({
      layers: [
        { w: [[0.5, 0.5], [0.5, 0.5]], b: [0, 0], act: 'step' },
        { w: [[0.5, 0.5]], b: [0], act: 'step' },
      ],
    });

  const addHidden = () =>
    edit((n) => {
      n.layers[0].w.push([0.5, 0.5]);
      n.layers[0].b.push(0);
      n.layers[1].w.forEach((r) => r.push(0.5));
    });

  const removeHidden = (o: number) =>
    edit((n) => {
      n.layers[0].w.splice(o, 1);
      n.layers[0].b.splice(o, 1);
      n.layers[1].w.forEach((r) => r.splice(o, 1));
    });

  const restart = () => {
    setNet(cloneNetwork(INITIAL_NET));
    setObjIdx(0);
    setUnlocked(START);
    setOff([]);
    setTool('inspect');
    setMain('network');
    setFlash(null);
  };

  const counts = [2, ...net.layers.map((l) => l.b.length)];
  const nodeName = (col: number, i: number) =>
    col === 0 ? `x${i + 1}` : col === counts.length - 1 ? '出力' : `h${i + 1}`;

  const view = (id: ViewId, small: boolean) => {
    switch (id) {
      case 'network':
        return (
          <NetworkDiagram
            net={net}
            trace={trace}
            tool={tool}
            small={small}
            onWeight={(li, o, i, d) => edit((n) => { n.layers[li].w[o][i] = clamp(n.layers[li].w[o][i] + d); })}
            onBias={(li, o, d) => edit((n) => { n.layers[li].b[o] = clamp(n.layers[li].b[o] + d); })}
            onHover={setHover}
            onAddHidden={addHidden}
            onRemoveHidden={removeHidden}
          />
        );
      case 'calc':
        return <Inspector net={net} trace={trace} inputLabels={['x₁', 'x₂']} />;
      case 'actchart':
        return (
          <ActivationChart
            activation={ACTIVATIONS[last.act]}
            z={trace.layers[trace.layers.length - 1].z[0]}
            a={trace.output[0]}
            small={small}
          />
        );
      case 'truth':
        return <TruthTable rows={rows} selected={row} onSelect={small ? undefined : setRow} small={small} />;
      case 'plane':
        return <DecisionPlane net={net} rows={rows} small={small} />;
    }
  };

  const openHelp = (title: string, body: string, action?: () => void, actionLabel?: string) =>
    setHelp({ title, body, action, actionLabel });

  return (
    <div className="sb">
      <header className="sb-bar">
        <a className="sb-bar__back" href="/learn/">
          ← 学習
        </a>
        <div className="sb-bar__set">
          <span className="sb-bar__cap">道具</span>
          {TOOLS.map((t) => {
            const open = unlocked.tools.includes(t.id);
            return (
              <button
                key={t.id}
                type="button"
                className="sb-chip"
                disabled={!open}
                aria-pressed={tool === t.id}
                title={open ? t.help : '未解禁'}
                onClick={() => setTool(t.id)}
              >
                {t.label}
              </button>
            );
          })}
        </div>
        <div className="sb-bar__set">
          <span className="sb-bar__cap">窓</span>
          {VIEWS.map((v) => {
            const open = unlocked.views.includes(v.id);
            return (
              <button
                key={v.id}
                type="button"
                className="sb-chip"
                disabled={!open}
                aria-pressed={open && !off.includes(v.id)}
                title={open ? '表示のオンオフ' : '未解禁'}
                onClick={() => setOff((o) => (o.includes(v.id) ? o.filter((x) => x !== v.id) : [...o, v.id]))}
              >
                {v.label}
              </button>
            );
          })}
        </div>
        <button type="button" className="sb-chip sb-bar__restart" onClick={restart}>
          最初から
        </button>
      </header>

      <div className="sb-body">
        <aside className="sb-rail" aria-label="小窓">
          {shown
            .filter((v) => v !== main)
            .map((v) => (
              <button key={v} type="button" className="sb-thumb" onClick={() => setMain(v)} title={`${label(v)}を大きく見る`}>
                <span className="sb-thumb__t">{label(v)}</span>
                <span className="sb-thumb__box">{view(v, true)}</span>
              </button>
            ))}
        </aside>

        <main className="sb-main">
          <h1 className="sb-main__t">{label(main)}</h1>
          <div className="sb-main__stage">{view(main, false)}</div>
          <p className="sb-main__read">{hover ?? (tool === 'adjust' ? '線やノードを上下にドラッグ' : ' ')}</p>
        </main>

        <aside className="sb-side">
          <section className="sb-box">
            <h2 className="sb-box__t">部品</h2>
            <div className="sb-parts">
              {PARTS.map((p) => {
                const open = unlocked.parts.includes(p.id);
                return (
                  <button
                    key={p.id}
                    type="button"
                    className="sb-part"
                    data-open={open}
                    onClick={() => open && openHelp(p.label, p.help)}
                    disabled={!open}
                  >
                    {open ? '■' : '□'} {p.label}
                  </button>
                );
              })}
            </div>
            {unlocked.parts.includes('layer2') && net.layers.length === 1 && (
              <button type="button" className="sb-btn" onClick={addLayer}>
                2層目を足す
              </button>
            )}
          </section>

          <section className="sb-box">
            <h2 className="sb-box__t">見ている入力</h2>
            <div className="sb-inputs">
              {LOGIC_INPUTS.map((x, i) => (
                <button key={i} type="button" className="sb-chip" aria-pressed={row === i} onClick={() => setRow(i)}>
                  ({x[0]},{x[1]})
                </button>
              ))}
            </div>
          </section>

          {unlocked.parts.includes('activation') && (
            <section className="sb-box">
              <h2 className="sb-box__t">活性化関数</h2>
              <div className="sb-inputs">
                {ACTIVATION_ORDER.map((id) => (
                  <button
                    key={id}
                    type="button"
                    className="sb-chip"
                    aria-pressed={last.act === id}
                    onClick={() => edit((n) => { n.layers.forEach((l) => { l.act = id as ActivationId; }); })}
                  >
                    {ACTIVATIONS[id].label}
                  </button>
                ))}
              </div>
            </section>
          )}

          <section className="sb-box sb-box--grow">
            <h2 className="sb-box__t">つまみ</h2>
            {net.layers.map((layer, li) =>
              layer.w.map((wrow, o) => (
                <div className="sb-knobs" key={`${li}-${o}`}>
                  <p className="sb-knobs__t">{nodeName(li + 1, o)}</p>
                  {wrow.map((w, i) => (
                    <Knob
                      key={i}
                      label={`← ${nodeName(li, i)}`}
                      value={w}
                      onChange={(v) => edit((n) => { n.layers[li].w[o][i] = v; })}
                    />
                  ))}
                  <Knob
                    label="バイアス"
                    value={layer.b[o]}
                    onChange={(v) => edit((n) => { n.layers[li].b[o] = v; })}
                  />
                </div>
              )),
            )}
          </section>
        </aside>
      </div>

      <footer className="sb-goal">
        {objective ? (
          <>
            <span className="sb-goal__no">
              目標 {objIdx + 1} / {OBJECTIVES.length}
            </span>
            <span className="sb-goal__text">{objective.text}</span>
            <button
              type="button"
              className="sb-goal__q"
              aria-label="ヒント"
              onClick={() =>
                openHelp(
                  objective.text,
                  objective.help,
                  objective.giveUp
                    ? () => {
                        grant(objective.giveUp!.grant);
                        setFlash(objective.giveUp!.done);
                        setObjIdx((i) => i + 1);
                        setHelp(null);
                      }
                    : undefined,
                  objective.giveUp?.label,
                )
              }
            >
              ?
            </button>
          </>
        ) : (
          <span className="sb-goal__text">目標はここまでです。自由にいじってください</span>
        )}
      </footer>

      {flash && (
        <div className="sb-flash" role="status">
          {flash}
        </div>
      )}

      {help && (
        <div className="sb-modal" role="dialog" aria-modal="true" onClick={() => setHelp(null)}>
          <div className="sb-modal__panel" onClick={(e) => e.stopPropagation()}>
            <h2 className="sb-modal__t">{help.title}</h2>
            <p className="sb-modal__b">{help.body}</p>
            <div className="sb-modal__foot">
              {help.action && (
                <button type="button" className="sb-btn" onClick={help.action}>
                  {help.actionLabel}
                </button>
              )}
              <button type="button" className="sb-btn" onClick={() => setHelp(null)}>
                閉じる
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function Knob({ label, value, onChange }: { label: string; value: number; onChange: (v: number) => void }) {
  return (
    <label className="sb-knob">
      <span className="sb-knob__l">{label}</span>
      <input type="range" min={-2} max={2} step={0.05} value={value} onChange={(e) => onChange(Number(e.target.value))} />
      <span className="sb-knob__v">{fmt(value)}</span>
    </label>
  );
}
