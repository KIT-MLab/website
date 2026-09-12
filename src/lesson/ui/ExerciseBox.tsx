/**
 * 課題のエディタと採点（20-platform.md 第4章）。
 *
 * 10-lesson-and-writing.md 第9.2節「演習は編集できるエディタと採点ボタンを本文中に置く。
 * 結果もその場に出る」。読んでいる場所から離れずに、書く・試す・採点するを回せること。
 */
import { useEffect, useRef, useState } from 'react';
import CodeEditor from './CodeEditor';
import { Inline, LoadBar, outputText, Prose, StdinBox } from './shared';
import { getExerciseData, getLessonData, type ExerciseData, type LessonData } from '../data';
import { gradeExercise, type GradeResult } from '../grade';
import { execPython } from '../runtime/runner';
import { getProgressStore } from '../store/progress';

type Props = {
  id: string;
  kind: 'trace' | 'modify' | 'build';
  starter?: string;
  stdin?: string;
};

export default function ExerciseBox({ id, kind, starter, stdin }: Props) {
  const initial = starter ?? '';
  // 判定データは <script type="application/json"> から読む。サーバ側では読めないので、
  // 最初の描画はサーバと同じ形にしておき、載ってから差し替える。
  const [lesson, setLesson] = useState<LessonData | null>(null);
  const [exercise, setExercise] = useState<ExerciseData | null>(null);
  const [ready, setReady] = useState(false);

  const [code, setCode] = useState(initial);
  const [stdinValue, setStdinValue] = useState(stdin ?? '');
  const [busy, setBusy] = useState<'none' | 'run' | 'grade'>('none');
  const [runOutput, setRunOutput] = useState<string | null>(null);
  const [result, setResult] = useState<GradeResult | null>(null);
  const [fails, setFails] = useState(0);
  const [passed, setPassed] = useState(false);
  const [solution, setSolution] = useState<string | null>(null);
  const [solutionNote, setSolutionNote] = useState<string | null>(null);
  const [resetSignal, setResetSignal] = useState(0);
  const codeRef = useRef(initial);

  useEffect(() => {
    let alive = true;
    setLesson(getLessonData());
    setExercise(getExerciseData(id));
    setReady(true);
    getProgressStore()
      .exerciseResult(id)
      .then((r) => {
        if (!alive) return;
        setPassed(r.passed);
        setFails(r.fails);
      });
    return () => {
      alive = false;
    };
  }, [id]);

  function update(next: string) {
    codeRef.current = next;
    setCode(next);
  }

  async function tryRun() {
    setBusy('run');
    const out = await execPython({ code: codeRef.current, stdin: stdinValue });
    setRunOutput(outputText(out));
    setBusy('none');
  }

  async function grade() {
    if (!exercise || !lesson) return;
    setBusy('grade');
    setRunOutput(null);
    const graded = await gradeExercise(codeRef.current, exercise, lesson.mistakes);
    const store = getProgressStore();
    await store.recordSubmission({
      lessonId: lesson.lessonId,
      exerciseId: id,
      code: codeRef.current,
      passed: graded.passed,
      failedTest: graded.failedTest,
      errorType: graded.errorType,
      at: Date.now(),
    });
    const after = await store.exerciseResult(id);
    setResult(graded);
    setPassed(after.passed);
    setFails(after.fails);
    setBusy('none');

    // その節の課題を全部通したら「済」にする（20-platform.md 第6章）
    if (graded.passed) {
      const all = await Promise.all(lesson.exerciseIds.map((x) => store.exerciseResult(x)));
      if (all.every((r) => r.passed)) await store.finishLesson(lesson.lessonId);
      window.dispatchEvent(new CustomEvent('kit:progress'));
    }
  }

  async function showSolution() {
    setSolutionNote(null);
    try {
      // passed=1 は「この課題を通した」という申告。いまはサーバがこれを信用している。
      // D1 とログインを入れたら、サーバが submissions を見て判定するので、この引数は消す
      // （src/pages/api/solution/[id].ts の冒頭のコメント）。
      const res = await fetch(`/api/solution/${encodeURIComponent(id)}?passed=1`);
      const body = (await res.json()) as { code?: string; message?: string };
      if (res.ok && body.code) setSolution(body.code);
      else setSolutionNote(body.message ?? '模範解答を取り出せませんでした。');
    } catch {
      setSolutionNote('模範解答を取り出せませんでした。');
    }
  }

  // 3回落ちたらヒントの1つ目。以降1回落ちるごとに次（20-platform.md 第4.3節 5）
  const hints = exercise?.hints ?? [];
  const hintCount = Math.max(0, Math.min(fails - 2, hints.length));

  return (
    <div className="kit-ex__work">
      <CodeEditor
        value={code}
        onChange={update}
        label={kind === 'build' ? '解答のコード' : 'コード'}
        resetSignal={resetSignal}
      />
      {stdin !== undefined ? <StdinBox id={`${id}-stdin`} value={stdinValue} onChange={setStdinValue} /> : null}

      {ready && !exercise ? (
        <p className="kit-ex__missing">この課題の判定データが見つかりません（id: {id}）。</p>
      ) : null}

      <div className="kit-ex__bar">
        <button
          type="button"
          className="kit-btn kit-btn--strong"
          onClick={grade}
          disabled={busy !== 'none' || !exercise}
        >
          {busy === 'grade' ? '採点中' : '採点する'}
        </button>
        <button type="button" className="kit-btn" onClick={tryRun} disabled={busy !== 'none'}>
          {busy === 'run' ? '実行中' : '▶ 試す'}
        </button>
        {starter ? (
          <button
            type="button"
            className="kit-btn kit-btn--quiet"
            onClick={() => {
              update(initial);
              setResetSignal((n) => n + 1);
            }}
            disabled={busy !== 'none'}
          >
            最初の形に戻す
          </button>
        ) : null}
        {busy !== 'none' ? <LoadBar /> : null}
        {passed ? <span className="kit-ex__badge">通過</span> : null}
      </div>

      {runOutput !== null ? (
        <div className="kit-out">
          <div className="kit-out__label">試した結果</div>
          <pre className="kit-out__text">{runOutput === '' ? '（何も出ません）' : runOutput}</pre>
        </div>
      ) : null}

      {result ? <Verdict result={result} /> : null}

      {hintCount > 0 ? (
        <div className="kit-hints">
          <div className="kit-hints__label">ヒント</div>
          <ol>
            {hints.slice(0, hintCount).map((h, i) => (
              <li key={i}>
                <Inline text={h} />
              </li>
            ))}
          </ol>
        </div>
      ) : null}

      {passed ? (
        <div className="kit-solution">
          {solution === null ? (
            <button type="button" className="kit-btn kit-btn--quiet" onClick={showSolution}>
              別の書き方を見る
            </button>
          ) : (
            <div className="kit-out">
              <div className="kit-out__label">模範解答（通し方はこれ1つではありません）</div>
              <pre className="kit-out__text">{solution}</pre>
            </div>
          )}
          {solutionNote ? <p className="kit-solution__note">{solutionNote}</p> : null}
        </div>
      ) : null}
    </div>
  );
}

