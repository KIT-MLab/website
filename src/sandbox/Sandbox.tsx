import { useEffect, useMemo, useReducer, useRef, useState } from 'react';
import { ACTIVATIONS, ACTIVATION_ORDER } from './engine/activations';
import { layerGradNorms } from './engine/backward';
import { INIT_ORDER, INITS, initNetwork, paramCount, type InitId, type Shape } from './engine/init';
import { LOSS_ORDER, LOSSES } from './engine/losses';
import { cloneNetwork, forward, LOGIC_INPUTS } from './engine/network';
import { createOptimizerState, OPTIMIZER_ORDER, OPTIMIZERS } from './engine/optimizers';
import { uniform, type RngState } from './engine/random';
import { DEFAULT_CONFIG, datasetLoss, trainStep } from './engine/trainer';
import type {
  ActivationId,
  Dataset,
  ForwardTrace,
  LossId,
  Network,
  OptimizerState,
  ParamShape,
  TrainConfig,
} from './engine/types';
import { ALL_OPS, OP_LABEL, opsUpTo, STAGES, type OpId, type Stage } from './stages';
import { ActivationChart } from './views/ActivationChart';
import { DecisionPlane } from './views/DecisionPlane';
import { FitCurve } from './views/FitCurve';
import { FitPlane } from './views/FitPlane';
import { fmt } from './views/format';
import { GradBars } from './views/GradBars';
import { Inspector } from './views/Inspector';
import { LossBar } from './views/LossBar';
import { NetworkDiagram } from './views/NetworkDiagram';
import { TruthTable, type LogicRow } from './views/TruthTable';
import './sandbox.css';

/* ------------------------------------------------------------------ */

type ViewId = 'fit' | 'network' | 'calc' | 'actchart' | 'truth' | 'grad';
type ToolId = 'inspect' | 'adjust' | 'place';

const VIEW_LABEL: Record<ViewId, string> = {
  fit: '当てはまり',
  network: 'ネットワーク',
  calc: '計算の中身',
  actchart: '活性化関数',
  truth: '真理値表',
  grad: '勾配の大きさ',
};

const TOOLS: { id: ToolId; label: string; need?: OpId; hint: string }[] = [
  { id: 'inspect', label: '観察', hint: 'カーソルを合わせると値が出ます' },
  { id: 'adjust', label: '調整', need: 'weights', hint: '線やノードを上下にドラッグして重みを変えます' },
  { id: 'place', label: '設置', need: 'place', hint: '「＋」で層を置き、見出しの「×」で外します' },
];

/** 損失は 1e-30 まで落ちることがあるので、小さいときは指数表記にする */
const sci = (v: number) => (!Number.isFinite(v) ? '—' : v !== 0 && Math.abs(v) < 0.001 ? v.toExponential(1) : fmt(v, 4));

const HIST_MAX = 4000;
const DEFAULT_HIDDEN = 4;

type Entry = { step: number; net: Network; loss: number };

type Core = {
  net: Network;
  opt: OptimizerState;
  rng: RngState;
  hist: Entry[];
  cursor: number;
  grad: ParamShape | null;
};

const shapeOf = (net: Network, inDim: number): Shape => ({
  sizes: [inDim, ...net.layers.map((l) => l.b.length)],
  acts: net.layers.map((l) => l.act),
});

function build(shape: Shape, initId: InitId, seed: number, data: Dataset, lossId: LossId): Core {
  const { net, rng } = initNetwork(shape, initId, seed);
  const ok = net.layers.length > 0;
  return {
    net,
    opt: createOptimizerState(net),
    rng,
    hist: [{ step: 0, net, loss: ok ? datasetLoss(net, data, lossId) : NaN }],
    cursor: 0,
    grad: null,
  };
}

function defaultCfg(stage: Stage): TrainConfig {
  return { ...DEFAULT_CONFIG, loss: stage.kind === 'cls2' ? 'bce' : 'mse' };
}

/* ------------------------------------------------------------------ */

