import { fmt } from './format';

export type LogicRow = {
  x: number[];
  z: number;
  a: number;
  target: number;
  ok: boolean;
};

type Props = {
  rows: LogicRow[];
  targetName: string;
  selected: number;
  onSelect: (i: number) => void;
};

export function TruthTable({ rows, targetName, selected, onSelect }: Props) {
  const done = rows.filter((r) => r.ok).length;
  return (
    <div className="sb-truth">
      <table>
        <thead>
          <tr>
            <th>x₁</th>
            <th>x₂</th>
            <th>加重和 z</th>
            <th>出力</th>
            <th>正解</th>
            <th />
          </tr>
        </thead>
        <tbody>
          {rows.map((r, i) => (
            <tr
              key={i}
              className={`${r.ok ? '' : 'sb-truth__ng'} ${i === selected ? 'sb-truth__sel' : ''}`}
              onClick={() => onSelect(i)}
              title="この行を左の図に映す"
            >
              <td>{r.x[0]}</td>
              <td>{r.x[1]}</td>
              <td className="sb-truth__z">{fmt(r.z, 2)}</td>
              <td>{fmt(r.a, 0)}</td>
              <td>{r.target}</td>
              <td className="sb-truth__mark">{r.ok ? '○' : '×'}</td>
            </tr>
          ))}
        </tbody>
      </table>
      <p className="sb-truth__score">
        目標: {targetName} — <b>{done} / {rows.length}</b> 一致
      </p>
      <p className="sb-truth__hint">行をクリックすると、その入力が図に映ります</p>
    </div>
  );
}
