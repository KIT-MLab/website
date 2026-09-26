/**
 * <Run>（その場で実行できるコード例）と <Mistake>（壊れたコード）の実行部。
 *
 * 10-lesson-and-writing.md 第9.2節「コード例はすべてその場で実行できる。別画面に飛ばない」。
 * 読者は本文を読む場所から離れずに ▶ を押せる。
 */
import { useState } from 'react';
import CodeEditor from './CodeEditor';
import { LoadBar, outputText, StdinBox } from './shared';
import { execPython } from '../runtime/runner';

type Props = {
  code: string;
  /** 壊れたコード（<Mistake>）で最初から見せるエラー文。<Run> では渡さない。
      <Run> の実行結果は ▶ を押すまで出さない（10-lesson 第2.2節） */
  expected?: string;
  /** input() を使うコードのときの入力欄の初期値 */
  stdin?: string;
  /** 壊れたコードの例（<Mistake>）かどうか */
  broken?: boolean;
  editorId: string;
};

export default function RunBox({ code, expected = '', stdin, broken = false, editorId }: Props) {
  const [stdinValue, setStdinValue] = useState(stdin ?? '');
  const [state, setState] = useState<'idle' | 'running' | 'done'>('idle');
  const [output, setOutput] = useState('');

  async function run() {
    setState('running');
    const result = await execPython({ code, stdin: stdinValue });
    setOutput(outputText(result));
    setState('done');
  }

  const showing = state === 'done' ? output : expected;
  /** まだ押していない <Run>。結果の枠は残して高さを変えない */
  const waiting = state !== 'done' && expected === '';

  return (
    <div className={`kit-run${broken ? ' kit-run--broken' : ''}`}>
      <div className="kit-run__bar">
        <button type="button" className="kit-btn" onClick={run} disabled={state === 'running'}>
          {state === 'running' ? '実行中' : '▶ 実行'}
        </button>
        {state === 'running' ? <LoadBar /> : null}
      </div>
      <CodeEditor value={code} readOnly label={broken ? '壊れたコードの例' : 'コード例'} />
      {stdin !== undefined ? <StdinBox id={`${editorId}-stdin`} value={stdinValue} onChange={setStdinValue} /> : null}
      <div className={`kit-out${broken ? ' kit-out--err' : ''}`}>
        <div className="kit-out__label">{broken ? '出るエラー' : '実行結果'}</div>
        <pre className={`kit-out__text${waiting ? ' kit-out__text--wait' : ''}`}>
          {waiting ? '▶ を押すと出ます' : showing}
        </pre>
      </div>
    </div>
  );
}
