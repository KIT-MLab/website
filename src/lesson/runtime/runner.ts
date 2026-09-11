/**
 * ページ側から Python を動かす窓口。
 *
 * - Worker はページに1つ。<Run> と <Exercise> が同じものを使う
 * - ページを開いた時点では読み込まない。最初に exec が呼ばれたときに読み込む（第3.1節）
 * - 実行は順番に1つずつ。実行ごとに Python 側で新しい名前空間を作るので状態は残らない
 * - Python 側の5秒の見張りが効かないとき（C の中で止まっている等）のために、
 *   こちら側でも見張り、返事が来なければ Worker を捨てて作り直す
 */
import type { ExecRequest, ExecResult, LoadProgress } from './types';
import { TIME_LIMIT_SECONDS } from './types';

type Waiter = { resolve: (r: ExecResult) => void; timer: ReturnType<typeof setTimeout> };

const HARD_LIMIT_MS = TIME_LIMIT_SECONDS * 1000 + 3000;

let worker: Worker | null = null;
let nextId = 1;
const waiting = new Map<number, Waiter>();
const progressSubscribers = new Set<(p: LoadProgress) => void>();

let loadState: 'idle' | 'loading' | 'ready' = 'idle';
let loadPromise: Promise<void> | null = null;
let lastProgress: LoadProgress = { loaded: 0, total: 0, done: false };

export function pythonStatus(): 'idle' | 'loading' | 'ready' {
  return loadState;
}

export function onLoadProgress(fn: (p: LoadProgress) => void): () => void {
  progressSubscribers.add(fn);
  return () => progressSubscribers.delete(fn);
}

function timeoutResult(): ExecResult {
  return { stdout: '', error: { kind: 'timeout' }, value: null, hasValue: false };
}

function dropWorker(): void {
  if (worker) worker.terminate();
  worker = null;
  loadState = 'idle';
  loadPromise = null;
  for (const [id, w] of waiting) {
    clearTimeout(w.timer);
    w.resolve(timeoutResult());
    waiting.delete(id);
  }
}

function getWorker(): Worker {
  if (worker) return worker;
  worker = new Worker(new URL('./pyodide.worker.ts', import.meta.url), { type: 'module' });
  worker.onmessage = (event: MessageEvent) => {
    const msg = event.data;
    if (msg.type === 'progress') {
      lastProgress = { loaded: msg.loaded, total: msg.total, done: msg.done };
      for (const fn of progressSubscribers) fn(lastProgress);
      return;
    }
    if (msg.type === 'result') {
      const w = waiting.get(msg.id);
      if (!w) return;
      clearTimeout(w.timer);
      waiting.delete(msg.id);
      w.resolve(msg.result as ExecResult);
    }
  };
  return worker;
}

/** Pyodide を読み込む。すでに読み込み中なら、その終わりを待つ。 */
export function ensurePython(): Promise<void> {
  if (loadState === 'ready') return Promise.resolve();
  if (loadPromise) return loadPromise;
  loadState = 'loading';
  const w = getWorker();
  loadPromise = new Promise<void>((resolve, reject) => {
    const onMessage = (event: MessageEvent) => {
      if (event.data.type === 'ready') {
        w.removeEventListener('message', onMessage);
        loadState = 'ready';
        resolve();
      } else if (event.data.type === 'load-error') {
        w.removeEventListener('message', onMessage);
        loadState = 'idle';
        loadPromise = null;
        reject(new Error(event.data.message));
      }
    };
    w.addEventListener('message', onMessage);
    w.postMessage({ type: 'load' });
  });
  return loadPromise;
}

/** Python を1回動かす。返り値は必ず ExecResult（例外では返さない）。 */
export async function execPython(request: ExecRequest): Promise<ExecResult> {
  await ensurePython();
  const w = getWorker();
  const id = nextId++;
  return new Promise<ExecResult>((resolve) => {
    const timer = setTimeout(() => {
      waiting.delete(id);
      dropWorker();
      resolve(timeoutResult());
    }, HARD_LIMIT_MS);
    waiting.set(id, { resolve, timer });
    w.postMessage({ type: 'exec', id, code: request.code, stdin: request.stdin ?? '', call: request.call ?? null });
  });
}
