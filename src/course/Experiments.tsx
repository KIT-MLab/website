import { useEffect, useId, useMemo, useState } from 'react';
import type { ReactNode } from 'react';
import Sandbox from '../sandbox/Sandbox';
import { ACTIVATIONS } from '../sandbox/engine/activations';
import { forward } from '../sandbox/engine/network';
import { datasetLoss } from '../sandbox/engine/trainer';
import type { ActivationId, Dataset, Network } from '../sandbox/engine/types';
import { accuracy, advanceRun, attention, backwardExample, batchEpoch, BATCH_DATA, convolve, curveTrain, curveValidation, FILTERS, fitCurve, fixed, gradientWalk, lineLoss, newRun, pixelPattern, SPLITS, XOR } from './math';

type Props = { onSolved: () => void };
function useAchievement(done: boolean, callback: () => void) { useEffect(() => { if (done) callback(); }, [done, callback]); }
function Range({ label, value, min, max, step = .1, change }: { label: string; value: number; min: number; max: number; step?: number; change: (v: number) => void }) {
  const id = useId();
  return <div className="lab-range"><label htmlFor={id}>{label}<output>{fixed(value, 2)}</output></label><input id={id} type="range" min={min} max={max} step={step} value={value} onChange={(e) => change(Number(e.target.value))} /></div>;
}
function Choices<T extends string | number>({ label, value, options, change, disabled = false }: { label: string; value: T; options: [T, string][]; change: (v: T) => void; disabled?: boolean }) {
  return <fieldset className="lab-choices" disabled={disabled}><legend>{label}</legend><div>{options.map(([v, name]) => <button key={v} type="button" aria-pressed={v === value} onClick={() => change(v)}>{name}</button>)}</div></fieldset>;
}
function Metric({ label, children, good }: { label: string; children: ReactNode; good?: boolean }) {
  return <div className="lab-metric" data-good={good || undefined}><span>{label}</span><strong>{children}</strong></div>;
}
type Series = { points: [number, number][]; color: string; dots?: boolean; diamond?: boolean; dashed?: boolean };
export function Plot({ series, xRange = [-1, 1], yRange = [-1, 2], xLabel = '入力 x', yLabel = '出力 y', caption }: { series: Series[]; xRange?: [number, number]; yRange?: [number, number]; xLabel?: string; yLabel?: string; caption: string }) {
  const id = useId();
  const px = (v: number) => 56 + (v - xRange[0]) / (xRange[1] - xRange[0]) * 390;
  const py = (v: number) => 220 - (v - yRange[0]) / (yRange[1] - yRange[0]) * 178;
  return <figure className="lab-plot"><svg viewBox="0 0 480 268" role="img" aria-labelledby={id}><title id={id}>{caption}</title><defs><clipPath id={`${id}-clip`}><rect x="52" y="38" width="398" height="186" /></clipPath></defs>
    {[0, .5, 1].map((t) => { const y = yRange[0] + (yRange[1] - yRange[0]) * t; return <g key={t}><line x1="56" x2="446" y1={py(y)} y2={py(y)} stroke="#44443d" strokeDasharray="3 5" /><text x="46" y={py(y) + 5} textAnchor="end">{Number(y.toFixed(2))}</text></g>; })}
    <line x1="56" x2="446" y1="220" y2="220" stroke="#818173" /><line x1="56" x2="56" y1="42" y2="220" stroke="#818173" />
    {[0, .5, 1].map((t) => { const x = xRange[0] + (xRange[1] - xRange[0]) * t; return <text key={t} x={px(x)} y="240" textAnchor="middle">{Number(x.toFixed(2))}</text>; })}
    <text x="56" y="22">{yLabel}</text><text x="446" y="263" textAnchor="end">{xLabel}</text>
    <g clipPath={`url(#${id}-clip)`}>{series.map((s, i) => <g key={i}>{s.dots ? s.points.map(([x, y], j) => s.diamond ? <path key={j} d={`M${px(x)},${py(y) - 5}l5,5 -5,5 -5,-5Z`} fill="none" stroke={s.color} strokeWidth="2" /> : <circle key={j} cx={px(x)} cy={py(y)} r="4" fill={s.color} />) : <path d={s.points.map(([x, y], j) => `${j ? 'L' : 'M'}${px(x)},${py(y)}`).join(' ')} fill="none" stroke={s.color} strokeWidth="2.5" strokeDasharray={s.dashed ? '6 5' : undefined} />}</g>)}</g>
  </svg><figcaption>{caption}</figcaption></figure>;
}
const curve = (f: (x: number) => number, lo = -1, hi = 1): [number, number][] => Array.from({ length: 101 }, (_, i) => { const x = lo + (hi - lo) * i / 100; return [x, f(x)]; });

