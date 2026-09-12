/**
 * 執筆規約の自動検査（20-platform.md 第2.4節）。
 *
 * 全 .mdx を読み、10-lesson-and-writing.md 第8章のチェックリストのうち
 * 機械判定できる13項目を検査する。1つでも落ちたら終了コード1を返す。
 * この検査はビルドの前に走り、失敗したらビルドを止める。
 *
 *   node scripts/check-lessons.mjs
 */
import { readdirSync, readFileSync, statSync } from 'node:fs';
import { join, relative } from 'node:path';
import { fileURLToPath } from 'node:url';
import { glossaryWords } from './glossary.mjs';
import { parseLesson, plainText } from './parse-lesson.mjs';
import {
  ABSTRACT,
  BANNED,
  BANNED_CHARS,
  EXERCISE_KINDS,
  LIMITS,
  SECTION_OPTIONAL,
  SECTION_ORDER,
  START_CHAPTER,
  START_EXERCISE_KINDS,
  START_LIMITS,
  boundaryKinds,
  countChars,
  splitSentences,
} from './lesson-rules.mjs';

const ROOT = fileURLToPath(new URL('..', import.meta.url));
const LESSONS_DIR = join(ROOT, 'src', 'content', 'lessons');

function listMdx(dir) {
  const out = [];
  for (const name of readdirSync(dir)) {
    const full = join(dir, name);
    if (statSync(full).isDirectory()) out.push(...listMdx(full));
    else if (name.endsWith('.mdx')) out.push(full);
  }
  return out;
}

/** 文の長さを数える。記法の記号と空白は数えず、末尾の句点も数えない。 */
function sentenceLength(sentence) {
  return countChars(plainText(sentence).replace(/。$/, ''));
}

/** テストの「入力」を取り出す。stdout は入力欄の各行、call は引数。 */
function testInputs(test) {
  if (!test || typeof test !== 'object') return [];
  if (test.kind === 'call') return Array.isArray(test.args) ? test.args : [];
  const stdin = typeof test.stdin === 'string' ? test.stdin : '';
  if (stdin === '') return [];
  const lines = stdin.split('\n');
  if (lines[lines.length - 1] === '') lines.pop();
  return lines;
}

/**
 * 「選ぶ練習」の選択肢の数（20-platform.md 第11.4節）。
 * <Exercise> は問題文の最後の箇条書きを選択肢にするので、ここも後ろから数える。
 */
function choiceCount(prompt) {
  const lines = String(prompt ?? '').split('\n').map((l) => l.replace(/\s+$/, ''));
  while (lines.length > 0 && lines[lines.length - 1] === '') lines.pop();
  let count = 0;
  for (let i = lines.length - 1; i >= 0; i--) {
    if (/^[ \t]*[-*]\s+\S/.test(lines[i])) count++;
    else if (lines[i] === '') continue;
    else break;
  }
  return count;
}

const files = listMdx(LESSONS_DIR).sort();
const words = glossaryWords();
const problems = [];
const seenLessonIds = new Map();
const seenExerciseIds = new Map();

