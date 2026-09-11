/** Python の実行とその結果の型。20-platform.md 第3章。 */

/** 1回の実行の上限（秒）。仕様書 第3.1節。 */
export const TIME_LIMIT_SECONDS = 5;

/** 時間切れのときに出す文言。仕様書 第3.1節の文をそのまま使う。 */
export const TIMEOUT_MESSAGE = '時間がかかりすぎたので止めました。無限ループになっていないか確認してください';

/** 入力欄を読み切ったときに出す文言。仕様書 第3.2節の文をそのまま使う。 */
export const INPUT_EMPTY_MESSAGE = '入力欄が空です。入力欄に値を書いてから実行してください';

export type RunError =
  | { kind: 'timeout' }
  | { kind: 'input-empty' }
  | { kind: 'no-function'; fn: string }
  | {
      kind: 'python';
      /** 例外の型の名前。'NameError' など */
      type: string;
      message: string;
      /** 提出したコードの何行目か。分からなければ null */
      line: number | null;
      /** 'NameError: name 'x' is not defined' の形。<Mistake> の error と照合するのに使う */
      display: string;
      /** Python が出すそのままの traceback */
      traceback: string;
    };

export type ExecResult = {
  stdout: string;
  error: RunError | null;
  /** call を指定したときの戻り値 */
  value: unknown;
  hasValue: boolean;
};

export type ExecRequest = {
  code: string;
  /** 入力欄の中身。input() が上から1行ずつ読む */
  stdin?: string;
  /** 関数を呼んで戻り値を見るとき */
  call?: { fn: string; args: unknown[] };
};

export type LoadProgress = { loaded: number; total: number; done: boolean };
