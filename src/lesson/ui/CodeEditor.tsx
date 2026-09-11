/**
 * コード入力欄。CodeMirror 6（20-platform.md 第1章）。
 *
 * CodeMirror を使う理由は行番号である。Python のエラーは `line 3` のように行番号で
 * 場所を示す。行番号のない入力欄では、エラーメッセージを読む練習ができない。
 */
import { useEffect, useRef } from 'react';
import { EditorView, basicSetup } from 'codemirror';
import { python } from '@codemirror/lang-python';

/** サイト本体のトークンに合わせた見た目。コードは14px以上（10-lesson 第9.4節 原則7）。 */
const THEME = EditorView.theme({
  '&': {
    fontSize: '14.5px',
    backgroundColor: 'var(--color-card)',
    color: 'var(--color-ink)',
    border: '1.5px solid var(--color-line)',
    borderRadius: 'var(--radius)',
  },
  '&.cm-focused': { outline: '2px solid var(--color-focus)', outlineOffset: '1px' },
  '.cm-scroller': { fontFamily: 'var(--font-mono)', lineHeight: '1.7' },
  '.cm-gutters': {
    backgroundColor: 'transparent',
    color: 'var(--color-ink-2)',
    borderRight: '1px solid var(--color-line)',
  },
  '.cm-activeLine': { backgroundColor: 'rgba(179, 64, 42, 0.06)' },
  '.cm-activeLineGutter': { backgroundColor: 'rgba(179, 64, 42, 0.06)' },
  '.cm-content': { padding: '8px 0' },
});

type Props = {
  value: string;
  onChange?: (value: string) => void;
  readOnly?: boolean;
  label: string;
  /** この数を変えると、中身を value に戻す */
  resetSignal?: number;
};

export default function CodeEditor({ value, onChange, readOnly = false, label, resetSignal = 0 }: Props) {
  const host = useRef<HTMLDivElement | null>(null);
  const view = useRef<EditorView | null>(null);
  const changed = useRef(onChange);
  changed.current = onChange;

  useEffect(() => {
    if (!host.current) return;
    const extensions = [
      basicSetup,
      python(),
      THEME,
      EditorView.lineWrapping,
      EditorView.updateListener.of((update) => {
        if (update.docChanged) changed.current?.(update.state.doc.toString());
      }),
    ];
    if (readOnly) extensions.push(EditorView.editable.of(false));
    const created = new EditorView({ doc: value, extensions, parent: host.current });
    created.contentDOM.setAttribute('aria-label', label);
    view.current = created;
    return () => {
      created.destroy();
      view.current = null;
    };
    // 作り直すのは読み取り専用の切り替えだけ。value の変化では作り直さない
  }, [readOnly]);

  useEffect(() => {
    const v = view.current;
    if (!v || resetSignal === 0) return;
    v.dispatch({ changes: { from: 0, to: v.state.doc.length, insert: value } });
  }, [resetSignal]);

  return <div className="kit-editor" ref={host} />;
}
