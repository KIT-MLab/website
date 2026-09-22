/**
 * Node の上で Python を動かす。ビルド時の期待値づくり（scripts/build-tests.mjs）が使う。
 *
 * ブラウザ側（src/lesson/runtime/pyodide.worker.ts）と同じ harness を読み込む。
 * 同じ版・同じ実行係にすることで、「ビルド時に作った答え」と「ブラウザで出る答え」を
 * 食い違わせない（20-platform.md 第4.2節）。
 */
import { createRequire } from 'node:module';
import { fileURLToPath } from 'node:url';
import { PYTHON_HARNESS } from '../src/lesson/runtime/harness.ts';
import { PYODIDE_VERSION } from '../src/lesson/runtime/pyodide-source.ts';

const require = createRequire(import.meta.url);

let cached = null;

/** Pyodide を1回だけ立ち上げ、harness を入れて返す。 */
export async function getPython() {
  if (cached) return cached;

  const pkg = require('pyodide/package.json');
  if (pkg.version !== PYODIDE_VERSION) {
    throw new Error(
      `Pyodide の版がずれています。node_modules=${pkg.version} / ブラウザに配る版=${PYODIDE_VERSION}。` +
        'src/lesson/runtime/pyodide-source.ts と package.json をそろえてください。',
    );
  }

  const { loadPyodide } = await import('pyodide');
  // 日本語を含むパスだと既定の indexURL が URL エンコードされたまま渡り、読み込みに失敗する。
  const indexURL = fileURLToPath(new URL('../node_modules/pyodide/', import.meta.url));
  const py = await loadPyodide({ indexURL });
  py.runPython(PYTHON_HARNESS);
  cached = py;
  return py;
}

/**
 * Python を1回動かす。返り値は ExecResult（src/lesson/runtime/types.ts）と同じ形。
 * @param {{ code: string; stdin?: string; call?: { fn: string; args: unknown[] } }} request
 */
export async function execPython(request) {
  const py = await getPython();
  /* numpy のような外部のパッケージは、コードの import を見て、要るときだけ読む
     （20-platform.md 第3.3節）。numpy を使うのは第7章だけなので、ほかの章の
     読み込みを重くしない。読めなかったときは黙って進め、Python 側の
     ModuleNotFoundError として読み手に見せる。 */
  try {
    await py.loadPackagesFromImports(request.code);
  } catch {
    /* 握りつぶす */
  }
  const run = py.globals.get('_kit_run');
  const json = run(
    request.code,
    request.stdin ?? '',
    request.call ? JSON.stringify(request.call) : '',
    5,
  );
  return JSON.parse(json);
}
