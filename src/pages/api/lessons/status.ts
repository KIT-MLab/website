/**
 * 章の公開状態を画面へ返す（20-platform.md 第20.1節）。
 *
 * `/learn/`（学習の一覧）と用語の検索の右の欄は、どちらも事前生成・静的な索引を持つ
 * ページなので、どの章が準備中かはブラウザからここを読んで知る（第13.2節と同じ考え方）。
 *
 * ログインしていなくても 200 を返す（`/api/me` と同じ約束。第7.1節）。準備中の章の一覧は
 * 誰が見ても困る情報ではない（中身までは見えない）ので、`public` の値だけを返す。
 *
 * メンバーかどうか（`member`）も返す。用語の検索の右の欄が、メンバーだけの章（タイタニック演習。
 * design/spec/53-ml-intro.md 第7節）への行き先をリンクにするかを決めるのに使う。
 *
 * タイタニック演習は節ごとに公開する（53-ml-intro.md 第12節）ので、その章の公開済みの節の行き先
 * （`/learn/lesson/<章>/<節>/`）を `sections` で返す。**メンバーにだけ**入れる（メンバーでない人には空。
 * 節の行き先はメンバーだけのものなので）。この章は `public` の章の一覧では判じない。
 */
import type { APIRoute } from 'astro';
import { currentUser, json, serverConfig } from '../../../server/auth';
import { getCollection } from 'astro:content';
import { publicChapters, publicSections } from '../../../server/lessons-publish';
import { isMembersOnlyChapter, lessonHref } from '../../../lesson/chapters';
import { isMember } from '../../../server/member';

export const prerender = false;

export const GET: APIRoute = async ({ request }) => {
  const config = serverConfig();
  if (!config) return json({ error: 'サーバの設定が足りません。' }, 500);

  const user = await currentUser(request);
  const staff = user !== null && (user.role === 'staff' || user.role === 'admin');
  const member = user !== null && isMember(user);

  const pub = await publicChapters(config.db);
  let sections: string[] = [];
  if (member) {
    const open = await publicSections(config.db);
    sections = (await getCollection('lessons'))
      .filter((l) => isMembersOnlyChapter(l.data.chapter) && open.has(l.data.id))
      .map((l) => lessonHref(l.id));
  }
  return json({ public: [...pub], sections, staff, member }, 200);
};
