/**
 * 全部の節と練習問題集のページで、表の欄がつぶれていないか・ページが横にはみ出していないかを測る（2026-10-20）。
 *
 * きっかけ: 「この節の書き方」の表で、長い結果が説明の欄を1文字幅まで押しつぶし、縦書きのように見えた（第7章7節）。
 * 部品の CSS を変えたとき、すべての節を手で開いて見ることはできないので、ブラウザで一度に測る。
 *
 * 使い方（手順は .claude/skills/preview-check/SKILL.md の「全部の節を測る」）:
 *   1. 開発サーバを動かし、手元のデータベースで章を公開する（準備中の章は中身が出ない）
 *   2. `node scripts/layout-scan.mjs` で public/_scan-urls.json を書く
 *   3. Browser ペインで開発サーバのページを開き、このファイルの下の SNIPPET を javascript_tool で動かす
 *      （1回の呼び出しで終わらないので、window.__scan の中身を何回かに分けて読む）
 *   4. 終わったら public/_scan-urls.json を消し、手元のデータベースの公開を戻す
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const MEMBERS_ONLY = /08q|15q|15r/; // メンバーだけの章は、ログインしないと開けないので測らない（CSS は同じ部品を使う）

const urls = [];
const lessons = path.join(ROOT, 'src/content/lessons');
for (const ch of fs.readdirSync(lessons).sort()) {
  const dir = path.join(lessons, ch);
  if (MEMBERS_ONLY.test(ch) || !fs.statSync(dir).isDirectory()) continue;
  for (const f of fs.readdirSync(dir).filter((x) => x.endsWith('.mdx')).sort()) urls.push(`/learn/lesson/${ch}/${f.replace('.mdx', '')}/`);
}
const practice = path.join(ROOT, 'src/content/practice');
for (const ch of fs.readdirSync(practice).sort()) {
  const dir = path.join(practice, ch);
  if (ch === 'solutions' || !fs.statSync(dir).isDirectory()) continue;
  for (const f of fs.readdirSync(dir).filter((x) => x.endsWith('.mdx')).sort()) urls.push(`/learn/practice/${ch}/${f.replace('.mdx', '')}/`);
}
fs.writeFileSync(path.join(ROOT, 'public/_scan-urls.json'), JSON.stringify(urls));
console.log(`public/_scan-urls.json に ${urls.length} ページを書いた。終わったら消すこと`);

/* Browser ペインで動かすもの（width を 1280 と 375 の2回）。結果は window.__scan.res、進み具合は window.__scan.pages
window.__scan = { res: null, pages: 0, cells: 0 };
(async (width) => {
  const urls = await (await fetch('/_scan-urls.json')).json();
  const res = [];
  for (const u of urls) {
    const f = document.createElement('iframe');
    f.style.cssText = `position:fixed;left:0;top:0;width:${width}px;height:800px;opacity:0.01;pointer-events:none;`;
    f.src = u; document.body.appendChild(f);
    await new Promise((r) => { f.onload = r; setTimeout(r, 8000); });
    await new Promise((r) => setTimeout(r, 300));
    const d = f.contentDocument; window.__scan.pages++;
    const probs = [];
    if (d.title.includes('準備中')) probs.push('準備中（公開していない）');
    if (d.documentElement.scrollWidth > d.documentElement.clientWidth + 2) probs.push('横はみ出し ' + d.documentElement.scrollWidth);
    for (const td of d.querySelectorAll('td, th')) {
      const r = td.getBoundingClientRect(); const t = (td.innerText || '').trim(); window.__scan.cells++;
      if (r.width > 0 && r.width < 48 && t.length >= 4 && !/^[\d.\-−+ ]+$/.test(t)) probs.push(`狭い欄 ${Math.round(r.width)}px「${t.slice(0, 20)}」`);
    }
    if (probs.length) res.push([u, probs.slice(0, 4)]);
    f.remove();
  }
  window.__scan.res = res;
})(1280);
*/
