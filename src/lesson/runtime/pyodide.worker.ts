/// <reference lib="webworker" />
/**
 * Pyodide を動かす Web Worker。UI を止めないため、Python はすべてここで走る。
 * 20-platform.md 第3.1節。
 */
import { PYTHON_HARNESS } from './harness';
import { PYODIDE_BASE, PYODIDE_PRELOAD } from './pyodide-source';
import { TIME_LIMIT_SECONDS } from './types';

type Pyodide = {
  runPython: (code: string) => unknown;
  globals: { get: (name: string) => unknown };
  /** コードの import を見て、要る外部パッケージだけ読む（第7章の numpy） */
  loadPackagesFromImports: (code: string) => Promise<unknown>;
};

let pyodide: Pyodide | null = null;

/** 大きなファイルを先に読み、読んだ量を知らせる。読み終えた分はブラウザのキャッシュに残る。 */
async function preload(): Promise<void> {
  const sizes = await Promise.all(
    PYODIDE_PRELOAD.map(async (name) => {
      const res = await fetch(PYODIDE_BASE + name, { method: 'HEAD' });
      return Number(res.headers.get('content-length') ?? 0);
    }),
  );
  const total = sizes.reduce((a, b) => a + b, 0);
  let loaded = 0;
  for (const name of PYODIDE_PRELOAD) {
    const res = await fetch(PYODIDE_BASE + name);
    const reader = res.body?.getReader();
    if (!reader) continue;
    for (;;) {
      const { done, value } = await reader.read();
      if (done) break;
      loaded += value?.length ?? 0;
      self.postMessage({ type: 'progress', loaded, total, done: false });
    }
  }
  self.postMessage({ type: 'progress', loaded: total, total, done: true });
}

async function load(): Promise<Pyodide> {
  if (pyodide) return pyodide;
  await preload();
  const url = `${PYODIDE_BASE}pyodide.mjs`;
  const mod = (await import(/* @vite-ignore */ url)) as {
    loadPyodide: (options: { indexURL: string }) => Promise<Pyodide>;
  };
  const py = await mod.loadPyodide({ indexURL: PYODIDE_BASE });
  py.runPython(PYTHON_HARNESS);
  pyodide = py;
  return py;
}

self.onmessage = async (event: MessageEvent) => {
  const msg = event.data;
  if (msg.type === 'load') {
    try {
      await load();
      self.postMessage({ type: 'ready' });
    } catch (e) {
      self.postMessage({ type: 'load-error', message: e instanceof Error ? e.message : String(e) });
    }
    return;
  }
  if (msg.type === 'exec') {
    try {
      const py = await load();
      /* numpy は第7章だけが使う。全員に先に配ると初回の読み込みが重くなるので、
         コードが import したときにだけ読む。 */
      try {
        await py.loadPackagesFromImports(msg.code);
      } catch {
        /* 握りつぶす。Python 側のエラーとして読み手に見せる */
      }
      const run = py.globals.get('_kit_run') as (
        code: string,
        stdin: string,
        call: string,
        limit: number,
      ) => string;
      const json = run(msg.code, msg.stdin ?? '', msg.call ? JSON.stringify(msg.call) : '', TIME_LIMIT_SECONDS);
      self.postMessage({ type: 'result', id: msg.id, result: JSON.parse(json) });
    } catch (e) {
      self.postMessage({
        type: 'result',
        id: msg.id,
        result: {
          stdout: '',
          hasValue: false,
          value: null,
          error: {
            kind: 'python',
            type: 'InternalError',
            message: e instanceof Error ? e.message : String(e),
            line: null,
            display: `InternalError: ${e instanceof Error ? e.message : String(e)}`,
            traceback: '',
          },
        },
      });
    }
  }
};
