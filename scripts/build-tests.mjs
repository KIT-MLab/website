/**
 * 課題の期待値をビルド時に作る（20-platform.md 第4.2節）。
 *
 * 模範解答をブラウザに配らないための仕組み。
 *   - 模範解答は src/content/lessons/<章>/solutions/<課題のid>.py
 *   - このスクリプトが模範解答を Pyodide で走らせ、tests の expect を埋める
 *   - 生成物 src/generated/lesson-data.json だけがブラウザに渡る
 *
 * ついでに <Run> の out（併記した実行結果）が実際の出力と合っているかも確かめる。
 * 本文に嘘の実行結果が載ったまま公開されるのを止めるため。
 *
 * 模範解答をすべてここで読むので、使い回しの照合もここでやる
 * （10-lesson-and-writing.md 第3.5節「組む」は書き写しにしない）。
 *
 *   node scripts/build-tests.mjs
 */
import { mkdirSync, readdirSync, readFileSync, statSync, writeFileSync } from 'node:fs';
import { dirname, join, relative } from 'node:path';
import { fileURLToPath } from 'node:url';
import { parseLesson } from './parse-lesson.mjs';
import { execPython } from './pyodide-node.mjs';
import { buildSectionRefs, sectionHref, sectionLabel } from './section-refs.mjs';
import { loadGlossary } from './glossary.mjs';
import { PYTHON_TOOLS } from './python-tools.mjs';

const ROOT = fileURLToPath(new URL('..', import.meta.url));
const LESSONS_DIR = join(ROOT, 'src', 'content', 'lessons');
const OUT_DIR = join(ROOT, 'src', 'generated');
const OUT_FILE = join(OUT_DIR, 'lesson-data.json');
/* 「第N章M節」の行き先（20-platform.md 第15.2節）。採点画面の Inline（src/lesson/ui/shared.tsx）が読む。
   本文（MDX）側の自動リンクは scripts/remark-section-links.mjs が同じ元を自分で読んで作る */
const SECTION_REFS_FILE = join(OUT_DIR, 'section-refs.json');
/* 用語の検索の引く表（20-platform.md 第18章）。src/components/lesson/TermPanel.astro と
   src/lesson/term-search.ts が読む。ページの中では表を組み立てない（第18.3節）。 */
const SEARCH_INDEX_FILE = join(OUT_DIR, 'search-index.json');

function listMdx(dir) {
  const out = [];
  for (const name of readdirSync(dir)) {
    const full = join(dir, name);
    if (statSync(full).isDirectory()) out.push(...listMdx(full));
    else if (name.endsWith('.mdx')) out.push(full);
  }
  return out;
}

const failures = [];
function fail(where, message) {
  failures.push(`${where}  ${message}`);
}

/** 画面に出す名前。落ちたときのメッセージを読む人向け（10-lesson-and-writing.md 第3章） */
const STAGE = { trace: '例題', modify: '練習問題', build: '演習問題', type: '練習問題', choose: '確認問題' };

/**
 * 模範解答の .py が要る型。
 * type（打つ練習）と choose（選ぶ練習）は Python を動かさないので置かない（第11.4節）。
 * 期待値は書き手が書いた expect / correct をそのまま載せる。
 */
const NEEDS_SOLUTION = new Set(['trace', 'modify', 'build']);

/**
 * 空白と改行を落とす。字下げの深さ・行内の空白の数・空行・改行の位置の違いを無視する。
 * 文字列の中の空白まで落ちるので、`"a b"` と `"ab"` は同じと見なす。
 * 写したかどうかを見るための照合なので、そこまで似ていれば拾ってよい。
 */
function squash(code) {
  return String(code ?? '').replace(/\s+/g, '');
}

/** 第3.5節の照合。空白と改行の違いを除いて同じか。 */
function sameCode(a, b) {
  const x = squash(a);
  return x.length > 0 && x === squash(b);
}

/** ``` で囲んだコードを拾う。例題の「打つコード」は問題文の中にある。 */
function fencedCode(text) {
  const out = [];
  const re = /```[^\n]*\n([\s\S]*?)```/g;
  let m;
  while ((m = re.exec(text)) !== null) out.push(m[1]);
  return out;
}

/** 実行が失敗していたら、そのまま止める。模範解答が動かないまま出荷しないため。 */
function describeError(result) {
  const e = result.error;
  if (!e) return null;
  if (e.kind === 'timeout') return '5秒で止まりました';
  if (e.kind === 'input-empty') return '入力欄が足りません';
  if (e.kind === 'no-function') return `関数 ${e.fn} が定義されていません`;
  return `${e.display}${e.line ? `（${e.line}行目）` : ''}`;
}

