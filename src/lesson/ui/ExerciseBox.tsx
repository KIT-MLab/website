/**
 * 課題のエディタと採点（20-platform.md 第4章）。
 *
 * 10-lesson-and-writing.md 第9.2節「演習は編集できるエディタと採点ボタンを本文中に置く。
 * 結果もその場に出る」。読んでいる場所から離れずに、書く・試す・採点するを回せること。
 */
import { Fragment, useEffect, useRef, useState } from 'react';
import CodeEditor from './CodeEditor';
import { Inline, LoadBar, outputText, Prose, StdinBox } from './shared';
import { getExerciseData, getLessonData, isDirectKind, type ExerciseData, type ExerciseKind, type LessonData } from '../data';
import { gradeDirect, gradeExercise, showInput, type GradeResult } from '../grade';
import { execPython } from '../runtime/runner';
import { getProgressStore } from '../store/progress';

type Props = {
  id: string;
  kind: ExerciseKind;
  starter?: string;
  stdin?: string;
  /** kind="choose" の選択肢。<Exercise> の子の <li> を組み上げたもの（第11.4節） */
  choices?: string[];
  /** 構文の一覧で開く分類の key（20-platform.md 第22.1節）。今週の演習の問題だけに付く */
  syntax?: string[];
  /**
   * 質問の声かけを出すか（20-platform.md 第22.2節）。今週の演習のページだけ true になる
   * （src/components/lesson/WeeklyExercise.astro が渡す。レッスンの節では渡さない）。
   */
  nudge?: boolean;
  /**
   * 「判定に使う入力」（kind="build" だけ）。1組が1行で、行の中は入力欄の各行
   * （call は呼び出しの形）。Exercise.astro が tests から組んで渡す（10-lesson 第3.1節）。
   * 問題文を見ながら書けるように、コード欄の下に出す（20-platform.md 第23.2節）。
   */
  cases?: string[][];
};

/**
 * 通ってから次の問題に入れ替わるまでの間（20-platform.md 第12.1節）。
 * 覆いと印を先に出し、通ったことが見えてから入れ替える。
 */
const PASS_HOLD_MS = 1000;

/**
 * 正しい状態になってから自動で採点するまでの間（第12.3節）。
 * 打っている途中でたまたま一致したときに早とちりしないための間。
 */
const AUTO_GRADE_MS = 500;

/**
 * 質問の声かけを出すまでの間（20-platform.md 第22.2節）。1つの定数にまとめる
 * （確かめるときはここだけ短くして、確かめ終わったら戻す）。
 */
const NUDGE_AFTER_MS = 10 * 60 * 1000;

/**
 * 「判定に使う入力」の表。採点のたびに組ごとの状態を塗る（20-platform.md 第22.4節）。
 *
 * 以前は Exercise.astro がサーバ側で組み、ここから DOM を探して塗っていた。コード欄の下に
 * 移したとき（第23.2節）に、この島の中で描くようにした。
 *
 * 採点は最初に落ちたテストで止まる（src/lesson/grade.ts）ので、それより前の組は
 * 通っている・その組で止まった・まだ確かめていない、の3つに分かれる。
 * 採点していない・forbidden で止まった（どの組も試していない）ときは、状態の列を出さない。
 */
