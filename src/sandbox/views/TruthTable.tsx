import { fmt } from './format';

export type LogicRow = {
  x: number[];
  z: number;
  a: number;
  /** 目標がまだ「◯◯をつくる」形でない段階では null */
  target: number | null;
  ok: boolean | null;
};

type Props = {
  rows: LogicRow[];
  selected: number;
  onSelect?: (i: number) => void;
  small?: boolean;
};

export function TruthTable({ rows, selected, onSelect, small }: Props) {
  const graded = rows.some((r) => r.target !== null);
  return (
    <table className={`sb-truth ${small ? 'sb-truth--small' : ''}`}>
      <thead>
        <tr>
          <th>x₁</th>
          <th>x₂</th>
          <th>z</th>
          <th>出力</th>
          {graded && <th>正解</th>}
          {graded && <th />}
        </tr>
      </thead>
      <tbody>
        {rows.map((r, i) => (
          <tr
            key={i}
            className={`${r.ok === false ? 'sb-truth__ng' : ''} ${i === selected ? 'sb-truth__sel' : ''}`}
            onClick={() => onSelect?.(i)}
          >
            <td>{r.x[0]}</td>
            <td>{r.x[1]}</td>
            <td className="sb-truth__z">{fmt(r.z)}</td>
            <td>{fmt(r.a)}</td>
            {graded && <td>{r.target}</td>}
            {graded && <td className="sb-truth__mark">{r.ok ? '○' : '×'}</td>}
          </tr>
        ))}
      </tbody>
    </table>
  );
}
