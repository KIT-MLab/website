/**
 * 「第N章M節」を節の行き先に解決する（20-platform.md 第15.2節）。
 *
 * 章フォルダは `^\d\d-` で始まるものだけを数える（練習編 `04p-practice1` は除く。
 * src/lesson/chapters.ts の practiceNo と同じ形）。節ファイルは `^\d\d-` で始まる .mdx。
 *
 * scripts/remark-section-links.mjs（本文の自動リンク）・scripts/check-lessons.mjs（検査20）・
 * scripts/build-tests.mjs（src/generated/section-refs.json を書き出す）が、ここを共有する。
 *
 * メンバーだけの章（scripts/parts.mjs の PROJECT_CHAPTERS）は章の番号を持たないので、「タイタニック2」
 * 「pandas 2」と書くとその節へのリンクになる。キーは `タイタニック2` / `pandas 2`（節の呼び方と同じ形）。
 */
import { readdirSync, statSync } from 'node:fs';
import { join } from 'node:path';
import { PROJECT_REF_SOURCE, projectChapter, projectSectionLabel } from './parts.mjs';

/** 本文の中の節への参照。「第7章1節」と、メンバーだけの章の「タイタニック2」「pandas 2」の形（remark-section-links.mjs・検査20 が使う） */
export const SECTION_REF_RE = new RegExp(`第(\\d+)章(\\d+)節|${PROJECT_REF_SOURCE}`, 'g');

/** メンバーだけの章の節への参照だけ（検査20 が行き先を確かめる）。当たりの組は呼び方の頭と番号 */
export const PROJECT_REF_RE = new RegExp(PROJECT_REF_SOURCE, 'g');

/** SECTION_REF_RE の1つの当たりから、buildSectionRefs のキーを作る */
export function sectionRefKey(m) {
  return m[3] !== undefined ? `${m[3]}${Number(m[4])}` : `${Number(m[1])}-${Number(m[2])}`;
}

/** `{ "7-1": "07-array/01-array", "タイタニック1": "08q-mlintro/01-accuracy", ... }`。キーは章番号と節番号（ゼロ埋めなし）。 */
export function buildSectionRefs(lessonsDir) {
  const refs = {};
  for (const chapter of readdirSync(lessonsDir)) {
    const chapterFull = join(lessonsDir, chapter);
    if (!statSync(chapterFull).isDirectory()) continue;
    if (projectChapter(chapter)) {
      for (const file of readdirSync(chapterFull)) {
        const fm = /^(\d\d)-.*\.mdx$/.exec(file);
        if (fm) refs[projectSectionLabel(chapter, Number(fm[1]))] = `${chapter}/${file.slice(0, -'.mdx'.length)}`;
      }
      continue;
    }
    const cm = /^(\d\d)-/.exec(chapter);
    if (!cm) continue; // 練習編などは章番号を持たないので除く
    const chapterNo = String(Number(cm[1]));
    for (const file of readdirSync(chapterFull)) {
      if (!file.endsWith('.mdx')) continue;
      const fm = /^(\d\d)-/.exec(file);
      if (!fm) continue;
      const sectionNo = String(Number(fm[1]));
      refs[`${chapterNo}-${sectionNo}`] = `${chapter}/${file.slice(0, -'.mdx'.length)}`;
    }
  }
  return refs;
}

/** 節のURL。src/lesson/chapters.ts の lessonHref と同じ形。 */
export function sectionHref(entryId) {
  return `/learn/lesson/${entryId}/`;
}

/**
 * 練習編の章か（20-platform.md 第15.1節）。`04p-practice1` のように、前の章の番号のあとに p が付く。
 * 練習編なら何番目の練習編かを返す。そうでなければ null。
 * src/lesson/chapters.ts の practiceNo と同じ形（.mjs 側の生成スクリプトが使う）。
 */
export function practiceNo(chapter) {
  const m = /^\d\dp-practice(\d+)$/.exec(chapter);
  return m ? Number(m[1]) : null;
}

/**
 * 節の呼び方（20-platform.md 第17.3節）。`第7章1節` / 練習編は `練習1-2` / メンバーだけの章は `タイタニック2` `pandas 2`。
 * `indexInChapter` は章の中の何番目か（0始まり）。
 * src/lesson/chapters.ts の practiceSectionLabel と同じ形だが、こちらは章番号からも組み立てる
 * （呼び出し側が chapterTitle を経由しなくても済むように）。
 */
export function sectionLabel(chapter, indexInChapter) {
  const project = projectSectionLabel(chapter, indexInChapter + 1);
  if (project !== null) return project;
  const practice = practiceNo(chapter);
  if (practice !== null) return `練習${practice}-${indexInChapter + 1}`;
  const m = /^(\d\d)-/.exec(chapter);
  const chapterNo = m ? Number(m[1]) : 0;
  return `第${chapterNo}章${indexInChapter + 1}節`;
}
