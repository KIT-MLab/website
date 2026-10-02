/** Python の実行とその結果の型。20-platform.md 第3章。 */

/** 1回の実行の上限（秒）。仕様書 第3.1節。 */
export const TIME_LIMIT_SECONDS = 5;

/** 時間切れのときに出す文言。仕様書 第3.1節の文をそのまま使う。 */
export const TIMEOUT_MESSAGE = '時間がかかりすぎたので止めました。無限ループになっていないか確認してください';

/** 入力欄を読み切ったときに出す文言。仕様書 第3.2節の文をそのまま使う。 */
export const INPUT_EMPTY_MESSAGE = '入力欄が空です。入力欄に値を書いてから実行してください';

/** 節に添えたファイル（design/spec/57-lesson-files.md）を取れなかったときに出す文言。仕様書 第3.1節の文をそのまま使う。 */
export const FILES_MESSAGE = 'データのファイルを読み込めませんでした。少し待ってから、もう一度 ▶ を押してください。';

export type RunError =
  | { kind: 'timeout' }
  /** 節に添えたファイルを取れなかった。Python は動かしていない */
  | { kind: 'files' }
  | { kind: 'input-empty' }
  | { kind: 'no-function'; fn: string }
  | {
      kind: 'python';
      /** 例外の型の名前。'NameError' など */
      type: string;
      message: string;
      /** 提出したコードの何行目か。分からなければ null */
      line: number | null;
      /** 'NameError: name 'x' is not defined' の形。エラーの型ごとの説明を出すのに使う */
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
  /**
   * 質問の文を渡した input()（`input("年齢は？")`）が読んだ値（末尾に改行を付けたもの）と、それを差し込む stdout の位置（UTF-16 の単位）。
   * 画面の実行結果で、端末に打ち込んだように薄く見せるためだけに使う。**採点は stdout だけを見る**
   */
  echo?: [number, string][];
};

export type ExecRequest = {
  code: string;
  /** 入力欄の中身。input() が上から1行ずつ読む */
  stdin?: string;
  /** 関数を呼んで戻り値を見るとき */
  call?: { fn: string; args: unknown[] };
};

/** 実行の前に Python のいまのフォルダに置くファイル（design/spec/57-lesson-files.md） */
export type LessonFile = { name: string; data: Uint8Array };

export type LoadProgress = { loaded: number; total: number; done: boolean };
