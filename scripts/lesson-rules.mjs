/**
 * 執筆規約の機械判定用リスト。
 *
 * 出典は design/spec/10-lesson-and-writing.md。仕様書を直したらこのファイルも直す。
 *   - 第4.1節  数値の規定        -> LIMITS
 *   - 第4.2節  使ってはいけない表現 -> BANNED
 *   - 第4.3節  名前があるものは名前で呼ぶ（左列） -> ABSTRACT
 *   - 第2章    節の構造           -> SECTION_ORDER
 *   - 第3章    課題の3段階         -> LIMITS.exercise*
 */

/** 節の要素。この順序で {/* 名前 *\/} のマーカーを本文に置く（20-platform.md 第2.4節 検査1）。 */
export const SECTION_ORDER = ['困る例', 'やってみる', '説明', 'よくある間違い', '課題', 'つながり'];

/**
 * 任意の要素（無くてよい）。
 * 「課題」が任意なのは、課題を1問も置かない節を認めたため（第3.8節）。
 */
export const SECTION_OPTIONAL = new Set(['よくある間違い', '課題', 'つながり']);

/**
 * 第0章「パソコンの操作」だけの例外（20-platform.md 第11.5節）。
 * ほかの章には一切適用しない。
 */
export const START_CHAPTER = '00-start';

/**
 * 第0章の要素の順序（20-platform.md 第11.7節）。
 * 「よくある間違い」を置かない。<Mistake> は壊れたコードと実際のエラーメッセージを
 * 見せる要素で、パソコンの操作を習いに来た人に見せる理由がないため。
 */
export const START_SECTION_ORDER = ['困る例', 'やってみる', '説明', '課題', 'つながり'];

/** 課題の型。type と choose は第0章だけで使える（第11.4節） */
/* 「例題」（trace）は2026-09-21に廃止した。示された通りに打たせるだけで、
   すぐ上の <Run> と同じコードを書き写させる課題になっていた（第3章）。例は <Run> である。 */
export const EXERCISE_KINDS = ['modify', 'build'];
export const START_EXERCISE_KINDS = [...EXERCISE_KINDS, 'type', 'choose'];

/**
 * 第3.8節 章の合計で保つぶん。節ごとの下限を外した代わりに、ここで総量を担保する。
 *   「組む」  … その章の節数 以上（第0章は「打つ」と「選ぶ」の合計で数える）
 */
/** 第0章の「説明」の字数（第11.5節）。説明より練習を主にするため短くする */
export const START_LIMITS = {
  explainMin: 100,
  explainMax: 400,
};

export const LIMITS = {
  /** 第4.1節 1文の長さ */
  sentenceMax: 60,
  /** 第4.1節 1段落の文数 */
  sentencesPerParagraph: 3,
  /** 第4.1節 節の本文（コードと課題を除く）。下限は置かない（水増しを招くため） */
  bodyMax: 800,
  /** 第4.1節 「説明」の要素 */
  explainMin: 250,
  explainMax: 600,
  /** 第2章 よくある間違い 0〜3個。**下限は置かない**（躓く先が見えているときだけ置く。第6章） */
  mistakeMax: 3,
  /** 第3.8節 1つの節の課題。**下限は置かない**（下限が目標になり水増しを招くため） */
  exerciseMax: 7,
  /** 20-platform.md 第2.4節 検査5 「組む」のテストは3件以上 */
  buildTestsMin: 3,
};

/**
 * 使ってはいけない表現（第4.2節）。
 * 「〜」で始まる見出しの項目は、活用を拾うために正規表現にしてある。
 */
