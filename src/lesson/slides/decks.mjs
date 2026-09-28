/**
 * スライドの一覧（design/spec/53-ml-intro.md 第10節）。
 *
 * 節の frontmatter の `slides: intro1` がここの名前を指す。検査25（scripts/check-lessons.mjs）が
 * メンバーだけの章にしか付けられないこと・名前がここにあること・中身の形を見る。
 *
 * **サーバと検査だけが読む。**画面のスクリプト（src/lesson/slides.ts）から import しないこと。
 * 節のページは、メンバー・運営にだけ中身を HTML に書き込む（src/components/lesson/Slides.astro）。
 * .mjs にしてあるのは、検査（node の .mjs）と Astro のページの両方から読むため（scripts/parts.mjs と同じ）。
 *
 * @typedef {{ sex: string, pclass: number, n: number, s: number }} Cell
 * @typedef {{ kind: 'text', title: string, lines: string[] }} TextSlide
 * @typedef {{ kind: 'picto', title: string, sub?: string, by: 'all' | 'sex' | 'pclass' | 'sex-pclass', reveal: boolean }} PictoSlide
 * @typedef {{ cells: Cell[], slides: (TextSlide | PictoSlide)[] }} Deck
 * @typedef {{ name: string, n: number, s: number, cells: number[] }} PictoGroup
 */
import intro1 from './intro1.mjs';

/** @type {Record<string, Deck>} */
export const DECKS = { intro1 };

export const PICTO_BY = ['all', 'sex', 'pclass', 'sex-pclass'];

/** その名前のスライドがあれば返す。 */
export function deckById(id) {
  return Object.prototype.hasOwnProperty.call(DECKS, id) ? DECKS[id] : null;
}

/**
 * 人の図の1段ぶんの組（1組が横一列）。組の人数はセルの本当の数を足したもの。
 * @param {Deck} deck
 * @param {PictoSlide['by']} by
 * @returns {PictoGroup[]}
 */
export function pictoGroups(deck, by) {
  const keys = [];
  const groups = new Map();
  deck.cells.forEach((c, i) => {
    const name =
      by === 'all' ? '乗客' : by === 'sex' ? c.sex : by === 'pclass' ? `${c.pclass}等` : `${c.sex} ${c.pclass}等`;
    if (!groups.has(name)) {
      groups.set(name, { name, n: 0, s: 0, cells: [] });
      keys.push(name);
    }
    const g = groups.get(name);
    g.n += c.n;
    g.s += c.s;
    g.cells.push(i);
  });
  // 等級で分けるときは 1等・2等・3等 の順（セルの並びは女性1〜3等・男性1〜3等なので並べ直す）
  if (by === 'pclass') keys.sort();
  return keys.map((k) => groups.get(k));
}

/**
 * 形の検査（検査25 が使う）。問題を文字列の配列で返す。
 * @param {Deck} deck
 */
export function deckProblems(deck) {
  const out = [];
  if (!deck || !Array.isArray(deck.slides) || deck.slides.length === 0) return ['slides が空です'];
  const hasPicto = deck.slides.some((s) => s && s.kind === 'picto');
  if (hasPicto) {
    if (!Array.isArray(deck.cells) || deck.cells.length === 0) out.push('人の図があるのに cells がありません');
    else
      deck.cells.forEach((c, i) => {
        if (typeof c.sex !== 'string' || ![1, 2, 3].includes(c.pclass)) out.push(`cells[${i}]: sex と pclass（1〜3）を書きます`);
        if (!Number.isInteger(c.n) || !Number.isInteger(c.s) || c.n <= 0 || c.s < 0 || c.s > c.n) {
          out.push(`cells[${i}]: n（乗客）と s（生き残った人）は 0 ≤ s ≤ n の整数です`);
        }
      });
  }
  deck.slides.forEach((s, i) => {
    const at = `slides[${i}]`;
    if (!s || typeof s.title !== 'string' || s.title.trim() === '') out.push(`${at}: title がありません`);
    if (s?.kind === 'text') {
      if (!Array.isArray(s.lines) || s.lines.some((l) => typeof l !== 'string' || l.trim() === '')) {
        out.push(`${at}: lines は空でない文字列の配列です`);
      }
    } else if (s?.kind === 'picto') {
      if (!PICTO_BY.includes(s.by)) out.push(`${at}: by は ${PICTO_BY.join(' / ')} のどれかです`);
      if (typeof s.reveal !== 'boolean') out.push(`${at}: reveal（生き残りを色で見せるか）を true / false で書きます`);
      if (s.sub !== undefined && (typeof s.sub !== 'string' || s.sub.trim() === '')) out.push(`${at}: sub は空でない文字列です`);
    } else {
      out.push(`${at}: kind は text か picto です`);
    }
  });
  return out;
}