function ActivationLab({ onSolved }: Props) {
  const [act, setAct] = useState<ActivationId>('identity'), [z, setZ] = useState(-1), [seen, setSeen] = useState(0);
  useEffect(() => { const bit = act === 'relu' ? (z < 0 ? 1 : z > 0 ? 2 : 0) : act === 'sigmoid' ? 4 : 0; setSeen((s) => s | bit); }, [act, z]);
  useAchievement(seen === 7, onSolved);
  const a = ACTIVATIONS[act];
  const series: Series[] = act === 'step' ? [{ points: [[-3, 0], [-.001, 0]], color: '#f0c14b' }, { points: [[0, 1], [3, 1]], color: '#f0c14b' }] : [{ points: curve(a.f, -3, 3), color: '#f0c14b' }];
  return <div className="lab-grid"><div><Choices label="活性化関数" value={act} options={[[ 'identity', 'そのまま' ], ['step', 'ステップ'], ['relu', 'ReLU'], ['sigmoid', 'シグモイド']]} change={setAct} /><Range label="変換前の数 z" value={z} min={-3} max={3} change={setZ} /><div className="lab-formula">z = {fixed(z, 1)} <span>→ {act === 'identity' ? 'そのまま' : a.label} →</span> a = {fixed(a.f(z))}</div><p className="lab-note">{act === 'step' ? '0で切り替わります。点線でつながった坂ではなく、段差です。' : act === 'relu' ? '負のときは0。正のときは入れた値がそのまま出ます。' : act === 'sigmoid' ? 'なめらかに変化し、0と1の間に収まります。' : '出力は入力と同じ。グラフは1本の直線です。'}</p><p className="lab-checks">{seen & 1 ? '✓' : '○'} ReLUの負　{seen & 2 ? '✓' : '○'} ReLUの正　{seen & 4 ? '✓' : '○'} シグモイド</p></div><Plot xRange={[-3, 3]} yRange={[-1, 3]} xLabel="変換前 z" yLabel="変換後 a" series={[...series, { points: [[z, a.f(z)]], dots: true, color: '#fff' }]} caption="黄色：関数の形 ／ 白い点：いまの入力と出力。表示範囲は a = −1〜3。" /></div>;
}

function LayersLab({ onSolved }: Props) {
  const [w1, setW1] = useState(1), [w2, setW2] = useState(0);
  const rows = XOR.x.map(([a, b], i) => { const or = a || b ? 1 : 0, and = a && b ? 1 : 0; return { a, b, or, and, output: or * w1 + and * w2, target: XOR.y[i][0] }; });
  const hits = rows.filter((r) => Math.abs(r.output - r.target) < .05).length;
  useAchievement(hits === 4, onSolved);
  return <><div className="lab-flow"><span>入力 x₁・x₂</span><span className="lab-flow__group"><b>中間層（ステップ）</b><span>h₁：どちらかが1（OR）</span><span>h₂：両方が1（AND）</span></span><span>出力：h₁ × w₁ ＋ h₂ × w₂</span></div><div className="lab-grid"><div><Range label="ORからの重み w₁" value={w1} min={-2} max={2} step={.1} change={setW1} /><Range label="ANDからの重み w₂" value={w2} min={-2} max={2} step={.1} change={setW2} /><Metric label="4通りのうち当たった数" good={hits === 4}>{hits} / 4</Metric><p className="lab-note">調整するのは出力側の2本だけ。出力の活性化は「そのまま」、バイアスは0です。</p></div><div className="table-wrap"><table className="lab-table"><caption>中間層の計算も見てみよう</caption><thead><tr>{['入力', 'OR', 'AND', '予測', '正解', '判定'].map((s) => <th key={s}>{s}</th>)}</tr></thead><tbody>{rows.map((r, i) => <tr key={i}><td>{r.a}, {r.b}</td><td>{r.or}</td><td>{r.and}</td><td>{fixed(r.output, 1)}</td><td>{r.target}</td><td>{Math.abs(r.output - r.target) < .05 ? '○' : '×'}</td></tr>)}</tbody></table></div></div><details className="lab-details"><summary>中間層の重みも見てみる</summary><p>OR：step(x₁ + x₂ − 0.5) ／ AND：step(x₁ + x₂ − 1.5)。前のステージと同じ計算部品を2つ並べています。</p></details></>;
}

