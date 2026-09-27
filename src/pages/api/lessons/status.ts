/**
 * 章の公開状態を画面へ返す（20-platform.md 第20.1節）。
 *
 * `/learn/`（学習の一覧）と用語の検索の右の欄は、どちらも事前生成・静的な索引を持つ
 * ページなので、どの章が準備中かはブラウザからここを読んで知る（第13.2節と同じ考え方）。
 *
 * ログインしていなくても 200 を返す（`/api/me` と同じ約束。第7.1節）。準備中の章の一覧は
 * 誰が見ても困る情報ではない（中身までは見えない）ので、`public` の値だけを返す。
 *
 * メンバーだけの章（機械学習の入口。design/spec/53-ml-intro.md 第6節）の節は、事前生成の
 * `/learn/` に題を1つも書かないので、**メンバーにだけ**ここで `membersSections` として返す
 * （学習の一覧の行を組むのに要る分だけ）。メンバーでない人には空の配列。
 */
import type { APIRoute } from 'astro';
import { getCollection } from 'astro:content';
import { currentUser, json, serverConfig } from '../../../server/auth';
import { publicChapters } from '../../../server/lessons-publish';
import { isMember } from '../../../server/member';
import { isMembersOnlyChapter, lessonHref } from '../../../lesson/chapters';
// @ts-expect-error 節の呼び方は .mjs 側に1つだけ置く（src/pages/learn/index.astro と同じ）
import { sectionLabel } from '../../../../scripts/section-refs.mjs';
import generated from '../../../generated/lesson-data.json';

export const prerender = false;

/** src/lesson/learn-list.ts の LearnSection と同じ形 */
type MembersSection = {
  href: string;
  lessonId: string;
  chapter: string;
  label: string;
  title: string;
  minutes: number;
  exerciseIds: string[];
};

async function membersSections(): Promise<MembersSection[]> {
  const genLessons = (generated as { lessons: Record<string, { exerciseIds: string[] }> }).lessons;
  const lessons = (await getCollection('lessons')).sort((a, b) => a.id.localeCompare(b.id));
  const count = new Map<string, number>();
  const out: MembersSection[] = [];
  for (const l of lessons) {
    const n = count.get(l.data.chapter) ?? 0;
    count.set(l.data.chapter, n + 1);
    if (!isMembersOnlyChapter(l.data.chapter)) continue;
    out.push({
      href: lessonHref(l.id),
      lessonId: l.data.id,
      chapter: l.data.chapter,
      label: sectionLabel(l.data.chapter, n),
      title: l.data.title,
      minutes: l.data.minutes,
      exerciseIds: genLessons[l.data.id]?.exerciseIds ?? [],
    });
  }
  return out;
}

export const GET: APIRoute = async ({ request }) => {
  const config = serverConfig();
  if (!config) return json({ error: 'サーバの設定が足りません。' }, 500);

  const user = await currentUser(request);
  const staff = user !== null && (user.role === 'staff' || user.role === 'admin');
  const member = user !== null && isMember(user);

  const pub = await publicChapters(config.db);
  return json({ public: [...pub], staff, member, membersSections: member ? await membersSections() : [] }, 200);
};
