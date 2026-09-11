// @ts-check
import { defineConfig } from 'astro/config';

import react from '@astrojs/react';
import mdx from '@astrojs/mdx';
import cloudflare from '@astrojs/cloudflare';

// ページは事前生成（prerender）。/api/* だけ `export const prerender = false` でサーバ実行。
// 20-platform.md 第1章。
export default defineConfig({
  integrations: [react(), mdx()],
  adapter: cloudflare(),
});
