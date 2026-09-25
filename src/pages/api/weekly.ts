/**
 * 「今週の演習」の一覧をメンバーへ返す（20-platform.md 第19.3節・第19.4節）。
 *
 * `/learn/` は事前生成なので、メンバーかどうかはここで判定してから返す。
 * **メンバーでない人・ログインしていない人には、日付も範囲も1つも返さない。**
 * 回そのもの（本文・課題）は content collection が持つが、ここでは一覧に要る
 * 最小限（id・日付・範囲・公開済みか・公開済みなら課題の id）だけを返す。
 *
 * `/api/me` と同じく 401 にはしない。ログインしていないのは正常な状態で、
 * 画面はこの `sets` が空かどうかだけを見て「今週の演習」の段を出すかどうかを決める。
 */
import type { APIRoute } from 'astro';
import { getCollection } from 'astro:content';
import { currentUser, json, serverConfig } from '../../server/auth';
import { isMember } from '../../server/member';
import { openWeeklyIds } from '../../server/weekly';
import generated from '../../generated/lesson-data.json';

export const prerender = false;

type WeeklySet = {
  id: string;
  date: string;
  title: string;
  published: boolean;
  /** 公開済みのときだけ。進み具合の棒を出すのに要る（第19.4節） */
  exerciseIds: string[];
};

export const GET: APIRoute = async ({ request }) => {
  const config = serverConfig();
  if (!config) return json({ error: 'サーバの設定が足りません。' }, 500);

  const user = await currentUser(request);
  if (!user || !isMember(user)) return json({ sets: [] as WeeklySet[] }, 200);

  const genWeekly = (generated as { weekly?: Record<string, { exerciseIds: string[] }> }).weekly ?? {};
  const entries = (await getCollection('weekly')).sort((a, b) => a.data.date.localeCompare(b.data.date));
  const openIds = await openWeeklyIds(config.db, user.cohort.code);

  const sets: WeeklySet[] = entries.map((entry) => {
    const published = openIds.has(entry.data.id);
    return {
      id: entry.data.id,
      date: entry.data.date,
      title: entry.data.title,
      published,
      exerciseIds: published ? genWeekly[entry.data.id]?.exerciseIds ?? [] : [],
    };
  });

  return json({ sets }, 200);
};