function LossLab({ onSolved }: Props) {
  const [w, setW] = useState(0);
  const loss = lineLoss(w);
  useAchievement(loss <= .02, onSolved);
  return <div className="lab-grid"><div><Range label="重み w（予測 = w × x）" value={w} min={-1} max={3} step={.05} change={setW} /><div className="table-wrap"><table className="lab-table"><caption>2つの誤差をまとめる</caption><thead><tr>{['入力', '正解', '予測', '差', '差の二乗'].map((s) => <th key={s}>{s}</th>)}</tr></thead><tbody>{[-1, 1].map((x) => <tr key={x}><td>{x}</td><td>{2 * x}</td><td>{fixed(w * x, 2)}</td><td>{fixed((w - 2) * x, 2)}</td><td>{fixed(loss, 2)}</td></tr>)}</tbody></table></div><Metric label="平均二乗誤差（目標 0.02以下）" good={loss <= .02}>{fixed(loss)}</Metric><p className="lab-note">差の平均はいつも0でも、二乗した差は残ります。</p></div><Plot yRange={[-3, 3]} series={[{ points: curve((x) => w * x), color: '#f0c14b' }, { points: [[-1, -2], [1, 2]], dots: true, color: '#fff' }]} caption="白い点：正解 ／ 黄色い線：いまの予測。線を両方の点に近づけよう。" /></div>;
}

function GradientLab({ onSolved }: Props) {
  const [lr, setLr] = useState(.2), [history, setHistory] = useState([0]), [overshot, setOvershot] = useState(false), [stopped, setStopped] = useState(false);
  const w = history[history.length - 1], loss = lineLoss(w), gradient = 2 * (w - 2);
  useAchievement(overshot && lr === .2 && loss < .01, onSolved);
  function walk(count: number) { const extra = gradientWalk(w, lr, count); setHistory((h) => [...h, ...extra]); if (lr === 1.1 && extra.length) setOvershot(true); if (extra.length < count) setStopped(true); }
  return <div className="lab-grid"><div><Choices label="学習率（切り替えると同じ初期値に戻る）" value={lr} options={[[.02, '0.02 小さい'], [.2, '0.2 ほどよい'], [1.1, '1.1 大きい']]} change={(v) => { setLr(v); setHistory([0]); setStopped(false); }} /><div className="lab-actions"><button className="c-button primary" onClick={() => walk(1)} disabled={stopped}>1歩進める</button><button className="c-button" onClick={() => walk(10)} disabled={stopped}>10歩進める</button><button className="c-button" onClick={() => { setHistory([0]); setStopped(false); }}>重みを0に戻す</button></div><div className="lab-metrics"><Metric label="現在の重み">{fixed(w)}</Metric><Metric label="損失" good={loss < .01}>{fixed(loss)}</Metric></div><div className="lab-formula">次の重み = {fixed(w)} − {lr} × ({fixed(gradient)})</div><p className="lab-note">勾配 {fixed(gradient)}。{gradient < 0 ? '重みを増やす向きへ。' : gradient > 0 ? '重みを減らす向きへ。' : '谷底です。'} 更新 {history.length - 1} 回。</p><p className="lab-checks">{overshot ? '✓' : '○'} 大きい一歩を観察　{lr === .2 && loss < .01 ? '✓' : '○'} 損失0.01未満</p>{stopped && <p role="status">重みが表示できる範囲を超えそうなので停止しました。学習率を下げて試そう。</p>}</div><Plot xRange={[-2, 6]} yRange={[0, 17]} xLabel="重み w" yLabel="損失" series={[{ points: curve(lineLoss, -2, 6), color: '#727269' }, { points: history.filter((v) => v >= -2 && v <= 6).map((v) => [v, lineLoss(v)]), color: '#6bbcb8', dashed: true }, { points: [[w, loss]], color: '#f0c14b', dots: true }]} caption={w < -2 || w > 6 ? '現在の重みはグラフの範囲外。数値で行き過ぎを確かめよう。' : '黄色：現在地 ／ 破線：通った位置。損失の谷底は w = 2。'} /></div>;
}

