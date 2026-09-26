/**
 * 練習問題集の数と技能の表（20-platform.md 第25.3節・第25.5節）。
 *
 *   npm run report:practice
 *
 * 章ごとに「話題 × ★の段」の問題の数を出し、模範解答（src/content/practice/solutions）が使う技能
 * （scripts/weekly-skills.mjs。今週の演習と同じ一覧）を数える。次の2つを並べる。
 *   - その章の技能のうち、どの問題でも使っていないもの（試せていない）
 *   - その章の技能のうち、章の問題の半分を超えて使っているもの（寄りすぎ）
 * 前の章の技能をくり返し使うのは復習として良いので、寄りすぎには数えない（第24.1節と同じ）。
 * 検査ではなく報告である。何を足し何を減らすかは、この表を見て人が決める。
 */
import { existsSync, readdirSync, readFileSync, statSync } from 'node:fs';
import { basename, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { evalAttribute, parseLesson } from './parse-lesson.mjs';
import { SKILLS } from './weekly-skills.mjs';

const ROOT = fileURLToPath(new URL('..', import.meta.url));
const PRACTICE = join(ROOT, 'src/content/practice');
const SOLUTIONS = join(PRACTICE, 'solutions');

function listMdx(dir) {
  if (!existsSync(dir)) return [];
  const out = [];
  for (const name of readdirSync(dir)) {
    const full = join(dir, name);
    if (statSync(full).isDirectory()) out.push(...listMdx(full));
    else if (name.endsWith('.mdx')) out.push(full);
  }
  return out;
}

/** 表の列をそろえる（全角は2文字ぶん） */
function pad(text, width) {
  const w = [...text].reduce((n, c) => n + (c.charCodeAt(0) > 0xff ? 2 : 1), 0);
  return text + ' '.repeat(Math.max(0, width - w));
}

const topics = listMdx(PRACTICE)
  .map((file) => {
    const lesson = parseLesson(readFileSync(file, 'utf8').split('\r\n').join('\n'), file);
    const fm = lesson.data ?? {};
    const problems = lesson.exercises.map((e) => {
      const path = join(SOLUTIONS, `${e.id}.py`);
      const code = existsSync(path) ? readFileSync(path, 'utf8') : null;
      return {
        id: e.id,
        level: Number(evalAttribute(e.rawAttrs.level)),
        used: new Set(code === null ? [] : SKILLS.filter((s) => s.re.test(code)).map((s) => s.key)),
        hasCode: code !== null,
      };
    });
    return {
      chapter: String(fm.chapter ?? basename(join(file, '..'))),
      title: String(fm.title ?? basename(file, '.mdx')),
      order: Number(fm.order ?? 0),
      problems,
    };
  })
  .sort((a, b) => a.chapter.localeCompare(b.chapter) || a.order - b.order);

const chapters = [...new Set(topics.map((t) => t.chapter))];
let total = 0;
for (const chapter of chapters) {
  const list = topics.filter((t) => t.chapter === chapter);
  const all = list.flatMap((t) => t.problems);
  total += all.length;
  console.log(`\n■ ${chapter}  ${all.length}問`);
  console.log(`  ${pad('話題', 48)} ★1 ★2 ★3  計`);
  for (const t of list) {
    const n = (lv) => String(t.problems.filter((p) => p.level === lv).length).padStart(2);
    const label = t.problems.length === 0 ? `${t.title}（まだ無い）` : t.title;
    console.log(`  ${pad(label, 48)} ${n(1)} ${n(2)} ${n(3)}  ${String(t.problems.length).padStart(2)}`);
  }
  const withCode = all.filter((p) => p.hasCode);
  if (withCode.length === 0) continue;

  console.log(`  技能（模範解答 ${withCode.length}問で数える）`);
  const inRange = SKILLS.filter((s) => s.chapter.localeCompare(chapter) <= 0);
  for (const s of inRange) {
    const k = withCode.filter((p) => p.used.has(s.key)).length;
    const label = `${s.basic ? '（土台）' : ''}${s.name}`;
    console.log(`    ${pad(label.slice(0, 40), 58)} ${String(k).padStart(3)}`);
  }
  const own = inRange.filter((s) => s.chapter === chapter && !s.basic);
  const untested = own.filter((s) => !withCode.some((p) => p.used.has(s.key)));
  const heavy = own.filter((s) => withCode.filter((p) => p.used.has(s.key)).length * 2 > withCode.length);
  console.log(`  試せていない（この章の技能）: ${untested.map((s) => s.name).join(' / ') || 'なし'}`);
  console.log(`  寄りすぎ（この章の問題の半分を超えて使う）: ${heavy.map((s) => s.name).join(' / ') || 'なし'}`);
}
console.log(`\n合計 ${topics.length}話題 / ${total}問`);
