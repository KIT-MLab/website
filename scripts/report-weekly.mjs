/**
 * 今週の演習で確かめている技能の表（20-platform.md 第24章）。
 *
 *   npm run report:weekly
 *
 * 回ごとに「技能 × 問題」の表を出し、次の2つを並べる。
 *   - この回で新しく扱う章の技能のうち、どの問題でも使っていないもの（試せていない）
 *   - 土台（print・input）以外で、半分以上の問題で使っているもの（寄りすぎ）
 * 技能は scripts/weekly-skills.mjs。模範解答（src/content/weekly/solutions）のコードから見分ける。
 * 検査ではなく報告である。何を足し何を減らすかは、この表を見て人が決める。
 */
import { readFileSync, readdirSync, existsSync } from 'node:fs';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { SKILLS } from './weekly-skills.mjs';

const ROOT = fileURLToPath(new URL('..', import.meta.url));
const WEEKLY = join(ROOT, 'src/content/weekly');
const SOLUTIONS = join(WEEKLY, 'solutions');

/** '02-numbers' → 2、'04p-practice1' → 4.5（練習編はその章のすぐあと） */
function chapterOrder(ch) {
  const m = /^(\d+)(p?)/.exec(ch);
  if (!m) return Infinity;
  return Number(m[1]) + (m[2] ? 0.5 : 0);
}

function readSet(file) {
  const text = readFileSync(join(WEEKLY, file), 'utf8');
  const fm = /^---\r?\n([\s\S]*?)\r?\n---/.exec(text)?.[1] ?? '';
  const date = /date:\s*'?([\d-]+)'?/.exec(fm)?.[1] ?? file;
  const title = /title:\s*(.+)/.exec(fm)?.[1]?.trim() ?? '';
  const chapters = [...(/chapters:\s*\[([^\]]*)\]/.exec(fm)?.[1] ?? '').matchAll(/'([^']+)'/g)].map((m) => m[1]);
  const ids = [...text.matchAll(/<Exercise[\s\S]*?\bid="([^"]+)"/g)].map((m) => m[1]);
  const problems = ids.map((id) => {
    const path = join(SOLUTIONS, `${id}.py`);
    const code = existsSync(path) ? readFileSync(path, 'utf8') : null;
    const used = new Set(code === null ? [] : SKILLS.filter((s) => s.re.test(code)).map((s) => s.key));
    return { id, short: id.replace(/^weekly-[\d-]+-/, ''), code, used };
  });
  return { file, date, title, chapters, problems };
}

const sets = readdirSync(WEEKLY)
  .filter((f) => f.endsWith('.mdx'))
  .sort()
  .map(readSet);

const seen = new Set();
for (const set of sets) {
  const last = Math.max(...set.chapters.map(chapterOrder));
  const focus = set.chapters.filter((c) => !seen.has(c));
  set.chapters.forEach((c) => seen.add(c));
  const inRange = SKILLS.filter((s) => chapterOrder(s.chapter) <= last);
  const withCode = set.problems.filter((p) => p.code !== null);

  console.log(`\n■ ${set.date}  ${set.title}  （新しく扱う章: ${focus.join(', ') || 'なし'}）`);
  const noSolution = set.problems.filter((p) => p.code === null).map((p) => p.short);
  if (noSolution.length) console.log(`  模範解答が無い問題（数えない）: ${noSolution.join(', ')}`);

  const head = withCode.map((p) => p.short.padEnd(3)).join(' ');
  console.log(`  ${'技能'.padEnd(34)} ${head}  計`);
  for (const s of inRange) {
    const marks = withCode.map((p) => (p.used.has(s.key) ? '○  ' : '・ ')).join(' ');
    const n = withCode.filter((p) => p.used.has(s.key)).length;
    const label = `${s.basic ? '（土台）' : ''}${s.name}`;
    console.log(`  ${label.slice(0, 34).padEnd(34)} ${marks}  ${n}`);
  }

  const untested = inRange.filter(
    (s) => focus.includes(s.chapter) && !s.basic && !withCode.some((p) => p.used.has(s.key)),
  );
  // 寄りすぎは、この回で新しく扱う章の技能だけで見る。前の章の技能をくり返し使うのは復習として良い
  const heavy = inRange.filter(
    (s) =>
      focus.includes(s.chapter) &&
      !s.basic &&
      withCode.length > 0 &&
      withCode.filter((p) => p.used.has(s.key)).length * 2 > withCode.length,
  );
  console.log(`  試せていない（新しく扱う章）: ${untested.map((s) => s.name).join(' / ') || 'なし'}`);
  console.log(`  寄りすぎ（半分を超える問題で使う）: ${heavy.map((s) => s.name).join(' / ') || 'なし'}`);
}
