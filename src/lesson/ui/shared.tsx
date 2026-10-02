/** <Run> と <Exercise> が共に使う小さな部品。 */
import { useEffect, useState, type ReactNode } from 'react';
import { PROJECT_REF_SOURCE, isMembersOnlyChapter, lessonHref } from '../chapters';
import { onLoadProgress, pythonStatus } from '../runtime/runner';
import type { ExecResult, LoadProgress } from '../runtime/types';
import { FILES_MESSAGE, INPUT_EMPTY_MESSAGE, TIMEOUT_MESSAGE } from '../runtime/types';
import sectionRefs from '../../generated/section-refs.json';

const SECTION_REFS: Record<string, string> = sectionRefs;

/** 実行結果を、画面に出す文字列にする。エラーは訳さずそのまま出す（10-lesson 第5章）。 */
export function outputText(result: ExecResult): string {
  const e = result.error;
  if (!e) return result.stdout;
  if (e.kind === 'timeout') return `${result.stdout}${TIMEOUT_MESSAGE}`;
  if (e.kind === 'files') return FILES_MESSAGE;
  if (e.kind === 'input-empty') return `${result.stdout}${INPUT_EMPTY_MESSAGE}`;
  if (e.kind === 'no-function') return `${result.stdout}${e.fn} という名前の関数が見つかりません`;
  return `${result.stdout}${e.traceback || e.display}`.replace(/\n+$/, '');
}

/**
 * 実行結果の表示。質問の文を渡した input() が読んだ値を、端末で打ち込んだように読んだ位置へ薄く差し込む
 * （2026-09-29。20-platform.md 第3.2節）。表示だけで、採点と期待値は stdout のまま。
 */
export function OutputText({ result }: { result: ExecResult }) {
  const text = outputText(result);
  const parts: ReactNode[] = [];
  let last = 0;
  for (const [at, value] of result.echo ?? []) {
    const cut = Math.min(Math.max(at, last), text.length);
    if (cut > last) parts.push(text.slice(last, cut));
    parts.push(
      <span key={parts.length} className="kit-out__echo">
        {value}
      </span>,
    );
    last = cut;
  }
  parts.push(text.slice(last));
  return <>{parts}</>;
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
 * 「タイタニック2」（メンバーだけの章。design/spec/53-ml-intro.md 第7節）をリンクにしてよいページか。
 * この部品はだれが見ているかを知らないので、メンバーでない人が開けないページ（メンバーだけの章の節と
 * 今週の演習）にいるときだけリンクにする。ほかのページでは文字だけにする。ヒントは押してから出るので、
 * サーバで組むときにここを通ることは無い
 */
function membersPage(): boolean {
  if (typeof location === 'undefined') return false;
  const m = /^\/learn\/(lesson|weekly)\/([^/]+)\//.exec(location.pathname);
  return m !== null && (m[1] === 'weekly' || isMembersOnlyChapter(m[2]));
}

/**
 * `…` と、節への参照「第N章M節」（メンバーだけの章は「タイタニック2」「pandas 2」）だけを組む、ごく小さな記法の表示。
 *
 * リンクにするのは src/generated/section-refs.json（scripts/build-tests.mjs が書き出す）に
 * 行き先がある形だけ（20-platform.md 第15.2節）。無ければ文字のまま出す。同じタブで開く。
 * 本文（MDX）側の同じ変換は scripts/remark-section-links.mjs が受け持つ。
 * 同じ形を scripts/check-lessons.mjs（検査20）が見て、リンク先の節が実在することを確かめる。
 */
const INLINE_RE = new RegExp(`\`([^\`]*)\`|第(\\d+)章(\\d+)節|${PROJECT_REF_SOURCE}`, 'g');

export function Inline({ text }: { text: string }) {
  const parts: ReactNode[] = [];
  let last = 0;
  for (const m of text.matchAll(INLINE_RE)) {
    const at = m.index ?? 0;
    if (at > last) parts.push(<span key={parts.length}>{text.slice(last, at)}</span>);
    if (m[1] !== undefined) {
      parts.push(<code key={parts.length}>{m[1]}</code>);
    } else {
      const entry = m[4] !== undefined && !membersPage() ? undefined : SECTION_REFS[m[4] !== undefined ? `${m[4]}${Number(m[5])}` : `${Number(m[2])}-${Number(m[3])}`];
      parts.push(
        entry ? (
          <a key={parts.length} className="kit-lessonlink" href={lessonHref(entry)}>
            {m[0]}
          </a>
        ) : (
          <span key={parts.length}>{m[0]}</span>
        ),
      );
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