const files = listMdx(LESSONS_DIR).sort();
const lessons = {};
/* 教材の順（course order）で節を集める。検索の索引（第18章）が使う。
   files は既にソート済みなので、この配列に積む順がそのまま教材の順になる
   （scripts/check-lessons.mjs の codeOf と同じ前提）。 */
const courseSections = [];
const chapterCounts = new Map();

for (const file of files) {
  const rel = relative(ROOT, file).replace(/\\/g, '/');
  const lesson = parseLesson(readFileSync(file, 'utf8'), rel);
  const lessonId = lesson.data?.id;
  if (!lessonId) {
    fail(rel, 'frontmatter に id がありません');
    continue;
  }

  {
    const chapter = String(lesson.data.chapter ?? '');
    const indexInChapter = chapterCounts.get(chapter) ?? 0;
    chapterCounts.set(chapter, indexInChapter + 1);
    const entryId = rel.replace(/^src\/content\/lessons\//, '').replace(/\.mdx$/, '');
    courseSections.push({
      order: courseSections.length,
      lessonId,
      chapter,
      href: sectionHref(entryId),
      label: sectionLabel(chapter, indexInChapter),
      title: String(lesson.data.title ?? ''),
      terms: Array.isArray(lesson.data.terms) ? lesson.data.terms : [],
      // 「やってみる」に置かれた <Run> だけ（第18.3節の「使い方の例」の元）。書き出しはしない
      tryRuns: lesson.runs.filter((r) => r.section === 'やってみる'),
    });
  }

  // <Run> の out の照合
  for (const run of lesson.runs) {
    if (run.out === undefined && run.error === undefined) continue;
    if (run.out !== undefined && run.error !== undefined) {
      fail(`${rel}:${run.line}`, '<Run> に out と error の両方があります。どちらか一方です');
      continue;
    }
    const result = await execPython({ code: run.code, stdin: run.stdin });
    /* エラーそのものが題材の節がある（第6.1節 エラーメッセージの読み方）。
       そこでは <Run> が失敗するのが正しい。読み手は ▶ を押して、説明が指している
       メッセージを自分の目で見る。<Mistake> に逃がすと既定で閉じているので、
       **その節の題材が最初から見えない。** */
    if (run.error !== undefined) {
      const e = result.error;
      if (!e || e.kind !== 'python') {
        fail(`${rel}:${run.line}`, '<Run> に error がありますが、このコードはエラーになりません');
        continue;
      }
      const head = run.error.split('\n').map((l) => l.trim()).filter((l) => l.length > 0).pop() ?? '';
      if (!e.display.startsWith(head)) {
        fail(
          `${rel}:${run.line}`,
          `<Run> の error が実際と違います。error=${JSON.stringify(head)} 実際=${JSON.stringify(e.display)}`,
        );
      }
      continue;
    }
    const err = describeError(result);
    if (err) {
      fail(`${rel}:${run.line}`, `<Run> のコードが動きません: ${err}`);
      continue;
    }
    if (normalize(result.stdout) !== normalize(run.out)) {
      fail(
        `${rel}:${run.line}`,
        `<Run> の out が実行結果と違います。out=${JSON.stringify(run.out)} 実際=${JSON.stringify(result.stdout)}`,
      );
    }
  }

  // <Mistake> の error の照合。採点の応答（第4.3節）がこの文字列に前方一致するかで
  // 決まるので、本当にそのエラーが出るかをここで確かめる。
  for (const m of lesson.mistakes) {
    const result = await execPython({ code: m.code, stdin: m.stdin });
    const e = result.error;
    if (!e || e.kind !== 'python') {
      fail(`${rel}:${m.line}`, `<Mistake id="${m.id}"> のコードはエラーになりません`);
      continue;
    }
    const lines = m.error.split('\n').map((l) => l.trim()).filter((l) => l.length > 0);
    const head = lines[lines.length - 1] ?? '';
    if (!e.display.startsWith(head)) {
      fail(
        `${rel}:${m.line}`,
        `<Mistake id="${m.id}"> の error が実際と違います。error=${JSON.stringify(head)} 実際=${JSON.stringify(e.display)}`,
      );
    }
  }

  const exercises = {};
  const solutions = [];
  for (const e of lesson.exercises) {
    let solution = null;
    if (NEEDS_SOLUTION.has(e.kind)) {
      const solutionPath = join(dirname(file), 'solutions', `${e.id}.py`);
      try {
        solution = readFileSync(solutionPath, 'utf8');
      } catch {
        fail(`${rel}:${e.line}`, `模範解答がありません: ${relative(ROOT, solutionPath).replace(/\\/g, '/')}`);
        continue;
      }
      solutions.push({ id: e.id, kind: e.kind, line: e.line, code: solution });

      for (const forbidden of e.forbid) {
        if (solution.includes(forbidden)) {
          fail(`${rel}:${e.line}`, `模範解答が、問題文で禁じた書き方「${forbidden}」を使っています`);
        }
      }
    }

    const tests = [];
    for (let i = 0; i < e.tests.length; i++) {
      const test = e.tests[i];

      // 第0章の判定（第11.4節）。模範解答を走らせず、書き手の書いた値をそのまま載せる
      if (test.kind === 'text') {
        if (typeof test.expect !== 'string' || test.expect.trim() === '') {
          fail(`${rel}:${e.line}`, `tests[${i}] の expect に、打つ見本の文字列を書いてください`);
          continue;
        }
        tests.push({ kind: 'text', expect: test.expect });
        continue;
      }
      if (test.kind === 'choice') {
        if (!Number.isInteger(test.correct) || test.correct < 1) {
          fail(`${rel}:${e.line}`, `tests[${i}] の correct は1から数えた選択肢の番号です: ${test.correct}`);
          continue;
        }
        tests.push({ kind: 'choice', correct: test.correct });
        continue;
      }
      if (!solution) {
        fail(`${rel}:${e.line}`, `kind="${e.kind}" の tests[${i}] は text か choice です: ${test.kind}`);
        continue;
      }
      if (test.expect !== undefined) {
        fail(`${rel}:${e.line}`, `tests[${i}] に expect が書かれています。expect はビルド時に模範解答から作ります`);
        continue;
      }
      if (test.kind === 'stdout') {
        const result = await execPython({ code: solution, stdin: test.stdin });
        const err = describeError(result);
        if (err) {
          fail(`${rel}:${e.line}`, `模範解答が tests[${i}] で動きません: ${err}`);
          continue;
        }
        tests.push({ kind: 'stdout', stdin: test.stdin, expect: result.stdout });
      } else if (test.kind === 'call') {
        const result = await execPython({
          code: solution,
          stdin: test.stdin,
          call: { fn: test.fn, args: test.args ?? [] },
        });
        const err = describeError(result);
        if (err) {
          fail(`${rel}:${e.line}`, `模範解答が tests[${i}] で動きません: ${err}`);
          continue;
        }
        tests.push({ kind: 'call', fn: test.fn, args: test.args ?? [], expect: result.value });
      } else {
        fail(`${rel}:${e.line}`, `tests[${i}] の kind は stdout か call です: ${test.kind}`);
      }
    }

    /* starter のまま通ってしまう「変える」課題を落とす（10-lesson-and-writing.md 第3.9節）。
       問題文を「出力を指定して値を決めさせる」形に直すとき、starter の初期値が
       すでにその出力だと、読み手は何もせずに通る。**目で見ても気づきにくい。**
       模範解答はここで走らせているので、starter も走らせて確かめる。 */
    if (e.kind === 'modify' && e.starter && tests.length > 0 && tests.every((t) => t.kind === 'stdout')) {
      let asIs = true;
      for (const t of tests) {
        const r = await execPython({ code: e.starter, stdin: t.stdin });
        if (describeError(r) || r.stdout !== t.expect) {
          asIs = false;
          break;
        }
      }
      if (asIs) {
        fail(`${rel}:${e.line}`, `${e.id} は starter のままで通ります。読み手が何もしなくても正解になる課題です（第3.9節）`);
      }
    }

    exercises[e.id] = {
      id: e.id,
      kind: e.kind,
      tests,
      hints: e.hints,
      mistakes: e.mistakes,
      forbid: e.forbid,
      /* 付いている課題にだけ載せる。ほかの節の生成物は1文字も変わらない（第11.7節） */
      ...(e.requirePaste ? { requirePaste: true } : {}),
    };
  }

  // 模範解答の使い回しの照合（10-lesson-and-writing.md 第3.5節）。
  // 「変える」の答えと「組む」の答えが1文字も違わない事故が起きたので、人の目に頼らない。
  for (let i = 0; i < solutions.length; i++) {
    for (let j = i + 1; j < solutions.length; j++) {
      const [a, b] = [solutions[i], solutions[j]];
      if (!sameCode(a.code, b.code)) continue;
      fail(
        `${rel}:${b.line}`,
        `${STAGE[b.kind] ?? b.kind} ${b.id} の模範解答が、${STAGE[a.kind] ?? a.kind} ${a.id} の模範解答と同じです（空白と改行の違いを除いて）`,
      );
    }
  }

  // 「組む」は書き写しにしない（第3.5節）。同じ節の <Run> や例題の「打つコード」を
  // そのまま写して通る形になっていないか。
  const traceCode = lesson.exercises
    .filter((e) => e.kind === 'trace')
    .flatMap((e) => fencedCode(e.prompt).map((code) => ({ id: e.id, code })));
  for (const b of solutions.filter((s) => s.kind === 'build')) {
    for (const run of lesson.runs) {
      if (sameCode(b.code, run.code)) {
        fail(`${rel}:${b.line}`, `演習問題 ${b.id} の模範解答が、${run.line}行目の <Run> のコードと同じです`);
      }
    }
    for (const t of traceCode) {
      if (sameCode(b.code, t.code)) {
        fail(`${rel}:${b.line}`, `演習問題 ${b.id} の模範解答が、例題 ${t.id} の打つコードと同じです`);
      }
    }
  }

  /* 文字が違っても、<Run> を貼って通るなら書き写しである。第5.3節の課題が
     <Run> と関数名・引数・既定値まで同じで、後ろの print 2行のぶんだけ上の照合をすり抜けた。 */
  for (const e of lesson.exercises.filter((x) => x.kind === 'build')) {
    const tests = exercises[e.id]?.tests ?? [];
    if (tests.length === 0) continue;
    for (const run of lesson.runs) {
      if (run.error !== undefined) continue;
      let passes = true;
      for (const t of tests) {
        const r = await execPython(
          t.kind === 'call'
            ? { code: run.code, stdin: t.stdin, call: { fn: t.fn, args: t.args } }
            : { code: run.code, stdin: t.stdin },
        );
        const ok = !describeError(r) &&
          (t.kind === 'call' ? JSON.stringify(r.value) === JSON.stringify(t.expect) : normalize(r.stdout) === normalize(t.expect));
        if (!ok) {
          passes = false;
          break;
        }
      }
      if (passes) {
        fail(`${rel}:${run.line}`, `演習問題 ${e.id} が、この <Run> のコードをそのまま出すと通ります（第3.5節）`);
      }
    }
  }

  lessons[lessonId] = {
    lessonId,
    title: lesson.data.title ?? '',
    exerciseIds: lesson.exercises.map((e) => e.id),
    exercises,
    mistakes: lesson.mistakes.map((m) => ({ id: m.id, error: m.error, fix: m.fix })),
  };
}

/** 出力の比較の緩さ（第4.4節）: 行末の空白と末尾の改行を無視する。 */
function normalize(text) {
  return String(text ?? '')
    .split('\n')
    .map((line) => line.replace(/[ \t]+$/, ''))
    .join('\n')
    .replace(/\n+$/, '');
}

if (failures.length > 0) {
  console.error(`build:tests  ${failures.length}件の問題`);
  for (const f of failures) console.error(`  ${f}`);
  process.exit(1);
}

/* --- 用語の検索の引く表を作る（20-platform.md 第18章） -------------------------------
   ページの中では組み立てず、ビルドのときにここで1つだけ作る（第18.3節）。
   NFKC・小文字にそろえた比較は、読む側（TermPanel / term-search.ts）でも同じ規則でやる。 */
function normKey(s) {
  return String(s ?? '').normalize('NFKC').toLowerCase();
}

const searchEntries = [];
/** 行き先の節が無い、または使い方の例が無い項目。ビルドは止めない（人が読んで判断する） */
const searchNotes = [];

{
  const glossary = loadGlossary();
  const glossarySet = new Set(glossary.map((t) => normKey(t.word)));
  const bySectionId = new Map(courseSections.map((s) => [s.lessonId, s]));

  // その章でいちばん先の節（「terms に持つ節が無ければその章の最初の節」の受け皿。第18.3節）
  const firstOfChapter = new Map();
  for (const s of courseSections) {
    if (!firstOfChapter.has(s.chapter)) firstOfChapter.set(s.chapter, s);
  }

  const exampleFrom = (runs) => {
    const r = runs?.[0];
    return r ? { code: r.code, out: r.out ?? '' } : null;
  };

  // --- 用語（design/spec/glossary.md） ---
  for (const term of glossary) {
    const home = courseSections.find((s) => s.terms.includes(term.word)) ?? firstOfChapter.get(term.chapter) ?? null;
    if (!home) {
      searchNotes.push(`用語「${term.word}」: 行き先の節がありません（初出の章 ${term.chapter} がまだ無い）`);
      continue;
    }
    const example = exampleFrom(home.tryRuns);
    if (!example) searchNotes.push(`用語「${term.word}」: ${home.href} に「やってみる」の <Run> が無く、使い方の例を作れません`);
    searchEntries.push({
      kind: '用語',
      word: term.word,
      english: term.english ?? '',
      aliases: [],
      definition: term.definition,
      section: { href: home.href, label: home.label, title: home.title },
      order: home.order,
      example,
    });
  }

  /* --- 書き方（scripts/python-tools.mjs） ---
     用語集に同じものがある書き方（台帳の term、または名前が用語集の語と同じもの）は、札を分けずに
     用語の札の読み替えにする。`input()` で引いても用語「input」が出るように。用語の札の例は、
     その書き方に当たる <Run> を先に使う（節の最初の <Run> より、その書き方が確かに入っている）。
     用語集に無いものだけを「書き方」の札にし、定義の文は台帳の desc を使う。
     term も desc も無い書き方はここで止める（定義の無い札を出さない） */
  const termEntry = new Map(searchEntries.map((e) => [normKey(e.word), e]));
  for (const tool of PYTHON_TOOLS) {
    if (/^python-99-/.test(tool.in)) continue; // まだどの節でも教えていない書き方（検査16 の先送り分）
    const home = bySectionId.get(tool.in);
    if (!home) continue; // まだ書いていない章
    const matched = home.tryRuns.find((r) => tool.re.test(r.code));
    const matchedExample = matched ? { code: matched.code, out: matched.out ?? '' } : null;
    const terms = tool.term ? [tool.term].flat() : glossarySet.has(normKey(tool.name)) ? [tool.name] : [];
    if (terms.length > 0) {
      for (const word of terms) {
        const entry = termEntry.get(normKey(word));
        if (!entry) {
          console.error(`build:tests  台帳の「${tool.name}」の term「${word}」が用語集にありません（scripts/python-tools.mjs）`);
          process.exit(1);
        }
        if (normKey(word) !== normKey(tool.name)) entry.aliases.push(tool.name);
        if (matchedExample) entry.example = matchedExample;
      }
      continue;
    }
    if (!tool.desc) {
      console.error(`build:tests  台帳の「${tool.name}」に term も desc もありません。検索の札に出す定義が無いので止めます（scripts/python-tools.mjs）`);
      process.exit(1);
    }
    /* 例は、その書き方が入っている <Run> だけ。無ければ例を出さない（`==` の札に、`==` の無いコードを見せない） */
    const example = matchedExample;
    if (!example) searchNotes.push(`書き方「${tool.name}」: ${home.href} の「やってみる」の <Run> にこの書き方が無く、使い方の例を出しません`);
    searchEntries.push({
      kind: '書き方',
      word: tool.name,
      english: '',
      aliases: [tool.name],
      definition: tool.desc,
      section: { href: home.href, label: home.label, title: home.title },
      order: home.order,
      example,
    });
  }

  // --- 節 ---
  for (const s of courseSections) {
    searchEntries.push({
      kind: '節',
      word: s.title,
      english: '',
      aliases: [],
      definition: '',
      section: { href: s.href, label: s.label, title: s.title },
      order: s.order,
      example: null,
      terms: s.terms,
    });
  }
}

// 開いた札・候補の絞り込みが持ち回る鍵（TermPanel / term-search.ts）。索引の中の位置でよい
searchEntries.forEach((e, i) => {
  e.id = i;
});

mkdirSync(OUT_DIR, { recursive: true });
writeFileSync(OUT_FILE, `${JSON.stringify({ lessons }, null, 2)}\n`, 'utf8');
writeFileSync(SECTION_REFS_FILE, `${JSON.stringify(buildSectionRefs(LESSONS_DIR), null, 2)}\n`, 'utf8');
writeFileSync(SEARCH_INDEX_FILE, `${JSON.stringify({ entries: searchEntries }, null, 2)}\n`, 'utf8');
if (searchNotes.length > 0) {
  console.log(`build:tests  用語の検索の索引: ${searchNotes.length}件、確かめてください`);
  for (const n of searchNotes) console.log(`  ${n}`);
}
const count = Object.values(lessons).reduce((n, l) => n + l.exerciseIds.length, 0);
console.log(`build:tests  ${Object.keys(lessons).length}節 / ${count}問の期待値を作りました -> src/generated/lesson-data.json`);
process.exit(0);
