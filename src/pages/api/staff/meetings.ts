/**
 * 集まりを保存する（20-platform.md 第13.5節）。
 *
 * `id` があれば更新、無ければ作成。**消す口は作らない**（第13.8節）。
 *
 * 運営以上だけ。所属は、運営なら自分の所属、管理者ならどれでも（第5.4節の範囲）。
 * 範囲の判定は src/server/meetings.ts が src/server/staff.ts の visibleUsers で行う。
 * 範囲の外の回を更新しようとしたときは、居ないときと同じ 404 にする。
 *
 * 断るとき（URL が不正、題が空、日時が読めない）は `field` でどの欄かを言う。
 * 画面はその欄の下に理由を出す。
 */
import type { APIRoute } from 'astro';
import { json, readJsonObject, serverConfig } from '../../../server/auth';
import { requireStaff } from '../../../server/staff';
import { colabUrlOk, staffMeeting, writableCohorts } from '../../../server/meetings';
import { parseJst } from '../../../server/member';

export const prerender = false;

function text(value: unknown): string {
  return typeof value === 'string' ? value.trim() : '';
}

export const POST: APIRoute = async ({ request }) => {
  const config = serverConfig();
  if (!config) return json({ error: 'サーバの設定が足りません。' }, 500);
  const { db } = config;

  const me = await requireStaff(request);
  if (!me) return json({ error: '運営の画面です。' }, 403);

  const body = await readJsonObject(request);
  if (!body) return json({ error: '送信された内容を読み取れませんでした。' }, 400);

  // 更新なら、その回が範囲の中にあること
  let id: number | null = null;
  if (body.id !== undefined && body.id !== null && body.id !== '') {
    const n = Number(body.id);
    if (!Number.isInteger(n) || n <= 0 || !(await staffMeeting(db, me, n))) {
      return json({ error: '見つかりません。' }, 404);
    }
    id = n;
  }

  const cohort = text(body.cohort);
  const cohorts = await writableCohorts(db, me);
  if (!cohorts.some((c) => c.code === cohort)) return json({ error: '所属を選んでください。', field: 'cohort' }, 400);

  // 画面の欄からは文字列で届く。数で届いてもよい
  const no = typeof body.no === 'number' ? body.no : Number(text(body.no) || NaN);
  if (!Number.isInteger(no) || no <= 0) return json({ error: '第何回かを数で入れてください。', field: 'no' }, 400);

  const title = text(body.title);
  if (title === '') return json({ error: '題を入れてください。', field: 'title' }, 400);

  const startsAt = parseJst(text(body.date), text(body.time));
  if (startsAt === null) return json({ error: '日付と時刻を読めませんでした。', field: 'date' }, 400);

  const colabUrl = text(body.colabUrl);
  if (!colabUrlOk(colabUrl)) {
    return json(
      {
        error: 'Colab の URL は https://colab.research.google.com/ か https://drive.google.com/ で始まるものだけです。',
        field: 'colabUrl',
      },
      400,
    );
  }

  // 節の id は空白で区切って1つの空白でつなぎ直す。知らない id は画面が黙って飛ばす（第13.3節）
  const readAfter = text(body.readAfter).split(/\s+/).filter((s) => s !== '').join(' ');

  const values = [
    cohort,
    no,
    title,
    startsAt,
    text(body.place),
    text(body.summary),
    colabUrl,
    text(body.bring),
    readAfter,
    text(body.teamNote),
    text(body.teamScore),
  ];
  const now = Date.now();

  if (id === null) {
    const row = await db
      .prepare(
        `INSERT INTO meetings (cohort_code, no, title, starts_at, place, summary, colab_url, bring,
                               read_after, team_note, team_score, created_at, updated_at)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?) RETURNING id`,
      )
      .bind(...values, now, now)
      .first<{ id: number }>();
    return json({ id: row?.id ?? null }, 200);
  }

  await db
    .prepare(
      `UPDATE meetings SET cohort_code = ?, no = ?, title = ?, starts_at = ?, place = ?, summary = ?,
              colab_url = ?, bring = ?, read_after = ?, team_note = ?, team_score = ?, updated_at = ?
        WHERE id = ?`,
    )
    .bind(...values, now, id)
    .run();
  return json({ id }, 200);
};
