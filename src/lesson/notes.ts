/**
 * 気づいたことのメモの書く・解決するの配線（20-platform.md 第20.3節）。
 * 部品は src/components/lesson/NotesPanel.astro。運営にだけ埋め込まれる。
 *
 * 1ページに複数の `[data-notebox]`（節のメモと教材全体のメモが並ぶ「教材の公開」の画面など）
 * があってもよいように、`querySelectorAll` で全部を配線する。
 */

type CreateResponse = { note?: { id: number; body: string; createdAt: number; createdByName: string }; error?: string };

function fmt(ms: number): string {
  const d = new Date(ms + 9 * 60 * 60 * 1000);
  return `${d.getUTCMonth() + 1}/${d.getUTCDate()}`;
}

function buildItem(note: { id: number; body: string; createdAt: number; createdByName: string }): HTMLLIElement {
  const li = document.createElement('li');
  li.className = 'notebox__item';
  li.dataset.noteId = String(note.id);

  const meta = document.createElement('p');
  meta.className = 'notebox__meta';
  meta.textContent = `${note.createdByName} ・ ${fmt(note.createdAt)}`;

  const body = document.createElement('p');
  body.className = 'notebox__body';
  body.textContent = note.body;

  const button = document.createElement('button');
  button.type = 'button';
  button.className = 'kit-btn notebox__resolve';
  button.dataset.noteResolve = '';
  button.textContent = '解決';

  li.append(meta, body, button);
  return li;
}

function wireResolve(box: HTMLElement, button: HTMLButtonElement): void {
  if (button.dataset.wired) return;
  button.dataset.wired = '1';
  button.addEventListener('click', async () => {
    const li = button.closest<HTMLLIElement>('[data-note-id]');
    if (!li) return;
    const id = li.dataset.noteId;
    button.disabled = true;
    try {
      const res = await fetch(`/api/staff/notes/${id}/resolve`, { method: 'POST', headers: { 'content-type': 'application/json' } });
      if (!res.ok) {
        button.disabled = false;
        return;
      }
      li.remove();
      const list = box.querySelector('[data-notebox-list]');
      const empty = box.querySelector<HTMLElement>('[data-notebox-empty]');
      if (list && empty) empty.hidden = list.children.length > 0;
    } catch {
      button.disabled = false;
    }
  });
}

function wireBox(box: HTMLElement): void {
  const form = box.querySelector<HTMLFormElement>('[data-notebox-form]');
  const input = box.querySelector<HTMLTextAreaElement>('[data-notebox-input]');
  const deny = box.querySelector<HTMLElement>('[data-notebox-deny]');
  const list = box.querySelector<HTMLElement>('[data-notebox-list]');
  const empty = box.querySelector<HTMLElement>('[data-notebox-empty]');
  const lessonId = box.dataset.lessonId || undefined;
  const weeklyId = box.dataset.weeklyId || undefined;

  for (const button of box.querySelectorAll<HTMLButtonElement>('[data-note-resolve]')) wireResolve(box, button);

  form?.addEventListener('submit', async (e) => {
    e.preventDefault();
    if (!input || !deny) return;
    deny.textContent = '';
    const body = input.value.trim();
    if (body === '') {
      deny.textContent = '書いてください。';
      return;
    }
    const submitButton = form.querySelector<HTMLButtonElement>('button[type="submit"]');
    if (submitButton) submitButton.disabled = true;
    try {
      const res = await fetch('/api/staff/notes', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ lessonId, weeklyId, body }),
      });
      const data = (await res.json().catch(() => ({}))) as CreateResponse;
      if (!res.ok || !data.note) {
        deny.textContent = data.error ?? '送れませんでした。';
        return;
      }
      input.value = '';
      if (list) {
        const item = buildItem(data.note);
        list.prepend(item);
        const button = item.querySelector<HTMLButtonElement>('[data-note-resolve]');
        if (button) wireResolve(box, button);
        if (empty) empty.hidden = true;
      }
    } catch {
      deny.textContent = '送れませんでした。';
    } finally {
      if (submitButton) submitButton.disabled = false;
    }
  });
}

export function setupNotesPanels(): void {
  for (const box of document.querySelectorAll<HTMLElement>('[data-notebox]')) wireBox(box);
}
