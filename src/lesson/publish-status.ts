/**
 * 章の公開状態をブラウザから読む（20-platform.md 第20.1節）。
 *
 * `/learn/`（学習の一覧。src/lesson/learn-list.ts）と用語の検索の右の欄
 * （src/lesson/term-search.ts）の両方が使う。どちらも静的な索引を持つだけのページなので、
 * どの章が準備中かは `/api/lessons/status` を読んで初めて分かる。1ページに何回呼ばれても
 * 通信は1回で済むよう、答えをここで覚えておく。
 */

export type PublishStatus = { publicChapters: Set<string>; staff: boolean };

let cached: Promise<PublishStatus> | null = null;

async function load(): Promise<PublishStatus> {
  try {
    const res = await fetch('/api/lessons/status');
    if (!res.ok) return { publicChapters: new Set(), staff: false };
    const data = (await res.json()) as { public?: string[]; staff?: boolean };
    return { publicChapters: new Set(data.public ?? []), staff: data.staff === true };
  } catch {
    return { publicChapters: new Set(), staff: false };
  }
}

export function fetchPublishStatus(): Promise<PublishStatus> {
  if (!cached) cached = load();
  return cached;
}

/** href（`/learn/lesson/<章>/<節>/` の形）から章のディレクトリ名を取り出す。 */
export function chapterOfHref(href: string): string {
  const parts = href.split('/').filter((p) => p !== '');
  // ['learn', 'lesson', '<章>', '<節>']
  return parts[2] ?? '';
}
