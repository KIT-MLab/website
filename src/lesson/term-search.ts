/**
 * 用語を検索する右の欄（20-platform.md 第18章）。
 *
 * 引く表はビルドのときに作ってある（scripts/build-tests.mjs -> src/generated/search-index.json）。
 * ページの中では表を組み立てない（第18.3節）。ここでは読んで、絞り込みと開閉だけをする。
 */
import searchIndexData from '../generated/search-index.json';

export type SearchKind = '用語' | '書き方' | '節';

export type SearchEntry = {
  id: number;
  kind: SearchKind;
  word: string;
  english: string;
  aliases: string[];
  definition: string;
  section: { href: string; label: string; title: string };
  order: number;
  example: { code: string; out: string } | null;
  terms?: string[];
};

const ENTRIES: SearchEntry[] = (searchIndexData as { entries: SearchEntry[] }).entries;

const MAX_CANDIDATES = 8;
const MAX_CARDS = 3;

/** NFKC・小文字にそろえる（第18.3節）。 */
export function normKey(text: string): string {
  return String(text ?? '').normalize('NFKC').toLowerCase();
}

/**
 * 並び順（第18.3節）: 語と完全一致 → 語の頭と一致 → 語か英語か読み替えの途中と一致 → 定義の中と一致。
 * それ以外はヒットしない。最大8件。
 */
export function rankEntries(query: string, entries: SearchEntry[] = ENTRIES): SearchEntry[] {
  const q = normKey(query).trim();
  if (!q) return [];
  const scored: { e: SearchEntry; score: number }[] = [];
  for (const e of entries) {
    const w = normKey(e.word);
    const en = normKey(e.english ?? '');
    const aliases = (e.aliases ?? []).map(normKey);
    const def = normKey(e.definition ?? '');
    let score = -1;
    if (w === q) score = 0;
    else if (w.startsWith(q)) score = 1;
    else if (w.includes(q) || en.includes(q) || aliases.some((a) => a.includes(q))) score = 2;
    else if (def.includes(q)) score = 3;
    if (score >= 0) scored.push({ e, score });
  }
  scored.sort((a, b) => a.score - b.score || a.e.order - b.e.order);
  return scored.slice(0, MAX_CANDIDATES).map((s) => s.e);
}

/** いま見ている節までに習った、用語・書き方の例から1つ選ぶ（第18.2節「例: print」）。 */
export function randomExampleWord(currentOrder: number, entries: SearchEntry[] = ENTRIES): string | null {
  const learned = entries.filter((e) => (e.kind === '用語' || e.kind === '書き方') && e.order <= currentOrder);
  if (learned.length === 0) return null;
  return learned[Math.floor(Math.random() * learned.length)].word;
}

function findEntry(id: number): SearchEntry | undefined {
  return ENTRIES.find((e) => e.id === id);
}

function findByWord(word: string): SearchEntry | undefined {
  return ENTRIES.find((e) => e.kind === '用語' && e.word === word) ?? ENTRIES.find((e) => e.word === word);
}

