/**
 * ある節の時点で、学習者に「もう教えたこと」と「まだ教えていないこと」を書き出す
 * （design/AUTHORING.md 第4章）。
 *
 *   node scripts/taught.mjs python-03-andor      節の id で指す
 *   node scripts/taught.mjs 03-branch/04-andor   章/ファイル名でもよい
 *
 * 設計する人・書き手・読み手が、同じ1枚を見るための道具である。検査ではない（何も落とさない）。
 * 出どころは3つで、どれも教材が実際に使っているもの。ここに無い書き方は「教えた」と言えない。
 *   - 書き方: src/lesson/syntax-list.ts の since（節の「この節の書き方」の表と同じデータ）
 *   - 台帳  : scripts/python-tools.mjs の in（検査16）
 *   - 語    : 各節の frontmatter の terms と design/spec/glossary.md の定義
 */
import { readdirSync, readFileSync, statSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { splitFrontmatter } from './parse-lesson.mjs';
import { loadGlossary } from './glossary.mjs';
import { PYTHON_TOOLS } from './python-tools.mjs';
import { MEMBERS_ONLY_CHAPTERS } from './parts.mjs';
import { SYNTAX_CATEGORIES } from '../src/lesson/syntax-list.ts';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const LESSONS = join(ROOT, 'src', 'content', 'lessons');

const arg = process.argv[2];
if (!arg) {
  console.error('使い方: node scripts/taught.mjs <節の id、または 章/ファイル名>');
  process.exit(1);
}

// 節を教材の並び順に集める。メンバーだけの章（タイタニック演習）は一般の並びに入れない
const sections = [];
for (const chapter of readdirSync(LESSONS).sort()) {
  const full = join(LESSONS, chapter);
  if (!statSync(full).isDirectory() || MEMBERS_ONLY_CHAPTERS.includes(chapter)) continue;
  for (const file of readdirSync(full).sort()) {
    if (!file.endsWith('.mdx')) continue;
    const source = readFileSync(join(full, file), 'utf8').replace(/\r\n/g, '\n');
    const { data } = splitFrontmatter(source);
    sections.push({ id: data.id, title: data.title, terms: data.terms ?? [], path: `${chapter}/${file.slice(0, -4)}` });
  }
}

const at = sections.findIndex((s) => s.id === arg || s.path === arg);
if (at < 0) {
  console.error(`節が見つかりません: ${arg}`);
  process.exit(1);
}
const here = sections[at];
const orderOf = new Map(sections.map((s, i) => [s.id, i]));
/** その id の節が、この節より前（-1）・この節（0）・後ろか未定（1） */
const when = (id) => {
  const i = orderOf.get(id);
  if (i === undefined) return 1;
  return Math.sign(i - at);
};
const oneLine = (code) => code.replace(/\n/g, ' ⏎ ');

const glossary = new Map(loadGlossary().map((g) => [g.word, g.definition]));
const out = [];
out.push(`# ${here.path}「${here.title}」の時点`);
out.push('');
out.push('学習者が持っているのは「ここまでに教えた」の中身だけである。');
out.push('「この節で教える」は、この節の説明を読んだあとなら使える。「まだ教えていない」は使えない。');

out.push('', '## ここまでに教えた書き方（教えた節）');
for (const cat of SYNTAX_CATEGORIES) {
  const rows = cat.entries.filter((e) => when(e.since) < 0);
  if (rows.length === 0) continue;
  out.push('', `### ${cat.name}`);
  for (const e of rows) out.push(`- \`${oneLine(e.code)}\` → ${e.result || '（出力なし）'}  … ${e.note}（${e.since}）`);
}

out.push('', '## この節で教える書き方');
const nowRows = SYNTAX_CATEGORIES.flatMap((c) => c.entries.filter((e) => when(e.since) === 0));
if (nowRows.length === 0) out.push('（構文の一覧に、この節の行は無い）');
for (const e of nowRows) out.push(`- \`${oneLine(e.code)}\` → ${e.result || '（出力なし）'}  … ${e.note}`);
const nowTools = PYTHON_TOOLS.filter((t) => when(t.in) === 0).map((t) => t.name);
if (nowTools.length) out.push(`- 台帳でこの節が導入するもの: ${nowTools.join('、')}`);

out.push('', '## ここまでに出した語');
for (const s of sections.slice(0, at)) {
  for (const t of s.terms) out.push(`- ${t}: ${glossary.get(t) ?? '（用語集に定義が無い）'}（${s.id}）`);
}
out.push('', '## この節で出す語');
if (here.terms.length === 0) out.push('（無し）');
for (const t of here.terms) out.push(`- ${t}: ${glossary.get(t) ?? '（用語集に定義が無い）'}`);

out.push('', '## まだ教えていない（台帳にあるもの。これが全部ではない）');
out.push(PYTHON_TOOLS.filter((t) => when(t.in) > 0).map((t) => t.name).join('、') || '（無し）');

console.log(out.join('\n'));