function BackpropLab({ onSolved }: Props) {
  const [phase, setPhase] = useState(0), [w2, setW2] = useState(.5);
  const r = backwardExample(w2), dw1 = r.grad.layers[0].dw[0][0], dw2 = r.grad.layers[1].dw[0][0];
  useAchievement(phase === 4 && r.afterLoss < r.loss, onSolved);
  return <><Range label="出力側の重み w₂（変えると最初の手順に戻る）" value={w2} min={.2} max={1} step={.1} change={(v) => { setW2(v); setPhase(0); }} /><div className="lab-flow"><span>入力 1</span><span>w₁ = 0.5<br />ReLU → h = 0.5</span><span>w₂ = {fixed(w2, 1)}<br />出力 {phase >= 1 ? fixed(r.trace.output[0]) : '?'}</span><span>正解 1</span></div><div className="lab-actions">{['① 順伝播', '② 損失を計算', '③ 逆伝播', '④ 重みを更新'].map((name, i) => <button className={`c-button ${phase === i ? 'primary' : ''}`} disabled={phase !== i} key={name} onClick={() => setPhase(i + 1)}>{name}{phase > i ? ' ✓' : ''}</button>)}</div><div className="lab-results" aria-live="polite">{phase === 0 && <p>まずは入力から出力を計算しよう。バイアスは0に固定しています。</p>}{phase >= 1 && <p>順伝播：1 × 0.5 → ReLU → 0.5 × {fixed(w2, 1)} = <b>{fixed(r.trace.output[0])}</b></p>}{phase >= 2 && <p>損失：({fixed(r.trace.output[0])} − 1)² = <b>{fixed(r.loss)}</b></p>}{phase >= 3 && <><p className="lab-reverse">損失 → 出力側 w₂ の勾配 {fixed(dw2)} → 手前 w₁ の勾配 {fixed(dw1)}</p><p>出力の変化 {fixed(r.grad.dOutput[0])} × w₂ {fixed(w2, 1)} × ReLUの傾き1 × 入力1 = w₁ の勾配 {fixed(dw1)}</p></>}{phase >= 4 && <p className="lab-success">学習率0.1で2本を同時に更新。損失は {fixed(r.loss)} → <b>{fixed(r.afterLoss)}</b>。前の層にも直し方が届きました。</p>}</div></>;
}

function ClassifierPlot({ net, data }: { net: Network; data: Dataset }) {
  const id = useId();
  return <figure className="lab-plot"><svg viewBox="0 0 340 315" role="img" aria-labelledby={id}><title id={id}>赤はクラス1、青はクラス0。背景はモデルの予測、丸と四角はデータの正解。</title>{Array.from({ length: 22 * 22 }, (_, i) => { const col = i % 22, row = Math.floor(i / 22), p = forward(net, [-1.1 + (col + .5) * .1, 1.1 - (row + .5) * .1]).output[0]; return <rect key={i} x={40 + col * 12} y={18 + row * 12} width="12.1" height="12.1" fill={p >= .5 ? '#da755f' : '#60b9d2'} opacity={.01 + Math.abs(p - .5) * .45} />; })}<line x1="172" x2="172" y1="18" y2="282" stroke="#88887c" /><line x1="40" x2="304" y1="150" y2="150" stroke="#88887c" />{data.x.map(([a, b], i) => data.y[i][0] ? <circle key={i} cx={172 + a * 120} cy={150 - b * 120} r="4.5" fill="#ed997f" stroke="#171715" /> : <rect key={i} x={168 + a * 120} y={146 - b * 120} width="8" height="8" fill="#75cce1" stroke="#171715" />)}<text x="44" y="305">−1</text><text x="165" y="305">0</text><text x="286" y="305">1</text><text x="310" y="155">x₁</text><text x="165" y="13">x₂</text></svg><figcaption>背景：予測 ／ ● 赤：正解1 ／ ■ 青：正解0</figcaption></figure>;
}