/** 採点の応答（20-platform.md 第4.3節）。単なる「不正解」だけを返してはいけない。 */
function Verdict({ result }: { result: GradeResult }) {
  const f = result.feedback;
  if (f.kind === 'pass') {
    return (
      <div className="kit-verdict kit-verdict--pass">
        <strong>合格</strong>
        <p>判定に使った入力すべてで、期待した結果になりました。</p>
      </div>
    );
  }
  return (
    <div className="kit-verdict kit-verdict--fail">
      <strong>まだ通っていません</strong>
      {f.kind === 'forbidden' ? (
        <p>
          問題文で使わないように書いた <code>{f.word}</code> が入っています。別の書き方で解いてください。
        </p>
      ) : null}
      {f.kind === 'timeout' ? <p>時間がかかりすぎたので止めました。無限ループになっていないか確認してください。</p> : null}
      {f.kind === 'input-empty' ? <p>入力欄が空です。入力欄に値を書いてから実行してください。</p> : null}
      {f.kind === 'no-function' ? (
        <p>
          <code>{f.fn}</code> という名前の関数が見つかりません。名前の綴りを確かめてください。
        </p>
      ) : null}
      {f.kind === 'mistake' ? (
        <>
          <div className="kit-out kit-out--err">
            <pre className="kit-out__text">{f.display}</pre>
          </div>
          {f.line ? <p className="kit-verdict__where">{f.line} 行目で止まりました。</p> : null}
          <div className="kit-verdict__fix">
            <Prose text={f.mistake.fix} />
          </div>
        </>
      ) : null}
      {f.kind === 'error' ? (
        <>
          <div className="kit-out kit-out--err">
            <pre className="kit-out__text">{f.display}</pre>
          </div>
          {f.line ? <p className="kit-verdict__where">{f.line} 行目で止まりました。</p> : null}
          <p>{f.advice}</p>
        </>
      ) : null}
      {f.kind === 'diff' ? (
        <table className="kit-diff">
          <tbody>
            <tr>
              <th>入力</th>
              <td>
                <code>{f.input}</code>
              </td>
            </tr>
            <tr>
              <th>期待した結果</th>
              <td>
                <pre>{f.expect === '' ? '（何も出ません）' : f.expect}</pre>
              </td>
            </tr>
            <tr>
              <th>実際の結果</th>
              <td>
                <pre>{f.actual === '' ? '（何も出ません）' : f.actual}</pre>
              </td>
            </tr>
          </tbody>
        </table>
      ) : null}
    </div>
  );
}