export const BANNED = [
  // 煽り・過小評価
  { re: /簡単に/, label: '簡単に', group: '煽り・過小評価' },
  { re: /たった/, label: 'たった', group: '煽り・過小評価' },
  { re: /[ぁ-んァ-ヴー一-龥]るだけで/, label: '〜するだけで', group: '煽り・過小評価' },
  { re: /あっという間に/, label: 'あっという間に', group: '煽り・過小評価' },
  { re: /驚くほど/, label: '驚くほど', group: '煽り・過小評価' },
  { re: /実は/, label: '実は', group: '煽り・過小評価' },
  { re: /なんと/, label: 'なんと', group: '煽り・過小評価' },
  { re: /魔法のように/, label: '魔法のように', group: '煽り・過小評価' },
  { re: /便利な/, label: '便利な', group: '煽り・過小評価' },
  { re: /強力な/, label: '強力な', group: '煽り・過小評価' },
  { re: /パワフルな/, label: 'パワフルな', group: '煽り・過小評価' },
  { re: /してみましょう/, label: '〜してみましょう', group: '煽り・過小評価' },
  // 曖昧化
  { re: /基本的に/, label: '基本的に', group: '曖昧化' },
  { re: /一般的に/, label: '一般的に', group: '曖昧化' },
  { re: /ある意味/, label: 'ある意味', group: '曖昧化' },
  { re: /的な/, label: '〜的な', group: '曖昧化' },
  { re: /のようなもの/, label: '〜のようなもの', group: '曖昧化' },
  // 読者の知識の仮定
  { re: /ご存知のとおり/, label: 'ご存知のとおり', group: '読者の知識の仮定' },
  { re: /もちろん/, label: 'もちろん', group: '読者の知識の仮定' },
  { re: /言うまでもなく/, label: '言うまでもなく', group: '読者の知識の仮定' },
  // 回収先のない先送り
  { re: /詳しくは省略しますが/, label: '詳しくは省略しますが', group: '回収先のない先送り' },
  { re: /ここでは深入りしません/, label: 'ここでは深入りしません', group: '回収先のない先送り' },
];

/** 抽象語の言い換え（第4.3節の左列）。右列が正しい書き方。 */
export const ABSTRACT = [
  { word: '条件を分岐する方法', instead: 'if文' },
  { word: '繰り返しの仕組み', instead: 'for文' },
  { word: '値を保存しておく箱', instead: '変数' },
  { word: 'データをまとめて扱う考え方', instead: 'リスト' },
  { word: '処理をまとめたもの', instead: '関数' },
  { word: '学習を効率化する工夫', instead: '具体名（ミニバッチ、学習率の減衰、など）' },
];

/** 本文に使ってはいけない記号（第4.1節 感嘆符）。 */
export const BANNED_CHARS = [{ char: '！', label: '感嘆符' }];

/**
 * 「組む」課題の判定入力に含めるべき境界（20-platform.md 第2.4節 検査5）。
 * 0・負・同値・空のいずれか1つ以上。
 */
export function boundaryKinds(values) {
  const kinds = new Set();
  const flat = [];
  const walk = (v) => {
    if (Array.isArray(v)) {
      if (v.length === 0) kinds.add('空');
      v.forEach(walk);
      return;
    }
    flat.push(v);
    if (typeof v === 'number') {
      if (v === 0) kinds.add('0');
      if (v < 0) kinds.add('負');
    }
    if (typeof v === 'string') {
      if (v.trim() === '') kinds.add('空');
      const n = Number(v.trim());
      if (v.trim() !== '' && Number.isFinite(n)) {
        if (n === 0) kinds.add('0');
        if (n < 0) kinds.add('負');
      }
    }
  };
  walk(values);
  for (let i = 0; i < flat.length; i++) {
    for (let j = i + 1; j < flat.length; j++) {
      if (flat[i] === flat[j] && flat[i] !== undefined) kinds.add('同値');
    }
  }
  return kinds;
}

/** 文に分ける。句点で区切る（20-platform.md 第2.4節 検査6）。 */
export function splitSentences(text) {
  return text
    .split(/(?<=。)/)
    .map((s) => s.trim())
    .filter((s) => s.length > 0);
}

/** 字数を数える。空白と改行は数えない。 */
export function countChars(text) {
  return text.replace(/\s+/g, '').length;
}
