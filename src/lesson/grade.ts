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
import { isDirectKind } from './data';
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
  | { kind: 'diff'; input: string; expect: string; actual: string }
  /* --- 第0章だけ（20-platform.md 第11.4節）。Python を動かさない型の応答 --- */
  /** まだ打っていない・選んでいない */
  | { kind: 'no-answer'; mode: 'type' | 'choose' }
  /** 全角が混ざっている。この章の目的そのものなので専用の応答を持つ（第4.3節の例外） */
  | { kind: 'zenkaku'; hits: ZenkakuHit[] }
  /** 全角ではないが見本と違う。expect は答えそのものなので出さない */
  | { kind: 'text-miss'; actual: string; at: number | null }
  /** 選んだ番号が違う */
  | { kind: 'choice-miss' }
  /** コピーと貼り付けを使う課題なのに、入力欄で貼り付けが起きていない（第11.7節） */
  | { kind: 'no-paste' };

export type GradeResult = {
  passed: boolean;
  feedback: Feedback;
  /** 落ちたテストの番号。0始まり。通ったときは null */
  failedTest: number | null;
  /** 'NameError' など。エラーが出なかったときは null */
  errorType: string | null;
  /** 合格したときだけ持つ。判定に使った各テストの入力と、実際に出た結果 */
  runs?: { input: string; output: string }[];
};

/** エラーの型ごとの一般的な説明（第4.3節 4-2）。 */
const ADVICE: Record<string, string> = {
  SyntaxError: 'Python が文として読めない形になっています。かっこの閉じ忘れ、コロンの不足、全角の記号を順に見てください。',
  IndentationError: '行の左の空白の数が合っていません。同じまとまりの行は、左端をそろえてください。',
  TabError: 'タブと空白が混ざっています。インデントは空白4つにそろえてください。',
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
  if (test.kind === 'text' || test.kind === 'choice') return '';
  if (test.kind === 'call') return `${test.fn}(${test.args.map(showValue).join(', ')})`;
  const stdin = test.stdin ?? '';
  if (stdin === '') return '（入力なし）';
  const lines = stdin.split('\n');
  if (lines[lines.length - 1] === '') lines.pop();
  return `入力欄: ${lines.map((l) => (l === '' ? '（空の行）' : l)).join(' / ')}`;
}

/* ============================================================
 * 第0章だけの採点（20-platform.md 第11.4節）。
 * Python を動かさない。打った文字列と選んだ番号を、その場で見るだけ。
 * ============================================================ */

export type ZenkakuHit = {
  /** 混ざっていた全角の文字 */
  char: string;
  /** その半角の相手。空白だけは文字で示せないので null */
  half: string | null;
  /** 何文字目か。1から数える */
  at: number;
};

/**
 * 全角の文字に、半角の相手があれば返す。
 *
 * 拾うのは「半角で打つつもりが全角になったもの」だけである。ひらがなや漢字は
 * 半角の相手を持たないので拾わない（打つ見本に日本語が入ることがあるため）。
 */
function halfOf(ch: string): string | null | undefined {
  const c = ch.codePointAt(0);
  if (c === undefined) return undefined;
  if (c >= 0xff01 && c <= 0xff5e) return String.fromCodePoint(c - 0xfee0); // ！〜～ の全角英数記号
  if (c === 0x3000) return null; // 全角の空白。半角の相手は空白なので文字では示せない
  if (c === 0x201c || c === 0x201d) return '"'; // “ ”
  if (c === 0x2018 || c === 0x2019) return "'"; // ‘ ’
  return undefined;
}

/**
 * 全角が混ざっていないか見る（第11.4節）。
 * expect に元から入っている文字は、書き手が意図して置いたものなので拾わない。
 */
export function findZenkaku(text: string, expect = ''): ZenkakuHit[] {
  const allowed = new Set(Array.from(expect));
  const hits: ZenkakuHit[] = [];
  const seen = new Set<string>();
  Array.from(text).forEach((ch, i) => {
    if (allowed.has(ch)) return;
    const half = halfOf(ch);
    if (half === undefined) return;
    if (seen.has(ch)) return;
    seen.add(ch);
    hits.push({ char: ch, half, at: i + 1 });
  });
  return hits;
}

