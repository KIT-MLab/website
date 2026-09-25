/**
 * 次回の予定（20-platform.md 第21.1節）。`/learn/` の入口の行が読む。
 *
 * `/api/me` `/api/weekly` と同じ約束: ログインしていない人・メンバーでない人にも
 * 401 にはせず 200 を返す。ただし `next` は必ず `null` にする（第13.1節・第19.3節と同じ
 * 「メンバーでない人には1つも返さない」考え方）。
 */
import type { APIRoute } from 'astro';
import { currentUser, json, serverConfig } from '../../../server/auth';
import { isMember, jstFormValues } from '../../../server/member';
import { PLAN, entranceDateLabel, nextMeeting } from '../../../lesson/plan';

export const prerender = false;

type NextPlan = {
  no: string;
  date: string;
  until?: string;
  dateLabel: string;
  title: string;
  goal: string;
};

export const GET: APIRoute = async ({ request }) => {
  const config = serverConfig();
  if (!config) return json({ error: 'サーバの設定が足りません。' }, 500);

  const user = await currentUser(request);
  if (!user || !isMember(user)) return json({ next: null as NextPlan | null }, 200);

  const today = jstFormValues(Date.now()).date;
  const row = nextMeeting(PLAN, today);
  if (!row) return json({ next: null as NextPlan | null }, 200);

  return json(
    {
      next: {
        no: row.no,
        date: row.date,
        until: row.until,
        dateLabel: entranceDateLabel(row),
        title: row.title,
        goal: row.goal,
      } satisfies NextPlan,
    },
    200,
  );
};
