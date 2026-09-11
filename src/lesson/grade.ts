/**
 * 演習の採点（20-platform.md 第4.3節・第4.4節）。
 *
 * 応答の順序（第4.3節）:
 *   1. 実行時にエラーが出た → その節の <Mistake> の error と前方一致で照合し、合えばその説明を出す
 *   2. 合わない → エラーの型ごとの一般的な説明を出す
 *   3. エラーは出ないが結果が違う → 最初に落ちたテストの入力・期待した値・実際の値を並べる
 *
 * 単なる「不正解」だけを返してはいけない（00-overview.md 第3.3節）。
 */
import type { ExerciseData, MistakeData, Test } from './data';
import { execPython } from './runtime/runner';
import type { ExecResult } from './runtime/types';
import { INPUT_EMPTY_MESSAGE, TIMEOUT_MESSAGE } from './runtime/types';

/** 採点の応答。画面はこれを見て描く */
export type Feedback =
  | { kind: 'pass' }
  /** 問題文で禁じた書き方を使っている（第4.4節） */
  | { kind: 'forbidden'; word: string }
  | { kind: 'timeout' }
  | { kind: 'input-empty' }
  | { kind: 'no-function'; fn: string }
  /** 節の <Mistake> に当てはまった */
  | { kind: 'mistake'; display: string; line: number | null; mistake: MistakeData }
  /** 当てはまらなかったので、エラーの型ごとの説明 */
  | { kind: 'error'; display: string; line: number | null; type: string; advice: string }
  /** エラーは出ないが結果が違う */
  | { kind: 'diff'; input: string; expect: string; actual: string };

export type GradeResult = {
  passed: boolean;
  feedback: Feedback;
  /** 落ちたテストの番号。0始まり。通ったときは null */
  failedTest: number | null;
  /** 'NameError' など。エラーが出なかったときは null */
  errorType: string | null;
};

/** エラーの型ごとの一般的な説明（第4.3節 4-2）。 */
const ADVICE: Record<string, string> = {
  SyntaxError: 'Python が文として読めない形になっています。かっこの閉じ忘れ、コロンの不足、全角の記号を順に見てください。',
  IndentationError: '行の左の空白の数が合っていません。同じまとまりの行は、左端をそろえてください。',
  TabError: 'タブと空白が混ざっています。字下げは空白4つにそろえてください。',
  NameError: 'その名前が見つかりません。綴りの違い、大文字と小文字の違い、まだ書いていない行がないかを見てください。',
  TypeError: '型が合っていません。文字列と整数をそのまま足していないか、関数に渡す値の数が合っているかを見てください。',
  ValueError: '値が受け付けられない形です。int() に数字でない文字列を渡していないかを見てください。',
  ZeroDivisionError: '0 で割っています。割る側が0にならないか確かめてください。',
  IndexError: '番号が範囲の外です。並びの長さと、指定した番号を見比べてください。',
  KeyError: 'その名前の項目がありません。書いた名前と、入れたときの名前を見比べてください。',
  AttributeError: 'その名前の付いた機能が、その値にはありません。変数に入っている値の型を確かめてください。',
  ModuleNotFoundError: 'そのライブラリはこの画面では使えません。第1部で使えるのは math と random だけです。',
  ImportError: 'そのライブラリはこの画面では使えません。第1部で使えるのは math と random だけです。',
  RecursionError: '関数が自分を呼び続けています。呼び出しを止める条件を書いてください。',
};

const DEFAULT_ADVICE = 'エラーの1行目に出ている型の名前と、何行目で止まったかを手がかりに、その行を読み直してください。';

/** 出力の比較の緩さ（第4.4節）: 行末の空白と末尾の改行を無視する。 */
export function normalizeOutput(text: string): string {
  return String(text ?? '')
    .split('\n')
    .map((line) => line.replace(/[ \t]+$/, ''))
    .join('\n')
    .replace(/\n+$/, '');
}

/** 数値の比較（第4.4節）: 浮動小数点なら相対誤差 1e-9 まで許す。 */
function numbersEqual(a: number, b: number): boolean {
  if (Number.isInteger(a) && Number.isInteger(b)) return a === b;
  if (a === b) return true;
  const scale = Math.max(Math.abs(a), Math.abs(b));
  return Math.abs(a - b) <= 1e-9 * (scale === 0 ? 1 : scale);
}

export function valuesEqual(a: unknown, b: unknown): boolean {
  if (typeof a === 'number' && typeof b === 'number') return numbersEqual(a, b);
  if (Array.isArray(a) && Array.isArray(b)) {
    return a.length === b.length && a.every((x, i) => valuesEqual(x, b[i]));
  }
  if (a && b && typeof a === 'object' && typeof b === 'object') {
    const ka = Object.keys(a as object);
    const kb = Object.keys(b as object);
    if (ka.length !== kb.length) return false;
    return ka.every((k) => valuesEqual((a as Record<string, unknown>)[k], (b as Record<string, unknown>)[k]));
  }
  return a === b;
}