for (const file of files) {
  const rel = relative(ROOT, file).replace(/\\/g, '/');
  const source = readFileSync(file, 'utf8');
  const lesson = parseLesson(source, rel);
  const add = (check, line, message) => problems.push({ file: rel, check, line, message });

  // --- frontmatter（第2.2節）。13項目の前提になるので先に見る ---
  const fm = lesson.data ?? {};
  /* 第0章だけの例外（20-platform.md 第11.5節）。chapter がちょうど 00-start のときだけ。
     ほかの章の検査は1つも緩めない。 */
  const isStart = fm.chapter === START_CHAPTER;
  for (const key of ['id', 'chapter', 'title', 'minutes']) {
    if (fm[key] === undefined || fm[key] === '') add('frontmatter', 1, `frontmatter に ${key} がありません`);
  }
  if (fm.id) {
    if (seenLessonIds.has(fm.id)) add('frontmatter', 1, `id が ${seenLessonIds.get(fm.id)} と重複しています: ${fm.id}`);
    else seenLessonIds.set(fm.id, rel);
  }

  // --- 検査1 要素の順序 ---
  const names = lesson.markers.map((m) => m.name);
  const known = names.filter((n) => SECTION_ORDER.includes(n));
  for (const n of names) {
    if (!SECTION_ORDER.includes(n)) {
      add(1, lesson.markers.find((m) => m.name === n).line, `知らない要素のマーカーです: ${n}`);
    }
  }
  for (const required of SECTION_ORDER) {
    if (SECTION_OPTIONAL.has(required)) continue;
    if (!known.includes(required)) add(1, 1, `要素「${required}」のマーカーがありません`);
  }
  const dup = known.filter((n, i) => known.indexOf(n) !== i);
  for (const n of new Set(dup)) add(1, 1, `要素「${n}」のマーカーが2回以上あります`);
  let last = -1;
  for (const n of known) {
    const at = SECTION_ORDER.indexOf(n);
    if (at < last) add(1, lesson.markers.find((m) => m.name === n).line, `要素の順序が違います: 「${n}」が後ろに来ています`);
    last = Math.max(last, at);
  }

  // --- 検査2 <Run> が「説明」より前にあること ---
  // 第0章は Python を動かさないので <Run> を置かない（第11.5節）
  const runTags = lesson.components.filter((c) => c.name === 'Run');
  const explain = lesson.sections.find((s) => s.name === '説明');
  if (runTags.length === 0) {
    if (!isStart) add(2, 1, '<Run> がありません。実行できるコードと実行結果を「やってみる」に置いてください');
  } else if (explain && runTags[0].start > explain.start) {
    add(2, runTags[0].line, '<Run> が「説明」より後ろにあります');
  }
  for (const run of lesson.runs) {
    if (run.out === undefined) add(2, run.line, '<Run> に out（実行結果）がありません');
  }

  // --- 検査3 <Mistake> が1〜3個 ---
  if (lesson.mistakes.length < LIMITS.mistakeMin || lesson.mistakes.length > LIMITS.mistakeMax) {
    add(3, 1, `<Mistake> は${LIMITS.mistakeMin}〜${LIMITS.mistakeMax}個です。いまは${lesson.mistakes.length}個`);
  }
  for (const m of lesson.mistakes) {
    if (!m.id) add(3, m.line, '<Mistake> に id がありません');
    if (!m.error) add(3, m.line, '<Mistake> に error（実際に出るエラーメッセージ）がありません');
    if (!m.code) add(3, m.line, '<Mistake> に code（壊れたコード）がありません');
    if (!m.fix) add(3, m.line, '<Mistake> に原因と直し方の本文がありません');
  }

  // --- 検査4 <Exercise> が4〜7個、うち kind="build" が1個以上 ---
  const ex = lesson.exercises;
  if (ex.length < LIMITS.exerciseMin || ex.length > LIMITS.exerciseMax) {
    add(4, 1, `課題は${LIMITS.exerciseMin}〜${LIMITS.exerciseMax}問です。いまは${ex.length}問`);
  }
  const builds = ex.filter((e) => e.kind === 'build');
  // 第0章は「組む」を置かず、kind="type" か kind="choose" が1問以上（第11.5節）
  if (isStart) {
    const directs = ex.filter((e) => e.kind === 'type' || e.kind === 'choose');
    if (directs.length < LIMITS.buildMin) {
      add(4, 1, '第0章には kind="type" か kind="choose" の課題が1問以上要ります');
    }
  } else if (builds.length < LIMITS.buildMin) {
    add(4, 1, '「組む」課題（kind="build"）が1問もありません');
  }
  const allowedKinds = isStart ? START_EXERCISE_KINDS : EXERCISE_KINDS;
  for (const e of ex) {
    if (!e.id) add(4, e.line, '<Exercise> に id がありません');
    else if (seenExerciseIds.has(e.id)) add(4, e.line, `課題の id が重複しています: ${e.id}`);
    else seenExerciseIds.set(e.id, rel);
    if (!allowedKinds.includes(e.kind)) add(4, e.line, `kind は ${allowedKinds.join(' / ')} のどれかです: ${e.kind}`);
    if (e.kind === 'modify' && !e.starter) add(4, e.line, '「変える」課題には starter（動くコード）が要ります');
    if (e.kind === 'build' && e.starter) add(4, e.line, '「組む」課題にコードを渡してはいけません（starter を消してください）');
    if ((e.kind === 'type' || e.kind === 'choose') && e.starter) {
      add(4, e.line, `kind="${e.kind}" にコードを渡してはいけません（starter を消してください）`);
    }
    const tests = Array.isArray(e.tests) ? e.tests : [];
    if (tests.length === 0) add(4, e.line, '<Exercise> に tests がありません');
    if (e.hints.length > 3) add(4, e.line, 'hints は0〜3個です');

    // 課題の型と判定の型が合っていること（第11.4節）
    if (e.kind === 'type') {
      if (tests.length !== 1 || tests[0]?.kind !== 'text') {
        add(4, e.line, "kind=\"type\" の tests は { kind: 'text', expect } の1件です");
      } else if (typeof tests[0].expect !== 'string' || tests[0].expect.trim() === '') {
        add(4, e.line, 'text の expect に、打つ見本の文字列を書いてください');
      }
    } else if (e.kind === 'choose') {
      const items = choiceCount(e.prompt);
      if (items < 2) {
        add(4, e.line, 'kind="choose" の選択肢は、問題文の最後の箇条書きに2つ以上書いてください');
      }
      if (tests.length !== 1 || tests[0]?.kind !== 'choice') {
        add(4, e.line, "kind=\"choose\" の tests は { kind: 'choice', correct } の1件です");
      } else if (!Number.isInteger(tests[0].correct) || tests[0].correct < 1 || tests[0].correct > items) {
        add(4, e.line, `choice の correct は1から数えた選択肢の番号です（選択肢は${items}個）: ${tests[0].correct}`);
      }
    } else if (tests.some((t) => t?.kind === 'text' || t?.kind === 'choice')) {
      add(4, e.line, 'text / choice の判定が使えるのは kind="type" / kind="choose" だけです');
    }
  }

  // --- 検査5 「組む」の tests に3件以上の入力があり、境界を含むこと ---
  for (const e of builds) {
    const tests = Array.isArray(e.tests) ? e.tests : [];
    if (tests.length < LIMITS.buildTestsMin) {
      add(5, e.line, `「組む」の判定は${LIMITS.buildTestsMin}件以上です。いまは${tests.length}件`);
    }
    const inputs = tests.flatMap(testInputs);
    const kinds = boundaryKinds(inputs);
    if (kinds.size === 0) {
      add(5, e.line, '「組む」の判定に境界の場合（0・負・同値・空）が1つも入っていません');
    }
    // 判定に使う入力は <Exercise> が tests から組んで出す（10-lesson 第3.1節）。
    // 手で書くと隠しテストとずれても誰も気づかないので、問題文には書かせない。
    if (e.prompt.includes('判定に使う入力')) {
      add(5, e.line, '問題文に「判定に使う入力」を手で書いています。tests から機械が組んで出すので消してください');
    }
  }

  // --- 検査6 すべての文が60字以内 / 検査7 すべての段落が3文以内 ---
  for (const p of lesson.allParagraphs) {
    const sentences = splitSentences(p.text);
    if (sentences.length > LIMITS.sentencesPerParagraph) {
      add(7, 1, `段落が${sentences.length}文あります（${LIMITS.sentencesPerParagraph}文以内）: ${p.where} 「${p.text.slice(0, 24)}…」`);
    }
    for (const s of sentences) {
      const len = sentenceLength(s);
      if (len > LIMITS.sentenceMax) {
        add(6, 1, `1文が${len}字あります（${LIMITS.sentenceMax}字以内）: ${p.where} 「${plainText(s).slice(0, 30)}…」`);
      }
    }
  }

  // --- 検査8 本文が800字以内。「説明」が250〜600字 ---
  // 本文合計に下限を置かない。下限があると、内容として要らない一文を字数のために
  // 足すことが起きる（第4.1節）。節が薄くなるのを防ぐ役目は「説明」の下限が担う。
  const bodyChars = lesson.bodyParagraphs.reduce((sum, p) => sum + countChars(plainText(p.text)), 0);
  if (bodyChars > LIMITS.bodyMax) {
    add(8, 1, `本文が${bodyChars}字です（${LIMITS.bodyMax}字以内）`);
  }
  const explainChars = lesson.bodyParagraphs
    .filter((p) => p.section === '説明')
    .reduce((sum, p) => sum + countChars(plainText(p.text)), 0);
  // 第0章は「説明より練習を主にする」ので 100〜400字に読み替える（第11.5節）
  const explainMin = isStart ? START_LIMITS.explainMin : LIMITS.explainMin;
  const explainMax = isStart ? START_LIMITS.explainMax : LIMITS.explainMax;
  if (explainChars < explainMin || explainChars > explainMax) {
    add(8, 1, `「説明」が${explainChars}字です（${explainMin}〜${explainMax}字）`);
  }

  // --- 検査9 禁止表現 / 検査10 抽象語の言い換え ---
  for (const p of lesson.allParagraphs) {
    const text = plainText(p.text);
    for (const b of BANNED) {
      if (b.re.test(text)) add(9, 1, `禁止表現（${b.group}）「${b.label}」が入っています: ${p.where}`);
    }
    for (const a of ABSTRACT) {
      if (text.includes(a.word)) add(10, 1, `抽象語の言い換え「${a.word}」が入っています。「${a.instead}」と書いてください: ${p.where}`);
    }
  }

  // --- 検査11 本文に ！ を含まないこと ---
  for (const p of lesson.bodyParagraphs) {
    for (const c of BANNED_CHARS) {
      if (p.text.includes(c.char)) add(11, 1, `本文に${c.label}「${c.char}」が入っています: ${p.where}`);
    }
  }

  // --- 検査12 terms の全語が用語集にあること ---
  for (const term of Array.isArray(fm.terms) ? fm.terms : []) {
    if (!words.has(term)) add(12, 1, `用語集（design/spec/glossary.md）にない語です: ${term}`);
  }

  // --- 検査13 <Level0> の中に、その節が新しく名前を付ける語が出てこないこと ---
  // 第7.3節が禁じているのは「概念の説明をレベル0に隠すこと」。禁じる対象は
  // その節の terms（この節が名前を付ける概念）だけ。前の節で習った語や、
  // 画面にそのまま出る文字列まで禁じると、操作の説明が書けなくなる。
  const ownTerms = Array.isArray(fm.terms) ? fm.terms : [];
  for (const l of lesson.level0) {
    const text = plainText(l.text);
    for (const w of ownTerms) {
      if (text.includes(w)) {
        add(13, l.line, `<Level0> に、この節が名前を付ける語「${w}」が出ています。概念は本文に書いてください`);
      }
    }
  }
}

if (problems.length === 0) {
  console.log(`check:lessons  ${files.length}節を検査して問題なし`);
  process.exit(0);
}

console.error(`check:lessons  ${problems.length}件の不合格`);
let current = '';
for (const p of problems) {
  if (p.file !== current) {
    current = p.file;
    console.error(`\n  ${current}`);
  }
  console.error(`    検査${p.check} (${p.file}:${p.line})  ${p.message}`);
}
console.error('\n不合格の節は採用しません（10-lesson-and-writing.md 第8章）。');
process.exit(1);
