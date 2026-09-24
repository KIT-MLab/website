// @ts-check
import { defineConfig } from 'astro/config';

import react from '@astrojs/react';
import mdx from '@astrojs/mdx';
import cloudflare from '@astrojs/cloudflare';
import { unified } from '@astrojs/markdown-remark';
import remarkSectionLinks from './scripts/remark-section-links.mjs';

// ページは事前生成（prerender）。/api/* だけ `export const prerender = false` でサーバ実行。
// 20-platform.md 第1章。
export default defineConfig({
  integrations: [react(), mdx()],
  adapter: cloudflare(),
  /* 既定の Sätteri は remark プラグインを走らせない。本文の「第N章M節」を節へのリンクに変える
     remark-section-links.mjs（20-platform.md 第15.2節）を使うため、remark/rehype の processor に戻す。
     src/content/lessons 以外に .md / .mdx は無いので、サイト全体で切り替えてよい */
  markdown: {
    processor: unified({ remarkPlugins: [remarkSectionLinks] }),
  },
});