/** 値を画面に出す形にする。Python の見た目に寄せる。 */
export function showValue(value: unknown): string {
  if (value === null || value === undefined) return 'None';
  if (typeof value === 'boolean') return value ? 'True' : 'False';
  if (typeof value === 'string') return JSON.stringify(value);
  if (Array.isArray(value)) return `[${value.map(showValue).join(', ')}]`;
  if (typeof value === 'object' && '__repr__' in (value as object)) {
    return String((value as { __repr__: unknown }).__repr__);
  }
  return JSON.stringify(value);
}

/** テストの入力を、画面に出す1行にする。 */
export function showInput(test: Test): string {
  if (test.kind === 'call') return `${test.fn}(${test.args.map(showValue).join(', ')})`;
  const stdin = test.stdin ?? '';
  if (stdin === '') return '（入力なし）';
  const lines = stdin.split('\n');
  if (lines[lines.length - 1] === '') lines.pop();
  return `入力欄: ${lines.map((l) => (l === '' ? '（空の行）' : l)).join(' / ')}`;
}

/**
 * 節の <Mistake> と照合する（第4.3節 4-1）。
 * 課題に書かれた mistakes の id を先に見て、次にその節のすべてを見る。
 */
function matchMistake(display: string, exercise: ExerciseData, mistakes: MistakeData[]): MistakeData | null {
  const ordered = [
    ...exercise.mistakes.map((id) => mistakes.find((m) => m.id === id)).filter((m): m is MistakeData => !!m),
    ...mistakes,
  ];
  for (const m of ordered) {
    const lines = m.error.split('\n').map((l) => l.trim()).filter((l) => l.length > 0);
    const head = lines[lines.length - 1];
    if (head && display.startsWith(head)) return m;
  }
  return null;
}

function fromError(result: ExecResult, exercise: ExerciseData, mistakes: MistakeData[]): Feedback | null {
  const e = result.error;
  if (!e) return null;
  if (e.kind === 'timeout') return { kind: 'timeout' };
  if (e.kind === 'input-empty') return { kind: 'input-empty' };
  if (e.kind === 'no-function') return { kind: 'no-function', fn: e.fn };
  const hit = matchMistake(e.display, exercise, mistakes);
  if (hit) return { kind: 'mistake', display: e.display, line: e.line, mistake: hit };
  return { kind: 'error', display: e.display, line: e.line, type: e.type, advice: ADVICE[e.type] ?? DEFAULT_ADVICE };
}

/** 採点を1回走らせる。 */
export async function gradeExercise(
  code: string,
  exercise: ExerciseData,
  mistakes: MistakeData[],
): Promise<GradeResult> {
  // 書き方の指定は、問題文に書いた範囲だけを文字列で見る（第4.4節）
  for (const word of exercise.forbid) {
    if (code.includes(word)) {
      return { passed: false, feedback: { kind: 'forbidden', word }, failedTest: null, errorType: null };
    }
  }

  for (let i = 0; i < exercise.tests.length; i++) {
    const test = exercise.tests[i];
    const result = await execPython({
      code,
      stdin: test.kind === 'stdout' ? test.stdin : undefined,
      call: test.kind === 'call' ? { fn: test.fn, args: test.args } : undefined,
    });

    const errorFeedback = fromError(result, exercise, mistakes);
    if (errorFeedback) {
      const errorType = result.error?.kind === 'python' ? result.error.type : null;
      return { passed: false, feedback: errorFeedback, failedTest: i, errorType };
    }

    if (test.kind === 'stdout') {
      if (normalizeOutput(result.stdout) !== normalizeOutput(test.expect)) {
        return {
          passed: false,
          feedback: {
            kind: 'diff',
            input: showInput(test),
            expect: normalizeOutput(test.expect),
            actual: normalizeOutput(result.stdout),
          },
          failedTest: i,
          errorType: null,
        };
      }
    } else if (!valuesEqual(result.value, test.expect)) {
      return {
        passed: false,
        feedback: {
          kind: 'diff',
          input: showInput(test),
          expect: showValue(test.expect),
          actual: showValue(result.value),
        },
        failedTest: i,
        errorType: null,
      };
    }
  }

  return { passed: true, feedback: { kind: 'pass' }, failedTest: null, errorType: null };
}

export { INPUT_EMPTY_MESSAGE, TIMEOUT_MESSAGE };
