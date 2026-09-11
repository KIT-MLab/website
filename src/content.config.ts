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
  }),
});

export const collections = { lessons };
