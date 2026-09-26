/**
 * 練習問題集の執筆規約の自動検査（20-platform.md 第25.5節・第25.6節）。
 *
 * 1つの話題＝1つの .mdx（src/content/practice/<章>/<話題>.mdx）。本文は <Exercise> だけ。
 * 書き方は 10-lesson-and-writing.md 第3.12節。見るもの:
 *
 *   - frontmatter（id・chapter・topic・title・sections・order・levels）と置き場所が合っていること
 *   - 課題の id が `practice-<章の番号>-<話題>-<n>` の形で、教材・今週の演習・ほかの話題と重複しないこと
 *   - 課題に level（1〜3）と name（札の名前）があり、level の順（★1 → ★3）に並んでいること
 *   - 問題が1問でもある話題は、frontmatter の levels に挙げた★の段ごとに1問以上あること
 *     （1問も無い話題は「準備中」として通す。数だけ最後に出す）
 *   - 組む問題は問題文・入力・出力の形（第23章。規則は scripts/problem-form.mjs）
 *   - 判定の数と境界（検査5 と同じ。入力欄を使わない問題は判定が1組でよい）
 *   - 文の長さ・段落の文数・禁止表現・抽象語・感嘆符（検査6・7・9・10・11 と同じ規則）
 *   - 節への参照「第N章M節」「入口N」の行き先（検査20 と同じ規則）
 *   - 書き方の台帳（検査16 の読み替え）: **その話題の章までに教えた書き方だけ**を使うこと
 *   - 用語集（検査18 の読み替え）: その話題の章までに出てきた語だけを地の文で使うこと
 *   - syntax（構文の一覧の分類の key）が src/lesson/syntax-list.ts にあること
 *
 * 教材・今週の演習のファイルは読むだけ。
 *
 *   node scripts/check-practice.mjs
 */
import { existsSync, readdirSync, readFileSync, statSync } from 'node:fs';
import { basename, dirname, join, relative } from 'node:path';
import { fileURLToPath } from 'node:url';
import { loadGlossary } from './glossary.mjs';
import { evalAttribute, parseLesson, plainText } from './parse-lesson.mjs';
import { checkProblemForm, loadGeneratedExpect } from './problem-form.mjs';
import { ABSTRACT, BANNED, BANNED_CHARS, LIMITS, boundaryKinds, countChars, splitSentences } from './lesson-rules.mjs';
import { PYTHON_TOOLS } from './python-tools.mjs';
import { buildSectionRefs } from './section-refs.mjs';

const ROOT = fileURLToPath(new URL('..', import.meta.url));
const LESSONS_DIR = join(ROOT, 'src', 'content', 'lessons');
const WEEKLY_DIR = join(ROOT, 'src', 'content', 'weekly');
const PRACTICE_DIR = join(ROOT, 'src', 'content', 'practice');
const SOLUTIONS_DIR = join(PRACTICE_DIR, 'solutions');
const SYNTAX_LIST = join(ROOT, 'src', 'lesson', 'syntax-list.ts');
const SECTION_REFS = buildSectionRefs(LESSONS_DIR);

const PRACTICE_KINDS = ['build', 'modify'];
const LEVELS = [1, 2, 3];
/** 札（一覧の問題の札）の名前の長さ。札が折り返さない程度 */
const NAME_MAX = 14;

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

const lf = (s) => String(s).split('\r\n').join('\n');

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

// --- 教材（lessons）: 節の id・課題の id・章の並び ---
const lessonIds = new Set();
const lessonExerciseIds = new Set();
const lessonChapterOf = new Map();
/** 章のディレクトリ名 → 教材の順の位置（ファイルの位置の順。check-lessons と同じ前提） */
const chapterOrder = new Map();
for (const file of listMdx(LESSONS_DIR).sort()) {
  const lesson = parseLesson(lf(readFileSync(file, 'utf8')), relative(ROOT, file));
  const id = lesson.data?.id;
  const chapter = String(lesson.data?.chapter ?? '');
  if (!chapterOrder.has(chapter)) chapterOrder.set(chapter, chapterOrder.size);
  if (id) {
    lessonIds.add(id);
    lessonChapterOf.set(id, chapter);
  }
  for (const e of lesson.exercises) if (e.id) lessonExerciseIds.add(e.id);
}

