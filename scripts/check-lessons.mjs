/**
 * 執筆規約の自動検査（20-platform.md 第2.4節）。
 *
 * 全 .mdx を読み、10-lesson-and-writing.md 第8章のチェックリストのうち
 * 機械判定できる18項目を検査する。1つでも落ちたら終了コード1を返す。
 * この検査はビルドの前に走り、失敗したらビルドを止める。
 *
 *   node scripts/check-lessons.mjs
 */
import { existsSync, readdirSync, readFileSync, statSync } from 'node:fs';
import { dirname, join, relative } from 'node:path';
import { fileURLToPath } from 'node:url';
import { glossaryWords, loadGlossary } from './glossary.mjs';
import { parseLesson, plainText } from './parse-lesson.mjs';
import {
  ABSTRACT,
  BANNED,
  BANNED_CHARS,
  EXERCISE_KINDS,
  LESSON_LINK_PATH,
  LIMITS,
  PRACTICE_CHAPTER,
  PRACTICE_EXERCISE_KINDS,
  PRACTICE_SECTION_OPTIONAL,
  PRACTICE_SECTION_ORDER,
  SECTION_OPTIONAL,
  SECTION_ORDER,
  START_CHAPTER,
  START_EXERCISE_KINDS,
  START_LIMITS,
  START_SECTION_ORDER,
  boundaryKinds,
  countChars,
  splitSentences,
} from './lesson-rules.mjs';
import { PYTHON_TOOLS } from './python-tools.mjs';
import { buildSectionRefs } from './section-refs.mjs';

const ROOT = fileURLToPath(new URL('..', import.meta.url));
const LESSONS_DIR = join(ROOT, 'src', 'content', 'lessons');
const SECTION_REFS = buildSectionRefs(LESSONS_DIR);

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
/** 検査18 用。語と「初出の章」 */
const glossary = loadGlossary();
const problems = [];
const seenLessonIds = new Map();
const seenExerciseIds = new Map();
/** 検査16・17 用。節の並び順に、その節が持つ Python のコードを貯める */
const codeOf = [];

