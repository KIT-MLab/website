/**
 * 「みんなの進み具合（運営だけ）」の配線（design/spec/53-ml-intro.md 第11節）。部品は src/components/lesson/LiveProgress.astro。
 *
 * GET /api/staff/live-progress を**画面が見えている間だけ10秒ごと**に読み直し、裏に回ったら止める
 * （見えたらすぐ1回読んでから再開。予想ボードの src/lesson/guess.ts と同じ）。401・403・404 が返ったら止める。
 * 「2分前」はサーバの時刻との差で出す（端末の時計がずれていても狂わないように）。
 */

type Cell = { state: 'pass' | 'fail' | 'none'; fails: number };
type Person = { displayName: string; cells: Cell[]; now: { label: string; at: number } | null };
type Live = { columns: string[]; people: Person[]; serverNow: number };

const POLL_MS = 10000;

/** 経った長さ → 「たったいま」「2分前」「3時間前」「4日前」 */
function ago(ms: number): string {
  const min = Math.floor(Math.max(0, ms) / 60000);
  if (min < 1) return 'たったいま';
  if (min < 60) return `${min}分前`;
  const h = Math.floor(min / 60);
  if (h < 24) return `${h}時間前`;
  return `${Math.floor(h / 24)}日前`;
}

function td(text: string, className?: string): HTMLTableCellElement {
  const el = document.createElement('td');
  el.textContent = text;
  if (className) el.className = className;
  return el;
}

function render(box: HTMLElement, data: Live): void {
  if (data.people.length === 0) {
    const p = document.createElement('p');
    p.className = 'kit-live__msg';
    p.textContent = 'この所属のメンバーはまだいません。';
    box.replaceChildren(p);
    return;
  }
  const table = document.createElement('table');
  const head = document.createElement('tr');
  for (const label of ['', ...data.columns, 'いま']) {
    const th = document.createElement('th');
    th.textContent = label;
    head.append(th);
  }
  const thead = document.createElement('thead');
  thead.append(head);
  const tbody = document.createElement('tbody');
  for (const person of data.people) {
    const tr = document.createElement('tr');
    tr.append(td(person.displayName));
    for (const cell of person.cells) {
      if (cell.state === 'pass') tr.append(td('✓', 'c-ok'));
      else if (cell.state === 'fail') tr.append(td(`×${cell.fails}`, 'c-ng'));
      else tr.append(td('–', 'c-no'));
    }
    const now = td(person.now ? person.now.label : '–', person.now ? undefined : 'c-no');
    if (person.now) {
      const small = document.createElement('span');
      small.className = 'kit-live__ago';
      small.textContent = ago(data.serverNow - person.now.at);
      now.append(small);
    }
    tr.append(now);
    tbody.append(tr);
  }
  table.append(thead, tbody);
  box.replaceChildren(table);
}

let wired = false;

export function setupLiveProgress(): void {
  if (wired) return;
  const root = document.querySelector<HTMLElement>('[data-live]');
  const box = root?.querySelector<HTMLElement>('[data-live-table]');
  if (!root || !box) return;
  wired = true;
  const query = root.dataset.live ?? '';

  let timer: number | null = null;
  let loading = false;
  let stopped = false;
  /** 同じ中身なら描き直さない（表の横の動きなどを崩さない） */
  let lastKey = '';

  async function refresh(): Promise<void> {
    if (loading || stopped) return;
    loading = true;
    try {
      const res = await fetch(`/api/staff/live-progress?${query}`, { cache: 'no-store' });
      const body = (await res.json().catch(() => ({}))) as Partial<Live> & { error?: string };
      if (!res.ok || !Array.isArray(body.people) || !Array.isArray(body.columns)) {
        if (res.status === 401 || res.status === 403 || res.status === 404) {
          stopped = true;
          stopPolling();
          const p = document.createElement('p');
          p.className = 'kit-live__msg';
          p.textContent = body.error ?? '読み込めませんでした。';
          box!.replaceChildren(p);
        }
        return;
      }
      const data = body as Live;
      const key = JSON.stringify({ c: data.columns, p: data.people.map((p) => [p.displayName, p.cells, p.now?.label, p.now ? ago(data.serverNow - p.now.at) : '']) });
      if (key === lastKey) return;
      lastKey = key;
      render(box!, data);
    } catch {
      /* 通信が切れたときは次の読み直しで */
    } finally {
      loading = false;
    }
  }

  function startPolling(): void {
    if (timer !== null || stopped) return;
    timer = window.setInterval(() => void refresh(), POLL_MS);
  }

  function stopPolling(): void {
    if (timer === null) return;
    window.clearInterval(timer);
    timer = null;
  }

  document.addEventListener('visibilitychange', () => {
    if (document.visibilityState === 'visible') {
      void refresh();
      startPolling();
    } else {
      stopPolling();
    }
  });

  if (document.visibilityState === 'visible') {
    void refresh();
    startPolling();
  }
}
