import { useEffect, useMemo, useReducer, useRef, useState } from 'react';
import { ACTIVATIONS } from './engine/activations';
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
import {
  activationChoicesFor,
  ALL_OPS,
  hits,
  judgeDelay,
  opsUpTo,
  STAGES,
  VIEW_LABEL,
  type DataOpts,
  type OpId,
  type Stage,
  type ViewId,
} from './stages';
import { ActivationChart } from './views/ActivationChart';
import { ActivationIcon } from './views/ActivationIcon';
import { ActivationPicker } from './views/ActivationPicker';
import { DebugInspector } from './views/DebugInspector';
import { DecisionPlane } from './views/DecisionPlane';
import { FitCurve } from './views/FitCurve';
import { FitPlane } from './views/FitPlane';
import { fmt } from './views/format';
import { GradBars } from './views/GradBars';
import { LossBar } from './views/LossBar';
import { NetworkDiagram, W_RANGE_DEFAULT, W_STEP, type Cue } from './views/NetworkDiagram';
import { TruthTable, type LogicRow } from './views/TruthTable';
import './sandbox.css';

/* ------------------------------------------------------------------ */

/** 損失は 1e-30 まで落ちることがあるので、小さいときは指数表記にする */
const sci = (v: number) => (!Number.isFinite(v) ? '—' : v !== 0 && Math.abs(v) < 0.001 ? v.toExponential(1) : fmt(v, 4));

const HIST_MAX = 4000;
const DEFAULT_HIDDEN = 4;
/** ここまでのステージは、指示された1手以外を触れなくする（1 平均 〜 5 直線） */
const LOCK_UNTIL = 4;
/** 合格の緑を見せている時間（ms）。CSS の sb-cue-pop と合わせる */
const PASS_MS = 280;

type Entry = { step: number; net: Network; loss: number };

type Core = {
  net: Network;
  opt: OptimizerState;
  rng: RngState;
  hist: Entry[];
  cursor: number;
  grad: ParamShape | null;
};

/** チュートリアルの進み具合。base はこの手に入った時点の控え */
type Tut = { i: number; base: Network; baseStep: number; scrubbed: boolean };

/**
 * 1点ずつ出す進行（ステージ1・2）。
 * idle = 予約なしで待っている、armed = 判定を予約した、pass = 合格の演出中、fail = 揺れている最中。
 * 判定はドラッグ中には走らない。予約するきっかけは「新しい問題が出た」「指を離した」の2つだけ。
 */
type Tick = {
  pos: number;
  /** 落とさずに通した連続数。データの数に届いたらクリア */
  streak: number;
  fails: number;
  phase: 'idle' | 'armed' | 'pass' | 'fail';
  nonce: number;
  done: boolean;
};

const newTick = (): Tick => ({ pos: 0, streak: 0, fails: 0, phase: 'idle', nonce: 0, done: false });

/**
 * ステージごとに保存しておく状態。行き来してもそのステージの続きに戻れるようにする。
 * 「最初から」を押したときは、いま見ているステージぶんだけこれを作り直す。
 */
type StageState = {
  core: Core;
  tick: Tick;
  dataOpts: DataOpts;
  cfg: TrainConfig;
  initId: InitId;
  seed: number;
  selected: number;
  wasCleared: boolean;
  tut: Tut;
  sample: number;
};

