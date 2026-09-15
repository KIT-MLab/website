/**
 * 節の .mdx を読んで、検査と期待値生成の両方が使う形にほどく。
 *
 * scripts/check-lessons.mjs（規約の検査）と scripts/build-tests.mjs（期待値の生成）が
 * 同じ読み方をするように、解析はこのファイルにだけ置く。
 *
 * 節の形（10-lesson-and-writing.md 第2章）は、本文に置いた MDX コメントで示す。
 *
 *   {/* 困る例 *\/}
 *   ...
 *   {/* やってみる *\/}
 *   <Run code={`print("Hello")`} out={`Hello`} />
 *   {/* 説明 *\/}
 *   ...
 *
 * 部品の属性は MDX がそのまま JavaScript として評価するので、ここでも同じく評価する。
 * つまりコード中の「\」は JavaScript の規則で解釈される（`\\n` と書くと Python の `\n`）。
 */

const COMPONENTS = ['Run', 'Mistake', 'Exercise', 'Level0', 'Experiment', 'Keys', 'Figure'];

export function lineOf(text, index) {
  let line = 1;
  for (let i = 0; i < index && i < text.length; i++) if (text[i] === '\n') line++;
  return line;
}

/** frontmatter を分ける。値は YAML の一部だけ（文字列・数値・文字列の配列）に対応する。 */
export function splitFrontmatter(source) {
  const m = /^---\r?\n([\s\S]*?)\r?\n---\r?\n?/.exec(source);
  if (!m) return { data: null, body: source, offset: 0 };
  const data = {};
  for (const raw of m[1].split(/\r?\n/)) {
    const line = raw.trim();
    if (!line || line.startsWith('#')) continue;
    const i = line.indexOf(':');
    if (i < 0) continue;
    const key = line.slice(0, i).trim();
    let value = line.slice(i + 1).trim();
    if (value.startsWith('[') && value.endsWith(']')) {
      value = value
        .slice(1, -1)
        .split(',')
        .map((s) => s.trim().replace(/^['"]|['"]$/g, ''))
        .filter((s) => s.length > 0);
    } else if (/^-?\d+(\.\d+)?$/.test(value)) {
      value = Number(value);
    } else {
      value = value.replace(/^['"]|['"]$/g, '');
    }
    data[key] = value;
  }
  return { data, body: source.slice(m[0].length), offset: m[0].length };
}

/** 開きタグの終わりを探す。文字列・テンプレートリテラル・波括弧の入れ子を数える。 */
function scanOpenTag(text, start) {
  let i = start;
  let depth = 0;
  let quote = null;
  while (i < text.length) {
    const c = text[i];
    if (quote) {
      if (c === '\\') {
        i += 2;
        continue;
      }
      if (c === quote) quote = null;
      i++;
      continue;
    }
    if (c === '"' || c === "'" || c === '`') {
      quote = c;
      i++;
      continue;
    }
    if (c === '{') depth++;
    else if (c === '}') depth--;
    else if (c === '>' && depth === 0) {
      const selfClosing = text[i - 1] === '/';
      return { end: i, selfClosing };
    }
    i++;
  }
  return null;
}

/** 属性を切り出す。値は生のソースのまま返す。 */
function parseAttributes(inner) {
  const attrs = {};
  let i = 0;
  while (i < inner.length) {
    while (i < inner.length && /\s/.test(inner[i])) i++;
    const nameStart = i;
    while (i < inner.length && /[A-Za-z0-9_]/.test(inner[i])) i++;
    const name = inner.slice(nameStart, i);
    if (!name) break;
    while (i < inner.length && /\s/.test(inner[i])) i++;
    if (inner[i] !== '=') {
      attrs[name] = { raw: 'true', kind: 'flag' };
      continue;
    }
    i++;
    while (i < inner.length && /\s/.test(inner[i])) i++;
    if (inner[i] === '"' || inner[i] === "'") {
      const q = inner[i];
      const valStart = ++i;
      while (i < inner.length && inner[i] !== q) i++;
      attrs[name] = { raw: inner.slice(valStart, i), kind: 'string' };
      i++;
    } else if (inner[i] === '{') {
      const valStart = ++i;
      let depth = 1;
      let quote = null;
      while (i < inner.length && depth > 0) {
        const c = inner[i];
        if (quote) {
          if (c === '\\') i++;
          else if (c === quote) quote = null;
        } else if (c === '"' || c === "'" || c === '`') quote = c;
        else if (c === '{') depth++;
        else if (c === '}') depth--;
        i++;
      }
      attrs[name] = { raw: inner.slice(valStart, i - 1), kind: 'expression' };
    } else {
      const valStart = i;
      while (i < inner.length && !/\s/.test(inner[i])) i++;
      attrs[name] = { raw: inner.slice(valStart, i), kind: 'bare' };
    }
  }
  return attrs;
}

/** 属性の値を MDX と同じ規則で JavaScript として評価する。 */
export function evalAttribute(attr) {
  if (!attr) return undefined;
  if (attr.kind === 'string') return attr.raw;
  // eslint-disable-next-line no-new-func
  return new Function(`return (${attr.raw});`)();
}

/** 部品（<Run> など）をすべて拾う。 */
function findComponents(body) {
  const found = [];
  const re = new RegExp(`<(${COMPONENTS.join('|')})(?=[\\s/>])`, 'g');
  let m;
  while ((m = re.exec(body)) !== null) {
    const name = m[1];
    const tagStart = m.index;
    const scan = scanOpenTag(body, tagStart + 1 + name.length);
    if (!scan) continue;
    const inner = body.slice(tagStart + 1 + name.length, scan.selfClosing ? scan.end - 1 : scan.end);
    const attrs = parseAttributes(inner);
    let children = '';
    let blockEnd = scan.end + 1;
    if (!scan.selfClosing) {
      const closeTag = `</${name}>`;
      const closeAt = body.indexOf(closeTag, scan.end);
      if (closeAt >= 0) {
        children = body.slice(scan.end + 1, closeAt);
        blockEnd = closeAt + closeTag.length;
      }
    }
    found.push({ name, attrs, children, start: tagStart, end: blockEnd, line: lineOf(body, tagStart) });
    re.lastIndex = blockEnd;
  }
  return found;
}

const MARKER_RE = /^[ \t]*\{\s*\/\*\s*([^*]+?)\s*\*\/\s*\}[ \t]*$/gm;

/** 節の要素マーカーを拾う。 */
function findMarkers(body) {
  const markers = [];
  MARKER_RE.lastIndex = 0;
  let m;
  while ((m = MARKER_RE.exec(body)) !== null) {
    markers.push({ name: m[1].trim(), start: m.index, end: m.index + m[0].length, line: lineOf(body, m.index) });
  }
  return markers;
}

/** 文章だけを残す。コードブロック・表・部品・マーカーを落とす。 */
function proseOf(text) {
  let t = text;
  t = t.replace(/```[\s\S]*?```/g, '\n');
  t = t.replace(/^[ \t]*\|.*\|[ \t]*$/gm, '');
  t = t.replace(/^[ \t]*\{\s*\/\*[\s\S]*?\*\/\s*\}[ \t]*$/gm, '');
  t = t.replace(/^import .*$/gm, '');
  return t;
}

/**
 * 段落に分ける。見出し行は段落として数えない。
 * 箇条書きは1項目を1段落として数える（1段落3文以内の規定を、並びの長さで落とさないため）。
 */
export function paragraphsOf(text) {
  const blocks = proseOf(text)
    .split(/\n[ \t]*\n/)
    .map((p) => p.replace(/^\s*#{1,6}\s.*$/gm, '').trim())
    .filter((p) => p.length > 0);
  const out = [];
  for (const block of blocks) {
    if (/^[ \t]*(?:[-*]|\d+\.)\s/.test(block)) {
      for (const item of block.split(/\n(?=[ \t]*(?:[-*]|\d+\.)\s)/)) {
        const t = (item ?? '').trim();
        if (t.length > 0) out.push(t);
      }
    } else {
      out.push(block);
    }
  }
  return out;
}

/** 記法の記号を落として、読む文字だけにする。 */
export function plainText(text) {
  return text
    .replace(/`([^`]*)`/g, '$1')
    .replace(/\*\*([^*]*)\*\*/g, '$1')
    .replace(/\[([^\]]*)\]\([^)]*\)/g, '$1')
    .replace(/^[ \t]*[-*>]\s+/gm, '')
    .replace(/^\s*#{1,6}\s+/gm, '');
}

/**
 * 1つの節を解析する。
 * 返すもの: frontmatter、要素マーカー、部品、文章。
 */
export function parseLesson(source, file) {
  /* 改行を LF にそろえる。
     Windows の git は既定で作業ファイルを CRLF で書き出す。段落は空行で
     区切って数えているので、CRLF のままだと段落が1つも割れず、節まるごとが1段落と
     数えられて検査7（段落は3文以内）が落ちる。**clone した直後の全22節が落ちる。**
     読む側でそろえれば、どの環境から来たファイルでも同じ結果になる。 */
  source = String(source).replace(/\r\n/g, '\n');
  const { data, body } = splitFrontmatter(source);
  const markers = findMarkers(body);
  const components = findComponents(body);

  const sections = markers.map((mk, i) => {
    const next = markers[i + 1];
    return {
      name: mk.name,
      line: mk.line,
      start: mk.end,
      end: next ? next.start : body.length,
      text: body.slice(mk.end, next ? next.start : body.length),
    };
  });
  const sectionOf = (index) => sections.find((s) => index >= s.start && index < s.end)?.name ?? null;

  const runs = [];
  const mistakes = [];
  const exercises = [];
  const level0 = [];
  const experiments = [];

  for (const c of components) {
    const section = sectionOf(c.start);
    if (c.name === 'Run') {
      runs.push({
        section,
        line: c.line,
        code: evalAttribute(c.attrs.code) ?? '',
        stdin: evalAttribute(c.attrs.stdin) ?? '',
        out: evalAttribute(c.attrs.out),
        rawAttrs: c.attrs,
      });
    } else if (c.name === 'Mistake') {
      mistakes.push({
        section,
        line: c.line,
        id: evalAttribute(c.attrs.id) ?? '',
        code: evalAttribute(c.attrs.code) ?? '',
        stdin: evalAttribute(c.attrs.stdin) ?? '',
        error: evalAttribute(c.attrs.error) ?? '',
        fix: c.children.trim(),
        rawAttrs: c.attrs,
      });
    } else if (c.name === 'Exercise') {
      exercises.push({
        section,
        line: c.line,
        id: evalAttribute(c.attrs.id) ?? '',
        kind: evalAttribute(c.attrs.kind) ?? '',
        starter: evalAttribute(c.attrs.starter),
        stdin: evalAttribute(c.attrs.stdin),
        /* 貼り付けを使ったかどうかを見る（20-platform.md 第11.7節）。kind="type" だけ */
        requirePaste: evalAttribute(c.attrs.requirePaste) === true,
        tests: evalAttribute(c.attrs.tests) ?? [],
        hints: evalAttribute(c.attrs.hints) ?? [],
        mistakes: evalAttribute(c.attrs.mistakes) ?? [],
        forbid: evalAttribute(c.attrs.forbid) ?? [],
        prompt: c.children.trim(),
        rawAttrs: c.attrs,
      });
    } else if (c.name === 'Level0') {
      level0.push({ section, line: c.line, title: evalAttribute(c.attrs.title) ?? '', text: c.children.trim() });
    } else if (c.name === 'Experiment') {
      experiments.push({ section, line: c.line });
    }
  }

  // 本文（字数を数える対象）= 部品の外の文章 ＋ <Mistake> の直し方。
  // <Level0>（レベル別の補助）と「課題」の問題文は本文に数えない。
  const withoutComponents = [];
  let cursor = 0;
  for (const c of components) {
    withoutComponents.push({ text: body.slice(cursor, c.start), start: cursor });
    cursor = c.end;
  }
  withoutComponents.push({ text: body.slice(cursor), start: cursor });

  const bodyParagraphs = [];
  const allParagraphs = [];
  // 1つの塊が要素の境目をまたぐことがある（<Run> の直後から「説明」のマーカーを越えて続く、など）。
  // 塊の頭の位置だけで要素を決めると、その塊が丸ごと手前の要素に数えられる。境目で切り分ける。
  for (const chunk of withoutComponents) {
    const chunkEnd = chunk.start + chunk.text.length;
    const cuts = [chunk.start, chunkEnd];
    for (const sec of sections) {
      for (const at of [sec.start, sec.end]) {
        if (at > chunk.start && at < chunkEnd) cuts.push(at);
      }
    }
    cuts.sort((a, b) => a - b);
    for (let i = 0; i < cuts.length - 1; i++) {
      const [from, to] = [cuts[i], cuts[i + 1]];
      if (to <= from) continue;
      const section = sectionOf(from);
      for (const p of paragraphsOf(chunk.text.slice(from - chunk.start, to - chunk.start))) {
        const entry = { section, text: p, where: section ?? '（マーカーの外）' };
        allParagraphs.push(entry);
        if (section !== '課題') bodyParagraphs.push(entry);
      }
    }
  }
  /* 表の字数を、要素ごとに数えておく（20-platform.md 第2.4節 検査8）。
     段落としては数えない（1行3文以内のような規定は表の行に当てはまらない）が、
     **字数には数える。表は説明である。**
     数えないままだと、文章を表に置き換えるほど「説明」が短くなり、下限に
     押し戻されて要らない一文を足すことになる。字数の下限が水増しを生むのは
     これで3度目である（本文の下限・課題の数の下限・ここ）。 */
  const tableChars = {};
  for (const chunk of withoutComponents) {
    const chunkEnd = chunk.start + chunk.text.length;
    const cuts = [chunk.start, chunkEnd];
    for (const sec of sections) {
      for (const at of [sec.start, sec.end]) {
        if (at > chunk.start && at < chunkEnd) cuts.push(at);
      }
    }
    cuts.sort((a, b) => a - b);
    for (let i = 0; i < cuts.length - 1; i++) {
      const [from, to] = [cuts[i], cuts[i + 1]];
      if (to <= from) continue;
      const section = sectionOf(from) ?? '（マーカーの外）';
      const text = chunk.text.slice(from - chunk.start, to - chunk.start);
      let n = 0;
      for (const row of text.split('\n')) {
        const line = row.trim();
        if (!line.startsWith('|') || !line.endsWith('|')) continue;
        if (/^\|[\s:|-]*\|$/.test(line)) continue; // 区切りの行
        // 字数の数え方は lesson-rules.mjs の countChars と同じ（空白を数えない）。
        // ここで import すると循環するので、1行だけ写している
        n += plainText(line.split('|').join(' ')).replace(/\s+/g, '').length;
      }
      tableChars[section] = (tableChars[section] ?? 0) + n;
    }
  }

  /* 図（<Figure>）の中の説明文も、表と同じ理由で字数に数える。
     部品の属性は地の文から外されるので、数えないと図を置くほど「説明」が短くなる。
     かな漢字だけを数えるのは、属性の名前やコードを含めないためである。 */
  for (const c of components) {
    if (c.name !== 'Figure') continue;
    const section = sectionOf(c.start) ?? '（マーカーの外）';
    const raw = body.slice(c.start, c.end);
    const jp = raw.match(/[ぁ-んァ-ヴー一-龥]/g);
    tableChars[section] = (tableChars[section] ?? 0) + (jp ? jp.length : 0);
  }

  for (const m of mistakes) {
    for (const p of paragraphsOf(m.fix)) {
      const entry = { section: 'よくある間違い', text: p, where: `<Mistake id="${m.id}">` };
      allParagraphs.push(entry);
      bodyParagraphs.push(entry);
    }
  }
  for (const e of exercises) {
    for (const p of paragraphsOf(e.prompt)) {
      allParagraphs.push({ section: '課題', text: p, where: `<Exercise id="${e.id}">` });
    }
  }
  for (const l of level0) {
    for (const p of paragraphsOf(l.text)) {
      allParagraphs.push({ section: l.section, text: p, where: `<Level0 title="${l.title}">` });
    }
  }

  return {
    file,
    data,
    body,
    markers,
    sections,
    components,
    runs,
    mistakes,
    exercises,
    level0,
    experiments,
    bodyParagraphs,
    allParagraphs,
    tableChars,
  };
}
