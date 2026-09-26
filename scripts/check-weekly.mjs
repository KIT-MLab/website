/**
 * 「今週の演習」の執筆規約の自動検査（20-platform.md 第19章）。
 *
 * scripts/check-lessons.mjs の全部をそのまま流用はしない。週次の演習は章ではないので、
 * 検査21（部への所属）のような章専用の検査は当てはまらない。20-platform.md の指示
 * （作業依頼の Build 手順1）が挙げた、当てはまる検査だけをここに置く。
 *
 *   - 文の長さ・段落の文数（check-lessons の検査6・7 と同じ規則）
 *   - 使ってはいけない表現・抽象語（検査9・10 と同じ規則）
 *   - 道具の台帳（検査16）。ただし「節の並び順より前」ではなく、**frontmatter の
 *     chapters に挙げた章の中で導入された道具か**で判じる（範囲を上回らない。第19.1節）
 *   - 用語集（検査18）。同じく chapters に挙げた章が初出かどうかで判じる
 *   - 節への参照「第N章M節」の形と行き先（検査20 と同じ規則）
 *   - 構造は練習編と同じ「はじめに」＋「課題」（第19.2節）
 *   - 課題の id が一意で、教材（lessons）の節・課題の id と重複しないこと（Build 手順1）
 *   - 確認問題（choose）を置かないこと、組む問題が問題文・入力・出力の形で書いてあること（第23章。
 *     規則は scripts/problem-form.mjs。check-lessons の検査22 と同じ）
 *
 * 節（src/content/lessons）は一切書き換えない。読むだけ。
 *
 *   node scripts/check-weekly.mjs
 */
import { existsSync, readdirSync, readFileSync, statSync } from 'node:fs';
import { join, relative } from 'node:path';
import { fileURLToPath } from 'node:url';
import { loadGlossary } from './glossary.mjs';
import { parseLesson, plainText } from './parse-lesson.mjs';
import { checkProblemForm, loadGeneratedExpect } from './problem-form.mjs';
import { ABSTRACT, BANNED, LIMITS, boundaryKinds, countChars, splitSentences } from './lesson-rules.mjs';
import { PYTHON_TOOLS } from './python-tools.mjs';
import { buildSectionRefs } from './section-refs.mjs';

const ROOT = fileURLToPath(new URL('..', import.meta.url));
const LESSONS_DIR = join(ROOT, 'src', 'content', 'lessons');
const WEEKLY_DIR = join(ROOT, 'src', 'content', 'weekly');
const SECTION_REFS = buildSectionRefs(LESSONS_DIR);

/** 「はじめに」＋「課題」だけ（第15.1節の練習編と同じ形。第19.2節）。 */
const WEEKLY_SECTION_ORDER = ['はじめに', '課題'];
/* 確認問題（choose）は置かない（第23.1節。利用者「少し簡単すぎる」） */
/* 第6章（エラーを読む）以降は、エラーになるコードを直す「変える」（modify）を1問置く（第24.3節） */
const WEEKLY_EXERCISE_KINDS = ['build', 'type', 'modify'];

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

function sentenceLength(sentence) {
  return countChars(plainText(sentence).replace(/。$/, ''));
}

function testInputs(test) {
  if (!test || typeof test !== 'object') return [];
  if (test.kind === 'call') return Array.isArray(test.args) ? test.args : [];
  const stdin = typeof test.stdin === 'string' ? test.stdin : '';
  if (stdin === '') return [];
  const lines = stdin.split('\n');
  if (lines[lines.length - 1] === '') lines.pop();
  return lines;
}

const problems = [];
function add(file, check, line, message) {
  problems.push({ file, check, line, message });
}

// --- 教材（lessons）の id を集める。節の id・章の id・課題の id、すべてに重複しないこと ---
const lessonIds = new Set();
const lessonExerciseIds = new Set();
/** 課題の id（PYTHON_TOOLS の in）→ その節の章 */
const lessonChapterOf = new Map();

for (const file of listMdx(LESSONS_DIR)) {
  const source = readFileSync(file, 'utf8').split('\r\n').join('\n');
  const lesson = parseLesson(source, relative(ROOT, file).replace(/\\/g, '/'));
  const id = lesson.data?.id;
  if (id) {
    lessonIds.add(id);
    lessonChapterOf.set(id, String(lesson.data.chapter ?? ''));
  }
  for (const e of lesson.exercises) if (e.id) lessonExerciseIds.add(e.id);
}