function TrainingLab({ onSolved, final = false }: Props & { final?: boolean }) {
  const data = final ? SPLITS.train : XOR, validation = final ? SPLITS.validation : undefined;
  const [hidden, setHidden] = useState(final ? 0 : 4), [lr, setLr] = useState(.03);
  const [run, setRun] = useState(() => newRun(hidden, data, validation)), [tested, setTested] = useState(false), [view, setView] = useState('train');
  const loss = datasetLoss(run.net, data, 'bce'), acc = accuracy(run.net, data), valAcc = validation ? accuracy(run.net, validation) : 0;
  const testAcc = tested ? accuracy(run.net, SPLITS.test) : null;
  useAchievement(final ? tested && valAcc >= .85 && testAcc! >= .8 : hidden > 0 && run.steps > 0 && acc === 1 && loss < .15, onSolved);
  const points = (ys: number[]): [number, number][] => ys.map((y, i) => [i * 10, y]);
  const shownData = view === 'validation' && validation ? validation : view === 'test' && tested ? SPLITS.test : data;
  return <><div className="lab-grid"><div><Choices label="中間層のニューロン（変更で学習を初期化）" value={hidden} options={final ? [[0, 'なし'], [4, '4個'], [8, '8個']] : [[0, 'なし'], [4, '4個']]} disabled={tested} change={(v) => { setHidden(v); setRun(newRun(v, data, validation)); }} />{final && <Choices label="学習率（変更で学習を初期化）" value={lr} options={[[.003, '0.003'], [.03, '0.03'], [.3, '0.3']]} disabled={tested} change={(v) => { setLr(v); setRun(newRun(hidden, data, validation)); }} />}<div className="lab-actions"><button className="c-button primary" disabled={tested || run.error || run.steps >= 3000} onClick={() => setRun((r) => advanceRun(r, data, lr, 100, validation))}>100回学習させる</button><button className="c-button" disabled={tested} onClick={() => setRun(newRun(hidden, data, validation))}>重みを初期化</button></div><p className="lab-note">更新 {run.steps} 回 / 3000回まで。毎回、学習用の全{data.x.length}個から勾配を計算。Adamで更新。</p>{run.error && <p role="alert">計算が不安定になりました。初期化し、学習率を下げてみよう。</p>}{run.steps >= 3000 && !tested && <p role="status">この設定では上限まで試しました。構造や学習率を変えて比べられます。</p>}<div className="lab-metrics"><Metric label="学習用の損失" good={loss < .15}>{fixed(loss)}</Metric><Metric label="学習用の正答率" good={acc === 1}>{Math.round(acc * 100)}%</Metric>{final && <Metric label="検証用の正答率" good={valAcc >= .85}>{Math.round(valAcc * 100)}%</Metric>}</div>{final && <><button className="c-button primary" disabled={tested || run.steps === 0} onClick={() => { setTested(true); setView('test'); }}>このモデルで最終テストを開く</button><p className="lab-note">開くと設定と重みは固定されます。先に検証用で85%以上を目指そう。</p>{tested && <div className="lab-results" role="status"><b>最終テスト：{Math.round(testAcc! * 100)}%</b><p>{valAcc >= .85 && testAcc! >= .8 ? '未知の点にもルールが通用しました。' : '目標には届きませんでした。学習用・検証用の結果から、改善の仮説を考えよう。'}</p><p className="lab-note">やり直す場合はページ下の「実験をリセット」。同じテストを繰り返し見て調整すると、独立した最終評価ではなくなります。</p></div>}</>}</div><div>{final ? <><Choices label="表示する点" value={view} options={tested ? [['train', '学習用'], ['validation', '検証用'], ['test', 'テスト用']] : [['train', '学習用'], ['validation', '検証用']]} change={setView} /><ClassifierPlot net={run.net} data={shownData} /></> : <div className="table-wrap"><table className="lab-table"><caption>XORの予測（0.5以上なら1）</caption><thead><tr><th>入力</th><th>出力</th><th>判定</th><th>正解</th></tr></thead><tbody>{XOR.x.map((x, i) => { const p = forward(run.net, x).output[0]; return <tr key={i}><td>{x.join(', ')}</td><td>{fixed(p)}</td><td>{p >= .5 ? 1 : 0}</td><td>{XOR.y[i][0]}</td></tr>; })}</tbody></table></div>}<Plot xRange={[0, Math.max(100, run.steps)]} yRange={[0, Math.max(1, ...run.losses, ...run.validationLosses)]} xLabel="更新した回数" yLabel="損失" series={[{ points: points(run.losses), color: '#f0c14b' }, ...(final ? [{ points: points(run.validationLosses), color: '#75cce1', dashed: true }] : [])]} caption={final ? '黄色の実線：学習用 ／ 青の破線：検証用。どちらも更新後の損失。' : '重みを更新した後の損失。10回ごとに記録しています。'} /></div></div></>;
}

