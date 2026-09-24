/**
 * 週1の集まり（20-platform.md 第13.4節・第13.5節）。
 *
 * メンバーの画面（/learn/home/）が読むのは**自分の所属の回だけ**。運営の画面
 * （/staff/meetings/）と保存の口（/api/staff/meetings）は、運営なら自分の所属、
 * 管理者なら全部（第5.4節の範囲）。**範囲の判定は src/server/staff.ts の
 * visibleUsers をそのまま使う。**書き写すと、片方だけ直したときに別の所属の回が見える。
 *
 * visibleUsers の条件は `u.cohort_code` を見る形なので、集まりの表には
 * `(SELECT code AS cohort_code, name FROM cohorts) u` を繋いで同じ条件を挟む。
 *
 * 本文はすべて文字として出す（第13.4節）。画面で set:html を使わないこと。
 */
import type { CurrentUser, Db } from './auth';
import { visibleUsers } from './staff';

export type Meeting = {
  id: number;
  cohortCode: string;
  no: number;
  title: string;
  startsAt: number;
  place: string;
  summary: string;
  colabUrl: string;
  bring: string;
  readAfter: string[];
  teamNote: string;
  teamScore: string;
};

type MeetingRow = {
  id: number;
  cohort_code: string;
  no: number;
  title: string;
  starts_at: number;
  place: string;
  summary: string;
  colab_url: string;
  bring: string;
  read_after: string;
  team_note: string;
  team_score: string;
};

const COLUMNS = `m.id, m.cohort_code, m.no, m.title, m.starts_at, m.place, m.summary, m.colab_url,
                 m.bring, m.read_after, m.team_note, m.team_score`;

/** 範囲の条件を挟めるように、所属の表を `u` として繋ぐ（頭の説明）。 */
const SCOPE_JOIN = 'JOIN (SELECT code AS cohort_code, name FROM cohorts) u ON u.cohort_code = m.cohort_code';

function toMeeting(row: MeetingRow): Meeting {
  return {
    id: row.id,
    cohortCode: row.cohort_code,
    no: row.no,
    title: row.title,
    startsAt: row.starts_at,
    place: row.place,
    summary: row.summary,
    colabUrl: row.colab_url,
    bring: row.bring,
    readAfter: row.read_after.split(/\s+/).filter((id) => id !== ''),
    teamNote: row.team_note,
    teamScore: row.team_score,
  };
}

/** 受ける Colab の URL の頭（第13.4節）。`javascript:` などを画面に出さないため。 */
export const COLAB_PREFIXES = ['https://colab.research.google.com/', 'https://drive.google.com/'];

/** 空か、決めた頭で始まるものだけ通す。 */
export function colabUrlOk(url: string): boolean {
  return url === '' || COLAB_PREFIXES.some((prefix) => url.startsWith(prefix));
}

// ---------------------------------------------------------------- メンバーの画面

/** 自分の所属の回を全部、開始の早い順に。1年で50回ほどなので全部引いて画面で分ける。 */
export async function cohortMeetings(db: Db, cohortCode: string): Promise<Meeting[]> {
  const rows = await db
    .prepare(`SELECT ${COLUMNS} FROM meetings m WHERE m.cohort_code = ? ORDER BY m.starts_at ASC, m.id ASC`)
    .bind(cohortCode)
    .all<MeetingRow>();
  return rows.results.map(toMeeting);
}

/** 「今週の集まり」に出す回を決めるときの猶予。始まって3時間までは「今週」のまま（第13.3節）。 */
export const STILL_NOW_MS = 3 * 60 * 60 * 1000;

/**
 * メンバーの画面の一番上に出す回（第13.3節）。
 *
 *   開始が「いまから3時間前」以降でいちばん近い回 → 札は「今週の集まり」
 *   無ければ、いちばん新しい過去の回           → 札は「前回の集まり」
 *   1回も無ければ null
 *
 * `meetings` は開始の早い順であること（cohortMeetings の並び）。
 */
export function pickMeeting(meetings: Meeting[], now: number): { meeting: Meeting; past: boolean } | null {
  const next = meetings.find((m) => m.startsAt >= now - STILL_NOW_MS);
  if (next) return { meeting: next, past: false };
  const last = meetings[meetings.length - 1];
  return last ? { meeting: last, past: true } : null;
}

// ---------------------------------------------------------------- 運営の画面

/** 見える範囲の回を全部、新しい順に（第13.5節）。 */
export async function staffMeetings(db: Db, me: CurrentUser): Promise<(Meeting & { cohortName: string })[]> {
  const scope = visibleUsers(me);
  const rows = await db
    .prepare(
      `SELECT ${COLUMNS}, u.name AS cohort_name
         FROM meetings m ${SCOPE_JOIN}
        WHERE ${scope.where}
        ORDER BY m.starts_at DESC, m.id DESC`,
    )
    .bind(...scope.binds)
    .all<MeetingRow & { cohort_name: string }>();
  return rows.results.map((row) => ({ ...toMeeting(row), cohortName: row.cohort_name }));
}

/** 範囲の中の1回。範囲の外か、無ければ null。 */
export async function staffMeeting(db: Db, me: CurrentUser, id: number): Promise<Meeting | null> {
  const scope = visibleUsers(me);
  const row = await db
    .prepare(`SELECT ${COLUMNS} FROM meetings m ${SCOPE_JOIN} WHERE m.id = ? AND ${scope.where}`)
    .bind(id, ...scope.binds)
    .first<MeetingRow>();
  return row ? toMeeting(row) : null;
}

/** 回を書いてよい所属。運営なら自分の所属1つ、管理者なら全部（第13.5節）。 */
export async function writableCohorts(db: Db, me: CurrentUser): Promise<{ code: string; name: string }[]> {
  const scope = visibleUsers(me);
  const rows = await db
    .prepare(
      `SELECT u.cohort_code AS code, u.name FROM (SELECT code AS cohort_code, name FROM cohorts) u
        WHERE ${scope.where} ORDER BY u.cohort_code`,
    )
    .bind(...scope.binds)
    .all<{ code: string; name: string }>();
  return rows.results;
}
