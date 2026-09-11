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
 *   node scripts/build-tests.mjs
 */
import { mkdirSync, readdirSync, readFileSync, statSync, writeFileSync } from 'node:fs';
import { dirname, join, relative } from 'node:path';
import { fileURLToPath } from 'node:url';
import { parseLesson } from './parse-lesson.mjs';
import { execPython } from './pyodide-node.mjs';

const ROOT = fileURLToPath(new URL('..', import.meta.url));
const LESSONS_DIR = join(ROOT, 'src', 'content', 'lessons');
const OUT_DIR = join(ROOT, 'src', 'generated');
const OUT_FILE = join(OUT_DIR, 'lesson-data.json');

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

for (const file of files) {
  const rel = relative(ROOT, file).replace(/\\/g, '/');
  const lesson = parseLesson(readFileSync(file, 'utf8'), rel);
  const lessonId = lesson.data?.id;
  if (!lessonId) {
    fail(rel, 'frontmatter に id がありません');
    continue;
  }

  // <Run> の out の照合
  for (const run of lesson.runs) {
    if (run.out === undefined) continue;
    const result = await execPython({ code: run.code, stdin: run.stdin });
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
  for (const e of lesson.exercises) {
    const solutionPath = join(dirname(file), 'solutions', `${e.id}.py`);
    let solution;
    try {
      solution = readFileSync(solutionPath, 'utf8');
    } catch {
      fail(`${rel}:${e.line}`, `模範解答がありません: ${relative(ROOT, solutionPath).replace(/\\/g, '/')}`);
      continue;
    }

    for (const forbidden of e.forbid) {
      if (solution.includes(forbidden)) {
        fail(`${rel}:${e.line}`, `模範解答が、問題文で禁じた書き方「${forbidden}」を使っています`);
      }
    }

    const tests = [];
    for (let i = 0; i < e.tests.length; i++) {
      const test = e.tests[i];
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

    exercises[e.id] = {
      id: e.id,
      kind: e.kind,
      tests,
      hints: e.hints,
      mistakes: e.mistakes,
      forbid: e.forbid,
    };
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

mkdirSync(OUT_DIR, { recursive: true });
writeFileSync(OUT_FILE, `${JSON.stringify({ lessons }, null, 2)}\n`, 'utf8');
const count = Object.values(lessons).reduce((n, l) => n + l.exerciseIds.length, 0);
console.log(`build:tests  ${Object.keys(lessons).length}節 / ${count}問の期待値を作りました -> src/generated/lesson-data.json`);
process.exit(0);