function DataLab({ onSolved }: Props) {
  const [answers, setAnswers] = useState(['', '', '']), [checked, setChecked] = useState(false);
  const names = ['重みとバイアスを更新する', '中間層の個数や、止める時点を選ぶ', 'すべて選び終えて、最後の成績を測る'];
  const correct = ['train', 'validation', 'test'];
  const good = answers.every((a, i) => a === correct[i]);
  useAchievement(checked && good, onSolved);
  return <><div className="lab-data-cards">{[['学習用', '重みを直す'], ['検証用', '設定を選ぶ'], ['テスト用', '最後に確かめる']].map(([title, sub], i) => <div key={title}><span className="eyebrow">DATA {i + 1}</span><h3>{title}</h3><p>{sub}</p><div className="data-dots" aria-hidden="true">{Array.from({ length: i === 0 ? 12 : 4 }, (_, j) => <i key={j} />)}</div></div>)}</div><div className="lab-assignments">{names.map((name, i) => <label key={name}>{name}<select value={answers[i]} onChange={(e) => { setAnswers((a) => a.map((v, j) => i === j ? e.target.value : v)); setChecked(false); }}><option value="">選んでください</option><option value="train">学習用</option><option value="validation">検証用</option><option value="test">テスト用</option></select>{checked && <span>{answers[i] === correct[i] ? '✓ 合っています' : 'もう一度、上の役割を見てみよう'}</span>}</label>)}</div><button className="c-button primary" onClick={() => setChecked(true)} disabled={answers.some((a) => !a)}>役割を確かめる</button>{checked && <p role="status">{good ? '3つの役割がそろいました。実際には目的に合わせて分割の方法や割合も決めます。' : 'まだ違う役割があります。重みを直すデータと、選んだ結果を評価するデータを分けよう。'}</p>}</>;
}

function OverfitLab({ onSolved }: Props) {
  const [knots, setKnots] = useState(0), [lambda, setLambda] = useState(0), [triedComplex, setTriedComplex] = useState(false);
  const fit = useMemo(() => fitCurve(knots, lambda), [knots, lambda]);
  useAchievement(triedComplex && fit.validationLoss < .01, onSolved);
  return <div className="lab-grid"><div><Choices label="曲線の細かさ（ReLUの折れ目の数）" value={knots} options={[[0, '0個：直線'], [4, '4個'], [18, '18個']]} change={(v) => { setKnots(v); if (v === 18) setTriedComplex(true); }} /><Choices label="正則化の強さ λ" value={lambda} options={[[0, '0'], [.001, '0.001'], [.1, '0.1'], [1, '1']]} change={setLambda} /><div className="lab-metrics"><Metric label="学習用の損失">{fixed(fit.trainLoss, 4)}</Metric><Metric label="検証用の損失" good={fit.validationLoss < .01}>{fixed(fit.validationLoss, 4)}</Metric></div><p className="lab-note">{knots === 0 ? '直線では、曲がった並びを追いきれません。' : fit.trainLoss < fit.validationLoss * .4 ? '学習用に比べ、検証用ではずれが大きくなっています。' : '学習用と検証用の両方で比べましょう。'}</p><p className="lab-checks">{triedComplex ? '✓' : '○'} 細かいモデルを試した</p><details className="lab-details"><summary>この実験の計算</summary><p>固定したReLUの出力を重み付きで足すモデルです。学習用MSE + λ × 重みの二乗和を最小にする重みを求めています。検証損失に罰則は含めません。比較のため、学習用15点と検証用40点は固定です。</p></details></div><Plot yRange={[-.4, 1.4]} series={[{ points: curve(fit.predict), color: '#f0c14b' }, { points: curveTrain, dots: true, color: '#fff' }, { points: curveValidation, dots: true, diamond: true, color: '#75cce1' }]} caption="● 白：学習用 ／ ◇ 青：検証用 ／ 黄色：予測。学習用には大きめのノイズが含まれます。" /></div>;
}