// --- 今週の演習: 回の id・課題の id ---
const weeklyIds = new Set();
const weeklyExerciseIds = new Set();
for (const file of listMdx(WEEKLY_DIR)) {
  const lesson = parseLesson(lf(readFileSync(file, 'utf8')), relative(ROOT, file));
  if (lesson.data?.id) weeklyIds.add(lesson.data.id);
  for (const e of lesson.exercises) if (e.id) weeklyExerciseIds.add(e.id);
}

// --- 構文の一覧の分類の key（src/lesson/syntax-list.ts。.ts なので key の行だけを拾う） ---
const syntaxKeys = new Set([...lf(readFileSync(SYNTAX_LIST, 'utf8')).matchAll(/^\s*key:\s*'([^']+)'/gm)].map((m) => m[1]));

const glossary = loadGlossary();
const expectOf = loadGeneratedExpect();

const files = listMdx(PRACTICE_DIR).sort();
const seenSetIds = new Map();
const seenExerciseIds = new Map();
/** 章 → order → ファイル（order の重複を見る） */
const ordersByChapter = new Map();
let exerciseCount = 0;
const emptyTopics = [];

for (const file of files) {
  const rel = relative(ROOT, file).replace(/\\/g, '/');
  const source = lf(readFileSync(file, 'utf8'));
  const lesson = parseLesson(source, rel);
  const fm = lesson.data ?? {};

  // --- frontmatter と置き場所 ---
  for (const key of ['id', 'chapter', 'topic', 'title', 'sections', 'order', 'levels']) {
    if (fm[key] === undefined || fm[key] === '' || (Array.isArray(fm[key]) && fm[key].length === 0)) {
      add(rel, 'frontmatter', 1, `frontmatter に ${key} がありません`);
    }
  }
  const dirChapter = basename(dirname(file));
  const fileTopic = basename(file, '.mdx');
  const chapter = String(fm.chapter ?? '');
  const topic = String(fm.topic ?? '');
  if (chapter !== dirChapter) add(rel, 'frontmatter', 1, `chapter（${chapter}）がフォルダ名（${dirChapter}）と違います`);
  if (topic !== fileTopic) add(rel, 'frontmatter', 1, `topic（${topic}）がファイル名（${fileTopic}）と違います`);
  if (!/^[a-z0-9]+(-[a-z0-9]+)*$/.test(topic)) add(rel, 'frontmatter', 1, `topic は英小文字・数字・- で書きます: ${topic}`);
  if (!chapterOrder.has(chapter)) add(rel, 'frontmatter', 1, `教材に無い章です: ${chapter}`);
  const chapterNo = chapter.split('-')[0];
  const expectedId = `practice-${chapterNo}-${topic}`;
  if (fm.id && fm.id !== expectedId) add(rel, 'frontmatter', 1, `id は ${expectedId} の形にしてください（いまは ${fm.id}）`);
  if (fm.id) {
    if (seenSetIds.has(fm.id)) add(rel, 'frontmatter', 1, `id が ${seenSetIds.get(fm.id)} と重複しています: ${fm.id}`);
    else seenSetIds.set(fm.id, rel);
    if (lessonIds.has(fm.id) || weeklyIds.has(fm.id)) add(rel, 'frontmatter', 1, `id が教材の節か今週の演習の id と重複しています: ${fm.id}`);
  }
  for (const s of Array.isArray(fm.sections) ? fm.sections : []) {
    if (!lessonIds.has(s)) add(rel, 'frontmatter', 1, `sections に無い節の id があります: ${s}`);
    else if (lessonChapterOf.get(s) !== chapter) add(rel, 'frontmatter', 1, `sections の ${s} は ${lessonChapterOf.get(s)} の節です。話題と同じ章の節を書きます`);
  }
  if (typeof fm.order !== 'number') {
    add(rel, 'frontmatter', 1, `order は数で書きます: ${fm.order}`);
  } else {
    const orders = ordersByChapter.get(chapter) ?? new Map();
    if (orders.has(fm.order)) add(rel, 'frontmatter', 1, `order ${fm.order} が ${orders.get(fm.order)} と重複しています`);
    orders.set(fm.order, rel);
    ordersByChapter.set(chapter, orders);
  }
  const declared = (Array.isArray(fm.levels) ? fm.levels : []).map(Number);
  for (const lv of declared) {
    if (!LEVELS.includes(lv)) add(rel, 'frontmatter', 1, `levels は 1・2・3 のどれかです: ${lv}`);
  }

  /** この話題で使ってよい章（教材の順でこの章まで） */
  const myOrder = chapterOrder.get(chapter) ?? -1;
  const allowed = (ch) => chapterOrder.has(ch) && chapterOrder.get(ch) <= myOrder;

  // --- 構造: <Exercise> だけ ---
  for (const m of lesson.markers) add(rel, 1, m.line, `練習問題集に要素のマーカー（${m.name}）は置きません。<Exercise> だけを書きます`);
  for (const r of lesson.runs) add(rel, 2, r.line, '練習問題集に <Run> は置きません');
  for (const m of lesson.mistakes) add(rel, 3, m.line, '練習問題集に <Mistake> は置きません');
  for (const p of lesson.bodyParagraphs) {
    add(rel, 1, 1, `<Exercise> の外に文章があります。話題の説明は教材の節が受け持ちます: 「${plainText(p.text).slice(0, 24)}…」`);
  }

  // --- 課題 ---
  const ex = lesson.exercises;
  exerciseCount += ex.length;
  if (ex.length === 0) emptyTopics.push(`${chapter}/${topic}`);
  const levelsSeen = new Set();
  const names = new Set();
  let lastLevel = 0;
  for (const e of ex) {
    const prefix = `${fm.id}-`;
    if (!e.id) {
      add(rel, 4, e.line, '<Exercise> に id がありません');
    } else {
      if (!e.id.startsWith(prefix) || !/^\d+$/.test(e.id.slice(prefix.length))) {
        add(rel, 4, e.line, `課題の id は ${prefix}<番号> の形にしてください: ${e.id}`);
      }
      if (seenExerciseIds.has(e.id)) add(rel, 4, e.line, `課題の id が ${seenExerciseIds.get(e.id)} と重複しています: ${e.id}`);
      else seenExerciseIds.set(e.id, rel);
      if (lessonExerciseIds.has(e.id) || weeklyExerciseIds.has(e.id)) add(rel, 4, e.line, `課題の id が教材か今週の演習の課題と重複しています: ${e.id}`);
    }
    if (!PRACTICE_KINDS.includes(e.kind)) add(rel, 4, e.line, `練習問題集の課題は build / modify のどれかです: ${e.kind}`);

    // ★の段（第25.5節）と札の名前
    const level = Number(evalAttribute(e.rawAttrs.level));
    if (!LEVELS.includes(level)) {
      add(rel, 4, e.line, `level（★の段）は 1・2・3 のどれかを {1} の形で書きます: ${e.rawAttrs.level?.raw ?? '（なし）'}`);
    } else {
      levelsSeen.add(level);
      if (!declared.includes(level)) add(rel, 4, e.line, `★${level} の問題がありますが、frontmatter の levels に ${level} がありません`);
      if (level < lastLevel) add(rel, 4, e.line, `★の段の順（★1 → ★3）に並べてください。★${lastLevel} のあとに ★${level} があります`);
      lastLevel = Math.max(lastLevel, level);
    }
    const name = String(evalAttribute(e.rawAttrs.name) ?? '').trim();
    if (name === '') add(rel, 4, e.line, 'name（一覧の札に出す短い名前）がありません');
    else if ([...name].length > NAME_MAX) add(rel, 4, e.line, `name は${NAME_MAX}字以内です: ${name}`);
    else if (names.has(name)) add(rel, 4, e.line, `name が同じ話題の中で重複しています: ${name}`);
    names.add(name);

    const syntax = evalAttribute(e.rawAttrs.syntax);
    if (syntax !== undefined) {
      if (!Array.isArray(syntax)) add(rel, 4, e.line, 'syntax は分類の key の配列です');
      else for (const k of syntax) if (!syntaxKeys.has(k)) add(rel, 4, e.line, `syntax の「${k}」は src/lesson/syntax-list.ts に無い分類です`);
    }

    if (e.kind === 'build') {
      if (e.starter) add(rel, 4, e.line, '「組む」課題にコードを渡してはいけません（starter を消してください）');
      if (e.form !== 'new') add(rel, 22, e.line, '組む問題は <Input>（入力）と <Output>（出力）に分けて書きます（第23.2節）');
    }
    if (e.kind === 'modify' && !e.starter) add(rel, 4, e.line, '「変える」課題には starter（動くコード）が要ります');
    for (const message of checkProblemForm(e, expectOf(e.id))) add(rel, 22, e.line, message);
    if (e.hints.length > 3) add(rel, 4, e.line, 'hints は0〜3個です');

    const tests = Array.isArray(e.tests) ? e.tests : [];
    if (tests.length === 0) add(rel, 4, e.line, '<Exercise> に tests がありません');
    if (e.kind === 'build' && tests.length > 0) {
      /* 入力欄を使わない問題（第1章の「値を表示する」など）は、何組書いても同じ判定になる。
         1組でよく、境界も無い */
      const noInput = tests.every((t) => t?.kind === 'stdout' && (typeof t.stdin !== 'string' || t.stdin === ''));
      if (noInput) {
        if (tests.length !== 1) add(rel, 5, e.line, `入力欄を使わない問題の判定は1組です。いまは${tests.length}組`);
      } else {
        if (tests.length < LIMITS.buildTestsMin) {
          add(rel, 5, e.line, `「組む」の判定は${LIMITS.buildTestsMin}件以上です。いまは${tests.length}件`);
        }
        if (boundaryKinds(tests.flatMap(testInputs)).size === 0) {
          add(rel, 5, e.line, '「組む」の判定に境界の場合（0・負・同値・空）が1つも入っていません');
        }
      }
    }
    if ((e.kind === 'build' || e.kind === 'modify') && e.id && !existsSync(join(SOLUTIONS_DIR, `${e.id}.py`))) {
      add(rel, 4, e.line, `模範解答がありません: src/content/practice/solutions/${e.id}.py`);
    }
  }
  if (ex.length > 0) {
    for (const lv of declared) {
      if (!levelsSeen.has(lv)) add(rel, 4, 1, `frontmatter の levels に ${lv} がありますが、★${lv} の問題が1問もありません`);
    }
  }

  // --- 文の長さ・段落の文数・禁止表現・抽象語・感嘆符 ---
  for (const p of lesson.allParagraphs) {
    const sentences = splitSentences(p.text);
    if (sentences.length > LIMITS.sentencesPerParagraph) {
      add(rel, 7, 1, `段落が${sentences.length}文あります（${LIMITS.sentencesPerParagraph}文以内）: ${p.where} 「${p.text.slice(0, 24)}…」`);
    }
    for (const s of sentences) {
      const len = countChars(plainText(s).replace(/。$/, ''));
      if (len > LIMITS.sentenceMax) add(rel, 6, 1, `1文が${len}字あります（${LIMITS.sentenceMax}字以内）: ${p.where} 「${plainText(s).slice(0, 30)}…」`);
    }
    const text = plainText(p.text);
    for (const b of BANNED) if (b.re.test(text)) add(rel, 9, 1, `禁止表現（${b.group}）「${b.label}」が入っています: ${p.where}`);
    for (const a of ABSTRACT) if (text.includes(a.word)) add(rel, 10, 1, `抽象語の言い換え「${a.word}」が入っています。「${a.instead}」と書いてください: ${p.where}`);
    for (const c of BANNED_CHARS) if (p.text.includes(c.char)) add(rel, 11, 1, `${c.label}「${c.char}」が入っています: ${p.where}`);
  }

  // --- 節への参照（検査20 と同じ規則） ---
  {
    const places = [
      ...ex.flatMap((e) => (Array.isArray(e.hints) ? e.hints : []).map((h) => [e.line, `${e.id} のヒント`, String(h)])),
      ...lesson.allParagraphs.map((p) => [1, p.where, p.text]),
    ];
    for (const [line, where, text] of places) {
      if (/\d+\.\d+節/.test(text)) add(rel, 20, line, `${where}: 節への参照が旧形式です。「第N章M節」の形に書き直してください`);
      for (const m of text.matchAll(/第(\d+)章(\d+)節/g)) {
        if (!SECTION_REFS[`${Number(m[1])}-${Number(m[2])}`]) add(rel, 20, line, `${where}: 「第${Number(m[1])}章${Number(m[2])}節」に行き先の節がありません`);
      }
      for (const m of text.matchAll(/入口(\d+)/g)) {
        if (!SECTION_REFS[`入口${Number(m[1])}`]) add(rel, 20, line, `${where}: 「入口${Number(m[1])}」に行き先の節がありません`);
      }
    }
  }

  // --- 書き方の台帳（検査16 の読み替え）。この話題の章までに教えた書き方だけ ---
  {
    const parts = [];
    for (const m of source.matchAll(/```python\n([\s\S]*?)```/g)) parts.push(['本文のコード', m[1]]);
    for (const m of source.matchAll(/(?:code|starter)=\{?`([\s\S]*?)`\}?/g)) parts.push(['部品のコード', m[1]]);
    for (const e of ex) {
      const p = join(SOLUTIONS_DIR, `${e.id}.py`);
      if (e.id && existsSync(p)) parts.push([`模範解答 ${e.id}.py`, lf(readFileSync(p, 'utf8'))]);
    }
    for (const tool of PYTHON_TOOLS) {
      const toolChapter = lessonChapterOf.get(tool.in);
      if (toolChapter !== undefined && allowed(toolChapter)) continue;
      const hit = parts.find(([, code]) => tool.re.test(code));
      if (!hit) continue;
      const line = (hit[1].split('\n').find((l) => tool.re.test(l)) ?? '').trim();
      add(rel, 16, 1, `${tool.name} を使っていますが、${chapter} より先で教える書き方です（${hit[0]}: ${line}）`);
    }
  }

  // --- 用語集（検査18 の読み替え）。地の文だけ（コードブロック・部品の属性を落とす） ---
  {
    let prose = '';
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
    const BOUND = '[^A-Za-z0-9_]';
    const ascii = (w) => [...w].every((c) => c.charCodeAt(0) < 128);
    const hit = (text, w) =>
      ascii(w) ? new RegExp('(^|' + BOUND + ')' + w.split('.').join('[.]') + '($|' + BOUND + ')').test(text) : text.includes(w);
    for (const term of glossary) {
      if (allowed(term.chapter)) continue;
      const line = prose.split('\n').find((l) => hit(l, term.word));
      if (!line) continue;
      add(rel, 18, 1, `「${term.word}」を使っていますが、初出は ${term.chapter} です（${line.trim().slice(0, 50)}）`);
    }
  }
}

const withProblems = files.length - emptyTopics.length;
if (problems.length === 0) {
  console.log(`check:practice  ${files.length}話題（問題のある話題 ${withProblems}・まだ無い話題 ${emptyTopics.length}）/ ${exerciseCount}問を検査して問題なし`);
  process.exit(0);
}

console.error(`check:practice  ${problems.length}件の不合格`);
let current = '';
for (const p of problems) {
  if (p.file !== current) {
    current = p.file;
    console.error(`\n  ${current}`);
  }
  console.error(`    検査${p.check} (${p.file}:${p.line})  ${p.message}`);
}
console.error('\n不合格の話題は採用しません（20-platform.md 第25.5節）。');
process.exit(1);
