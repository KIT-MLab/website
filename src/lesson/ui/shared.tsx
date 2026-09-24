/** <Run> と <Exercise> が共に使う小さな部品。 */
import { useEffect, useState, type ReactNode } from 'react';
import { lessonHref } from '../chapters';
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

/**
 * `…` と、節へのリンク `[第4.5節 while文](04-loop/05-while)` だけを組む、ごく小さな記法の表示。
 *
 * リンクにするのは ( ) の中が節の場所（`/learn/lesson/` のあとの部分）の形のときだけ
 * （20-platform.md 第15.2節）。ほかの URL（https: や javascript: を含む）は文字のまま出す。
 * 同じタブで開く。書きかけのコードは課題の欄が残す。
 * 同じ形を scripts/check-lessons.mjs（LESSON_LINK）が見て、リンク先の節が実在することを確かめる。
 */
const INLINE_RE = /`([^`]*)`|\[([^\]\n]+)\]\((\d\d[a-z0-9-]*\/\d\d-[a-z0-9-]+)\)/g;

export function Inline({ text }: { text: string }) {
  const parts: ReactNode[] = [];
  let last = 0;
  for (const m of text.matchAll(INLINE_RE)) {
    const at = m.index ?? 0;
    if (at > last) parts.push(<span key={parts.length}>{text.slice(last, at)}</span>);
    if (m[3] !== undefined) {
      parts.push(
        <a key={parts.length} className="kit-lessonlink" href={lessonHref(m[3])}>
          <Inline text={m[2]} />
        </a>,
      );
    } else {
      parts.push(<code key={parts.length}>{m[1]}</code>);
    }
    last = at + m[0].length;
  }
  if (last < text.length) parts.push(<span key={parts.length}>{text.slice(last)}</span>);
  return <>{parts}</>;
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
