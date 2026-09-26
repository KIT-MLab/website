/**
 * 組む問題の問題文の形（20-platform.md 第23.2節）の検査。
 *
 * scripts/check-lessons.mjs（検査22）と scripts/check-weekly.mjs が同じ規則で見るように、
 * 規則はこのファイルにだけ置く。
 *
 *   <Exercise kind="build" ...>
 *   問題文（何をするか・決まり）
 *
 *   <Input>
 *   入力欄に何が何行で来るか。入力が無い問題は「なし」
 *   </Input>
 *
 *   <Output>
 *   何を何行で、どの形で表示するか
 *   </Output>
 *   </Exercise>
 *
 * 入力例と出力例は書かない。画面が判定のケース1から作る（第23.2節）。
 */
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { exampleLeak, plainText } from './parse-lesson.mjs';

const GENERATED = fileURLToPath(new URL('../src/generated/lesson-data.json', import.meta.url));

/**
 * 生成済みの lesson-data.json から、課題の id → 判定のケース1の期待値 を引く関数を返す。
 * 検査は build:tests より先に走るので、clone した直後はこのファイルが無い。
 * 無ければ何も引けない（available が false）。そのときは build:tests が同じことを見る。
 */
export function loadGeneratedExpect() {
  const map = new Map();
  let available = false;
  try {
    const g = JSON.parse(readFileSync(GENERATED, 'utf8'));
    available = true;
    for (const group of [g.lessons ?? {}, g.weekly ?? {}, g.practice ?? {}]) {
      for (const set of Object.values(group)) {
        for (const [id, ex] of Object.entries(set.exercises ?? {})) {
          const first = ex.tests?.[0];
          if (first && 'expect' in first) map.set(id, first.expect);
        }
      }
    }
  } catch {
    /* 無い・読めないときは引けないだけ */
  }
  const expectOf = (id) => map.get(id);
  expectOf.available = available;
  return expectOf;
}

/** 読む文字だけにして、前後の空白と句点を落とす */
function plain(text) {
  return plainText(String(text ?? '')).trim().replace(/。$/, '');
}

/**
 * 1つの課題を見て、落とす理由を並べて返す。古い形（<Input>/<Output> なし）は何も見ない。
 * @param {object} e parse-lesson.mjs の exercises の1件
 * @param {unknown} expect 判定のケース1の期待値（引けなければ undefined）
 * @returns {string[]}
 */
export function checkProblemForm(e, expect) {
  if (e.form !== 'new') return [];
  if (e.kind !== 'build') return ['<Input> と <Output> は組む問題（kind="build"）にだけ書きます'];

  const out = [];
  if (e.inputCount !== 1) out.push(`<Input>（入力）は1つだけ書きます。いまは${e.inputCount}個`);
  if (e.outputCount !== 1) out.push(`<Output>（出力）は1つだけ書きます。いまは${e.outputCount}個`);
  if (plain(e.prompt) === '') out.push('問題文がありません。<Input> の前に、何をするかと決まりを書きます');
  if (e.inputCount > 0 && plain(e.input) === '') out.push('<Input>（入力）が空です。入力が無い問題は「なし」と書きます');
  if (e.outputCount > 0 && plain(e.output) === '') out.push('<Output>（出力）が空です。何を何行で、どの形で表示するかを書きます');

  // 入力が「なし」かどうかと、判定に入力欄の値があるかどうかが食い違っていないか
  const tests = Array.isArray(e.tests) ? e.tests : [];
  const usesStdin = tests.some((t) => typeof t?.stdin === 'string' && t.stdin !== '');
  const onlyStdout = tests.length > 0 && tests.every((t) => t?.kind === 'stdout');
  const none = plain(e.input) === 'なし';
  if (e.inputCount > 0 && usesStdin && none) {
    out.push('判定に入力欄の値があるのに、入力が「なし」になっています');
  }
  if (e.inputCount > 0 && onlyStdout && !usesStdin && !none) {
    out.push('判定に入力欄の値が無いので、入力は「なし」と書きます');
  }

  // 出力例を問題文に手で書いていないか（出力例は判定のケース1から画面が作る）
  if (expect !== undefined) {
    const leak = exampleLeak(e.prompt, expect);
    if (leak) out.push(`問題文に出力例の「${leak}」がそのまま書いてあります。出力例は判定のケース1から自動で出すので、問題文からは消してください`);
  }
  return out;
}