for (const file of files) {
  const rel = relative(ROOT, file).replace(/\\/g, '/');
  const rawSource = readFileSync(file, 'utf8');
  /* 改行を LF にそろえてから探す。
     Windows の git は作業ファイルを CRLF で書き出す。```python のあとが \r\n になると
     この正規表現に当たらず、**その節のコードが1行も集まらない。**
     検査16 と18 が黙って何も見ない状態になるので、読む側でそろえる。
     parse-lesson.mjs でも同じ罠を踏んでいる。 */
  const source = rawSource.split('\r\n').join('\n');
  const lesson = parseLesson(source, rel);
  const add = (check, line, message) => problems.push({ file: rel, check, line, message });

  // --- frontmatter（第2.2節）。13項目の前提になるので先に見る ---
  const fm = lesson.data ?? {};
  /* 第0章だけの例外（20-platform.md 第11.5節）。chapter がちょうど 00-start のときだけ。
     ほかの章の検査は1つも緩めない。 */
  const isStart = fm.chapter === START_CHAPTER;
  /* 練習編だけの例外（20-platform.md 第15.1節）。chapter が 04p-practice1 の形のときだけ。
     新しいことを教えないので、「はじめに」の1段落と「組む」課題だけを置く。
     緩めるのは節の形（検査1・2・3・4・8）だけで、文の長さ・禁止表現・道具の台帳などはそのまま見る */
  const isPractice = PRACTICE_CHAPTER.test(String(fm.chapter ?? ''));
  for (const key of ['id', 'chapter', 'title', 'minutes']) {
    if (fm[key] === undefined || fm[key] === '') add('frontmatter', 1, `frontmatter に ${key} がありません`);
  }
  if (fm.id) {
    if (seenLessonIds.has(fm.id)) add('frontmatter', 1, `id が ${seenLessonIds.get(fm.id)} と重複しています: ${fm.id}`);
    else seenLessonIds.set(fm.id, rel);
  }

  /* 検査16・17 用にコードを集める。
     `parts` は**学習者が動かすコード**だけ（本文のコードブロック、部品に渡すコード、模範解答）。
     検査16（先取り）はこちらだけを見る。コードで使われている道具は、読み手が真似して動かす。

     `mentions` はそれに地の文の中の `…` を足したもの。検査17（台帳のずれ）はこちらを見る。
     道具は地の文で紹介されることがあり、「導入した」と言えるのは紹介も含むため。

     分けているのは、地の文には英語のエラーメッセージが引用されるからである。
     `name 'math' is not defined` の not を「and / or / not」と読むわけにいかない。 */
  {
    const parts = [];
    for (const m of source.matchAll(/```python\n([\s\S]*?)```/g)) parts.push(['本文のコード', m[1]]);
    for (const m of source.matchAll(/(?:code|starter)=\{?`([\s\S]*?)`\}?/g)) parts.push(['部品のコード', m[1]]);
    const solDir = join(dirname(file), 'solutions');
    if (fm.id && existsSync(solDir)) {
      for (const name of readdirSync(solDir).filter((x) => x.startsWith(fm.id))) {
        parts.push(['模範解答 ' + name, readFileSync(join(solDir, name), 'utf8')]);
      }
    }
    const mentions = [...parts];
    for (const m of source.matchAll(/`([^`\n]+)`/g)) mentions.push(['本文の中の引用', m[1]]);
    /* 検査18 用の地の文。コードブロック・部品の属性（={…} と ="…"）を落とす。
       英語のエラーメッセージが本文に引用されるので、落とさないと not / and / int を拾う */
    let prose = '';
    {
      // frontmatter を飛ばす。title や terms に語が入るので、地の文として数えない
      const src = lesson.body ?? source;
      let fence = false;
      let depth = 0;
      for (let i = 0; i < src.length; i++) {
        if (!fence && src.startsWith('```', i)) { fence = true; i += 2; continue; }
        if (fence) { if (src.startsWith('```', i)) { fence = false; i += 2; } continue; }
        if (src.startsWith('={', i)) { depth++; i += 1; continue; }
        if (src.startsWith('="', i)) { const e = src.indexOf('"', i + 2); i = e < 0 ? src.length : e; continue; }
        if (depth > 0) {
          if (src[i] === '{') depth++;
          else if (src[i] === '}') depth--;
          continue;
        }
        prose += src[i];
      }
    }
    codeOf.push({ id: fm.id ?? '', rel, chapter: String(fm.chapter ?? ''), parts, mentions, prose });
  }

  // --- 検査1 要素の順序 ---
  // 第0章だけ「よくある間違い」を抜いた並びで見る（第11.7節）。ほかの章は SECTION_ORDER のまま
  // 練習編は「はじめに」「課題」「つながり」の並びで見る（第15.1節）。「課題」は無くてはならない
  const order = isStart ? START_SECTION_ORDER : isPractice ? PRACTICE_SECTION_ORDER : SECTION_ORDER;
  const optional = isPractice ? PRACTICE_SECTION_OPTIONAL : SECTION_OPTIONAL;
  const names = lesson.markers.map((m) => m.name);
  const known = names.filter((n) => order.includes(n));
  for (const n of names) {
    if (order.includes(n)) continue;
    const line = lesson.markers.find((m) => m.name === n).line;
    if (isStart && SECTION_ORDER.includes(n)) add(1, line, `第0章に「${n}」は置きません`);
    else if (isPractice && SECTION_ORDER.includes(n)) add(1, line, `練習編に「${n}」は置きません。「はじめに」と「課題」だけです（第15.1節）`);
    else add(1, line, `知らない要素のマーカーです: ${n}`);
  }
  // 練習編の「はじめに」は1段落（第15.1節）。ここに説明を足し始めると、教えない章でなくなる
  if (isPractice && known.includes('はじめに')) {
    const intro = lesson.bodyParagraphs.filter((p) => p.section === 'はじめに').length;
    if (intro !== 1) {
      add(1, lesson.markers.find((m) => m.name === 'はじめに').line, `練習編の「はじめに」は1段落です。いまは${intro}段落（第15.1節）`);
    }
  }
  for (const required of order) {
    if (optional.has(required)) continue;
    if (!known.includes(required)) add(1, 1, `要素「${required}」のマーカーがありません`);
  }
  const dup = known.filter((n, i) => known.indexOf(n) !== i);
  for (const n of new Set(dup)) add(1, 1, `要素「${n}」のマーカーが2回以上あります`);
  let last = -1;
  for (const n of known) {
    const at = order.indexOf(n);
    if (at < last) add(1, lesson.markers.find((m) => m.name === n).line, `要素の順序が違います: 「${n}」が後ろに来ています`);
    last = Math.max(last, at);
  }

  // --- 検査2 <Run> が「説明」より前にあること ---
  // 第0章は Python を動かさないので <Run> を置かない（第11.5節）
  const runTags = lesson.components.filter((c) => c.name === 'Run');
  const explain = lesson.sections.find((s) => s.name === '説明');
  // 練習編は「やってみる」を置かないので <Run> も置かない（第15.1節）。動かすのは読み手の手である
  if (isPractice) {
    for (const run of runTags) add(2, run.line, '練習編に <Run> は置きません（第15.1節）');
  } else if (runTags.length === 0) {
    if (!isStart) add(2, 1, '<Run> がありません。実行できるコードと実行結果を「やってみる」に置いてください');
  } else if (explain && runTags[0].start > explain.start) {
    add(2, runTags[0].line, '<Run> が「説明」より後ろにあります');
  }
  for (const run of lesson.runs) {
    if (run.out === undefined && run.error === undefined)
      add(2, run.line, '<Run> に out（実行結果）がありません。エラーが題材の節では error を書きます');
  }

  // --- 検査3 <Mistake> が0〜3個 ---
  // 第0章には置かない（第11.7節）。実際のエラーメッセージを見せる要素なので、
  // パソコンの操作を習いに来た人に出す相手がいない
  if (isStart) {
    for (const m of lesson.mistakes) add(3, m.line, '第0章に <Mistake> は置きません');
  } else if (isPractice) {
    // 練習編は「よくある間違い」を置かない（第15.1節）。参照する節へはヒントのリンクで戻す
    for (const m of lesson.mistakes) add(3, m.line, '練習編に <Mistake> は置きません（第15.1節）');
  } else if (lesson.mistakes.length > LIMITS.mistakeMax) {
    add(3, 1, `<Mistake> は${LIMITS.mistakeMax}個までです。いまは${lesson.mistakes.length}個`);
  }
  for (const m of lesson.mistakes) {
    if (!m.id) add(3, m.line, '<Mistake> に id がありません');
    if (!m.error) add(3, m.line, '<Mistake> に error（実際に出るエラーメッセージ）がありません');
    if (!m.code) add(3, m.line, '<Mistake> に code（壊れたコード）がありません');
    if (!m.fix) add(3, m.line, '<Mistake> に原因と直し方の本文がありません');
  }

  // --- 検査4 <Exercise> が0〜7個。型ごとの書き方が揃っていること ---
  // **節ごとの下限は置かない**（第3.8節）。下限があると、足りない節を厚くするようには
  // 働かず、要らない課題を足すように働く。第0.5節は4問に届かせるために用語を選ばせる
  // 問いを3つ足し、Python の第1〜3章は16節すべてがちょうど4問で止まっていた。
  // 総量は章の合計で担保する（検査15）。
  const ex = lesson.exercises;
  if (ex.length > LIMITS.exerciseMax) {
    add(4, 1, `課題は${LIMITS.exerciseMax}問までです。いまは${ex.length}問`);
  }
  const builds = ex.filter((e) => e.kind === 'build');
  // 第0章は「組む」を置かず「打つ」「選ぶ」で数える（第11.5節）
  const directs = ex.filter((e) => e.kind === 'type' || e.kind === 'choose');
  /* --- 検査15 節ごとに「組む」課題があること（第3.8節） ---
     課題の総数に下限は置かない。数は「その節を理解したか確かめるのに要る最小限」で
     決める。下限を置くと、足りない節を厚くするようには働かず、要らないものを足す
     ように働く。この教材で5回確かめた。

     「組む」だけは残す。量の目標ではなく、**自分の頭で書く場が節ごとに消えない
     ための歯止め**である。

     **章の合計ではなく、節ごとに見る。** 合計で見ていたとき、「組む」を置けない節
     （第5.4節 有効範囲）のぶんを別の節が2問持ち、その2問目は1問目に含まれるもの
     だった。合計は「節ごとに消えない」を守らない。

     置けない節は frontmatter の nobuild に理由を書く。**例外を無くすのではなく、
     見えるようにする。** */
  const hands = isStart ? directs : builds;
  const nobuild = typeof fm.nobuild === 'string' ? fm.nobuild.trim() : '';
  const handName = isStart ? '「打つ」「選ぶ」' : '「組む」';
  if (isPractice && hands.length === 0) {
    add(15, 1, '練習編には「組む」課題を1問以上置きます（第15.1節）');
  } else if (hands.length === 0 && !nobuild) {
    add(15, 1, `${handName}課題がありません。置くか、置かない理由を frontmatter の nobuild に書いてください（第3.8節）`);
  }
  if (hands.length > 0 && nobuild) {
    add(15, 1, `nobuild に理由がありますが、${handName}課題が${hands.length}問あります。どちらかが古いままです`);
  }
  // 練習編は課題そのものが中身なので、「組む」を置かない理由は立たない（第15.1節）
  if (isPractice && nobuild) add(15, 1, '練習編に nobuild は置けません。「組む」課題を1問以上置いてください（第15.1節）');
  const allowedKinds = isStart ? START_EXERCISE_KINDS : EXERCISE_KINDS;
  for (const e of ex) {
    if (!e.id) add(4, e.line, '<Exercise> に id がありません');
    else if (seenExerciseIds.has(e.id)) add(4, e.line, `課題の id が重複しています: ${e.id}`);
    else seenExerciseIds.set(e.id, rel);
    // 練習編の課題はすべて「組む」（第15.1節）。直す場所を渡すと、どの道具を使うかを教えてしまう
    if (isPractice && !PRACTICE_EXERCISE_KINDS.includes(e.kind)) add(4, e.line, `練習編の課題はすべて「組む」（kind="build"）です: ${e.kind}（第15.1節）`);
    else if (!allowedKinds.includes(e.kind)) add(4, e.line, `kind は ${allowedKinds.join(' / ')} のどれかです: ${e.kind}`);
    if (e.kind === 'modify' && !e.starter) add(4, e.line, '「変える」課題には starter（動くコード）が要ります');
    if (e.kind === 'build' && e.starter) add(4, e.line, '「組む」課題にコードを渡してはいけません（starter を消してください）');
    if ((e.kind === 'type' || e.kind === 'choose') && e.starter) {
      add(4, e.line, `kind="${e.kind}" にコードを渡してはいけません（starter を消してください）`);
    }
    const tests = Array.isArray(e.tests) ? e.tests : [];
    if (tests.length === 0) add(4, e.line, '<Exercise> に tests がありません');
    if (e.hints.length > 3) add(4, e.line, 'hints は0〜3個です');

    // 貼り付けを使ったかどうかを見るのは「打つ練習」だけ（第11.7節）
    if (e.requirePaste && e.kind !== 'type') {
      add(4, e.line, `requirePaste は kind="type" にだけ付きます: ${e.kind}`);
    }

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

  /* --- 検査19 問題文に答えのコードが書いてないこと ---
     「変える」課題の問題文に、書き足すコードがそのまま書いてあると、読み手は
     それを書き写すだけで通る。何も確かめていない。
     出力を指定して、値や式は読み手に決めさせる形に直す（第3.8節）。

     見方: 模範解答から starter を引いた残り（数・文字列・演算子）が、
     すべて問題文の中のコード（引用符で囲った部分）に出てくるなら、
     書き写せば通るということである。

     名前（print や変数名）は数えない。名前を問題文で指定するのは仕様であって答えではない。
     日本語を含む引用も数えない。**出力を言うのは正しい書き方**だからである。

     この形は2度作った。例題を廃したあとにも「値を変えて実行」が10問残っていた。
     人が読んで見つけるのをやめ、機械に見させる。 */
  {
    const BS = String.fromCharCode(92);
    const LF = String.fromCharCode(10);
    const TICK = String.fromCharCode(96);
    const OPS2 = ['**', '//', '==', '!=', '>=', '<='];
    const OPS1 = '+-*/%<>=';
    const isName = (c) => c !== undefined && (c === '_' || (c >= 'A' && c <= 'Z') || (c >= 'a' && c <= 'z') || c.charCodeAt(0) > 127);
    const isDigit = (c) => c !== undefined && c >= '0' && c <= '9';
    /** 数・文字列・演算子だけを返す。名前と括弧は数えない */
    const meat = (code) => {
      const out = [];
      let i = 0;
      while (i < code.length) {
        const c = code[i];
        if (c === '#') {
          while (i < code.length && code[i] !== LF) i++;
          continue;
        }
        if (c === '"' || c === "'") {
          let j = i + 1;
          while (j < code.length && code[j] !== c) j += code[j] === BS ? 2 : 1;
          out.push(code.slice(i, j + 1));
          i = j + 1;
          continue;
        }
        if (isDigit(c)) {
          let j = i;
          while (j < code.length && (isDigit(code[j]) || code[j] === '.')) j++;
          out.push(code.slice(i, j));
          i = j;
          continue;
        }
        if (isName(c)) {
          let j = i;
          while (j < code.length && (isName(code[j]) || isDigit(code[j]))) j++;
          i = j;
          continue;
        }
        const two = code.slice(i, i + 2);
        if (OPS2.includes(two)) {
          out.push(two);
          i += 2;
          continue;
        }
        if (OPS1.includes(c)) out.push(c);
        i++;
      }
      return out;
    };
    /** a から b を1つずつ取り去った残り */
    const minus = (a, b) => {
      const left = [...b];
      return a.filter((t) => {
        const i = left.indexOf(t);
        if (i < 0) return true;
        left.splice(i, 1);
        return false;
      });
    };
    for (const e of ex) {
      if (e.kind !== 'modify' || !e.starter) continue;
      const solutionPath = join(dirname(file), 'solutions', e.id + '.py');
      if (!existsSync(solutionPath)) continue;
      const solution = readFileSync(solutionPath, 'utf8').split('\r\n').join(LF);
      const added = minus(meat(solution), meat(e.starter));
      if (added.length === 0) continue;
      const quoted = e.prompt.split(TICK).filter((s, i) => i % 2 === 1);
      const asCode = quoted.filter((s) => [...s].every((c) => c.charCodeAt(0) < 128));
      if (minus(added, meat(asCode.join(LF))).length === 0) {
        add(19, e.line, e.id + ' 問題文に答えのコードが書いてあります（書き写せば通ります）。出力を指定して、値や式は読み手に決めさせてください');
      }
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
  // 表の字数も「説明」に数える。**表は説明である**（parse-lesson.mjs の tableChars）
  const explainChars =
    lesson.bodyParagraphs
      .filter((p) => p.section === '説明')
      .reduce((sum, p) => sum + countChars(plainText(p.text)), 0) + (lesson.tableChars?.['説明'] ?? 0);
  // 第0章は「説明より練習を主にする」ので 100〜400字に読み替える（第11.5節）
  const explainMin = isStart ? START_LIMITS.explainMin : LIMITS.explainMin;
  const explainMax = isStart ? START_LIMITS.explainMax : LIMITS.explainMax;
  // 練習編は「説明」を置かない（第15.1節）。本文の上限（800字）はそのまま見る
  if (!isPractice && (explainChars < explainMin || explainChars > explainMax)) {
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

  // --- 検査12.5 選ぶ練習の正解が全部同じ位置でないこと ---
  // 全部1番だと、読まずに1番を選ぶだけで通ってしまう。
  const chooses = ex.filter((e) => e.kind === 'choose');
  if (chooses.length >= 3) {
    const at = chooses.map((e) => (Array.isArray(e.tests) ? e.tests[0]?.correct : undefined));
    if (new Set(at).size === 1) {
      add(4, 1, `選ぶ練習${chooses.length}問の正解が全部${at[0]}番目です。読まずに通せるので、位置を散らしてください`);
    }
  }

  // --- 検査14 用語の言い換えを選ばせる問いが1節に2問以上ないこと ---
  // 第3.7節。この形は選択肢から正しい言い換えを見分けるだけで通るので、何問も置くと
  // 節全体が「読んだ内容を思い出す」試験になり、その節で身につけたはずの操作を
  // 1度も使わないまま終わる。第0.5節が実際にそうなった（5問中3問）。
  // 見るのは問題文の1行目だけ。選択肢の文にこの言い回しが出るのは普通なので数えない。
  const RESTATING = ['の説明として', 'という言葉の説明', 'の意味として', 'とは何ですか', 'を説明したものは'];
  const restating = ex.filter((e) => {
    // 1行目だけを見る。選択肢の文にこの言い回しが出るのは普通なので数えない
    const head = (String(e.prompt ?? '').match(/[^\r\n]+/) ?? [''])[0].trim();
    return RESTATING.some((w) => head.includes(w));
  });
  if (restating.length > 1) {
    for (const e of restating.slice(1)) {
      add(14, e.line, `用語の言い換えを選ばせる問いが${restating.length}問あります。1節に1問までです。手を動かしてから答える問いに替えてください`);
    }
  }

  // --- 検査13 <Level0> に概念の説明が入っていないこと ---
  // 第7.3節が禁じているのは「概念の説明をレベル0に隠すこと」。語そのものは禁じない。
  // 語で見ていた頃は、画面にそのまま出る文字列（「ファイル名拡張子」）の引用も、
  // 「半角/全角 キーで切り替える」という操作の説明も書けなかった。3回とも誤検出で、
  // 本物の違反は1件も見つからなかったので、定義の言い回しを見る形に変えた。
  const DEFINING = ['とは', 'と呼び', 'と呼ぶ', 'という意味', 'のことです', 'を表します', 'を表す'];
  for (const l of lesson.level0) {
    const text = plainText(l.text);
    for (const w of DEFINING) {
      if (text.includes(w)) {
        add(13, l.line, `<Level0> に「${w}」があります。概念の説明は本文に書いてください。補足に書けるのは操作だけです`);
      }
    }
  }

  /* --- 検査20 学習者が読む文章の、節への参照が「第N章M節」の形で、行き先が実在すること
     （20-platform.md 第15.2節）。旧形式（`第7.1節` / `7.1節` / `[第7.1節 …](04-loop/05-while)`）は
     学習者が読む文章では使わない。新形式は本文（MDX）なら scripts/remark-section-links.mjs、
     ヒントや <Mistake> の直し方（採点画面で Inline が出す文章）なら src/lesson/ui/shared.tsx の
     Inline が、自動でリンクにする。ここではその元になる文章だけを見る（本文・課題の問題文・
     <Level0>・<Mistake> の直し方・ヒント）。MDX のコメント（仕様書の節を引くもの）は、
     地の文の抽出（parse-lesson.mjs）がすでに落としているので、ここには出てこない。 */
  {
    const places = [
      ...ex.flatMap((e) => (Array.isArray(e.hints) ? e.hints : []).map((h) => [e.line, `${e.id} のヒント`, String(h)])),
      ...lesson.allParagraphs.map((p) => [1, p.where, p.text]),
    ];
    for (const [line, where, text] of places) {
      if (/\d+\.\d+節/.test(text)) {
        add(20, line, `${where}: 節への参照が旧形式です。「第N章M節」の形に書き直してください: ${text.slice(0, 40)}`);
      }
      for (const m of text.matchAll(/第(\d+)章(\d+)節/g)) {
        const key = `${Number(m[1])}-${Number(m[2])}`;
        if (!SECTION_REFS[key]) {
          add(20, line, `${where}: 「第${Number(m[1])}章${Number(m[2])}節」に行き先の節がありません`);
        }
      }
      for (const m of text.matchAll(/(?<!!)\[([^\]\n]+)\]\(([^)\n]*)\)/g)) {
        if (LESSON_LINK_PATH.test(m[2])) {
          add(20, line, `${where}: 節へのリンクを [ラベル](パス) の旧形式で書いています。「第N章M節」の形に書き直してください（自動でリンクになります）: ${m[0]}`);
        }
      }
    }
  }
}

/* --- 検査16 まだ教えていない道具を使っていないこと ---
   教材でいちばん起こしやすい誤りは、書き手が知っている道具を、教える前の節で使うこと。
   書き手は気づかず、読み手は詰まるが何が足りないのか言葉にできない。
   台帳は scripts/python-tools.mjs（30-python-curriculum.md 第4章の課程表から起こしたもの）。 */
{
  const at = new Map(codeOf.map((l, i) => [l.id, i]));
  for (const [i, lesson] of codeOf.entries()) {
    for (const tool of PYTHON_TOOLS) {
      const introAt = at.get(tool.in);
      /* 導入する節がまだ無い道具は、**これから書く章のもの**である（台帳は課程表でもある）。
         その場合どの節で使っても早すぎるので、飛ばさずに落とす。
         ここで飛ばすと、先に順番を決めて置いた意味がまるごと消える。 */
      if (introAt !== undefined && i >= introAt) continue;
      const hit = lesson.parts.find(([, code]) => tool.re.test(code));
      if (!hit) continue;
      const line = (hit[1].split('\n').find((l) => tool.re.test(l)) ?? '').trim();
      problems.push({
        file: lesson.rel, check: 16, line: 1,
        message: `${tool.name} を使っていますが、教えるのは「${tool.in}」です（${hit[0]}: ${line}）`,
      });
    }
  }

  /* --- 検査17 台帳が実物とずれていないこと ---
     導入する節と書いてあるのに、その節に一度も出てこない道具があれば、台帳か中身の
     どちらかが古い。放っておくと検査16 が意味を失う。

     **まだ書いていない章は責めない。** 台帳は課程表でもあり、書く前から順番を決めて
     置いてある（30-python-curriculum.md 第4章）。その章の節が1つも無ければ、
     まだ書いていないということなので飛ばす。章が書かれ始めたら、そこからは責める。 */
  const writtenChapters = new Set(codeOf.map((l) => l.chapter.split('-')[0]));
  for (const tool of PYTHON_TOOLS) {
    const lesson = codeOf.find((l) => l.id === tool.in);
    if (!lesson) {
      const num = tool.in.split('-')[1] ?? '';
      if (!writtenChapters.has(num)) continue; // その章はまだ書いていない
      problems.push({ file: 'scripts/python-tools.mjs', check: 17, line: 1,
        message: `台帳の「${tool.in}」という節がありません（${tool.name}）` });
      continue;
    }
    if (!lesson.mentions.some(([, code]) => tool.re.test(code))) {
      problems.push({ file: lesson.rel, check: 17, line: 1,
        message: `この節が ${tool.name} を導入することになっていますが、コードに1度も出てきません` });
    }
  }
}

/* --- 検査18 まだ出てきていない語を地の文で使っていないこと ---
   用語集の「初出の章」より前の章で、その語を地の文に使っていたら落とす。
   検査16 が Python の道具を見るのに対し、こちらは**説明のための語**を見る。
   字下げ・型・クリック・デスクトップのような語は、書き手には当たり前すぎて
   説明を飛ばされやすい。読み手は詰まるが、何が分からないのかを言えない。

   見るのは地の文だけである。コードブロック・部品の属性・引用符の中は落とす。
   `name 'math' is not defined` の not を「not」と読むわけにいかないため。

   行き先を書いた先送り（「第3章で扱います」）は通す（第4.2節）。 */
{
  const AHEAD = ['章で扱', '節で扱', '章で学', '節で学', '章で出', '節で出', '章で使', '章で詳しく',
    /* 「次の章では、…for文を扱います」のように間に語が挟まる書き方も先送りである（第4.2節）*/
    '次の章', '次の節', 'あとの章', 'あとの節'];
  const BOUND = '[^A-Za-z0-9_]';
  const ascii = (w) => [...w].every((c) => c.charCodeAt(0) < 128);
  const hit = (text, w) =>
    ascii(w)
      ? new RegExp('(^|' + BOUND + ')' + w.split('.').join('[.]') + '($|' + BOUND + ')').test(text)
      : text.includes(w);
  const chapterAt = new Map([...new Set(codeOf.map((l) => l.chapter))].map((c, i) => [c, i]));
  for (const lesson of codeOf) {
    for (const term of glossary) {
      const home = chapterAt.get(term.chapter);
      if (home === undefined || chapterAt.get(lesson.chapter) >= home) continue;
      const line = lesson.prose.split('\n').find((l) => hit(l, term.word));
      if (!line) continue;
      if (AHEAD.some((a) => line.includes(a))) continue;
      problems.push({
        file: lesson.rel, check: 18, line: 1,
        message: `「${term.word}」を使っていますが、初出は ${term.chapter} です（${line.trim().slice(0, 50)}）`,
      });
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
