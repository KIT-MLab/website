/**
 * 章の公開状態をブラウザから読む（20-platform.md 第20.1節）。
 *
 * `/learn/`（学習の一覧。src/lesson/learn-list.ts）と用語の検索の右の欄
 * （src/lesson/term-search.ts）の両方が使う。どちらも静的な索引を持つだけのページなので、
 * どの章が準備中かは `/api/lessons/status` を読んで初めて分かる。1ページに何回呼ばれても
 * 通信は1回で済むよう、答えをここで覚えておく。
 *
 * メンバーかどうか（`member`）も同じ口から来る（design/spec/53-ml-intro.md 第7節）。右上から
 * ログイン・ログアウトしてメンバーかどうかや運営かどうかが変わったら、覚えた答えを捨てて読み直す（下の kit:account）。
 */

export type PublishStatus = {
  publicChapters: Set<string>;
  /** タイタニック演習の公開済みの節の行き先（節ごとに公開する。53-ml-intro.md 第12節）。メンバーにだけ入る */
  publicSectionHrefs: Set<string>;
  staff: boolean;
  member: boolean;
};

const EMPTY: PublishStatus = { publicChapters: new Set(), publicSectionHrefs: new Set(), staff: false, member: false };

let cached: Promise<PublishStatus> | null = null;
let settled: PublishStatus | null = null;

async function load(): Promise<PublishStatus> {
  try {
    const res = await fetch('/api/lessons/status');
    if (!res.ok) return EMPTY;
    const data = (await res.json()) as { public?: string[]; sections?: string[]; staff?: boolean; member?: boolean };
    return {
      publicChapters: new Set(data.public ?? []),
      publicSectionHrefs: new Set(data.sections ?? []),
      staff: data.staff === true,
      member: data.member === true,
    };
  } catch {
    return EMPTY;
  }
}

export function fetchPublishStatus(): Promise<PublishStatus> {
  if (!cached) {
    cached = load().then((s) => {
      settled = s;
      return s;
    });
  }
  return cached;
}

/* ログイン・ログアウトでメンバーか運営かが変わったら、次に読むときに取り直す。
   kit:account は1回の読み込みで2回鳴る（/api/me の答えと、手元の進度を合わせたあと）ので、
   変わったときだけ捨てる。ログインの応答そのものには member が無い（/api/me の答えで届く）ので、
   member が書いていない知らせは見ない。このモジュールを読むページのリスナーより先に登録される */
if (typeof window !== 'undefined') {
  window.addEventListener('kit:account', (e) => {
    if (!settled) return;
    const user = (e as CustomEvent<{ role?: string; member?: boolean } | null>).detail;
    if (user && user.member === undefined) return;
    const member = user?.member === true;
    const staff = user?.role === 'staff' || user?.role === 'admin';
    if (member !== settled.member || staff !== settled.staff) {
      cached = null;
      settled = null;
    }
  });
}

/** href（`/learn/lesson/<章>/<節>/` の形）から章のディレクトリ名を取り出す。 */
export function chapterOfHref(href: string): string {
  const parts = href.split('/').filter((p) => p !== '');
  // ['learn', 'lesson', '<章>', '<節>']
  return parts[2] ?? '';
}
