/**
 * コード入力欄。CodeMirror 6（20-platform.md 第1章）。
 *
 * CodeMirror を使う理由は行番号である。Python のエラーは `line 3` のように行番号で
 * 場所を示す。行番号のない入力欄では、エラーメッセージを読む練習ができない。
 *
 * 見た目は 10-lesson-and-writing.md 第10.9節の決定（案J）。
 * 黒い面 #17140f に紙色5pxのマットを巻き、その外に1pxの墨罫。マットと罫は
 * 親の .kit-code（lesson.css）が持つ。キャプションは札にしない（第10.6節）ので、
 * 暗い面の中の小さな文字にする。
 */
import { useEffect, useRef } from 'react';
import { EditorView, basicSetup } from 'codemirror';
import { python } from '@codemirror/lang-python';
import { HighlightStyle, indentUnit, syntaxHighlighting } from '@codemirror/language';
import { tags } from '@lezer/highlight';
import { Prec } from '@codemirror/state';
import { keymap } from '@codemirror/view';
import { acceptCompletion } from '@codemirror/autocomplete';
import { indentWithTab } from '@codemirror/commands';

/** 黒い面の上の見た目。コードは14px以上（10-lesson 第9.4節 原則7）。 */
const THEME = EditorView.theme(
  {
    '&': {
      fontSize: '15px',
      backgroundColor: 'transparent',
      color: 'var(--k-fg)',
    },
    '&.cm-focused': { outline: '2px solid var(--l-shu)', outlineOffset: '-2px' },
    '.cm-scroller': { fontFamily: 'var(--font-mono)', lineHeight: '1.85' },
    '.cm-content': { padding: '13px 0', caretColor: 'var(--k-fg)' },
    '.cm-line': { padding: '0 16px 0 7px' },
    '.cm-gutters': {
      backgroundColor: 'transparent',
      color: 'var(--k-gut)',
      border: '0',
      borderRight: '1px solid var(--k-line)',
    },
    '.cm-lineNumbers .cm-gutterElement': { padding: '0 9px 0 16px' },
    '.cm-activeLine': { backgroundColor: 'rgba(236, 230, 216, 0.05)' },
    '.cm-activeLineGutter': { backgroundColor: 'rgba(236, 230, 216, 0.05)', color: '#a2977f' },
    '.cm-cursor, .cm-dropCursor': { borderLeftColor: 'var(--k-fg)' },
    '&.cm-focused .cm-selectionBackground, .cm-selectionBackground, .cm-content ::selection': {
      backgroundColor: 'var(--k-sel)',
    },
    '.cm-selectionMatch': { backgroundColor: 'rgba(236, 230, 216, 0.12)' },
    '.cm-matchingBracket, .cm-nonmatchingBracket': {
      backgroundColor: 'rgba(236, 230, 216, 0.16)',
      outline: '0',
    },
    '.cm-panels, .cm-tooltip': {
      backgroundColor: 'var(--k-bg2)',
      color: 'var(--k-fg)',
      border: '1px solid var(--k-line)',
    },
    '.cm-tooltip-autocomplete > ul > li[aria-selected]': {
      backgroundColor: 'var(--k-sel)',
      color: 'var(--k-fg)',
    },
    '.cm-foldPlaceholder': { backgroundColor: 'var(--k-sel)', color: 'var(--k-fg2)', border: '0' },
  },
  { dark: true },
);

/**
 * 案Jのコードは単色である。CodeMirror の既定の配色は明るい地に合わせた濃い色
 * （文字列 #a11 など）なので、黒い面では読めない。単色に戻し、コメントだけ沈める。
 * fallback なしの syntaxHighlighting は既定の配色を置き換える。
 */
const HIGHLIGHT = HighlightStyle.define([
  { tag: tags.comment, color: 'var(--k-dim)', fontStyle: 'italic' },
  { tag: tags.invalid, color: 'var(--k-err)' },
]);

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
      /* Tab: 補完の候補が出ていれば選ぶ。出ていなければ字下げ（Shift+Tab で戻す）。
         コード欄から抜けるときは Esc を押してから Tab（CodeMirror の決まり） */
      Prec.highest(keymap.of([{ key: 'Tab', run: acceptCompletion }])),
      keymap.of([indentWithTab]),
      indentUnit.of('    '), // 字下げは Python の決まりどおり空白4つ
      python(),
      syntaxHighlighting(HIGHLIGHT),
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

  return (
    <div className={`kit-code${readOnly ? ' kit-code--ro' : ''}`}>
      <div className="kit-code__label">{label}</div>
      <div className="kit-editor" ref={host} />
    </div>
  );
}