function BatchLab({ onSolved }: Props) {
  const [size, setSize] = useState(1), [history, setHistory] = useState<ReturnType<typeof batchEpoch>>([]), [seen, setSeen] = useState(0), [epochs, setEpochs] = useState(0);
  useAchievement(seen === 3, onSolved);
  const w = history.length ? history[history.length - 1].w : 0;
  return <div className="lab-grid"><div><Choices label="1回に使う例の数（切り替えると初期化）" value={size} options={[[1, '1個'], [2, '2個'], [8, '8個']]} change={(v) => { setSize(v); setHistory([]); setEpochs(0); }} /><div className="lab-batch-points">{BATCH_DATA.x.map((x, i) => <span key={i}>例{i + 1}<b>{x}</b></span>)}</div><button className="c-button primary" disabled={epochs >= 20} onClick={() => { setHistory((h) => [...h, ...batchEpoch(w, size)]); setEpochs((e) => e + 1); setSeen((s) => s | (size === 1 ? 1 : size === 8 ? 2 : 0)); }}>1エポック進める</button><div className="lab-metrics"><Metric label="データを回った数">{epochs} 周</Metric><Metric label="重みの更新">{history.length} 回</Metric></div><p>8個 ÷ バッチ{size}個 = 1周で{8 / size}回の更新</p><p className="lab-note">同じ順序・同じ学習率0.1で比較。違うのは、何個の勾配をまとめてから更新するかです。20周まで試せます。</p><p className="lab-checks">{seen & 1 ? '✓' : '○'} バッチ1　{seen & 2 ? '✓' : '○'} バッチ8</p></div><div><Plot xRange={[0, Math.max(8, history.length)]} yRange={[0, 2.5]} xLabel="更新した回数" yLabel="重み w" series={[{ points: [[0, 0], ...history.map((h, i) => [i + 1, h.w] as [number, number])], color: '#f0c14b' }]} caption="どちらも同じ8個の例から学びます。1周あたりの更新回数の違いに注目。" /><p className="lab-formula">現在の重み：{fixed(w)}{history.length > 0 && <><br /><span>最後に使った例：{history[history.length - 1].indices.map((i) => i + 1).join(', ')}</span></>}</p></div></div>;
}

