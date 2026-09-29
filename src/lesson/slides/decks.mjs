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
 * @typedef {{ kind: 'map', title: string, lines?: string[], step: 'southampton' | 'queenstown' | 'sink' }} MapSlide
 * @typedef {{ kind: 'image', title: string, src: string, alt: string, credit: string }} ImageSlide
 * どの1枚にも note?: string（運営にだけ見える話すこと）を付けられる。
 * @typedef {{ cells: Cell[], slides: ((TextSlide | PictoSlide | MapSlide | ImageSlide) & { note?: string })[] }} Deck
 * @typedef {{ name: string, n: number, s: number, cells: number[] }} PictoGroup
 */
import intro1 from './intro1.mjs';
import { POINTS } from './north-atlantic.mjs';

/** @type {Record<string, Deck>} */
export const DECKS = { intro1 };

export const PICTO_BY = ['all', 'sex', 'pclass', 'sex-pclass'];

/** 地図の1枚の段（船がどこにいるか）。港の順に進む */
export const MAP_STEPS = ['southampton', 'queenstown', 'sink'];

/** 航路（予定）。沈んだ所はニューヨークへの道の途中にある */
const ROUTE = ['southampton', 'cherbourg', 'queenstown', 'sink', 'newyork'];

const pathD = (pts) => (pts.length < 2 ? '' : pts.map((p, i) => `${i ? 'L' : 'M'}${p[0]},${p[1]}`).join(''));

/**
 * 地図の段ごとの船の位置と、進んだ道（実線）・まだの道（点線）。座標は src/lesson/slides/north-atlantic.mjs の図の上。
 * 「queenstown」はクイーンズタウンを出たところ（沈んだ所へ向かう道の3割）。
 * @param {'southampton' | 'queenstown' | 'sink'} step
 * @returns {{ ship: number[], done: string, rest: string, sink: boolean }}
 */
export function mapStep(step) {
  const at = (k) => POINTS[k];
  if (step === 'southampton') {
    return { ship: at('southampton'), done: '', rest: pathD(ROUTE.map(at)), sink: false };
  }
  if (step === 'queenstown') {
    const q = at('queenstown');
    const s = at('sink');
    const ship = [Math.round((q[0] + (s[0] - q[0]) * 0.3) * 10) / 10, Math.round((q[1] + (s[1] - q[1]) * 0.3) * 10) / 10];
    return { ship, done: pathD([...ROUTE.slice(0, 3).map(at), ship]), rest: pathD([ship, ...ROUTE.slice(3).map(at)]), sink: false };
  }
  return { ship: at('sink'), done: pathD(ROUTE.slice(0, 4).map(at)), rest: pathD(ROUTE.slice(3).map(at)), sink: true };
}

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
    } else if (s?.kind === 'map') {
      if (!MAP_STEPS.includes(s.step)) out.push(`${at}: step は ${MAP_STEPS.join(' / ')} のどれかです`);
      if (s.lines !== undefined && (!Array.isArray(s.lines) || s.lines.some((l) => typeof l !== 'string' || l.trim() === ''))) {
        out.push(`${at}: lines は空でない文字列の配列です`);
      }
    } else if (s?.kind === 'image') {
      // 画像は public/ の下に置く（ファイルがあるかは検査25 の本体が見る）
      if (typeof s.src !== 'string' || !/^\/[a-z0-9/_.-]+\.(?:jpg|png|webp)$/.test(s.src)) {
        out.push(`${at}: src は public/ から見たパス（/ で始まり .jpg・.png・.webp で終わる英小文字）です`);
      }
      if (typeof s.alt !== 'string' || s.alt.trim() === '') out.push(`${at}: alt（画像の説明）がありません`);
      if (typeof s.credit !== 'string' || s.credit.trim() === '') out.push(`${at}: credit（出典）がありません`);
    } else {
      out.push(`${at}: kind は text・picto・map・image のどれかです`);
    }
    if (s && s.note !== undefined && (typeof s.note !== 'string' || s.note.trim() === '')) out.push(`${at}: note は空でない文字列です`);
    if (s && (s.kind === 'image' || s.kind === 'map')) {
      const allowed = s.kind === 'image' ? ['kind', 'title', 'src', 'alt', 'credit', 'note'] : ['kind', 'title', 'lines', 'step', 'note'];
      const extra = Object.keys(s).filter((k) => !allowed.includes(k));
      if (extra.length > 0) out.push(`${at}: ${s.kind} に使えない項目があります（${extra.join('・')}）`);
    }
  });
  return out;
}
