import { ACTIVATIONS } from '../engine/activations';
import type { ForwardTrace, Network } from '../engine/types';
import { fmt, signed } from './format';

type Props = { net: Network; trace: ForwardTrace; inputLabels: string[]; big?: boolean };

/** 加重和を式のまま展開して見せる。ここが「中が見える」の中心 */
export function Inspector({ net, trace, inputLabels, big }: Props) {
  return (
    <div className={big ? 'sb-inspector sb-inspector--big' : 'sb-inspector'}>
      {net.layers.map((layer, li) => {
        const inputs = li === 0 ? trace.input : trace.layers[li - 1].a;
        return layer.w.map((row, o) => {
          const act = ACTIVATIONS[layer.acts[o]];
          const z = trace.layers[li].z[o];
          const a = trace.layers[li].a[o];
          return (
            <div className="sb-calc" key={`${li}-${o}`}>
              <div className="sb-calc__row">
                <span className="sb-calc__lhs">z</span>
                <span className="sb-calc__rhs">
                  {row.map((w, i) => (
                    <span key={i}>
                      {i > 0 ? ' + ' : ''}
                      <b>{fmt(w)}</b>
                      <span className="sb-calc__op"> × </span>
                      {fmt(inputs[i])}
                      <span className="sb-calc__note">
                        （{li === 0 ? inputLabels[i] : `h${i + 1}`}）
                      </span>
                    </span>
                  ))}
                  <span> {signed(layer.b[o])}</span>
                  <span className="sb-calc__note">（バイアス）</span>
                </span>
              </div>
              <div className="sb-calc__row">
                <span className="sb-calc__lhs" />
                <span className="sb-calc__rhs sb-calc__result">= {fmt(z, 3)}</span>
              </div>
              <div className="sb-calc__row">
                <span className="sb-calc__lhs">a</span>
                <span className="sb-calc__rhs">
                  {act.label === 'なし（そのまま）' ? 'そのまま' : act.label}(<b>{fmt(z, 3)}</b>) ={' '}
                  <span className="sb-calc__result">{fmt(a, 3)}</span>
                </span>
              </div>
            </div>
          );
        });
      })}
    </div>
  );
}