export default function Sandbox() {
  const [, force] = useReducer((n: number) => n + 1, 0);

  const [stageIdx, setStageIdx] = useState(0);
  const [maxStage, setMaxStage] = useState(0);
  const [free, setFree] = useState(false);
  const stage = STAGES[stageIdx];

  const [dataOpts, setDataOpts] = useState(stage.dataDefaults);
  const [cfg, setCfg] = useState<TrainConfig>(() => defaultCfg(STAGES[0]));
  const [initId, setInitId] = useState<InitId>('xavier');
  const [seed, setSeed] = useState(77);

  const [tool, setTool] = useState<ToolId>('place');
  const [selected, setSelected] = useState(0);
  const [main, setMain] = useState<ViewId>('network');
  const [off, setOff] = useState<ViewId[]>(['actchart', 'grad']);
  const [sample, setSample] = useState(0);
  const [playing, setPlaying] = useState(false);
  const [speed, setSpeed] = useState(10);
  const [hover, setHover] = useState<string | null>(null);
  const [flash, setFlash] = useState<string | null>(null);
  const [help, setHelp] = useState<{ title: string; body: string } | null>(null);
  const [wasCleared, setWasCleared] = useState(false);

  const inDim = stage.inputLabels.length;
  const data = useMemo(() => stage.data(dataOpts), [stage, dataOpts]);
  const outDim = data.y[0].length;

  const core = useRef<Core>(undefined as unknown as Core);
  if (core.current === undefined) {
    core.current = build(STAGES[0].start, 'xavier', 77, STAGES[0].data(STAGES[0].dataDefaults), 'mse');
  }

  const ops = free ? new Set(ALL_OPS) : opsUpTo(stageIdx);
  const can = (o: OpId) => ops.has(o);

  const c = core.current;
  const net = c.hist[c.cursor].net;
  const valid =
    net.layers.length > 0 &&
    net.layers[0].w[0].length === inDim &&
    net.layers[net.layers.length - 1].b.length === outDim;

  /* -------------------- 判定 -------------------- */

  const judge = valid ? datasetLoss(net, data, stage.judgeLoss) : NaN;
  const params = valid ? paramCount(net) : 0;
  const lim = stage.limits;
  const overParams = !!lim?.maxParams && params > lim.maxParams;
  const overLayers = !!lim?.maxLayers && net.layers.length > lim.maxLayers;
  const cleared = valid && judge <= stage.threshold && !overParams && !overLayers;

  const accuracy = useMemo(() => {
    if (!valid || (stage.kind !== 'cls2' && stage.kind !== 'logic')) return null;
    let ok = 0;
    for (let i = 0; i < data.x.length; i++) {
      const o = forward(net, data.x[i]).output[0];
      if (o >= 0.5 === data.y[i][0] >= 0.5) ok++;
    }
    return ok / data.x.length;
  }, [net, data, valid, stage.kind]);

  useEffect(() => {
    if (cleared && !wasCleared) {
      setWasCleared(true);
      setPlaying(false);
      setFlash('クリア');
    }
  }, [cleared, wasCleared]);

  useEffect(() => {
    if (!flash) return;
    const t = setTimeout(() => setFlash(null), 4000);
    return () => clearTimeout(t);
  }, [flash]);

  /* -------------------- 学習ループ -------------------- */

  useEffect(() => {
    if (!playing) return;
    let raf = 0;
    const frame = () => {
      const k = core.current;
      let live = k.hist[k.hist.length - 1];
      for (let i = 0; i < speed; i++) {
        const r = trainStep(live.net, data, cfg, k.opt, k.rng);
        k.opt = r.opt;
        k.rng = r.rng;
        k.grad = r.grad;
        live = { step: live.step + 1, net: r.net, loss: r.loss };
        k.hist.push(live);
      }
      if (k.hist.length > HIST_MAX) {
        const h = k.hist;
        const out: Entry[] = [];
        for (let i = 0; i < h.length; i += 2) out.push(h[i]);
        if (out[out.length - 1] !== h[h.length - 1]) out.push(h[h.length - 1]);
        k.hist = out;
      }
      k.cursor = k.hist.length - 1;
      force();
      raf = requestAnimationFrame(frame);
    };
    raf = requestAnimationFrame(frame);
    return () => cancelAnimationFrame(raf);
  }, [playing, speed, cfg, data]);

  /* -------------------- 操作 -------------------- */

  const stopAtCursor = () => {
    const k = core.current;
    if (k.cursor < k.hist.length - 1) {
      k.hist = k.hist.slice(0, k.cursor + 1);
      k.opt = createOptimizerState(k.hist[k.cursor].net);
      k.grad = null;
    }
  };

  const hasStep = net.layers.some((l) => l.act === 'step');

  const guardTrain = () => {
    if (!valid) {
      setFlash('入力が出力に繋がっていません');
      return false;
    }
    if (hasStep) {
      setFlash('ステップは傾きが 0 なので学習できません');
      return false;
    }
    return true;
  };

  const togglePlay = () => {
    if (playing) {
      setPlaying(false);
      return;
    }
    if (!guardTrain()) return;
    stopAtCursor();
    setPlaying(true);
  };

  const oneStep = () => {
    if (!guardTrain()) return;
    stopAtCursor();
    const k = core.current;
    const live = k.hist[k.hist.length - 1];
    const r = trainStep(live.net, data, cfg, k.opt, k.rng);
    k.opt = r.opt;
    k.rng = r.rng;
    k.grad = r.grad;
    k.hist.push({ step: live.step + 1, net: r.net, loss: r.loss });
    k.cursor = k.hist.length - 1;
    force();
  };

  /** いまの形のまま重みを初期値に戻す（履歴も消える） */
  const resetWeights = (newSeed?: number) => {
    const s = newSeed ?? seed;
    if (newSeed !== undefined) setSeed(newSeed);
    core.current = build(shapeOf(net, inDim), initId, s, data, cfg.loss);
    setPlaying(false);
    setWasCleared(false);
    force();
  };

  const scrub = (i: number) => {
    const k = core.current;
    k.cursor = i;
    k.opt = createOptimizerState(k.hist[i].net);
    setPlaying(false);
    force();
  };

  /** 手で重みを変える。以後の履歴は捨てて、そこから続けられるようにする */
  const editNet = (mutate: (n: Network) => void) => {
    const k = core.current;
    const n = cloneNetwork(net);
    mutate(n);
    k.hist = k.hist.slice(0, k.cursor + 1);
    k.hist[k.cursor] = {
      ...k.hist[k.cursor],
      net: n,
      loss: n.layers.length ? datasetLoss(n, data, cfg.loss) : NaN,
    };
    k.opt = createOptimizerState(n);
    k.grad = null;
    setPlaying(false);
    force();
  };

  /** 形を変える。重みは引き直しになる */
  const reshape = (sizes: number[], acts: ActivationId[]) => {
    core.current = build({ sizes, acts }, initId, seed, data, cfg.loss);
    setPlaying(false);
    setWasCleared(false);
    force();
  };

  const cur = shapeOf(net, inDim);

  const insertLayer = (gap: number) => {
    const sizes = [...cur.sizes];
    const acts = [...cur.acts];
    const last = gap === acts.length;
    sizes.splice(gap + 1, 0, last ? outDim : DEFAULT_HIDDEN);
    /* 新しい中間層は、すぐ後ろの層と同じ活性化から始める */
    acts.splice(gap, 0, last ? 'identity' : acts[gap]);
    reshape(sizes, acts);
    setSelected(gap);
  };

  const removeLayer = (li: number) => {
    if (net.layers.length <= 1) return;
    const sizes = [...cur.sizes];
    const acts = [...cur.acts];
    sizes.splice(li + 1, 1);
    acts.splice(li, 1);
    sizes[sizes.length - 1] = outDim;
    reshape(sizes, acts);
    setSelected(Math.min(li, acts.length - 1));
  };

  /** ノード数だけは重みを残す。並びの重なる所はそのまま引き継ぐ */
  const setNodes = (li: number, delta: number) => {
    const k = net.layers[li].b.length + delta;
    if (k < 1 || k > 8) return;
    let rng = core.current.rng;
    const draw = () => {
      let v: number;
      [v, rng] = uniform(rng, -0.5, 0.5);
      return v;
    };
    const fanIn = li === 0 ? inDim : net.layers[li - 1].b.length;
    editNet((n) => {
      const layer = n.layers[li];
      while (layer.b.length > k) {
        layer.b.pop();
        layer.w.pop();
      }
      while (layer.b.length < k) {
        layer.b.push(0);
        layer.w.push(Array.from({ length: fanIn }, draw));
      }
      const next = n.layers[li + 1];
      if (next) {
        next.w.forEach((row) => {
          while (row.length > k) row.pop();
          while (row.length < k) row.push(draw());
        });
      }
    });
    core.current.rng = rng;
  };

  const goStage = (idx: number) => {
    const s = STAGES[idx];
    const d = s.data(s.dataDefaults);
    const cf = defaultCfg(s);
    core.current = build(s.start, 'xavier', 77, d, cf.loss);
    setStageIdx(idx);
    setMaxStage((m) => Math.max(m, idx));
    setDataOpts(s.dataDefaults);
    setCfg(cf);
    setInitId('xavier');
    setSeed(77);
    setSelected(Math.max(0, s.start.acts.length - 1));
    setSample(0);
    setPlaying(false);
    setWasCleared(false);
    /* 手で組む段階はネットワーク図が主役、学習が解禁されたら当てはまりが主役 */
    const handmade = !opsUpTo(idx).has('train');
    setMain(handmade ? 'network' : 'fit');
    setOff(['actchart', 'grad']);
    setTool(s.start.acts.length === 0 ? 'place' : handmade ? 'adjust' : 'inspect');
    if (idx > maxStage && s.unlocks.length) {
      setFlash(`使えるようになりました: ${s.unlocks.map((o) => OP_LABEL[o]).join(' / ')}`);
    }
    force();
  };

  /* -------------------- 表示用の値 -------------------- */

  const sampleIdx = Math.min(sample, data.x.length - 1);
  const trace: ForwardTrace | null = valid ? forward(net, data.x[sampleIdx]) : null;
  const selLayer = Math.min(selected, Math.max(0, net.layers.length - 1));
  const isOutLayer = selLayer === net.layers.length - 1;
  const gradNorms = core.current.grad ? layerGradNorms(core.current.grad) : null;
  const entry = c.hist[c.cursor];

  const logicRows: LogicRow[] = useMemo(() => {
    if (stage.kind !== 'logic' || !valid) return [];
    return LOGIC_INPUTS.map((x, i) => {
      const t = forward(net, x);
      const a = t.output[0];
      const tg = data.y[i][0];
      return { x, z: t.layers[t.layers.length - 1].z[0], a, target: tg, ok: Math.abs(a - tg) < 0.5 };
    });
  }, [net, data, valid, stage.kind]);

  const availableViews: ViewId[] = ['fit', 'network', 'calc', 'actchart', 'grad'];
  if (stage.kind === 'logic') availableViews.splice(3, 0, 'truth');
  const shown = availableViews.filter((v) => !off.includes(v));

  useEffect(() => {
    if (!shown.includes(main) && shown.length) setMain(shown[0]);
  }, [shown.join(','), main]);

  const renderView = (id: ViewId, small: boolean) => {
    switch (id) {
      case 'fit':
        if (stage.kind === 'reg1')
          return <FitCurve net={net} data={data} range={stage.range[0]} valid={valid} small={small} />;
        if (stage.kind === 'logic')
          return valid ? <DecisionPlane net={net} rows={logicRows} small={small} /> : <p className="sb-empty">層がありません</p>;
        return (
          <FitPlane
            net={net}
            data={data}
            range={stage.range}
            mode={stage.kind === 'cls2' ? 'cls2' : 'reg2'}
            valid={valid}
            small={small}
          />
        );
      case 'network':
        return (
          <NetworkDiagram
            net={net}
            trace={trace}
            inDim={inDim}
            inputLabels={stage.inputLabels}
            tool={tool}
            selected={selLayer}
            small={small}
            canPlace={can('place')}
            canNodes={can('nodes')}
            maxLayers={lim?.maxLayers}
            onSelect={setSelected}
            onWeight={(li, o, i, d) =>
              editNet((n) => {
                n.layers[li].w[o][i] = Math.round((n.layers[li].w[o][i] + d) * 1000) / 1000;
              })
            }
            onBias={(li, o, d) =>
              editNet((n) => {
                n.layers[li].b[o] = Math.round((n.layers[li].b[o] + d) * 1000) / 1000;
              })
            }
            onInsert={insertLayer}
            onRemove={removeLayer}
            onNodes={setNodes}
            onHover={setHover}
          />
        );
      case 'calc':
        if (!trace) return <p className="sb-empty">層がありません</p>;
        return (
          <div className="sb-calcwrap">
            {!small && (
              <div className="sb-calcwrap__nav">
                <button type="button" className="sb-mini" onClick={() => setSample((s) => Math.max(0, s - 1))}>
                  ◀
                </button>
                <span>
                  データ {sampleIdx + 1} / {data.x.length}（
                  {data.x[sampleIdx].map((v) => fmt(v)).join(', ')} → {fmt(data.y[sampleIdx][0])}）
                </span>
                <button
                  type="button"
                  className="sb-mini"
                  onClick={() => setSample((s) => Math.min(data.x.length - 1, s + 1))}
                >
                  ▶
                </button>
              </div>
            )}
            <Inspector net={net} trace={trace} inputLabels={stage.inputLabels} />
          </div>
        );
      case 'actchart': {
        if (!trace) return <p className="sb-empty">層がありません</p>;
        const l = net.layers[selLayer];
        return (
          <ActivationChart
            activation={ACTIVATIONS[l.act]}
            z={trace.layers[selLayer].z[0]}
            a={trace.layers[selLayer].a[0]}
            small={small}
          />
        );
      }
      case 'truth':
        return <TruthTable rows={logicRows} selected={sampleIdx} onSelect={small ? undefined : setSample} small={small} />;
      case 'grad':
        return <GradBars norms={gradNorms} small={small} />;
    }
  };

  const chip = (label: string, on: boolean, onClick: () => void, disabled?: boolean, title?: string) => (
    <button
      key={label}
      type="button"
      className="sb-chip"
      aria-pressed={on}
      disabled={disabled}
      title={title}
      onClick={onClick}
    >
      {label}
    </button>
  );

  const lrPos = Math.round(((Math.log10(cfg.lr) + 3) / 3) * 100);

  return (
    <div className="sb">
      {/* ---- 1段目: ステージと窓 ---- */}
      <header className="sb-top">
        <a className="sb-back" href="/learn/">
          ← 学習
        </a>
        <div className="sb-stages">
          {STAGES.map((s, i) => (
            <button
              key={s.id}
              type="button"
              className="sb-stage"
              aria-pressed={i === stageIdx}
              disabled={!free && i > maxStage}
              title={`${s.no}. ${s.title}`}
              onClick={() => goStage(i)}
            >
              {s.no}
            </button>
          ))}
        </div>
        <button type="button" className="sb-chip sb-free" aria-pressed={free} onClick={() => setFree((f) => !f)}>
          自由モード
        </button>
        <div className="sb-spacer" />
        <span className="sb-cap">窓</span>
        {availableViews.map((v) =>
          chip(VIEW_LABEL[v], !off.includes(v), () =>
            setOff((o) => (o.includes(v) ? o.filter((x) => x !== v) : [...o, v])),
          ),
        )}
      </header>

      {/* ---- 2段目: 目標と道具 ---- */}
      <div className="sb-goal">
        <span className="sb-goal__no">{stage.no}</span>
        <span className="sb-goal__title">{stage.title}</span>
        <span className="sb-goal__text">{stage.goal}</span>
        <button
          type="button"
          className="sb-q"
          aria-label="ヒント"
          onClick={() => setHelp({ title: `${stage.no}. ${stage.title}`, body: stage.help })}
        >
          ?
        </button>
        {overParams && (
          <span className="sb-viol">
            パラメータ {params} / {lim!.maxParams}
          </span>
        )}
        {overLayers && (
          <span className="sb-viol">
            層 {net.layers.length} / {lim!.maxLayers}
          </span>
        )}
        <span className="sb-goal__score" data-ok={cleared || undefined}>
          {stage.judgeLoss === 'bce' ? '交差エントロピー' : '二乗誤差'} {valid ? sci(judge) : '—'} ／ 目標{' '}
          {sci(stage.threshold)}
          {accuracy !== null && ` ／ 正答 ${Math.round(accuracy * 100)}%`}
        </span>
        {cleared && stageIdx < STAGES.length - 1 && (
          <button type="button" className="sb-next" onClick={() => goStage(stageIdx + 1)}>
            次のステージへ →
          </button>
        )}
        <div className="sb-spacer" />
        <span className="sb-cap">道具</span>
        {TOOLS.map((t) =>
          chip(t.label, tool === t.id, () => setTool(t.id), !!t.need && !can(t.need), t.hint),
        )}
      </div>

      {/* ---- 3段目: 学習の操作と履歴 ---- */}
      <div className="sb-transport" data-locked={!can('train') || undefined}>
        <button type="button" className="sb-play" onClick={togglePlay} disabled={!can('train')}>
          {playing ? '⏸' : '▶'}
        </button>
        <button type="button" className="sb-btn" onClick={oneStep} disabled={!can('train') || playing}>
          1歩
        </button>
        <button type="button" className="sb-btn" onClick={() => resetWeights()} disabled={!can('train')}>
          初期化
        </button>
        <span className="sb-speed">
          {[1, 10, 100].map((s) => chip(`×${s}`, speed === s, () => setSpeed(s), !can('train')))}
        </span>
        <LossBar
          hist={c.hist}
          cursor={c.cursor}
          threshold={stage.threshold}
          onScrub={scrub}
          disabled={!can('train')}
        />
        <span className="sb-readout">
          <b>{entry.step.toLocaleString()}</b> 歩 ・ 損失 <b>{sci(entry.loss)}</b>
        </span>
      </div>

      {/* ---- 本体 ---- */}
      <div className="sb-body">
        <aside className="sb-rail" aria-label="小窓">
          {shown
            .filter((v) => v !== main)
            .map((v) => (
              <button key={v} type="button" className="sb-thumb" onClick={() => setMain(v)} title={`${VIEW_LABEL[v]}を大きく見る`}>
                <span className="sb-thumb__t">{VIEW_LABEL[v]}</span>
                <span className="sb-thumb__box">{renderView(v, true)}</span>
              </button>
            ))}
        </aside>

        <main className="sb-main">
          <div className="sb-main__head">
            <h1>{VIEW_LABEL[main]}</h1>
            <span className="sb-main__hint">{hover ?? TOOLS.find((t) => t.id === tool)!.hint}</span>
          </div>
          <div className="sb-main__stage">{renderView(main, false)}</div>
        </main>

        <aside className="sb-side">
          <Section title={`層 ${selLayer + 1}${isOutLayer ? '（出力）' : ''}`}>
            <Row label="ノード数" locked={!can('nodes') || isOutLayer}>
              <button type="button" className="sb-mini" onClick={() => setNodes(selLayer, -1)} disabled={!can('nodes') || isOutLayer}>
                −
              </button>
              <b className="sb-num">{valid ? net.layers[selLayer].b.length : 0}</b>
              <button type="button" className="sb-mini" onClick={() => setNodes(selLayer, 1)} disabled={!can('nodes') || isOutLayer}>
                ＋
              </button>
            </Row>
            <Row label="活性化" locked={!can('activation')} wrap>
              {ACTIVATION_ORDER.map((id) =>
                chip(
                  ACTIVATIONS[id].label.replace('（そのまま）', ''),
                  valid && net.layers[selLayer].act === id,
                  () =>
                    editNet((n) => {
                      n.layers[selLayer].act = id;
                    }),
                  !can('activation') || !valid,
                  ACTIVATIONS[id].note,
                ),
              )}
            </Row>
            <Row label="" locked={!can('place')}>
              <button
                type="button"
                className="sb-btn"
                onClick={() => removeLayer(selLayer)}
                disabled={!can('place') || net.layers.length <= 1}
              >
                この層を外す
              </button>
              <span className="sb-note">パラメータ {params}</span>
            </Row>
          </Section>

          <Section title="学習">
            <Row label="損失関数" locked={!can('loss')} wrap>
              {LOSS_ORDER.map((id) =>
                chip(LOSSES[id].label, cfg.loss === id, () => setCfg((v) => ({ ...v, loss: id })), !can('loss'), LOSSES[id].note),
              )}
            </Row>
            <Row label="オプティマイザ" locked={!can('optimizer')} wrap>
              {OPTIMIZER_ORDER.map((id) =>
                chip(
                  OPTIMIZERS[id].label,
                  cfg.optimizer === id,
                  () => {
                    setCfg((v) => ({ ...v, optimizer: id }));
                    core.current.opt = createOptimizerState(net);
                  },
                  !can('optimizer'),
                  OPTIMIZERS[id].note,
                ),
              )}
            </Row>
            <Row label={`学習率 ${cfg.lr < 0.01 ? cfg.lr.toFixed(4) : cfg.lr.toFixed(3)}`} locked={!can('lr')}>
              <input
                type="range"
                min={0}
                max={100}
                value={lrPos}
                disabled={!can('lr')}
                onChange={(e) => {
                  const p = Number(e.target.value) / 100;
                  const v = 10 ** (-3 + p * 3);
                  setCfg((c2) => ({ ...c2, lr: Number(v.toPrecision(2)) }));
                }}
              />
            </Row>
            <Row label="バッチ" locked={!can('batch')} wrap>
              {[null, 4, 8, 16].map((b) =>
                chip(b === null ? '全部' : String(b), cfg.batch === b, () => setCfg((v) => ({ ...v, batch: b })), !can('batch')),
              )}
            </Row>
            <Row label="初期化" locked={!can('init')} wrap>
              {INIT_ORDER.map((id) =>
                chip(INITS[id].label.replace('ばらつかせる', 'ばらつき'), initId === id, () => {
                  setInitId(id);
                  core.current = build(shapeOf(net, inDim), id, seed, data, cfg.loss);
                  setPlaying(false);
                  setWasCleared(false);
                  force();
                }, !can('init'), INITS[id].note),
              )}
              <button
                type="button"
                className="sb-btn"
                disabled={!can('init')}
                onClick={() => resetWeights(Math.floor(Math.random() * 1e9))}
              >
                引き直す
              </button>
            </Row>
          </Section>

          <Section title="データ">
            <Row label={`点の数 ${dataOpts.n}`} locked={!can('data') || stage.kind === 'logic'}>
              <input
                type="range"
                min={10}
                max={300}
                step={10}
                value={dataOpts.n}
                disabled={!can('data') || stage.kind === 'logic'}
                onChange={(e) => setDataOpts((o) => ({ ...o, n: Number(e.target.value) }))}
              />
            </Row>
            <Row label={`ノイズ ${dataOpts.noise.toFixed(2)}`} locked={!can('data') || stage.kind === 'logic'}>
              <input
                type="range"
                min={0}
                max={0.5}
                step={0.01}
                value={dataOpts.noise}
                disabled={!can('data') || stage.kind === 'logic'}
                onChange={(e) => setDataOpts((o) => ({ ...o, noise: Number(e.target.value) }))}
              />
            </Row>
            <Row label="" locked={!can('data') || stage.kind === 'logic'}>
              <button
                type="button"
                className="sb-btn"
                disabled={!can('data') || stage.kind === 'logic'}
                onClick={() => setDataOpts((o) => ({ ...o, seed: Math.floor(Math.random() * 1e9) }))}
              >
                点を取り直す
              </button>
            </Row>
          </Section>

          <Section title="つまみ" grow>
            {!can('weights') ? (
              <p className="sb-note">まだ使えません</p>
            ) : !valid ? (
              <p className="sb-note">層がありません</p>
            ) : net.layers[selLayer].b.length * (net.layers[selLayer].w[0].length + 1) > 20 ? (
              <p className="sb-note">この層はつまみが多すぎます。図の線を上下にドラッグしてください</p>
            ) : (
              net.layers[selLayer].w.map((row, o) => (
                <div className="sb-knobs" key={o}>
                  <p className="sb-knobs__t">{isOutLayer && row.length ? (net.layers[selLayer].b.length > 1 ? `出力${o + 1}` : '出力') : `h${o + 1}`}</p>
                  {row.map((w, i) => (
                    <Knob
                      key={i}
                      label={selLayer === 0 ? stage.inputLabels[i] : `h${i + 1}`}
                      value={w}
                      onChange={(v) =>
                        editNet((n) => {
                          n.layers[selLayer].w[o][i] = v;
                        })
                      }
                    />
                  ))}
                  <Knob
                    label="バイアス"
                    value={net.layers[selLayer].b[o]}
                    onChange={(v) =>
                      editNet((n) => {
                        n.layers[selLayer].b[o] = v;
                      })
                    }
                  />
                </div>
              ))
            )}
          </Section>

          {!free && (
            <Section title="この先で増える操作">
              <div className="sb-oplist">
                {ALL_OPS.map((o) => (
                  <span key={o} className="sb-op" data-on={can(o) || undefined}>
                    {OP_LABEL[o]}
                  </span>
                ))}
              </div>
            </Section>
          )}
        </aside>
      </div>

      {flash && (
        <div className="sb-flash" role="status" data-clear={flash === 'クリア' || undefined}>
          {flash}
        </div>
      )}

      {help && (
        <div className="sb-modal" role="dialog" aria-modal="true" onClick={() => setHelp(null)}>
          <div className="sb-modal__panel" onClick={(e) => e.stopPropagation()}>
            <h2>{help.title}</h2>
            <p>{help.body}</p>
            <button type="button" className="sb-btn" onClick={() => setHelp(null)}>
              閉じる
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

/* ------------------------------------------------------------------ */

function Section({ title, grow, children }: { title: string; grow?: boolean; children: React.ReactNode }) {
  return (
    <section className={`sb-box ${grow ? 'sb-box--grow' : ''}`}>
      <h2>{title}</h2>
      {children}
    </section>
  );
}

function Row({
  label,
  locked,
  wrap,
  children,
}: {
  label: string;
  locked?: boolean;
  wrap?: boolean;
  children: React.ReactNode;
}) {
  return (
    <div className={`sb-row ${wrap ? 'sb-row--wrap' : ''}`} data-locked={locked || undefined}>
      {label && <span className="sb-row__l">{label}</span>}
      <span className="sb-row__c">{children}</span>
    </div>
  );
}

function Knob({ label, value, onChange }: { label: string; value: number; onChange: (v: number) => void }) {
  return (
    <label className="sb-knob">
      <span className="sb-knob__l">{label}</span>
      <input type="range" min={-3} max={3} step={0.02} value={value} onChange={(e) => onChange(Number(e.target.value))} />
      <span className="sb-knob__v">{fmt(value)}</span>
    </label>
  );
}
