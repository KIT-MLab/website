/**
 * ブラウザに配る Pyodide の版と置き場所。
 *
 * 版は devDependency の `pyodide` と同じにする。ビルド時の期待値生成は node_modules の
 * Pyodide で走るので、ここがずれると「ビルド時に作った答え」と「ブラウザで出る答え」が
 * 食い違う。scripts/build-tests.mjs が起動時に一致を確かめる。
 */
export const PYODIDE_VERSION = '314.0.6';

export const PYODIDE_BASE = `https://cdn.jsdelivr.net/pyodide/v${PYODIDE_VERSION}/full/`;

/**
 * 初回に落ちてくる大きなファイル。進捗バーの分母に使う（20-platform.md 第3.1節）。
 * loadPyodide が同じ URL を読み直すが、そのときはブラウザのキャッシュから返る。
 */
export const PYODIDE_PRELOAD = ['pyodide.asm.wasm', 'python_stdlib.zip'];
