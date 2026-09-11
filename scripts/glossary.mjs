/**
 * 用語集の読み込み。
 *
 * 置き場所は design/spec/glossary.md（10-lesson-and-writing.md 第5章）。
 * scripts/check-lessons.mjs（検査12・13）と、サイトの用語集のページが同じものを読む。
 */
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';

/** @typedef {{ word: string; english: string; definition: string; chapter: string }} Term */

/**
 * 表をほどく。1行目の見出しと区切り行は読み飛ばす。
 * @param {string} text
 * @returns {Term[]}
 */
export function parseGlossary(text) {
  /** @type {Term[]} */
  const terms = [];
  for (const raw of text.split(/\r?\n/)) {
    const line = raw.trim();
    if (!line.startsWith('|')) continue;
    const cells = line
      .slice(1, line.endsWith('|') ? -1 : undefined)
      .split('|')
      .map((c) => c.trim());
    if (cells.length < 4) continue;
    if (cells[0] === '語' || /^-+$/.test(cells[0])) continue;
    terms.push({ word: cells[0], english: cells[1], definition: cells[2], chapter: cells[3] });
  }
  return terms;
}

/** @returns {Term[]} */
export function loadGlossary() {
  const path = fileURLToPath(new URL('../design/spec/glossary.md', import.meta.url));
  return parseGlossary(readFileSync(path, 'utf8'));
}

/** @returns {Set<string>} */
export function glossaryWords() {
  return new Set(loadGlossary().map((t) => t.word));
}