/** 見本と食い違う最初の位置。1から数える。同じ長さで同じなら null */
function firstDiff(actual: string, expect: string): number | null {
  const a = Array.from(actual);
  const b = Array.from(expect);
  for (let i = 0; i < Math.max(a.length, b.length); i++) {
    if (a[i] !== b[i]) return i + 1;
  }
  return null;
}

/**
 * 打った文字列・選んだ番号を、その場で見る（第11.4節）。
 * Pyodide は通らない。同期で答えが出る。
 *
 * pasted は入力欄で貼り付けが起きたかどうか（第11.7節）。起きたかだけを見る。
 * 貼り付けの中身は見ない。
 */
export function gradeDirect(
  answer: string | number | null,
  exercise: ExerciseData,
  pasted = false,
): GradeResult {
  const mode: 'type' | 'choose' = exercise.kind === 'choose' ? 'choose' : 'type';
  /* 手で打っても同じ文字になる課題なので、打った中身より先に見る。
     空のままでも同じ応答でよい（次にやることは同じ「貼り付ける」なので） */
  if (exercise.requirePaste && !pasted) {
    return { passed: false, feedback: { kind: 'no-paste' }, failedTest: null, errorType: null };
  }
  for (let i = 0; i < exercise.tests.length; i++) {
    const test = exercise.tests[i];

    if (test.kind === 'text') {
      // 前後の空白だけ落とす。中の空白は落とさない（打ち間違いそのものなので）
      const typed = String(answer ?? '').trim();
      if (typed === '') return { passed: false, feedback: { kind: 'no-answer', mode }, failedTest: i, errorType: null };
      const expect = test.expect.trim();
      if (typed === expect) continue;
      const hits = findZenkaku(typed, expect);
      if (hits.length > 0) {
        return { passed: false, feedback: { kind: 'zenkaku', hits }, failedTest: i, errorType: null };
      }
      return {
        passed: false,
        feedback: { kind: 'text-miss', actual: typed, at: firstDiff(typed, expect) },
        failedTest: i,
        errorType: null,
      };
    }

    if (test.kind === 'choice') {
      if (answer === null || answer === '') {
        return { passed: false, feedback: { kind: 'no-answer', mode }, failedTest: i, errorType: null };
      }
      if (Number(answer) === test.correct) continue;
      return { passed: false, feedback: { kind: 'choice-miss' }, failedTest: i, errorType: null };
    }
  }
  return { passed: true, feedback: { kind: 'pass' }, failedTest: null, errorType: null };
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
  // 第0章の型（type / choose）は Python を動かさない。こちらには来ない（第11.4節）
  if (isDirectKind(exercise.kind)) return gradeDirect(code, exercise);

  // 書き方の指定は、問題文に書いた範囲だけを文字列で見る（第4.4節）
  for (const word of exercise.forbid) {
    if (code.includes(word)) {
      return { passed: false, feedback: { kind: 'forbidden', word }, failedTest: null, errorType: null };
    }
  }

  const runs: { input: string; output: string }[] = [];

  for (let i = 0; i < exercise.tests.length; i++) {
    const test = exercise.tests[i];
    if (test.kind !== 'stdout' && test.kind !== 'call') continue;
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
      runs.push({ input: showInput(test), output: normalizeOutput(result.stdout) });
    } else if (test.kind === 'call') {
      if (!valuesEqual(result.value, test.expect)) {
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
      const valueText = showValue(result.value);
      const output = result.stdout ? `${normalizeOutput(result.stdout)}\n戻り値: ${valueText}` : valueText;
      runs.push({ input: showInput(test), output });
    }
  }

  return { passed: true, feedback: { kind: 'pass' }, failedTest: null, errorType: null, runs };
}

export { INPUT_EMPTY_MESSAGE, TIMEOUT_MESSAGE };
