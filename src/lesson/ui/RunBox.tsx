/**
 * <Run>（その場で実行できるコード例）の実行部。
 *
 * 10-lesson-and-writing.md 第9.2節「コード例はすべてその場で実行できる。別画面に飛ばない」。
 * 読者は本文を読む場所から離れずに ▶ を押せる。
 *
 * 2026-09-27に「よくある間違い」（<Mistake>）を廃止してからは、壊れたコードの専用表示は無い。
 * 代わりに、押した結果がエラーで止まったときはここでもエラーの型ごとの一般的な説明を出す
 * （src/lesson/grade.ts の adviceFor。design/DECISIONS.md）。
 */
import { useState } from 'react';
import CodeEditor from './CodeEditor';
import { LoadBar, OutputText, StdinBox } from './shared';
import { execPython } from '../runtime/runner';
import { adviceFor } from '../grade';
import type { ExecResult } from '../runtime/types';

type Props = {
  code: string;
  /** input() を使うコードのときの入力欄の初期値 */
  stdin?: string;
  editorId: string;
};

export default function RunBox({ code, stdin, editorId }: Props) {
  const [stdinValue, setStdinValue] = useState(stdin ?? '');
  const [state, setState] = useState<'idle' | 'running' | 'done'>('idle');
  const [result, setResult] = useState<ExecResult | null>(null);

  async function run() {
    setState('running');
    const r = await execPython({ code, stdin: stdinValue });
    setResult(r);
    setState('done');
  }

  const done = state === 'done' && result !== null;
  /** まだ押していない <Run>。結果の枠は残して高さを変えない */
  const waiting = !done;
  const pyError = done && result.error?.kind === 'python' ? result.error : null;

  return (
    <div className="kit-run">
      <div className="kit-run__bar">
        <button type="button" className="kit-btn" onClick={run} disabled={state === 'running'}>
          {state === 'running' ? '実行中' : '▶ 実行'}
        </button>
        {state === 'running' ? <LoadBar /> : null}
      </div>
      <CodeEditor value={code} readOnly label="コード例" />
      {stdin !== undefined ? <StdinBox id={`${editorId}-stdin`} value={stdinValue} onChange={setStdinValue} /> : null}
      <div className={`kit-out${pyError ? ' kit-out--err' : ''}`}>
        <div className="kit-out__label">{pyError ? '出たエラー' : '実行結果'}</div>
        <pre className={`kit-out__text${waiting ? ' kit-out__text--wait' : ''}`}>
          {done ? <OutputText result={result} /> : '▶ を押すと出ます'}
        </pre>
      </div>
      {pyError ? (
        <>
          {pyError.line ? <p className="kit-verdict__where">{pyError.line} 行目で止まりました。</p> : null}
          <p>{adviceFor(pyError.type)}</p>
        </>
      ) : null}
    </div>
  );
}
