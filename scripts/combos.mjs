/**
 * 組み合わせの表（20-platform.md 第15.3節）。
 *
 * 「組む」課題の模範解答ごとに、使っている道具（道具の台帳 scripts/python-tools.mjs のまとまり）を
 * 数え、主な道具のうち一度も一緒に使われていない組み合わせと、一緒に使われた回数を出す。
 * 章や練習編を足すたびに見て、次の練習編の問題を選ぶ材料にする。
 *
 * **検査ではない。**何が出ても終了コードは0で、npm run build にも入れない。
 *
 *   npm run report:combos
 */
import { existsSync, readdirSync, readFileSync, statSync } from 'node:fs';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { parseLesson } from './parse-lesson.mjs';
import { PYTHON_TOOLS } from './python-tools.mjs';
import { INTRO_CHAPTER } from './parts.mjs';

const ROOT = fileURLToPath(new URL('..', import.meta.url));
const LESSONS_DIR = join(ROOT, 'src', 'content', 'lessons');

/* 道具を、学習者の手で意味のある単位にまとめる。右は台帳の name。
   台帳に道具を足したら、ここにも足す（足さないと表に出ない） */
const GROUPS = {
  input: ['input()'],
  print: ['print'],
  'f文字列': ['f文字列'],
  '計算': ['**', '%', '//', 'round()'],
  if: ['if', 'else', 'elif'],
  'and/or': ['and / or / not'],
  for: ['for'],
  while: ['while'],
  'リスト': ['リスト', 'append()', 'remove()'],
  '添字': ['添字 []', 'len()'],
  def: ['def'],
  return: ['return'],
  numpy: ['numpy'],
  '2次元配列': ['2次元配列'],
  'スライス': ['スライス'],
  // 第8章
  '行と列の添字': ['行と列の添字 [i, j]'],
  '転置': ['転置 .T'],
  'arange/linspace/zeros': ['arange / linspace / zeros'],
  reshape: ['reshape'],
};

/** 「一度も一緒に使われていない組み合わせ」を探す相手。全部の組にすると、当たり前の空きで埋まる */
const CORE = ['if', 'for', 'while', 'リスト', '添字', 'def', 'return', 'numpy', '2次元配列', 'f文字列', 'and/or',
  '行と列の添字', 'reshape'];

const toolRe = new Map(PYTHON_TOOLS.map((t) => [t.name, t.re]));
for (const [group, names] of Object.entries(GROUPS)) {
  for (const name of names) if (!toolRe.has(name)) console.warn(`（台帳に「${name}」がありません。${group} から外して数えます）`);
}
const groupNames = Object.keys(GROUPS);
const uses = (code) => groupNames.filter((g) => GROUPS[g].some((n) => toolRe.get(n)?.test(code)));

/** 04-loop → 第4章、04p-practice1 → 練習編1、08q-mlintro → 機械学習の入口（src/lesson/chapters.ts と同じ呼び方の頭の部分） */
function chapterLabel(dir) {
  const practice = /^\d\dp-practice(\d+)$/.exec(dir);
  if (practice) return `練習編${practice[1]}`;
  if (dir === INTRO_CHAPTER) return '機械学習の入口';
  const n = Number.parseInt(dir, 10);
  return Number.isNaN(n) ? dir : `第${n}章`;
}

// --- 「組む」課題ごとに、使っている道具 ---
const rows = [];
for (const dir of readdirSync(LESSONS_DIR).sort()) {
  const chapterDir = join(LESSONS_DIR, dir);
  if (!statSync(chapterDir).isDirectory()) continue;
  for (const name of readdirSync(chapterDir).filter((f) => f.endsWith('.mdx')).sort()) {
    const lesson = parseLesson(readFileSync(join(chapterDir, name), 'utf8'), `${dir}/${name}`);
    for (const e of lesson.exercises) {
      if (e.kind !== 'build') continue;
      const path = join(chapterDir, 'solutions', `${e.id}.py`);
      if (!existsSync(path)) continue;
      // Windows の git は作業ファイルを CRLF で書き出すので、読む側で LF にそろえる（検査16 と同じ）
      const code = readFileSync(path, 'utf8').split('\r\n').join('\n');
      rows.push({ chapter: chapterLabel(dir), id: e.id, groups: uses(code) });
    }
  }
}

const pairs = new Map();
const key = (a, b) => (groupNames.indexOf(a) < groupNames.indexOf(b) ? `${a} + ${b}` : `${b} + ${a}`);
for (const r of rows) {
  for (let i = 0; i < r.groups.length; i++) {
    for (let j = i + 1; j < r.groups.length; j++) {
      const k = key(r.groups[i], r.groups[j]);
      pairs.set(k, (pairs.get(k) ?? 0) + 1);
    }
  }
}

console.log(`「組む」課題 ${rows.length}問（模範解答のあるもの）`);
const bySize = {};
for (const r of rows) bySize[r.groups.length] = (bySize[r.groups.length] ?? 0) + 1;
console.log(`道具の数ごとの問数: ${Object.entries(bySize).map(([n, c]) => `${n}個 ${c}問`).join(' / ')}`);

/* 主な道具を3つ以上組み合わせているか（20-platform.md 第15.1節、2026-09-24）。
   input・print・f文字列はほぼ全問で使うので数えない */
const NOT_MAIN = new Set(['input', 'print', 'f文字列']);
const mainCount = (r) => r.groups.filter((g) => !NOT_MAIN.has(g)).length;
console.log('\n■ 主な道具を3つ以上組み合わせている課題（input・print・f文字列は数えない）');
const chapters = [...new Set(rows.map((r) => r.chapter))];
for (const ch of chapters) {
  const inCh = rows.filter((r) => r.chapter === ch);
  console.log(`  ${ch.padEnd(5, '　')} ${inCh.filter((r) => mainCount(r) >= 3).length} / ${inCh.length}問`);
}
const shortPractice = rows.filter((r) => r.chapter.startsWith('練習編') && mainCount(r) < 3);
if (shortPractice.length > 0) {
  console.log('  練習編で、主な道具が3つに届かない問題:');
  for (const r of shortPractice) console.log(`    ${r.id}  ${r.groups.filter((g) => !NOT_MAIN.has(g)).join(', ')}`);
}

console.log('\n■ 課題ごとの道具');
const idWidth = Math.max(...rows.map((r) => r.id.length));
for (const r of rows) console.log(`  ${r.chapter.padEnd(5, '　')} ${r.id.padEnd(idWidth)}  ${r.groups.join(', ')}`);

console.log('\n■ 主な道具の組み合わせで、一度も一緒に使われていないもの');
let missing = 0;
for (let i = 0; i < CORE.length; i++) {
  for (let j = i + 1; j < CORE.length; j++) {
    if ((pairs.get(key(CORE[i], CORE[j])) ?? 0) > 0) continue;
    console.log(`  ${CORE[i]} × ${CORE[j]}`);
    missing++;
  }
}
console.log(`  （${missing}組）`);

console.log('\n■ 一緒に使われた回数（多い順）');
for (const [k, n] of [...pairs.entries()].sort((x, y) => y[1] - x[1] || x[0].localeCompare(y[0]))) {
  console.log(`  ${String(n).padStart(3)}  ${k}`);
}
