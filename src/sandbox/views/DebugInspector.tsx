import { useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';

/**
 * ユーザーが Claude に寸法を「言葉」ではなく「値」で渡すための、開発者専用の道具。
 * Ctrl+Shift+D で有効化（Sandbox.tsx 側）。通常のユーザーの目には一切触れない。
 * ホバーで箱の範囲・名前・寸法・文字サイズを見せ、クリックで選んで文字サイズ・余白・幅を
 * その場のスライダーで動かし、変更差分をコピーできるテキストにする。
 */

type Rect = { left: number; top: number; width: number; height: number };
type Prop = 'font-size' | 'padding' | 'width';
type Change = { prop: Prop; from: number; to: number };

const PROP_LABEL: Record<Prop, string> = {
  'font-size': '文字サイズ',
  padding: '余白',
  width: '幅',
};

const rectOf = (el: Element): Rect => {
  const r = el.getBoundingClientRect();
  return { left: r.left, top: r.top, width: r.width, height: r.height };
};

/** 分かりやすい名前が無ければクラス名、それも無ければタグ名 */
const nameOf = (el: Element): string => {
  const cls = Array.from(el.classList).find((c) => c.startsWith('sb-'));
  return cls ? `.${cls}` : el.tagName.toLowerCase();
};

const isInside = (el: EventTarget | null): boolean =>
  el instanceof Element ? !!el.closest('.sb-debug') : false;

export function DebugInspector({ active, onClose }: { active: boolean; onClose: () => void }) {
  const [hoverEl, setHoverEl] = useState<HTMLElement | null>(null);
  const [hoverRect, setHoverRect] = useState<Rect | null>(null);
  const [selEl, setSelEl] = useState<HTMLElement | null>(null);
  const [selRect, setSelRect] = useState<Rect | null>(null);
  const [changes, setChanges] = useState<Change[]>([]);
  const [copied, setCopied] = useState(false);
  const origRef = useRef<{ fontSize: number; padding: number; width: number } | null>(null);

  /* 有効／無効の切り替え時に状態を空にする */
  useEffect(() => {
    if (!active) {
      setHoverEl(null);
      setHoverRect(null);
      setSelEl(null);
      setSelRect(null);
      setChanges([]);
      origRef.current = null;
    }
  }, [active]);

  /* ホバーで箱を追う */
  useEffect(() => {
    if (!active) return;
    const move = (e: MouseEvent) => {
      const t = e.target;
      if (!(t instanceof HTMLElement) || isInside(t)) return;
      setHoverEl(t);
      setHoverRect(rectOf(t));
    };
    window.addEventListener('mousemove', move);
    return () => window.removeEventListener('mousemove', move);
  }, [active]);

  /* クリックで選ぶ。この間は通常の操作を止める（見る・動かすに専念させる） */
  useEffect(() => {
    if (!active) return;
    const down = (e: MouseEvent) => {
      const t = e.target;
      if (isInside(t)) return;
      if (!(t instanceof HTMLElement)) return;
      e.preventDefault();
      e.stopPropagation();
      const cs = getComputedStyle(t);
      origRef.current = {
        fontSize: parseFloat(cs.fontSize) || 0,
        padding: parseFloat(cs.paddingTop) || 0,
        width: t.getBoundingClientRect().width,
      };
      setSelEl(t);
      setSelRect(rectOf(t));
      setChanges([]);
    };
    window.addEventListener('mousedown', down, true);
    return () => window.removeEventListener('mousedown', down, true);
  }, [active]);

  /* Esc は選択の解除。デバッグ自体の有効／無効は呼び出し側（Ctrl+Shift+D）が持つ */
  useEffect(() => {
    if (!active) return;
    const key = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && selEl) {
        e.stopPropagation();
        setSelEl(null);
        setSelRect(null);
      }
    };
    window.addEventListener('keydown', key, true);
    return () => window.removeEventListener('keydown', key, true);
  }, [active, selEl]);

  if (!active || typeof document === 'undefined') return null;

  const record = (prop: Prop, to: number) => {
    const orig = origRef.current;
    if (!orig) return;
    const from = prop === 'font-size' ? orig.fontSize : prop === 'padding' ? orig.padding : orig.width;
    setChanges((cs) => {
      const rest = cs.filter((c) => c.prop !== prop);
      return Math.abs(to - from) < 0.05 ? rest : [...rest, { prop, from, to }];
    });
  };

  const applyFont = (v: number) => {
    if (!selEl) return;
    selEl.style.fontSize = `${v}px`;
    setSelRect(rectOf(selEl));
    record('font-size', v);
  };
  const applyPadding = (v: number) => {
    if (!selEl) return;
    selEl.style.padding = `${v}px`;
    setSelRect(rectOf(selEl));
    record('padding', v);
  };
  const applyWidth = (v: number) => {
    if (!selEl) return;
    selEl.style.width = `${v}px`;
    setSelRect(rectOf(selEl));
    record('width', v);
  };

  const copy = () => {
    if (!selEl || changes.length === 0) return;
    const name = nameOf(selEl);
    const lines = changes.map((c) => `${name} の${PROP_LABEL[c.prop]} ${c.from.toFixed(1)}px → ${c.to.toFixed(1)}px`);
    navigator.clipboard?.writeText(lines.join('\n')).then(
      () => {
        setCopied(true);
        setTimeout(() => setCopied(false), 1500);
      },
      () => {},
    );
  };

  const cur = selEl && origRef.current ? getComputedStyle(selEl) : null;
  const curFont = cur ? parseFloat(cur.fontSize) || 0 : 0;
  const curPad = cur ? parseFloat(cur.paddingTop) || 0 : 0;
  const curWidth = selRect ? selRect.width : 0;

  return createPortal(
    <div className="sb-debug">
      {!selEl && hoverEl && hoverRect && (
        <>
          <div
            className="sb-debug__box"
            style={{ left: hoverRect.left, top: hoverRect.top, width: hoverRect.width, height: hoverRect.height }}
          />
          <div
            className="sb-debug__tip"
            style={{ left: hoverRect.left, top: Math.max(4, hoverRect.top - 54) }}
          >
            <b>{nameOf(hoverEl)}</b>
            <span>
              {Math.round(hoverRect.width)} × {Math.round(hoverRect.height)} px
            </span>
            <span>文字 {(parseFloat(getComputedStyle(hoverEl).fontSize) || 0).toFixed(1)}px</span>
          </div>
        </>
      )}

      {selEl && selRect && (
        <div
          className="sb-debug__box sb-debug__box--sel"
          style={{ left: selRect.left, top: selRect.top, width: selRect.width, height: selRect.height }}
        />
      )}

      <div className="sb-debug__hint">デバッグ道具（Ctrl+Shift+D で終了）。クリックして選ぶ、Esc で選択解除</div>

      {selEl && (
        <div className="sb-debug__panel">
          <p className="sb-debug__name">{nameOf(selEl)}</p>
          <p className="sb-debug__dims">
            {Math.round(curWidth)} × {Math.round(selRect?.height ?? 0)} px
          </p>

          <label className="sb-debug__row">
            <span>文字サイズ {curFont.toFixed(1)}px</span>
            <input type="range" min={6} max={64} step={0.5} value={curFont} onChange={(e) => applyFont(Number(e.target.value))} />
          </label>
          <label className="sb-debug__row">
            <span>余白 {curPad.toFixed(1)}px</span>
            <input type="range" min={0} max={48} step={0.5} value={curPad} onChange={(e) => applyPadding(Number(e.target.value))} />
          </label>
          <label className="sb-debug__row">
            <span>幅 {Math.round(curWidth)}px</span>
            <input
              type="range"
              min={0}
              max={Math.max(900, curWidth * 1.5)}
              step={1}
              value={curWidth}
              onChange={(e) => applyWidth(Number(e.target.value))}
            />
          </label>

          <div className="sb-debug__changes">
            {changes.length === 0 ? (
              <p className="sb-debug__none">まだ変更なし</p>
            ) : (
              changes.map((c) => (
                <p key={c.prop}>
                  {PROP_LABEL[c.prop]} {c.from.toFixed(1)}px → {c.to.toFixed(1)}px
                </p>
              ))
            )}
          </div>

          <div className="sb-debug__actions">
            <button type="button" className="sb-debug__btn" disabled={changes.length === 0} onClick={copy}>
              {copied ? 'コピーしました' : 'この差分をコピー'}
            </button>
            <button
              type="button"
              className="sb-debug__btn"
              onClick={() => {
                setSelEl(null);
                setSelRect(null);
              }}
            >
              選択を解除
            </button>
          </div>
        </div>
      )}

      {!selEl && (
        <button type="button" className="sb-debug__close" onClick={onClose}>
          デバッグ道具を終了
        </button>
      )}
    </div>,
    document.body,
  );
}
