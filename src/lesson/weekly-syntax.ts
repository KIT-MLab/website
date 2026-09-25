/**
 * 「構文の一覧」を今週の演習の回の範囲で絞る（20-platform.md 第22.1節）。
 *
 * src/lesson/syntax-list.ts の生データ（`since` は節の frontmatter の id）を、
 * その回の frontmatter `chapters` の最後の章までに絞り込み、節への行き先（第N章M節）を添える。
 * 章の並び順は getCollection('lessons') の順（src/pages/learn/index.astro と同じ考え方）。
 *
 * サーバ側（今週の演習のページ。prerender = false）でしか呼ばない。
 */
import { getCollection } from 'astro:content';
// @ts-expect-error 節への行き先の組み立ては .mjs 側に1つだけ置く（scripts/section-refs.mjs。
// src/pages/learn/index.astro と同じ理由）
import { sectionHref, sectionLabel } from '../../scripts/section-refs.mjs';
import { SYNTAX_CATEGORIES, type SyntaxEntry } from './syntax-list';

export type SyntaxEntryView = SyntaxEntry & { sinceLabel: string; sinceHref: string };
export type SyntaxLink = { label: string; href: string };
export type SyntaxCategoryView = { key: string; name: string; entries: SyntaxEntryView[]; sinceLinks: SyntaxLink[] };

type LessonInfo = { chapter: string; label: string; href: string; order: number };

let cachedOrder: string[] | null = null;
let cachedIndex: Map<string, LessonInfo> | null = null;

async function courseIndex(): Promise<{ order: string[]; index: Map<string, LessonInfo> }> {
  if (cachedOrder && cachedIndex) return { order: cachedOrder, index: cachedIndex };
  const lessons = (await getCollection('lessons')).sort((a, b) => a.id.localeCompare(b.id));
  const byChapter = new Map<string, typeof lessons>();
  for (const l of lessons) {
    const list = byChapter.get(l.data.chapter) ?? [];
    list.push(l);
    byChapter.set(l.data.chapter, list);
  }
  const order: string[] = [];
  const index = new Map<string, LessonInfo>();
  lessons.forEach((l, i) => {
    if (!order.includes(l.data.chapter)) order.push(l.data.chapter);
    const siblings = byChapter.get(l.data.chapter) ?? [];
    const idx = siblings.findIndex((s) => s.id === l.id);
    index.set(l.data.id, { chapter: l.data.chapter, label: sectionLabel(l.data.chapter, idx), href: sectionHref(l.id), order: i });
  });
  cachedOrder = order;
  cachedIndex = index;
  return { order, index };
}

/**
 * その回で見せる分類だけを返す（空の分類は隠す。第22.1節）。
 * `chapters` は weekly entry の frontmatter（回の範囲の章のディレクトリ名の配列）。
 */
export async function syntaxCategoriesFor(chapters: string[]): Promise<SyntaxCategoryView[]> {
  const { order, index } = await courseIndex();
  const chapterIdx = chapters.map((c) => order.indexOf(c)).filter((i) => i >= 0);
  if (chapterIdx.length === 0) return [];
  const maxIdx = Math.max(...chapterIdx);

  const views: SyntaxCategoryView[] = [];
  for (const cat of SYNTAX_CATEGORIES) {
    const entries: SyntaxEntryView[] = [];
    const linkByHref = new Map<string, SyntaxLink & { order: number }>();
    for (const e of cat.entries) {
      const info = index.get(e.since);
      // 台帳（このファイル）が節の id を書き違えていたら、その行だけ静かに落とす
      // （無い節にリンクを張るより安全側。check-lessons.mjs 的な機械検査はここには無い）
      if (!info) continue;
      const chIdx = order.indexOf(info.chapter);
      if (chIdx === -1 || chIdx > maxIdx) continue;
      entries.push({ ...e, sinceLabel: info.label, sinceHref: info.href });
      if (!linkByHref.has(info.href)) linkByHref.set(info.href, { label: info.label, href: info.href, order: info.order });
    }
    if (entries.length === 0) continue;
    const sinceLinks = [...linkByHref.values()].sort((a, b) => a.order - b.order).map(({ label, href }) => ({ label, href }));
    views.push({ key: cat.key, name: cat.name, entries, sinceLinks });
  }
  return views;
}