/* 形を変えるときに引き渡す代表の活性化。層の先頭ノードのものを引き継ぐ */
const shapeOf = (net: Network, inDim: number): Shape => ({
  sizes: [inDim, ...net.layers.map((l) => l.b.length)],
  acts: net.layers.map((l) => l.acts[0] ?? 'identity'),
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

  const [selected, setSelected] = useState(0);
  const [main, setMain] = useState<ViewId>(STAGES[0].views[0]);
  const [sample, setSample] = useState(0);
  const [playing, setPlaying] = useState(false);
  const [speed, setSpeed] = useState(10);
  const [hover, setHover] = useState<string | null>(null);
  const [flash, setFlash] = useState<string | null>(null);
  const [help, setHelp] = useState<{ title: string; body: string } | null>(null);
  const [wasCleared, setWasCleared] = useState(false);

  /* -------------------- 活性化を「塗る」道具 -------------------- */
  const [pickerOpen, setPickerOpen] = useState(false);
  const [paintId, setPaintId] = useState<ActivationId | null>(null);
  /** デバッグ用の寸法計測ツール。Ctrl+Shift+D でのみ出る。通常のユーザーには見えない */
  const [debugOn, setDebugOn] = useState(false);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        if (pickerOpen) setPickerOpen(false);
        else if (paintId) setPaintId(null);
      }
      if (e.ctrlKey && e.shiftKey && (e.key === 'D' || e.key === 'd')) {
        e.preventDefault();
        setDebugOn((v) => !v);
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [pickerOpen, paintId]);

  const inDim = stage.inputLabels.length;
  const data = useMemo(() => stage.data(dataOpts), [stage, dataOpts]);
  const outDim = data.y[0].length;

  const core = useRef<Core>(undefined as unknown as Core);
  if (core.current === undefined) {
    core.current = build(STAGES[0].start, 'xavier', 77, STAGES[0].data(STAGES[0].dataDefaults), 'mse');
  }

  /** ステージごとの保存先。訪れたステージだけ入る。いまのステージは live な ref/state のほうが正 */
  const stageStates = useRef<Map<number, StageState>>(new Map());

  const [tut, setTut] = useState<Tut>(() => ({
    i: 0,
    base: core.current.net,
    baseStep: 0,
    scrubbed: false,
  }));

  const ops = free ? new Set(ALL_OPS) : opsUpTo(stageIdx);
  const can = (o: OpId) => ops.has(o);

  const c = core.current;
  const net = c.hist[c.cursor].net;
  const valid =
    net.layers.length > 0 &&
    net.layers[0].w[0].length === inDim &&
    net.layers[net.layers.length - 1].b.length === outDim;

  /* -------------------- 1点ずつ出す進行（ステージ1・2） -------------------- */

  const tick = useRef<Tick>(newTick());
  const timer = useRef<number | null>(null);
  /** 線や丸を掴んでいる間は true。この間は判定しない */
  const dragging = useRef(false);
  const stopTimer = () => {
    if (timer.current !== null) {
      clearTimeout(timer.current);
      timer.current = null;
    }
  };
  useEffect(() => stopTimer, []);

  const tutOn = !free && tut.i < stage.tutorial.length;
  const usingTicker = !!stage.ticker && !free;
  /** 最初の1手が済んだら出題を始める */
  const tickOn = usingTicker && !tutOn;
  const tk = tick.current;
  const tickPos = usingTicker ? Math.min(tk.pos, data.x.length - 1) : -1;
  /** 何度も落としている人にだけ、1行のヒントを出す */
  const hintOn = tickOn && !!stage.ticker && !tk.done && tk.fails >= stage.ticker.hintAfter;

  /* タイマーから呼ぶので、そのときの最新の値を ref で見る */
  const now = useRef({ net, data, stage, valid, tickOn });
  now.current = { net, data, stage, valid, tickOn };

  /** delay 後の判定を予約する。ドラッグ中は呼ばない */
  const arm = () => {
    stopTimer();
    const { stage: s } = now.current;
    const conf = s.ticker;
    const t = tick.current;
    if (!conf || t.done) return;
    t.phase = 'armed';
    timer.current = window.setTimeout(() => {
      timer.current = null;
      judgePoint();
    }, judgeDelay(t.streak));
  };

  /** 次の問題を出す。出した時点でまた判定を予約する */
  const nextPoint = () => {
    const t = tick.current;
    t.pos = (t.pos + 1) % now.current.data.x.length;
    t.phase = 'idle';
    t.nonce += 1;
    if (!dragging.current) arm();
    force();
  };

  /** いまの重みで、いまの点が合っているかを見る */
  const judgePoint = () => {
    const { net: n, data: d, stage: s, valid: v } = now.current;
    const conf = s.ticker;
    const t = tick.current;
    if (!conf || t.done) return;
    stopTimer();
    if (!v) {
      t.phase = 'idle';
      force();
      return;
    }
    const out = forward(n, d.x[t.pos]).output[0];
    t.nonce += 1;
    if (Math.abs(out - d.y[t.pos][0]) <= conf.tol) {
      t.streak += 1;
      t.phase = 'pass';
      /* 一周したらクリア */
      if (t.streak >= d.x.length) t.done = true;
      else timer.current = window.setTimeout(() => {
        timer.current = null;
        nextPoint();
      }, PASS_MS);
    } else {
      t.streak = 0;
      t.fails += 1;
      t.phase = 'fail';
      /* 揺らしたらそこで止まって待つ。次の予約は指を離したときに入る */
      timer.current = window.setTimeout(() => {
        timer.current = null;
        tick.current.phase = 'idle';
        force();
      }, conf.shake);
    }
    force();
  };

  /** 掴んだら予約を取り消し、離したら予約し直す */
  const handleDrag = (active: boolean) => {
    dragging.current = active;
    const t = tick.current;
    if (!now.current.tickOn || t.done) return;
    if (active) {
      if (t.phase === 'armed') {
        stopTimer();
        t.phase = 'idle';
        force();
      }
    } else if (t.phase === 'idle' || t.phase === 'fail') {
      /* 揺れている最中に直して離したときは、揺れを打ち切って予約に入る */
      arm();
      force();
    }
  };

  /* 出題が始まった最初の1問ぶんの予約 */
  const armed = useRef(false);
  useEffect(() => {
    if (!tickOn) {
      armed.current = false;
      return;
    }
    if (armed.current) return;
    armed.current = true;
    tick.current.phase = 'idle';
    tick.current.nonce += 1;
    if (!dragging.current) arm();
    force();
    /* stageIdx も見る: ティッカーのステージ同士を行き来しても tickOn の値自体は変わらないため */
  }, [tickOn, stageIdx]);

  /* -------------------- 判定 -------------------- */

  const judge = valid ? datasetLoss(net, data, stage.judgeLoss) : NaN;
  const params = valid ? paramCount(net) : 0;
  const lim = stage.limits;
  /** 縦目盛りとつまみの上下限。序盤は狭くする */
  const wRange = stage.wRange ?? W_RANGE_DEFAULT;
  const overParams = !!lim?.maxParams && params > lim.maxParams;
  const overLayers = !!lim?.maxLayers && net.layers.length > lim.maxLayers;
  const cleared = usingTicker ? tk.done : valid && judge <= stage.threshold && !overParams && !overLayers;

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

  /* -------------------- チュートリアル -------------------- */

  const entry = c.hist[c.cursor];
  const tutStep = tutOn ? stage.tutorial[tut.i] : null;
  /** 指示された1手以外を触れなくするか */
  const lock = tutOn && stageIdx <= LOCK_UNTIL;
  const point = tutStep ? tutStep.targets : null;
  const gate = lock && tutStep ? tutStep.targets : null;
  const frozen = (id: string) => gate !== null && !hits(gate, id);
  const pointed = (id: string) => point !== null && hits(point, id);

  /* 指さす先が図の中にあるなら、図を主役に持ってくる（小窓では触れないため） */
  const wantMain: ViewId | null = !tutStep
    ? null
    : tutStep.targets.some((t) => /^(e:|n:|h:|a:|plus|nodes)/.test(t))
      ? 'network'
      : tutStep.targets.some((t) => t === 'play' || t === 'hist')
        ? stage.views[0]
        : null;

  useEffect(() => {
    if (!tutStep) return;
    const ok = tutStep.done({
      net,
      base: tut.base,
      selected,
      cleared,
      steps: entry.step - tut.baseStep,
      scrubbed: tut.scrubbed,
    });
    if (ok) setTut({ i: tut.i + 1, base: net, baseStep: entry.step, scrubbed: false });
  });

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

  const hasStep = net.layers.some((l) => l.acts.includes('step'));

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
    setTut((t) => (t.scrubbed ? t : { ...t, scrubbed: true }));
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
        layer.acts.pop();
      }
      while (layer.b.length < k) {
        layer.b.push(0);
        layer.w.push(Array.from({ length: fanIn }, draw));
        /* 増やしたノードは、その層の最後のノードと同じ活性化から始める */
        layer.acts.push(layer.acts[layer.acts.length - 1] ?? 'identity');
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

  /** 塗る筆で、その1ノードだけ活性化を変える */
  const setActivation = (li: number, o: number, id: ActivationId) =>
    editNet((n) => {
      n.layers[li].acts[o] = id;
    });

  /** ツールバーの「活性化関数」。塗っている最中に押すと塗るのをやめる。それ以外は選択画面を開閉する */
  const toggleActTool = () => {
    if (paintId) {
      setPaintId(null);
      return;
    }
    setPickerOpen((o) => !o);
  };

  /** 触れていないステージを、初めて訪れたときの姿にする */
  const applyFreshStage = (idx: number) => {
    const s = STAGES[idx];
    const d = s.data(s.dataDefaults);
    const cf = defaultCfg(s);
    stopTimer();
    tick.current = newTick();
    dragging.current = false;
    armed.current = false;
    core.current = build(s.start, 'xavier', 77, d, cf.loss);
    setDataOpts(s.dataDefaults);
    setCfg(cf);
    setInitId('xavier');
    setSeed(77);
    setSelected(Math.max(0, s.start.acts.length - 1));
    setSample(0);
    setPlaying(false);
    setWasCleared(false);
    setMain(s.views[0]);
    setPaintId(null);
    setPickerOpen(false);
    setTut({ i: 0, base: core.current.net, baseStep: 0, scrubbed: false });
  };

  /** 前に触っていたステージを、そのときの続きに戻す */
  const restoreStage = (idx: number, saved: StageState) => {
    const s = STAGES[idx];
    stopTimer();
    tick.current = saved.tick;
    dragging.current = false;
    armed.current = false;
    core.current = saved.core;
    setDataOpts(saved.dataOpts);
    setCfg(saved.cfg);
    setInitId(saved.initId);
    setSeed(saved.seed);
    setSelected(saved.selected);
    setSample(saved.sample);
    setPlaying(false);
    setWasCleared(saved.wasCleared);
    setMain(s.views[0]);
    setPaintId(null);
    setPickerOpen(false);
    setTut(saved.tut);
  };

  /** いま出ている画面の値をそのステージの保存先に控える */
  const snapshotCurrent = (): StageState => ({
    core: core.current,
    tick: tick.current,
    dataOpts,
    cfg,
    initId,
    seed,
    selected,
    wasCleared,
    tut,
    sample,
  });

  const goStage = (idx: number) => {
    /* いま見ているステージのタブを押しても何もしない（進み具合を戻してしまわないため） */
    if (idx === stageIdx) return;
    stageStates.current.set(stageIdx, snapshotCurrent());
    const saved = stageStates.current.get(idx);
    if (saved) restoreStage(idx, saved);
    else applyFreshStage(idx);
    setStageIdx(idx);
    setMaxStage((m) => Math.max(m, idx));
    force();
  };

  /** いま見ているステージだけを初めから作り直す */
  const restart = () => {
    applyFreshStage(stageIdx);
    stageStates.current.delete(stageIdx);
    force();
  };

  /* -------------------- 表示用の値 -------------------- */

  const sampleIdx = usingTicker ? tickPos : Math.min(sample, data.x.length - 1);
  const trace: ForwardTrace | null = valid ? forward(net, data.x[sampleIdx]) : null;
  const cue: Cue | null = usingTicker
    ? {
        inputs: data.x[sampleIdx],
        target: data.y[sampleIdx][0],
        state: tk.phase === 'pass' ? 'pass' : tk.phase === 'fail' ? 'fail' : 'wait',
        nonce: tk.nonce,
      }
    : null;
  const selLayer = Math.min(selected, Math.max(0, net.layers.length - 1));
  const isOutLayer = selLayer === net.layers.length - 1;
  const gradNorms = core.current.grad ? layerGradNorms(core.current.grad) : null;

  const logicRows: LogicRow[] = useMemo(() => {
    if (stage.kind !== 'logic' || !valid) return [];
    return LOGIC_INPUTS.map((x, i) => {
      const t = forward(net, x);
      const a = t.output[0];
      const tg = data.y[i][0];
      return { x, z: t.layers[t.layers.length - 1].z[0], a, target: tg, ok: Math.abs(a - tg) < 0.5 };
    });
  }, [net, data, valid, stage.kind]);

  const availableViews: ViewId[] = free
    ? (['fit', 'network', 'actchart', 'grad', ...(stage.kind === 'logic' ? (['truth'] as ViewId[]) : [])] as ViewId[])
    : stage.views;
  const shown = availableViews;
  /** 「当てはまり」は論理回路のステージでは入力平面になるので、表示名もそちらに変える */
  const viewLabel = (v: ViewId) => (v === 'fit' && stage.kind === 'logic' ? '入力平面' : VIEW_LABEL[v]);

  useEffect(() => {
    if (!shown.includes(main) && shown.length) setMain(shown[0]);
  }, [shown.join(','), main]);

  useEffect(() => {
    if (wantMain && wantMain !== main && availableViews.includes(wantMain)) {
      setMain(wantMain);
    }
  }, [wantMain, main]);

  const renderView = (id: ViewId, small: boolean) => {
    switch (id) {
      case 'fit':
        if (stage.kind === 'reg1')
          return <FitCurve net={net} data={data} range={stage.range[0]} valid={valid} small={small} />;
        if (stage.kind === 'logic')
          return valid ? (
            <DecisionPlane
              net={net}
              rows={logicRows}
              small={small}
              selected={sampleIdx}
              onSelect={small ? undefined : setSample}
              hint={stage.logicHint}
            />
          ) : (
            <p className="sb-empty">層がありません</p>
          );
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
            selected={selLayer}
            small={small}
            canAdjust={can('weights')}
            canBias={can('bias')}
            canPlace={can('place')}
            canNodes={can('nodes')}
            canActivation={can('activation')}
            maxLayers={lim?.maxLayers}
            wRange={wRange}
            gate={small ? null : gate}
            point={small ? null : point}
            cue={small ? null : cue}
            paint={small ? null : paintId}
            onSelect={setSelected}
            onWeight={(li, o, i, v) =>
              editNet((n) => {
                n.layers[li].w[o][i] = v;
              })
            }
            onBias={(li, o, v) =>
              editNet((n) => {
                n.layers[li].b[o] = v;
              })
            }
            onInsert={insertLayer}
            onRemove={removeLayer}
            onNodes={setNodes}
            onPaint={(li, o) => paintId && setActivation(li, o, paintId)}
            onHover={setHover}
            onDrag={small ? undefined : handleDrag}
          />
        );
      case 'actchart': {
        if (!trace) return <p className="sb-empty">層がありません</p>;
        const l = net.layers[selLayer];
        return (
          <ActivationChart
            activation={ACTIVATIONS[l.acts[0]]}
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

  /* どの箱を出すか。設定できる項目が無ければ右パネルごと描かない */
  const showKnobs = can('knob');
  const showLayerBox = can('nodes') || can('place') || showKnobs;
  const showTrainBox = can('loss') || can('optimizer') || can('lr') || can('batch') || can('init');
  const showDataBox = can('data') && stage.kind !== 'logic';
  const showSide = showLayerBox || showTrainBox || showDataBox;
  const showRail = shown.length > 1;
  /* 真理値表・入力平面を含むステージは、小窓が読める大きさになるよう少し広げる */
  const railW = stage.kind === 'logic' ? 190 : 132;

  const cols = `${showRail ? `${railW}px ` : ''}minmax(0, 1fr)${showSide ? ' 254px' : ''}`;
  const isLogic = stage.kind === 'logic';

  return (
    <div className="sb">
      {/* ---- 左端の縦ツールバー。道具が解禁されたときだけ出る ---- */}
      {can('activation') && (
        <nav className="sb-toolbar" aria-label="道具">
          <button
            type="button"
            className={`sb-tool ${pointed('tool:act') ? 'sb-point' : ''}`}
            aria-pressed={paintId !== null || pickerOpen}
            disabled={frozen('tool:act')}
            title="活性化関数"
            onClick={toggleActTool}
          >
            <ActivationIcon id="step" w={26} h={17} />
            <span className="sb-tool__l">活性化関数</span>
          </button>
        </nav>
      )}

      <div className="sb-shell">
        {/* ---- 1段目: ステージ ---- */}
        <header className="sb-top">
          <a className="sb-back" href="/learn/">
            ← 学習
          </a>
          <div className="sb-stages">
            {STAGES.filter((_, i) => free || i <= maxStage).map((s, i) => (
              <button
                key={s.id}
                type="button"
                className="sb-stage"
                aria-pressed={i === stageIdx}
                title={`${s.no}. ${s.title}`}
                onClick={() => goStage(i)}
              >
                {s.no}
              </button>
            ))}
          </div>
          <div className="sb-spacer" />
          <button type="button" className="sb-restart" onClick={restart}>
            最初から
          </button>
          <button type="button" className="sb-free" aria-pressed={free} onClick={() => setFree((f) => !f)}>
            自由モード
          </button>
        </header>

        {/* ---- 2段目: 目標といまやる1手と損失。画面上部の中央にまとめる ---- */}
        <div className="sb-goal">
        <div className="sb-goal__pad" />
        <div className="sb-goal__center">
          <div className="sb-goal__line">
            <span className="sb-goal__no">{stage.no}</span>
            <h1 className="sb-goal__h">{stage.goal}</h1>
            <button
              type="button"
              className="sb-q"
              aria-label="ヒント"
              onClick={() => setHelp({ title: `${stage.no}. ${stage.title}`, body: stage.help })}
            >
              ?
            </button>
          </div>
          {tutStep ? (
            <p className="sb-goal__now">
              <span className="sb-goal__dot" />
              {tutStep.say}
            </p>
          ) : hintOn ? (
            <p className="sb-goal__now">
              <span className="sb-goal__dot" />
              {stage.ticker!.hint}
            </p>
          ) : (
            <p className="sb-goal__now sb-goal__now--dim">
              {hover ?? (usingTicker ? '' : '「?」に解き方の見当が書いてあります')}
            </p>
          )}
          {usingTicker ? (
            /* ステージ1・2は損失を出さない。通した数を主役級に大きく出す */
            <p className="sb-meter">
              <b className="sb-meter__v sb-meter__v--big" data-ok={tk.streak >= data.x.length || undefined}>
                {tk.streak} / {data.x.length}
              </b>
              <span className="sb-meter__l">通した数</span>
            </p>
          ) : stage.kind === 'logic' ? (
            /* AND・XOR も損失は出さない。真理値表の○×に対応する正解の数を主役級に */
            <p className="sb-meter">
              <b className="sb-meter__v sb-meter__v--big" data-ok={cleared || undefined}>
                {logicRows.filter((r) => r.ok).length} / {logicRows.length}
              </b>
              <span className="sb-meter__l">正解</span>
            </p>
          ) : (
            <p className="sb-meter">
              <span className="sb-meter__l">{stage.judgeLoss === 'bce' ? '交差エントロピー' : '二乗誤差'}</span>
              <b className="sb-meter__v" data-ok={cleared || undefined}>
                {valid ? sci(judge) : '—'}
              </b>
              <span className="sb-meter__sub">
                目標 {sci(stage.threshold)}
                {accuracy !== null && ` ・ 正答 ${Math.round(accuracy * 100)}%`}
              </span>
            </p>
          )}
        </div>

        <div className="sb-goal__pad sb-goal__pad--r">
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
        </div>
      </div>

      {/* ---- 3段目: 学習の操作と履歴（解禁後だけ） ---- */}
      {can('train') && (
        <div className="sb-transport">
          <button
            type="button"
            className={`sb-play ${pointed('play') ? 'sb-point' : ''}`}
            onClick={togglePlay}
            disabled={frozen('play')}
          >
            {playing ? '⏸' : '▶'}
          </button>
          <button type="button" className="sb-btn" onClick={oneStep} disabled={playing || frozen('play')}>
            1歩
          </button>
          <button type="button" className="sb-btn" onClick={() => resetWeights()} disabled={frozen('reset')}>
            初期化
          </button>
          <span className="sb-speed">{[1, 10, 100].map((s) => chip(`×${s}`, speed === s, () => setSpeed(s)))}</span>
          <div className={`sb-histwrap ${pointed('hist') ? 'sb-point' : ''}`}>
            <LossBar hist={c.hist} cursor={c.cursor} threshold={stage.threshold} onScrub={scrub} disabled={frozen('hist')} />
          </div>
          <span className="sb-readout">
            <b>{entry.step.toLocaleString()}</b> 歩 ・ 損失 <b>{sci(entry.loss)}</b>
          </span>
        </div>
      )}

      {/* ---- 本体 ---- */}
      {isLogic ? (
        <div className="sb-logic">
          <section className="sb-logic__panel sb-logic__truth">
            <h2>真理値表</h2>
            {renderView('truth', false)}
          </section>
          <div className="sb-logic__net">
            <div className="sb-main__head">
              <h2>ネットワーク</h2>
            </div>
            <div className="sb-main__stage">{renderView('network', false)}</div>
          </div>
          {/* 入力平面は正方形なので、本体の高さをまるごと使える専用の列に置く */}
          <section className="sb-logic__panel sb-logic__plane">
            <h2>入力平面</h2>
            {renderView('fit', false)}
          </section>
          {/* 次のステージ。本体いっぱいの右下に置く */}
          <button
            type="button"
            className="sb-next"
            data-on={(cleared && stageIdx < STAGES.length - 1) || undefined}
            disabled={!cleared || stageIdx >= STAGES.length - 1}
            onClick={() => goStage(stageIdx + 1)}
          >
            次のステージ
          </button>
        </div>
      ) : (
      <div className="sb-body" style={{ gridTemplateColumns: cols }}>
        {showRail && (
          <aside className="sb-rail" aria-label="小窓">
            {shown
              .filter((v) => v !== main)
              .map((v) => (
                <button
                  key={v}
                  type="button"
                  className="sb-thumb"
                  onClick={() => setMain(v)}
                  title={`${viewLabel(v)}を大きく見る`}
                >
                  <span className="sb-thumb__t">{viewLabel(v)}</span>
                  <span className="sb-thumb__box">{renderView(v, true)}</span>
                </button>
              ))}
          </aside>
        )}

        <main className="sb-main">
          <div className="sb-main__head">
            <h2>{viewLabel(main)}</h2>
          </div>
          <div className="sb-main__stage">{renderView(main, false)}</div>

          {/* 次のステージ。主役の領域内の右下に置き、右パネルには重ねない */}
          <button
            type="button"
            className="sb-next"
            data-on={(cleared && stageIdx < STAGES.length - 1) || undefined}
            disabled={!cleared || stageIdx >= STAGES.length - 1}
            onClick={() => goStage(stageIdx + 1)}
          >
            次のステージ
          </button>
        </main>

        {showSide && (
          <aside className="sb-side">
            {showLayerBox && (
              <Section
                title={isOutLayer ? '出力層' : net.layers.length <= 2 ? '中間層' : `中間層${selLayer + 1}`}
              >
                {can('nodes') && !isOutLayer && (
                  <Row label="ノード数">
                    <button type="button" className="sb-mini" onClick={() => setNodes(selLayer, -1)} disabled={frozen('nodes')}>
                      −
                    </button>
                    <b className="sb-num">{valid ? net.layers[selLayer].b.length : 0}</b>
                    <button type="button" className="sb-mini" onClick={() => setNodes(selLayer, 1)} disabled={frozen('nodes')}>
                      ＋
                    </button>
                  </Row>
                )}
                {can('place') && (
                  <Row label="">
                    <button
                      type="button"
                      className="sb-btn"
                      onClick={() => removeLayer(selLayer)}
                      disabled={net.layers.length <= 1 || frozen('plus')}
                    >
                      この層を外す
                    </button>
                    <span className="sb-note">パラメータ {params}</span>
                  </Row>
                )}
                {showKnobs && (
                  <div className="sb-knobwrap" data-off={frozen('knob') || undefined}>
                    {!valid ? (
                      <p className="sb-note">層がありません</p>
                    ) : net.layers[selLayer].b.length * (net.layers[selLayer].w[0].length + 1) > 20 ? (
                      <p className="sb-note">つまみが多すぎます。図の線を上下にドラッグしてください</p>
                    ) : (
                      net.layers[selLayer].w.map((row, o) => (
                        <div className="sb-knobs" key={o}>
                          <p className="sb-knobs__t">
                            {isOutLayer ? (net.layers[selLayer].b.length > 1 ? `出力${o + 1}` : '出力') : `h${o + 1}`}
                          </p>
                          {row.map((w, i) => (
                            <Knob
                              key={i}
                              label={selLayer === 0 ? stage.inputLabels[i] : `h${i + 1}`}
                              value={w}
                              range={wRange}
                              disabled={frozen('knob')}
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
                            range={wRange}
                            disabled={frozen('knob') || !can('bias')}
                            onChange={(v) =>
                              editNet((n) => {
                                n.layers[selLayer].b[o] = v;
                              })
                            }
                          />
                        </div>
                      ))
                    )}
                  </div>
                )}
              </Section>
            )}

            {showTrainBox && (
              <Section title="学習">
                {can('loss') && (
                  <Row label="損失関数" wrap>
                    {LOSS_ORDER.map((id) =>
                      chip(LOSSES[id].label, cfg.loss === id, () => setCfg((v) => ({ ...v, loss: id })), false, LOSSES[id].note),
                    )}
                  </Row>
                )}
                {can('optimizer') && (
                  <Row label="オプティマイザ" wrap>
                    {OPTIMIZER_ORDER.map((id) =>
                      chip(
                        OPTIMIZERS[id].label,
                        cfg.optimizer === id,
                        () => {
                          setCfg((v) => ({ ...v, optimizer: id }));
                          core.current.opt = createOptimizerState(net);
                        },
                        false,
                        OPTIMIZERS[id].note,
                      ),
                    )}
                  </Row>
                )}
                {can('lr') && (
                  <Row label={`学習率 ${cfg.lr < 0.01 ? cfg.lr.toFixed(4) : cfg.lr.toFixed(3)}`}>
                    <input
                      type="range"
                      min={0}
                      max={100}
                      value={lrPos}
                      onChange={(e) => {
                        const p = Number(e.target.value) / 100;
                        const v = 10 ** (-3 + p * 3);
                        setCfg((c2) => ({ ...c2, lr: Number(v.toPrecision(2)) }));
                      }}
                    />
                  </Row>
                )}
                {can('batch') && (
                  <Row label="バッチ" wrap>
                    {[null, 4, 8, 16].map((b) =>
                      chip(b === null ? '全部' : String(b), cfg.batch === b, () => setCfg((v) => ({ ...v, batch: b }))),
                    )}
                  </Row>
                )}
                {can('init') && (
                  <Row label="初期化" wrap>
                    {INIT_ORDER.map((id) =>
                      chip(
                        INITS[id].label.replace('ばらつかせる', 'ばらつき'),
                        initId === id,
                        () => {
                          setInitId(id);
                          core.current = build(shapeOf(net, inDim), id, seed, data, cfg.loss);
                          setPlaying(false);
                          setWasCleared(false);
                          force();
                        },
                        false,
                        INITS[id].note,
                      ),
                    )}
                    <button type="button" className="sb-btn" onClick={() => resetWeights(Math.floor(Math.random() * 1e9))}>
                      引き直す
                    </button>
                  </Row>
                )}
              </Section>
            )}

            {showDataBox && (
              <Section title="データ">
                <Row label={`点の数 ${dataOpts.n}`}>
                  <input
                    type="range"
                    min={10}
                    max={300}
                    step={10}
                    value={dataOpts.n}
                    onChange={(e) => setDataOpts((o) => ({ ...o, n: Number(e.target.value) }))}
                  />
                </Row>
                <Row label={`ノイズ ${dataOpts.noise.toFixed(2)}`}>
                  <input
                    type="range"
                    min={0}
                    max={0.5}
                    step={0.01}
                    value={dataOpts.noise}
                    onChange={(e) => setDataOpts((o) => ({ ...o, noise: Number(e.target.value) }))}
                  />
                </Row>
                <Row label="">
                  <button
                    type="button"
                    className="sb-btn"
                    onClick={() => setDataOpts((o) => ({ ...o, seed: Math.floor(Math.random() * 1e9) }))}
                  >
                    点を取り直す
                  </button>
                </Row>
              </Section>
            )}
          </aside>
        )}
      </div>
      )}

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

      <ActivationPicker
        open={pickerOpen}
        choices={activationChoicesFor(stage)}
        onPick={(id) => {
          setPaintId(id);
          setPickerOpen(false);
        }}
        onClose={() => setPickerOpen(false)}
      />
      <DebugInspector active={debugOn} onClose={() => setDebugOn(false)} />
    </div>
  );
}

/* ------------------------------------------------------------------ */

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="sb-box">
      <h3>{title}</h3>
      {children}
    </section>
  );
}

function Row({
  label,
  wrap,
  point,
  children,
}: {
  label: string;
  wrap?: boolean;
  point?: boolean;
  children: React.ReactNode;
}) {
  return (
    <div className={`sb-row ${wrap ? 'sb-row--wrap' : ''} ${point ? 'sb-point' : ''}`}>
      {label && <span className="sb-row__l">{label}</span>}
      <span className="sb-row__c">{children}</span>
    </div>
  );
}

function Knob({
  label,
  value,
  range,
  disabled,
  onChange,
}: {
  label: string;
  value: number;
  range: number;
  disabled?: boolean;
  onChange: (v: number) => void;
}) {
  return (
    <label className="sb-knob">
      <span className="sb-knob__l">{label}</span>
      <input
        type="range"
        min={-range}
        max={range}
        step={W_STEP}
        value={value}
        disabled={disabled}
        onChange={(e) => onChange(Number(e.target.value))}
      />
      <span className="sb-knob__v">{fmt(value)}</span>
    </label>
  );
}