function CaseTable({ cases, result }: { cases: string[][]; result: GradeResult | null }) {
  const paint = result !== null && !(result.failedTest === null && !result.passed);
  /* 値の数が組ごとに違っても、縦の位置がそろうように。足りない分は最後の升が受ける */
  const columns = Math.max(1, ...cases.map((values) => values.length));
  return (
    <div className="kit-cases">
      <p className="kit-cases__label">判定に使う入力</p>
      <table className="kit-cases__table">
        <tbody>
          {cases.map((values, i) => {
            const status: 'pass' | 'stop' | 'wait' | null = !paint
              ? null
              : result!.passed || result!.failedTest === null || i < result!.failedTest
                ? 'pass'
                : i === result!.failedTest
                  ? 'stop'
                  : 'wait';
            return (
              <tr key={i} data-case={i} className={status ? `is-case-${status}` : undefined}>
                <th scope="row">{i + 1}組目</th>
                {values.length === 0 ? (
                  <td className="kit-cases__none" colSpan={columns}>
                    入力なし
                  </td>
                ) : (
                  values.map((value, j) => (
                    <td key={j} colSpan={j === values.length - 1 ? columns - values.length + 1 : 1}>
                      {value}
                    </td>
                  ))
                )}
                {status ? (
                  <td className="kit-cases__status">
                    <span aria-hidden="true">{status === 'pass' ? '✓' : status === 'stop' ? '✕' : '－'}</span>{' '}
                    {status === 'pass' ? '通った' : status === 'stop' ? 'ここで止まった' : 'まだ'}
                  </td>
                ) : null}
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}

/**
 * 書きかけのコードの置き場所。課題の id → コード。進度（kit-lesson-progress-v1）とは分ける。
 * 進度はログインのたびに入れ替わるが、書きかけはこの端末で書いた人のためだけのものなので、
 * サーバへは送らない。保存領域が使えない環境（閉じた窓など）では黙って何もしない。
 */
const DRAFT_KEY = 'kit-exercise-draft-v1';

function readDrafts(): Record<string, string> {
  try {
    const raw = localStorage.getItem(DRAFT_KEY);
    const parsed = raw ? JSON.parse(raw) : {};
    return parsed && typeof parsed === 'object' ? (parsed as Record<string, string>) : {};
  } catch {
    return {};
  }
}

function loadDraft(id: string): string | null {
  const draft = readDrafts()[id];
  return typeof draft === 'string' ? draft : null;
}

/** null なら消す（最初の形に戻したとき） */
function saveDraft(id: string, code: string | null): void {
  try {
    const drafts = readDrafts();
    if (code === null) delete drafts[id];
    else drafts[id] = code;
    localStorage.setItem(DRAFT_KEY, JSON.stringify(drafts));
  } catch {
    /* 残せなくても書くことはできる */
  }
}

export default function ExerciseBox({ id, kind, starter, stdin, choices, syntax, nudge, cases }: Props) {
  const initial = starter ?? '';
  // 第0章の型（打つ練習・選ぶ練習）は Python を動かさない。
  // CodeMirror も Pyodide も通らない道にする（20-platform.md 第11.4節）
  const direct = isDirectKind(kind);
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
  /**
   * 通った瞬間だけ箱全体を覆う（第12.1節の案D）。PASS_HOLD_MS で外すと、
   * 覆いが帯の外まで縮んで薄くなり、帯の色が戻る。進度から戻したときは最初から
   * false なので、開き直した画面でいきなり覆いが光ることはない。
   */
  const [sealFull, setSealFull] = useState(false);
  const [solution, setSolution] = useState<string | null>(null);
  const [solutionNote, setSolutionNote] = useState<string | null>(null);
  const [resetSignal, setResetSignal] = useState(0);
  /** 質問の声かけ（20-platform.md 第22.2節）。進んでいく時計は出さず、この1行だけ出す */
  const [nudgeShown, setNudgeShown] = useState(false);
  const nudgeStarted = useRef(false);
  const nudgeTimer = useRef<number | null>(null);
  const codeRef = useRef(initial);
  /** 打つ欄・選択肢・コード欄を包む器。Ctrl＋Enter をここで捕まえる（第12.2節） */
  const workRef = useRef<HTMLDivElement | null>(null);
  /** いまの grade を指す。キーの処理と自動採点は張り直さずにこれを呼ぶ */
  const gradeRef = useRef<() => void>(() => {});
  /** 通ってから入れ替えるまでの待ち（第12.1節） */
  const holdTimer = useRef<number | null>(null);
  /**
   * 自動で採点した答え（選ぶ課題だけ）。採点が終わると busy が none に戻るので、
   * 同じ答えをそのまま採点し続けないように、一度見た答えを覚えておく（第12.3節）。
   */
  const autoGraded = useRef<string | null>(null);

  /* 打つ練習の1行と、選ぶ練習の番号（1から数える。第11.4節） */
  const [typed, setTyped] = useState('');
  const [picked, setPicked] = useState<number | null>(null);
  /* 入力欄で貼り付けが起きたか（第11.7節）。中身は見ない。起きたかどうかだけ */
  const [pasted, setPasted] = useState(false);

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

  /**
   * Ctrl ＋ Enter で採点する（20-platform.md 第12.2節）。
   *
   * 打つ欄・選択肢・コード欄の3つを包む器で、**捕まえる段（capture）**で受ける。
   * CodeMirror の既定は Mod-Enter に空行の挿入を持っている（@codemirror/commands の
   * defaultKeymap）。その処理は中の .cm-content に付いた上がる段の handler なので、
   * ここで止めれば届かない。ボタンは残す。キーの操作は足すだけ（第12.2節）。
   */
  useEffect(() => {
    const el = workRef.current;
    if (!el) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key !== 'Enter' || !(e.ctrlKey || e.metaKey)) return;
      e.preventDefault();
      e.stopPropagation();
      gradeRef.current();
    };
    el.addEventListener('keydown', onKey, true);
    return () => el.removeEventListener('keydown', onKey, true);
  }, []);

  useEffect(
    () => () => {
      if (holdTimer.current !== null) window.clearTimeout(holdTimer.current);
    },
    [],
  );

  function update(next: string) {
    codeRef.current = next;
    setCode(next);
    saveDraft(id, next === initial ? null : next);
    startNudgeClock();
  }

  /* 書きかけのコードを、この端末に課題ごとに残す（2026-09-24）。ページを移って戻ると
     最初の形に戻っていた。開き直したら、残してあるものを欄に戻す */
  useEffect(() => {
    if (direct) return;
    const draft = loadDraft(id);
    if (draft === null || draft === initial) return;
    codeRef.current = draft;
    setCode(draft);
    setResetSignal((n) => n + 1);
  }, [id]);

  /**
   * 質問の声かけの時計を1回だけ起こす（20-platform.md 第22.2節）。
   * 最初に書き換えるか、実行・採点を試みたときに起こす。通っていれば起こさない
   * （すでに通っている問題を開いただけでは、時計は動かない）。記録はしない。
   */
  function startNudgeClock() {
    if (!nudge || passed || nudgeStarted.current) return;
    nudgeStarted.current = true;
    nudgeTimer.current = window.setTimeout(() => setNudgeShown(true), NUDGE_AFTER_MS);
  }

  // 通ったら消す。もう問題を出た（idが変わった）ときも次の問題の時計に切り替える
  useEffect(() => {
    return () => {
      if (nudgeTimer.current !== null) window.clearTimeout(nudgeTimer.current);
    };
  }, [id]);

  useEffect(() => {
    if (!passed) return;
    setNudgeShown(false);
    if (nudgeTimer.current !== null) {
      window.clearTimeout(nudgeTimer.current);
      nudgeTimer.current = null;
    }
  }, [passed]);

  /**
   * 構文の一覧（20-platform.md 第22.1節）。この問題に使えそうな分類を右の欄で開く。
   * 今週の演習のページにだけ SyntaxPanel（#kit-syntax-panel）があるので、レッスンの節では
   * 受け手がいないまま投げるだけで何も起きない（新しい分岐を足さない）。
   */
  function openSyntax() {
    if (!syntax || syntax.length === 0) return;
    window.dispatchEvent(new CustomEvent('kit:syntax-open', { detail: { keys: syntax } }));
  }

  async function tryRun() {
    startNudgeClock();
    setBusy('run');
    const out = await execPython({ code: codeRef.current, stdin: stdinValue });
    setRunOutput(outputText(out));
    setBusy('none');
  }

  async function grade() {
    if (!exercise || !lesson) return;
    startNudgeClock();
    setBusy('grade');
    setRunOutput(null);
    // 提出したものをそのまま記録する。選ぶ練習は選んだ番号（第4.5節）
    const submitted = direct ? (kind === 'choose' ? String(picked ?? '') : typed) : codeRef.current;
    const graded = direct
      ? gradeDirect(kind === 'choose' ? picked : typed, exercise, pasted)
      : await gradeExercise(codeRef.current, exercise, lesson.mistakes);
    const store = getProgressStore();
    await store.recordSubmission({
      lessonId: lesson.lessonId,
      exerciseId: id,
      code: submitted,
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
      // 覆いと印を先に出し、通ったことが見えてから入れ替える（第12.1節）。
      // この合図で第0章の束が次の問題に進み、右レールの進度も塗り直す
      if (holdTimer.current !== null) window.clearTimeout(holdTimer.current);
      setSealFull(true);
      holdTimer.current = window.setTimeout(() => {
        holdTimer.current = null;
        setSealFull(false);
        window.dispatchEvent(new CustomEvent('kit:progress'));
      }, PASS_HOLD_MS);
    }
  }

  gradeRef.current = () => {
    if (busy === 'none' && exercise) void grade();
  };

  /**
   * 答えが決まっている課題は自動で採点する（20-platform.md 第12.3節）。
   *
   * 対象は type と choose だけ。Python の課題は動かしてみないと合否が決まらず、
   * 打ち終わったかどうかを機械が決められないので、こちらには入れない。
   *
   * 打つ課題は**正しい状態になってから** 0.5秒待って採点する。打っている途中の
   * 一致で早とちりしないためで、合っていないうちはボタンが受け持つ。
   * requirePaste の課題は gradeDirect が貼り付けを先に見るので、手で打って同じ文字に
   * なっただけでは通らず、ここも動かない。
   *
   * 選ぶ課題は**選んだらどれでも**採点する。ボタンを置かない（第12.3節）ので、
   * 合っていないものを採点しないと、違う番号を選んでも何も返らなくなるためである。
   * 0.5秒の間は押し間違いを選び直す猶予になる。選び直せば、そのつど採点し直す。
   */
  useEffect(() => {
    if (!direct || !exercise || passed || busy !== 'none') return;
    if (kind === 'choose') {
      if (picked === null) return;
      const key = String(picked);
      if (autoGraded.current === key) return;
      const timer = window.setTimeout(() => {
        autoGraded.current = key;
        gradeRef.current();
      }, AUTO_GRADE_MS);
      return () => window.clearTimeout(timer);
    }
    if (!gradeDirect(typed, exercise, pasted).passed) return;
    const timer = window.setTimeout(() => gradeRef.current(), AUTO_GRADE_MS);
    return () => window.clearTimeout(timer);
  }, [direct, exercise, passed, busy, kind, picked, typed, pasted]);

  async function showSolution() {
    setSolutionNote(null);
    try {
      /* 先に未送信を送りきる。
         サーバは submissions を見て「通したか」を判じる（第4.3.1節）。提出は30秒ごと
         または節を離れるときに送るので、**通した直後に押すとまだサーバに届いていない**。
         そのまま尋ねると、通したのに「通したあとに読めます」と返ってくる。 */
      const sent = await getProgressStore().flush();
      if (!sent) {
        setSolutionNote('いまは通信ができていないため、模範解答を取り出せません。');
        return;
      }
      const res = await fetch(`/api/solution/${encodeURIComponent(id)}`);
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

  const editorLabel = kind === 'build' ? '解答のコード' : 'コード';

  return (
    <div className="kit-ex__work" ref={workRef}>
      {kind === 'type' ? (
        <div className="kit-stdinwrap">
          <div className="kit-stdin">
            <label className="kit-stdin__label" htmlFor={`${id}-type`}>
              打つ欄
            </label>
            <input
              id={`${id}-type`}
              type="text"
              className="kit-stdin__line"
              value={typed}
              spellCheck={false}
              autoComplete="off"
              autoCapitalize="off"
              onChange={(e) => {
                setTyped(e.target.value);
                startNudgeClock();
              }}
              onPaste={() => setPasted(true)}
            />
          </div>
        </div>
      ) : null}

      {kind === 'choose' ? (
        <ol className="kit-choices">
          {(choices ?? []).map((html, i) => (
            <li key={i} className={picked === i + 1 ? 'is-picked' : ''}>
              <label>
                <input
                  type="radio"
                  name={`${id}-choice`}
                  value={i + 1}
                  checked={picked === i + 1}
                  /* 通ったあとは選び直せない。覆いの下で別の選択肢を押せていた */
                  disabled={passed}
                  onChange={() => {
                    setPicked(i + 1);
                    startNudgeClock();
                  }}
                />
                <span className="kit-choices__no">{i + 1}</span>
                <span className="kit-choices__text" dangerouslySetInnerHTML={{ __html: html }} />
              </label>
            </li>
          ))}
        </ol>
      ) : null}

      {/* 選ぶ課題には採点の欄が無い（第12.3節）ので、構文の一覧だけの小さな帯を出す */}
      {kind === 'choose' && syntax && syntax.length > 0 ? (
        <div className="kit-ex__bar">
          <button type="button" className="kit-btn" onClick={openSyntax}>
            構文の一覧
          </button>
        </div>
      ) : null}

      {direct ? null : (
        <CodeEditor value={code} onChange={update} label={editorLabel} resetSignal={resetSignal} />
      )}
      {!direct && stdin !== undefined ? (
        <StdinBox id={`${id}-stdin`} value={stdinValue} onChange={setStdinValue} />
      ) : null}

      {ready && !exercise ? (
        <p className="kit-ex__missing">この課題の判定データが見つかりません（id: {id}）。</p>
      ) : null}

      {/*
        選ぶ課題には採点の欄を置かない（20-platform.md 第12.3節）。選んだ時点で答えたのと
        同じなので、押させる手数が1つ増えるだけである。選び直しは選択肢を選び直せばよい。
        押すものが無いので「Ctrl ＋ Enter でも採点できます」も出さない。
        打つ課題はボタンを残す。打っている途中は答えが定まらないため。
      */}
      {kind === 'choose' ? null : (
        <div className="kit-ex__bar">
          <button
            type="button"
            className="kit-btn kit-btn--strong"
            onClick={grade}
            disabled={busy !== 'none' || !exercise}
          >
            {busy === 'grade' ? '採点中' : '採点する'}
          </button>
          {direct ? null : (
            <button type="button" className="kit-btn" onClick={tryRun} disabled={busy !== 'none'}>
              {busy === 'run' ? '実行中' : '▶ 試す'}
            </button>
          )}
          {!direct && starter ? (
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
          {syntax && syntax.length > 0 ? (
            <button type="button" className="kit-btn" onClick={openSyntax}>
              構文の一覧
            </button>
          ) : null}
          {/* 押せることが画面から分かるように（第12.2節）。素地の小さな文字。札にしない */}
          <span className="kit-ex__keyhint">Ctrl ＋ Enter でも採点できます</span>
          {!direct && busy !== 'none' ? <LoadBar /> : null}
        </div>
      )}

      {/* 質問の声かけ（20-platform.md 第22.2節）。ボタンの下の1行だけ。進む時計は出さない */}
      {nudgeShown ? (
        <p className="kit-ex__nudge">この問題を始めて10分たちました。近くの人や運営に聞いてみましょう。</p>
      ) : null}

      {/* 判定に使う入力（第23.2節でコード欄の下に移した）。組ごとの状態も塗る（第22.4節） */}
      {cases && cases.some((values) => values.length > 0) ? <CaseTable cases={cases} result={result} /> : null}

      {runOutput !== null ? (
        <div className="kit-out">
          <div className="kit-out__label">試した結果</div>
          <pre className="kit-out__text">{runOutput}</pre>
        </div>
      ) : null}

      {result ? <Verdict result={result} kind={kind} exercise={exercise} /> : null}

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

      {/* 模範解答の .py は type / choose には置かない（第11.4節）ので、開く口も出さない */}
      {passed && !direct ? (
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

      {/*
        通ったら箱を消さずに覆い、達成の印を重ねる（20-platform.md 第12.1節）。
        印はチェックマークであって札ではない。地色つきのラベルは増やさない（第10.6節）。
        覆いは触られない（pointer-events: none）ので、下の「別の書き方を見る」（第4.3.1節）も、
        前の問題のコードを読むこと（第11.7節）も、そのまま続けられる。

        覆いは通った瞬間だけ箱全体に掛かり、約1秒で帯の外まで縮んで薄くなる（案D）。
        印は動かさない。変わるのは覆いの範囲と濃さだけである。
      */}
      {passed ? (
        <div className={sealFull ? 'kit-ex__seal kit-ex__seal--full' : 'kit-ex__seal'}>
          <svg
            className="kit-ex__check"
            viewBox="0 0 48 48"
            role="img"
            aria-label="この課題は通りました"
            xmlns="http://www.w3.org/2000/svg"
          >
            {/* 下に紙色を敷く。黒い面（コード欄・打つ欄）の上でも緑が読めるように */}
            <path className="kit-ex__check-halo" d="M9 25.5 L19.5 36 L39 12.5" />
            <path className="kit-ex__check-line" d="M9 25.5 L19.5 36 L39 12.5" />
          </svg>
        </div>
      ) : null}
    </div>
  );
}

/**
 * 落ちたのがどの組かを、エラーの説明より前に出す（コーディネーターからの追加指示）。
 * 「N行目で止まりました」（コードの中の場所）とは別の情報なので、言葉を分けて両方が分かるようにする。
 */
function CaseNote({ result, kind, exercise }: { result: GradeResult; kind: ExerciseKind; exercise: ExerciseData | null }) {
  if (kind !== 'build' || result.failedTest === null || !exercise) return null;
  const test = exercise.tests[result.failedTest];
  const input = test ? showInput(test) : '';
  const ordinal = `${result.failedTest + 1}組目`;
  const f = result.feedback;
  const paren = input && input !== '（入力なし）' ? `（${input}）` : '';
  if (f.kind === 'mistake' || f.kind === 'error') {
    return (
      <p className="kit-verdict__case">
        {ordinal}の入力{paren}で、{f.line ? `${f.line}行目で` : ''}エラーになりました。
      </p>
    );
  }
  if (f.kind === 'diff') {
    return (
      <p className="kit-verdict__case">
        {ordinal}の入力{paren}で、正しい出力と違いました。
      </p>
    );
  }
  return null;
}

/** 採点の応答（20-platform.md 第4.3節）。単なる「不正解」だけを返してはいけない。 */
function Verdict({ result, kind, exercise }: { result: GradeResult; kind: ExerciseKind; exercise: ExerciseData | null }) {
  const f = result.feedback;
  if (f.kind === 'pass') {
    // 選ぶ練習は自己申告である（第11.4節）ので、合格の応答は控えめにする
    if (kind === 'choose') {
      return (
        <div className="kit-verdict kit-verdict--pass">
          <strong>合っています</strong>
          <p>選んだ番号は合っています。手元のパソコンでも同じになるか、実際に見てください。</p>
        </div>
      );
    }
    if (kind === 'type') {
      return (
        <div className="kit-verdict kit-verdict--pass">
          <strong>合格</strong>
          <p>見本と同じ文字が打てました。</p>
        </div>
      );
    }
    return (
      <div className="kit-verdict kit-verdict--pass">
        <strong>合格</strong>
        <p>判定に使った入力すべてで、正しい出力になりました。</p>
        {result.runs && result.runs.length > 0 ? (
          result.runs.length === 1 && result.runs[0].input === '（入力なし）' ? (
            <div className="kit-out">
              <div className="kit-out__label">出力</div>
              <pre className="kit-out__text">{result.runs[0].output}</pre>
            </div>
          ) : (
            <>
              <p className="kit-verdict__where">判定に使った入力と、このコードが出した結果です。</p>
              <table className="kit-diff">
                <tbody>
                  {result.runs.map((r, i) => (
                    <Fragment key={i}>
                      <tr>
                        <th>入力</th>
                        <td>
                          <code>{r.input}</code>
                        </td>
                      </tr>
                      <tr>
                        <th>出力</th>
                        <td>
                          <pre>{r.output}</pre>
                        </td>
                      </tr>
                    </Fragment>
                  ))}
                </tbody>
              </table>
            </>
          )
        ) : null}
      </div>
    );
  }
  return (
    <div className="kit-verdict kit-verdict--fail">
      <strong>不合格</strong>
      <CaseNote result={result} kind={kind} exercise={exercise} />
      {f.kind === 'no-answer' ? (
        <p>{f.mode === 'choose' ? 'まだ選んでいません。選択肢を1つ選んでください。' : '打つ欄が空です。見本のとおりに打ってください。'}</p>
      ) : null}
      {f.kind === 'zenkaku' ? (
        <>
          <p className="kit-verdict__lead">全角が混ざっています。</p>
          <p>
            日本語入力がオンになっていると、記号や数字が全角になります。<code>半角/全角</code> キーで切り替えてから打ち直してください。
          </p>
          <ul className="kit-zenkaku">
            {f.hits.map((h, i) => (
              <li key={i}>
                {h.at}文字目の <code>{h.char}</code> が全角です
                {h.half === null ? '（全角の空白）' : <>。半角は <code>{h.half}</code> です</>}
              </li>
            ))}
          </ul>
        </>
      ) : null}
      {f.kind === 'text-miss' ? (
        <>
          <p>
            打った文字が見本と違います。
            {f.at === null ? '前後の空白を除いて見比べてください。' : `${f.at}文字目から違っています。`}
          </p>
          <table className="kit-diff">
            <tbody>
              <tr>
                <th>打った文字</th>
                <td>
                  <pre>{f.actual}</pre>
                </td>
              </tr>
            </tbody>
          </table>
        </>
      ) : null}
      {f.kind === 'choice-miss' ? <p>選んだものは違います。選択肢をもう一度読んでください。</p> : null}
      {f.kind === 'no-paste' ? (
        <p>手で打っても同じ文字になりますが、この問題はコピーと貼り付けを使って解いてください。</p>
      ) : null}
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
          {/* build は上の CaseNote が「N組目の入力で、N行目でエラーになりました。」とまとめて言う */}
          {f.line && kind !== 'build' ? <p className="kit-verdict__where">{f.line} 行目で止まりました。</p> : null}
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
          {f.line && kind !== 'build' ? <p className="kit-verdict__where">{f.line} 行目で止まりました。</p> : null}
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
              <th>正しい出力</th>
              <td>
                <pre>{f.expect}</pre>
              </td>
            </tr>
            <tr>
              <th>出力</th>
              <td>
                <pre>{f.actual}</pre>
              </td>
            </tr>
          </tbody>
        </table>
      ) : null}
    </div>
  );
}
