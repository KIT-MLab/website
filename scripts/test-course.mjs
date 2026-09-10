import { build } from 'esbuild';
import { spawnSync } from 'node:child_process';
import { mkdirSync } from 'node:fs';
mkdirSync('.scratch', { recursive: true });
await build({ entryPoints: ['tests/course.test.tsx'], bundle: true, platform: 'node', format: 'esm', packages: 'external', loader: { '.css': 'empty' }, outfile: '.scratch/course-test.mjs' });
const result = spawnSync(process.execPath, ['--test', '.scratch/course-test.mjs'], { stdio: 'inherit' });
process.exit(result.status ?? 1);