/** 定義の中の `…` だけを <code> に組む。ほかは文字のまま（用語集のページ src/pages/learn/glossary.astro と同じ規則） */
function withCode(text: string): string {
  return escapeHtml(text).replace(/`([^`]*)`/g, "<code>$1</code>");
}

function escapeHtml(text: string): string {
  return text.replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c] ?? c);
}

/** 開くべき要素をキーボードでもクリックでも選べるようにする、素朴な状態機械。 */
export function setupTermSearch(opts: { currentHref: string }): void {
  const panel = document.getElementById('kit-term-panel');
  const input = document.getElementById('kit-term-input') as HTMLInputElement | null;
  const cands = document.getElementById('kit-term-cands');
  const cards = document.getElementById('kit-term-cards');
  const chips = document.getElementById('kit-term-chips');
  const toggle = document.getElementById('kit-term-toggle');
  const close = document.getElementById('kit-term-close');
  const scrim = document.getElementById('kit-term-scrim');
  if (!panel || !input || !cands || !cards) return;

  const current = ENTRIES.find((e) => e.kind === '節' && e.section.href === opts.currentHref);
  const currentOrder = current?.order ?? Number.POSITIVE_INFINITY;

  let opened: number[] = [];
  let highlighted = -1;
  let shown: SearchEntry[] = [];

  function setPlaceholder(): void {
    const word = randomExampleWord(currentOrder);
    input!.placeholder = word ? `例: ${word}` : '';
  }
  setPlaceholder();

  /* --- 候補 --------------------------------------------------------- */

  function closeCandidates(): void {
    cands!.hidden = true;
    cands!.innerHTML = '';
    highlighted = -1;
    shown = [];
    input!.removeAttribute('aria-activedescendant');
  }

  function renderCandidates(): void {
    const q = input!.value;
    shown = rankEntries(q);
    highlighted = shown.length > 0 ? 0 : -1;
    if (q.trim() === '') {
      closeCandidates();
      return;
    }
    cands!.hidden = false;
    if (shown.length === 0) {
      cands!.innerHTML = `<li class="term-cands__none">「${escapeHtml(q)}」は見つかりませんでした。</li>`;
      input!.removeAttribute('aria-activedescendant');
      return;
    }
    cands!.innerHTML = shown
      .map((e, i) => {
        const ahead = e.order > currentOrder;
        return `<li role="option" id="term-cand-${e.id}" aria-selected="${i === highlighted}">
          <button type="button" class="${i === highlighted ? 'is-hl' : ''}" data-open="${e.id}">
            <span class="term-cands__word">${escapeHtml(e.word)}${e.english ? ` <small>(${escapeHtml(e.english)})</small>` : ''}</span>
            <span class="term-cands__kind">${e.kind}${ahead ? ' ・ まだ先' : ''}</span>
          </button>
        </li>`;
      })
      .join('');
    if (highlighted >= 0) input!.setAttribute('aria-activedescendant', `term-cand-${shown[highlighted].id}`);
  }

  function moveHighlight(delta: number): void {
    if (shown.length === 0) return;
    highlighted = (highlighted + delta + shown.length) % shown.length;
    for (const li of Array.from(cands!.querySelectorAll('li[role="option"]'))) {
      const btn = li.querySelector('button');
      const isHl = li.id === `term-cand-${shown[highlighted].id}`;
      li.setAttribute('aria-selected', String(isHl));
      btn?.classList.toggle('is-hl', isHl);
    }
    input!.setAttribute('aria-activedescendant', `term-cand-${shown[highlighted].id}`);
  }

  /* --- 開いた札 ------------------------------------------------------ */

  function cardHtml(e: SearchEntry): string {
    const ahead = e.order > currentOrder;
    const kindBadge = `<small class="term-card__kind">${e.kind}</small>`;
    if (e.kind === '節') {
      const chipsHtml = (e.terms ?? [])
        .map((t) => `<button type="button" class="term-chip" data-open-word="${escapeHtml(t)}">${escapeHtml(t)}</button>`)
        .join('');
      return `<div class="term-card" data-card="${e.id}">
        <div class="term-card__head"><h3>${escapeHtml(e.word)}${kindBadge}</h3><button type="button" class="term-card__x" data-close="${e.id}" aria-label="閉じる">×</button></div>
        ${chipsHtml ? `<ul class="term-card__chips">${(e.terms ?? []).map((t) => `<li><button type="button" class="term-chip" data-open-word="${escapeHtml(t)}">${escapeHtml(t)}</button></li>`).join('')}</ul>` : ''}
        <p class="term-card__link"><a href="${e.section.href}">開く →</a></p>
      </div>`;
    }
    const head = `<h3>${escapeHtml(e.word)}${e.english ? `<small>${escapeHtml(e.english)}</small>` : ''}${kindBadge}</h3>`;
    if (ahead) {
      return `<div class="term-card" data-card="${e.id}">
        <div class="term-card__head">${head}<button type="button" class="term-card__x" data-close="${e.id}" aria-label="閉じる">×</button></div>
        ${e.definition ? `<p class="term-card__def">${withCode(e.definition)}</p>` : ''}
        <p class="term-card__later">${e.section.label}で習います。</p>
      </div>`;
    }
    const example = e.example
      ? `<pre class="kit-code term-card__code"><code>${escapeHtml(e.example.code)}</code></pre>
         <div class="kit-out term-card__out"><p class="kit-out__label">出る結果</p><p class="kit-out__text">${escapeHtml(e.example.out)}</p></div>`
      : '';
    return `<div class="term-card" data-card="${e.id}">
      <div class="term-card__head">${head}<button type="button" class="term-card__x" data-close="${e.id}" aria-label="閉じる">×</button></div>
      ${e.definition ? `<p class="term-card__def">${withCode(e.definition)}</p>` : ''}
      ${example}
      <p class="term-card__link"><a href="${e.section.href}">${e.section.label} ${escapeHtml(e.section.title)} を開く →</a></p>
    </div>`;
  }

  function renderCards(): void {
    cards!.innerHTML = opened
      .map((id) => findEntry(id))
      .filter((e): e is SearchEntry => !!e)
      .map(cardHtml)
      .join('');
  }

  function openEntry(id: number): void {
    opened = [id, ...opened.filter((x) => x !== id)].slice(0, MAX_CARDS);
    renderCards();
  }

  function openWord(word: string): void {
    const e = findByWord(word);
    if (e) openEntry(e.id);
  }

  /* --- イベント ------------------------------------------------------- */

  input.addEventListener('input', renderCandidates);
  input.addEventListener('focus', setPlaceholder);
  input.addEventListener('keydown', (e) => {
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      if (cands!.hidden) renderCandidates();
      else moveHighlight(1);
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      moveHighlight(-1);
    } else if (e.key === 'Enter') {
      if (highlighted >= 0 && shown[highlighted]) {
        e.preventDefault();
        openEntry(shown[highlighted].id);
        closeCandidates();
      }
    } else if (e.key === 'Escape') {
      if (!cands!.hidden) {
        e.preventDefault();
        closeCandidates();
      }
    }
  });

  cands.addEventListener('click', (e) => {
    const btn = (e.target as HTMLElement).closest<HTMLButtonElement>('button[data-open]');
    if (!btn) return;
    openEntry(Number(btn.dataset.open));
    closeCandidates();
  });

  cards.addEventListener('click', (e) => {
    const target = e.target as HTMLElement;
    const x = target.closest<HTMLButtonElement>('[data-close]');
    if (x) {
      opened = opened.filter((id) => id !== Number(x.dataset.close));
      renderCards();
      return;
    }
    const chip = target.closest<HTMLButtonElement>('[data-open-word]');
    if (chip) {
      e.preventDefault();
      openWord(chip.dataset.openWord ?? '');
    }
  });

  chips?.addEventListener('click', (e) => {
    const btn = (e.target as HTMLElement).closest<HTMLButtonElement>('[data-open-word]');
    if (!btn) return;
    openWord(btn.dataset.openWord ?? '');
  });

  document.addEventListener('click', (e) => {
    if (!panel.contains(e.target as Node)) closeCandidates();
  });

  /* --- 幅1280px未満: ボタンで開閉するオーバーレイ（第18.1節） --------- */

  function openPanel(): void {
    panel.classList.add('is-open');
    toggle?.setAttribute('aria-expanded', 'true');
    if (scrim) scrim.hidden = false;
    input.focus();
  }
  function closePanel(): void {
    panel.classList.remove('is-open');
    toggle?.setAttribute('aria-expanded', 'false');
    if (scrim) scrim.hidden = true;
  }

  toggle?.addEventListener('click', () => {
    if (panel.classList.contains('is-open')) closePanel();
    else openPanel();
  });
  close?.addEventListener('click', closePanel);
  scrim?.addEventListener('click', closePanel);

  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape' && panel.classList.contains('is-open')) {
      closePanel();
      return;
    }
    // 「/」で欄に入る。入力欄・テキストエリア・編集可能な要素（CodeMirror を含む）では奪わない
    if (e.key === '/') {
      const active = document.activeElement as HTMLElement | null;
      const typing =
        !!active &&
        (active.tagName === 'INPUT' ||
          active.tagName === 'TEXTAREA' ||
          active.tagName === 'SELECT' ||
          active.isContentEditable ||
          !!active.closest('.cm-editor'));
      if (typing) return;
      e.preventDefault();
      if (window.matchMedia('(max-width: 1279px)').matches) openPanel();
      else input.focus();
    }
  });
}
