import { defineCollection, z } from 'astro:content';
import { glob } from 'astro/loaders';

// 1節＝1つの .mdx。ディレクトリ名が章、ファイル名が節（20-platform.md 第2.1節）。
// frontmatter は 20-platform.md 第2.2節のとおり。
// data.id（進度の記録に使う一意のID）と entry.id（ファイルの位置）は別物。
const lessons = defineCollection({
  loader: glob({ pattern: '**/*.mdx', base: './src/content/lessons' }),
  schema: z.object({
    id: z.string(),
    chapter: z.string(),
    title: z.string(),
    minutes: z.number(),
    terms: z.array(z.string()).default([]),
    // 「組む」課題を置かない節は、置かない理由をここに書く（検査15。第3.8節）
    nobuild: z.string().optional(),
  }),
});

// 「今週の演習」（20-platform.md 第19章）。1回＝1つの .mdx。frontmatter は第19.2節のとおり。
// 模範解答は src/content/weekly/solutions/<課題のid>.py（章ごとではなく1か所にまとめる）。
const weekly = defineCollection({
  loader: glob({ pattern: '**/*.mdx', base: './src/content/weekly' }),
  schema: z.object({
    id: z.string(),
    date: z.string(),
    title: z.string(),
    chapters: z.array(z.string()),
  }),
});

// 練習問題集（20-platform.md 第25.5節）。1つの話題＝1つの .mdx（src/content/practice/<章>/<話題>.mdx）。
// 模範解答は src/content/practice/solutions/<課題のid>.py。書き方は 10-lesson-and-writing.md 第3.12節。
const practice = defineCollection({
  loader: glob({ pattern: '**/*.mdx', base: './src/content/practice' }),
  schema: z.object({
    id: z.string(),
    chapter: z.string(),
    topic: z.string(),
    // 話題の見出し。`…` で囲んだところはコードの字で出す（`print()` による出力）
    title: z.string(),
    sections: z.array(z.string()),
    order: z.number(),
    levels: z.array(z.number()),
  }),
});

export const collections = { lessons, weekly, practice };