function CnnLab({ onSolved }: Props) {
  const [pixels, setPixels] = useState(() => pixelPattern('vertical')), [axis, setAxis] = useState<'vertical' | 'horizontal'>('vertical'), [filter, setFilter] = useState<'vertical' | 'horizontal'>('horizontal'), [seen, setSeen] = useState(0), [selected, setSelected] = useState(0);
  const result = convolve(pixels, FILTERS[filter]);
  useEffect(() => { if (axis === filter) setSeen((s) => s | (filter === 'vertical' ? 1 : 2)); }, [axis, filter]);
  useAchievement(seen === 3, onSolved);
  const top = Math.floor(selected / 3), left = selected % 3;
  const terms = FILTERS[filter].flatMap((row, y) => row.map((w, x) => `${pixels[(top + y) * 5 + left + x]}×(${w})`));
  return <><div className="lab-grid"><Choices label="画像の例" value={axis} options={[[ 'vertical', '縦の境目' ], ['horizontal', '横の境目']]} change={(v) => { setAxis(v); setPixels(pixelPattern(v)); }} /><Choices label="フィルタの重み" value={filter} options={[[ 'vertical', '縦の境目用' ], ['horizontal', '横の境目用']]} change={setFilter} /></div><div className="lab-convolution"><div><h3>入力 5 × 5</h3><div className="pixel-grid input-pixels">{pixels.map((v, i) => { const row = Math.floor(i / 5), col = i % 5; return <button key={i} aria-label={`${row + 1}行${col + 1}列、画素${v}。クリックで反転`} aria-pressed={v === 1} data-lit={v === 1 || undefined} data-window={row >= top && row < top + 3 && col >= left && col < left + 3 || undefined} onClick={() => setPixels((p) => p.map((x, j) => i === j ? 1 - x : x))}>{v}</button>; })}</div><p className="lab-note">画素を押すと0 / 1を反転</p></div><div><h3>重み 3 × 3</h3><div className="pixel-grid filter-pixels">{FILTERS[filter].flat().map((v, i) => <span key={i}>{v}</span>)}</div><p className="lab-note">全位置で同じ重みを使う</p></div><div><h3>特徴マップ 3 × 3</h3><div className="pixel-grid output-pixels">{result.map((v, i) => <button key={i} aria-label={`反応 ${Math.floor(i / 3) + 1}行${i % 3 + 1}列：${v}`} aria-pressed={selected === i} onClick={() => setSelected(i)} style={{ background: v > 0 ? `rgb(240 193 75 / ${.15 + v * .18})` : v < 0 ? `rgb(117 204 225 / ${.15 - v * .18})` : '#292925' }}>{v}</button>)}</div><p className="lab-note">反応を押すと、その窓を表示</p></div></div><div className="lab-formula">選んだ窓：{terms.join(' + ')} = <b>{result[selected]}</b></div><p className="lab-note">外側への埋め合わせなし・1画素ずつ移動。ここでは活性化前の加重和を表示しています。</p><p className="lab-checks">{seen & 1 ? '✓' : '○'} 縦の反応　{seen & 2 ? '✓' : '○'} 横の反応</p></>;
}

function AttentionLab({ onSolved }: Props) {
  const [direction, setDirection] = useState('neutral'), [seen, setSeen] = useState(0);
  const query = direction === 'a' ? [3, 0] : direction === 'b' ? [0, 3] : [0, 0];
  const r = attention(query);
  useAchievement(seen === 3, onSolved);
  return <><Choices label="Query：いま集めたい情報の向き" value={direction} options={[[ 'neutral', 'どちらも同じ' ], ['a', 'A方向'], ['b', 'B方向']]} change={(v) => { setDirection(v); setSeen((s) => s | (v === 'a' ? 1 : v === 'b' ? 2 : 0)); }} /><p className="lab-formula">Query = [{query.join(', ')}]</p><div className="lab-attention">{['A', 'B', 'C'].map((token, i) => <div key={token}><span className="lab-token">{token}</span><p>Key [{r.keys[i].join(', ')}]</p><div className="attention-bar"><span style={{ width: `${r.weights[i] * 100}%` }} /></div><strong>{fixed(r.weights[i] * 100, 1)}%</strong><p className="lab-note">点数 {fixed(r.scores[i], 2)}<br />Value [{r.values[i].join(', ')}]</p></div>)}</div><div className="lab-results"><b>集まった情報：[{r.output.map((v) => fixed(v)).join(', ')}]</b><p>各Valueに上の割合を掛けて、位置ごとに足したベクトルです。割合の合計は100%。</p></div><details className="lab-details"><summary>点数と割合の計算</summary><p>点数 = QueryとKeyの内積 ÷ √2（ベクトルが2次元のため）。softmaxでは、各点数の指数をとって、その合計で割ります。A・B・Cは人工的な記号で、文章の意味を予測しているわけではありません。</p></details><p className="lab-checks">{seen & 1 ? '✓' : '○'} A方向　{seen & 2 ? '✓' : '○'} B方向</p></>;
}

export function Experiment({ stage, onSolved }: Props & { stage: number }) {
  if (stage < 3) return <Sandbox initialStage={stage} embedded onSolved={onSolved} />;
  const components = [ActivationLab, LayersLab, LossLab, GradientLab, BackpropLab, TrainingLab, DataLab, OverfitLab, BatchLab, CnnLab, AttentionLab];
  const Component = components[stage - 3];
  return <section className="experiment" aria-label="実験">{stage === 14 ? <TrainingLab final onSolved={onSolved} /> : Component ? <Component onSolved={onSolved} /> : null}</section>;
}
