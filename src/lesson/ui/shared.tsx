/** <Run> と <Exercise> が共に使う小さな部品。 */
import { useEffect, useState } from 'react';
import { onLoadProgress, pythonStatus } from '../runtime/runner';
import type { ExecResult, LoadProgress } from '../runtime/types';
import { INPUT_EMPTY_MESSAGE, TIMEOUT_MESSAGE } from '../runtime/types';

/** 実行結果を、画面に出す文字列にする。エラーは訳さずそのまま出す（10-lesson 第5章）。 */
export function outputText(result: ExecResult): string {
  const e = result.error;
  if (!e) return result.stdout;
  if (e.kind === 'timeout') return `${result.stdout}${TIMEOUT_MESSAGE}`;
  if (e.kind === 'input-empty') return `${result.stdout}${INPUT_EMPTY_MESSAGE}`;
  if (e.kind === 'no-function') return `${result.stdout}${e.fn} という名前の関数が見つかりません`;
  return `${result.stdout}${e.traceback || e.display}`.replace(/\n+$/, '');
}

/**
 * Pyodide の読み込みの進捗バー。
 * 20-platform.md 第3.1節「最初の1回だけ、進捗の出るバーを出す」。
 */
export function LoadBar() {
  const [progress, setProgress] = useState<LoadProgress | null>(null);
  useEffect(() => onLoadProgress(setProgress), []);
  if (pythonStatus() === 'ready') return null;
  const pct = progress && progress.total > 0 ? Math.round((progress.loaded / progress.total) * 100) : 0;
  return (
    <span className="kit-loadbar" role="status">
      <span className="kit-loadbar__track">
        <span className="kit-loadbar__fill" style={{ width: `${pct}%` }} />
      </span>
      <span className="kit-loadbar__text">Python を読み込んでいます {pct}%</span>
    </span>
  );
}

/** `…` だけを組む、ごく小さな記法の表示。 */
export function Inline({ text }: { text: string }) {
  const parts = text.split(/(`[^`]*`)/g);
  return (
    <>
      {parts.map((part, i) =>
        part.length > 1 && part.startsWith('`') && part.endsWith('`') ? (
          <code key={i}>{part.slice(1, -1)}</code>
        ) : (
          <span key={i}>{part}</span>
        ),
      )}
    </>
  );
}

/** 複数行の説明文を段落に分けて出す。 */
export function Prose({ text }: { text: string }) {
  return (
    <>
      {text
        .split(/\n{2,}/)
        .map((p) => p.trim())
        .filter((p) => p.length > 0)
        .map((p, i) => (
          <p key={i}>
            <Inline text={p} />
          </p>
        ))}
    </>
  );
}

/** 入力欄（20-platform.md 第3.2節）。複数行書ける。 */
export function StdinBox({
  id,
  value,
  onChange,
  readOnly = false,
}: {
  id: string;
  value: string;
  onChange?: (v: string) => void;
  readOnly?: boolean;
}) {
  return (
    <div className="kit-stdinwrap">
      <div className="kit-stdin">
        <label className="kit-stdin__label" htmlFor={id}>
          入力
        </label>
        <textarea
          id={id}
          className="kit-stdin__area"
          rows={Math.min(6, Math.max(2, value.split('\n').length))}
          value={value}
          readOnly={readOnly}
          spellCheck={false}
          onChange={(e) => onChange?.(e.target.value)}
        />
      </div>
      <p className="kit-stdin__note">input() は、この欄を上から1行ずつ読みます。</p>
    </div>
  );
}
