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
          <th>
            <span className="sb-truth__zh">加重和</span>
            <span className="sb-truth__zh sb-truth__zh--main">z</span>
          </th>
          <th>出力</th>
          {graded && <th>目標</th>}
        </tr>
      </thead>
      <tbody>
        {rows.map((r, i) => (
          <tr
            key={i}
            data-ok={r.ok === null ? undefined : r.ok}
            className={i === selected ? 'sb-truth__sel' : ''}
            onClick={() => onSelect?.(i)}
          >
            <td>{r.x[0]}</td>
            <td>{r.x[1]}</td>
            <td className="sb-truth__z">{fmt(r.z)}</td>
            <td className="sb-truth__out">{fmt(r.a)}</td>
            {graded && <td>{r.target}</td>}
          </tr>
        ))}
      </tbody>
    </table>
  );
}
