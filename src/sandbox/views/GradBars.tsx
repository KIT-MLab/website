import { fmt } from './format';

type Props = { norms: number[] | null; small?: boolean };

/** 層ごとの勾配の大きさ。奥の層で消える／膨らむのが見える */
export function GradBars({ norms, small }: Props) {
  if (!norms || norms.length === 0) {
    return <p className="sb-empty">まだ学習していません</p>;
  }
  const max = Math.max(...norms, 1e-9);
  return (
    <div className={`sb-grad ${small ? 'sb-grad--small' : ''}`}>
      {norms.map((v, i) => (
        <div className="sb-grad__row" key={i}>
          <span className="sb-grad__l">{i === norms.length - 1 ? '出力' : `層${i + 1}`}</span>
          <span className="sb-grad__track">
            <span className="sb-grad__fill" style={{ width: `${Math.max(1, (v / max) * 100)}%` }} />
          </span>
          {!small && <span className="sb-grad__v">{v < 0.001 ? v.toExponential(1) : fmt(v, 3)}</span>}
        </div>
      ))}
    </div>
  );
}