const glossary = loadGlossary();
/** 判定の1組目の期待値（生成済みの lesson-data.json から。無ければ build:tests が見る） */
const expectOf = loadGeneratedExpect();

const weeklyFiles = listMdx(WEEKLY_DIR).sort();
const seenWeeklyIds = new Map();
const seenWeeklyExerciseIds = new Map();

for (const file of weeklyFiles) {
  const rel = relative(ROOT, file).replace(/\\/g, '/');
  const rawSource = readFileSync(file, 'utf8');
  // CRLF の罠（design/HANDOFF.md 第7章）。lessons と同じくそろえてから読む
  const source = rawSource.split('\r\n').join('\n');
  const lesson = parseLesson(source, rel);
  const fm = lesson.data ?? {};

  for (const key of ['id', 'date', 'title', 'chapters']) {
    if (fm[key] === undefined || fm[key] === '' || (Array.isArray(fm[key]) && fm[key].length === 0)) {
      add(rel, 'frontmatter', 1, `frontmatter に ${key} がありません`);
    }
  }
  const dateMatch = /^(\d{4}-\d{2}-\d{2})\.mdx$/.exec(file.split(/[\\/]/).pop() ?? '');
  if (dateMatch && fm.date && fm.date !== dateMatch[1]) {
    add(rel, 'frontmatter', 1, `date（${fm.date}）がファイル名（${dateMatch[1]}）と違います`);
  }
  if (fm.id && dateMatch && fm.id !== `weekly-${dateMatch[1]}`) {
    add(rel, 'frontmatter', 1, `id は weekly-${dateMatch[1]} の形にしてください（いまは ${fm.id}）`);
  }
  if (fm.id) {
    if (seenWeeklyIds.has(fm.id)) add(rel, 'frontmatter', 1, `id が ${seenWeeklyIds.get(fm.id)} と重複しています: ${fm.id}`);
    else seenWeeklyIds.set(fm.id, rel);
    if (lessonIds.has(fm.id)) add(rel, 'frontmatter', 1, `id が教材の節の id と重複しています: ${fm.id}`);
  }

  const allowedChapters = new Set(Array.isArray(fm.chapters) ? fm.chapters : []);
  for (const chapter of allowedChapters) {
    if (!existsSync(join(LESSONS_DIR, chapter))) {
      add(rel, 'frontmatter', 1, `chapters に無い章のディレクトリがあります: ${chapter}`);
    }
  }

  // --- 構造: 「はじめに」＋「課題」だけ（練習編と同じ。第19.2節・第15.1節） ---
  const names = lesson.markers.map((m) => m.name);
  const known = names.filter((n) => WEEKLY_SECTION_ORDER.includes(n));
  for (const n of names) {
    if (!WEEKLY_SECTION_ORDER.includes(n)) {
      const line = lesson.markers.find((m) => m.name === n).line;
      add(rel, 1, line, `今週の演習に「${n}」は置きません。「はじめに」と「課題」だけです（第19.2節）`);
    }
  }
  for (const required of WEEKLY_SECTION_ORDER) {
    if (!known.includes(required)) add(rel, 1, 1, `要素「${required}」のマーカーがありません`);
  }
  const dup = known.filter((n, i) => known.indexOf(n) !== i);
  for (const n of new Set(dup)) add(rel, 1, 1, `要素「${n}」のマーカーが2回以上あります`);
  let last = -1;
  for (const n of known) {
    const at = WEEKLY_SECTION_ORDER.indexOf(n);
    if (at < last) add(rel, 1, lesson.markers.find((m) => m.name === n).line, `要素の順序が違います: 「${n}」が後ろに来ています`);
    last = Math.max(last, at);
  }
  const introParas = lesson.bodyParagraphs.filter((p) => p.section === 'はじめに').length;
  if (known.includes('はじめに') && introParas !== 1) {
    add(rel, 1, lesson.markers.find((m) => m.name === 'はじめに')?.line ?? 1, `「はじめに」は1段落です。いまは${introParas}段落`);
  }
  for (const r of lesson.runs) add(rel, 2, r.line, '今週の演習に <Run> は置きません（第19.2節。練習編と同じ）');
  for (const m of lesson.mistakes) add(rel, 3, m.line, '今週の演習に <Mistake> は置きません（第19.2節）');

  // --- 課題 ---
  const ex = lesson.exercises;
  if (ex.length === 0) add(rel, 4, 1, '課題が1問もありません');
  const builds = ex.filter((e) => e.kind === 'build');
  if (builds.length === 0) add(rel, 4, 1, '「組む」（kind="build"）を主にします。1問もありません（第19.2節）');

  for (const e of ex) {
    if (!e.id) {
      add(rel, 4, e.line, '<Exercise> に id がありません');
    } else {
      if (seenWeeklyExerciseIds.has(e.id)) add(rel, 4, e.line, `課題の id が重複しています: ${e.id}`);
      else seenWeeklyExerciseIds.set(e.id, rel);
      if (lessonExerciseIds.has(e.id)) add(rel, 4, e.line, `課題の id が教材の課題の id と重複しています: ${e.id}`);
    }
    if (e.kind === 'choose') {
      add(rel, 4, e.line, '今週の演習に確認問題（kind="choose"）は置きません（第23.1節）');
    } else if (!WEEKLY_EXERCISE_KINDS.includes(e.kind)) {
      add(rel, 4, e.line, `今週の演習の課題は build / type のどれかです: ${e.kind}（第19.2節・第23.1節）`);
    }
    // 組む問題は問題文・入力・出力に分けて書く（第23.2節）。今週の演習には古い形を残さない
    if (e.kind === 'build' && e.form !== 'new') {
      add(rel, 22, e.line, '組む問題は <Input>（入力）と <Output>（出力）に分けて書きます（第23.2節）');
    }
    for (const message of checkProblemForm(e, expectOf(e.id))) add(rel, 22, e.line, message);
    if (e.kind === 'build' && e.starter) add(rel, 4, e.line, '「組む」課題にコードを渡してはいけません（starter を消してください）');
    if (e.hints.length === 0) {
      add(rel, 4, e.line, 'hints がありません。読めばよい節を「第N章M節」で書いてください（第19.1節）');
    } else if (e.hints.length > 3) {
      add(rel, 4, e.line, 'hints は0〜3個です');
    } else if (!e.hints.some((h) => /第\d+章\d+節/.test(String(h)))) {
      add(rel, 4, e.line, 'hints のどれかに、読めばよい節を「第N章M節」で書いてください（第19.1節）');
    }
    const tests = Array.isArray(e.tests) ? e.tests : [];
    if (tests.length === 0) add(rel, 4, e.line, '<Exercise> に tests がありません');
    if (e.kind === 'build') {
      if (tests.length < LIMITS.buildTestsMin) {
        add(rel, 5, e.line, `「組む」の判定は${LIMITS.buildTestsMin}件以上です。いまは${tests.length}件`);
      }
      const inputs = tests.flatMap(testInputs);
      if (boundaryKinds(inputs).size === 0) {
        add(rel, 5, e.line, '「組む」の判定に境界の場合（0・負・同値・空）が1つも入っていません');
      }
    }
  }

  // --- 文の長さ・段落の文数・禁止表現・抽象語（検査6・7・9・10 と同じ規則） ---
  for (const p of lesson.allParagraphs) {
    const sentences = splitSentences(p.text);
    if (sentences.length > LIMITS.sentencesPerParagraph) {
      add(rel, 7, 1, `段落が${sentences.length}文あります（${LIMITS.sentencesPerParagraph}文以内）: ${p.where} 「${p.text.slice(0, 24)}…」`);
    }
    for (const s of sentences) {
      const len = sentenceLength(s);
      if (len > LIMITS.sentenceMax) {
        add(rel, 6, 1, `1文が${len}字あります（${LIMITS.sentenceMax}字以内）: ${p.where} 「${plainText(s).slice(0, 30)}…」`);
      }
    }
    const text = plainText(p.text);
    for (const b of BANNED) {
      if (b.re.test(text)) add(rel, 9, 1, `禁止表現（${b.group}）「${b.label}」が入っています: ${p.where}`);
    }
    for (const a of ABSTRACT) {
      if (text.includes(a.word)) add(rel, 10, 1, `抽象語の言い換え「${a.word}」が入っています。「${a.instead}」と書いてください: ${p.where}`);
    }
  }

  // --- 節への参照「第N章M節」（検査20 と同じ規則） ---
  {
    const places = [
      ...ex.flatMap((e) => (Array.isArray(e.hints) ? e.hints : []).map((h) => [e.line, `${e.id} のヒント`, String(h)])),
      ...lesson.allParagraphs.map((p) => [1, p.where, p.text]),
    ];
    for (const [line, where, text] of places) {
      if (/\d+\.\d+節/.test(text)) {
        add(rel, 20, line, `${where}: 節への参照が旧形式です。「第N章M節」の形に書き直してください: ${text.slice(0, 40)}`);
      }
      for (const m of text.matchAll(/第(\d+)章(\d+)節/g)) {
        const key = `${Number(m[1])}-${Number(m[2])}`;
        if (!SECTION_REFS[key]) add(rel, 20, line, `${where}: 「第${Number(m[1])}章${Number(m[2])}節」に行き先の節がありません`);
      }
    }
  }

  // --- 道具の台帳（検査16 の読み替え）。範囲は frontmatter.chapters の中だけ（第19.1節） ---
  {
    const parts = [];
    for (const m of source.matchAll(/```python\n([\s\S]*?)```/g)) parts.push(['本文のコード', m[1]]);
    for (const m of source.matchAll(/(?:code|starter)=\{?`([\s\S]*?)`\}?/g)) parts.push(['部品のコード', m[1]]);
    const solDir = join(WEEKLY_DIR, 'solutions');
    for (const e of ex) {
      if (e.kind !== 'build') continue;
      const solutionPath = join(solDir, `${e.id}.py`);
      if (existsSync(solutionPath)) parts.push([`模範解答 ${e.id}.py`, readFileSync(solutionPath, 'utf8')]);
    }
    for (const tool of PYTHON_TOOLS) {
      if (/^python-99-/.test(tool.in)) continue; // まだどの節でも教えていない書き方
      const toolChapter = lessonChapterOf.get(tool.in);
      // 導入する節がまだ無い道具は、この範囲でも早すぎる
      if (toolChapter !== undefined && allowedChapters.has(toolChapter)) continue;
      const hit = parts.find(([, code]) => tool.re.test(code));
      if (!hit) continue;
      const line = (hit[1].split('\n').find((l) => tool.re.test(l)) ?? '').trim();
      add(rel, 16, 1, `${tool.name} を使っていますが、frontmatter の chapters（${[...allowedChapters].join('・') || '（空）'}）の範囲より先で教える道具です（${hit[0]}: ${line}）`);
    }

    // --- 用語集（検査18 の読み替え） ---
    let prose = '';
    {
      const src = lesson.body ?? source;
      let fence = false;
      let depth = 0;
      for (let i = 0; i < src.length; i++) {
        if (!fence && src.startsWith('```', i)) { fence = true; i += 2; continue; }
        if (fence) { if (src.startsWith('```', i)) { fence = false; i += 2; } continue; }
        if (src.startsWith('={', i)) { depth++; i += 1; continue; }
        if (src.startsWith('="', i)) { const e2 = src.indexOf('"', i + 2); i = e2 < 0 ? src.length : e2; continue; }
        if (depth > 0) {
          if (src[i] === '{') depth++;
          else if (src[i] === '}') depth--;
          continue;
        }
        prose += src[i];
      }
    }
    const BOUND = '[^A-Za-z0-9_]';
    const ascii = (w) => [...w].every((c) => c.charCodeAt(0) < 128);
    const hit2 = (text, w) =>
      ascii(w)
        ? new RegExp('(^|' + BOUND + ')' + w.split('.').join('[.]') + '($|' + BOUND + ')').test(text)
        : text.includes(w);
    for (const term of glossary) {
      if (allowedChapters.has(term.chapter)) continue;
      const line = prose.split('\n').find((l) => hit2(l, term.word));
      if (!line) continue;
      add(rel, 18, 1, `「${term.word}」を使っていますが、初出は ${term.chapter} です。frontmatter の chapters に含まれていません（${line.trim().slice(0, 50)}）`);
    }
  }
}

if (problems.length === 0) {
  console.log(`check:weekly  ${weeklyFiles.length}回を検査して問題なし`);
  process.exit(0);
}

console.error(`check:weekly  ${problems.length}件の不合格`);
let current = '';
for (const p of problems) {
  if (p.file !== current) {
    current = p.file;
    console.error(`\n  ${current}`);
  }
  console.error(`    検査${p.check} (${p.file}:${p.line})  ${p.message}`);
}
console.error('\n不合格の回は採用しません（20-platform.md 第19章）。');
process.exit(1);
