/**
 * 「第N章M節」を節の行き先に解決する（20-platform.md 第15.2節）。
 *
 * 章フォルダは `^\d\d-` で始まるものだけを数える（練習編 `04p-practice1` は除く。
 * src/lesson/chapters.ts の practiceNo と同じ形）。節ファイルは `^\d\d-` で始まる .mdx。
 *
 * scripts/remark-section-links.mjs（本文の自動リンク）・scripts/check-lessons.mjs（検査20）・
 * scripts/build-tests.mjs（src/generated/section-refs.json を書き出す）が、ここを共有する。
 */
import { readdirSync, statSync } from 'node:fs';
import { join } from 'node:path';

/** `{ "7-1": "07-array/01-array", ... }`。キーは章番号と節番号（ゼロ埋めなし）。 */
export function buildSectionRefs(lessonsDir) {
  const refs = {};
  for (const chapter of readdirSync(lessonsDir)) {
    const chapterFull = join(lessonsDir, chapter);
    if (!statSync(chapterFull).isDirectory()) continue;
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
