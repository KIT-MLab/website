// @ts-check
import { defineConfig } from 'astro/config';

import react from '@astrojs/react';
import mdx from '@astrojs/mdx';
import cloudflare from '@astrojs/cloudflare';
import { unified } from '@astrojs/markdown-remark';
import remarkSectionLinks from './scripts/remark-section-links.mjs';
import remarkSectionSyntax from './scripts/remark-section-syntax.mjs';

// ページは事前生成（prerender）。/api/* だけ `export const prerender = false` でサーバ実行。
// 20-platform.md 第1章。
export default defineConfig({
  integrations: [react(), mdx()],
  adapter: cloudflare(),
  /* 既定の Sätteri は remark プラグインを走らせない。本文の「第N章M節」を節へのリンクに変える
     remark-section-links.mjs（20-platform.md 第15.2節）を使うため、remark/rehype の processor に戻す。
     src/content/lessons 以外に .md / .mdx は無いので、サイト全体で切り替えてよい。
     remark-section-syntax.mjs は節の「説明」の終わりに「この節の書き方」の表を差し込む（lessons の .mdx だけ） */
  markdown: {
    processor: unified({ remarkPlugins: [remarkSectionLinks, remarkSectionSyntax] }),
  },
  /* 開発サーバが CodeMirror の部品を別々に下ごしらえすると @codemirror/state が2つ読まれ、
     キー操作（Enter・Tab）が効かなくなる。まとめて1回で下ごしらえさせる（本番のビルドは1つ） */
  vite: {
    optimizeDeps: {
      include: [
        'codemirror',
        '@codemirror/state',
        '@codemirror/view',
        '@codemirror/language',
        '@codemirror/lang-python',
        '@codemirror/autocomplete',
        '@codemirror/commands',
        '@lezer/highlight',
      ],
    },
  },
});
