/**
 * 「みんなの進み具合（運営だけ）」の表（design/spec/53-ml-intro.md 第11節。2026-09-29 決定）。
 *
 * タイタニック演習の節と今週の演習のページの上に、運営として見ているときだけ出す。
 * 行は見ている運営の所属のメンバー、列はそのページの課題（ページに出ている番号の順）。
 * マスは ✓（通した）・×n（まだ通していない。落ちた回数）・–（まだ）。最後の「いま」は、その人がいちばん最近
 * 手を動かしたところ（提出か、活動した分のどちらか新しいほう）。
 *
 * **数えるのは学習者の側の記録だけ**（mode = 'learner'。20-platform.md 第26章）。マスは今週の演習の運営の表
 * （src/server/weekly.ts の weeklyBoard）と同じ問い合わせを使い、メンバーの行だけを残す。
 * 範囲（見てよい所属か）は呼ぶ側が決める。ここに渡す所属は、見ている運営の所属だけにすること。
 */
import type { Db } from './auth';
import { MEMBER_WHERE } from './member';
import { weeklyBoard, type WeeklyBoardCell } from './weekly';

/** 「いま」に出すための、ページの短い呼び名（節は「タイタニック2」「1.2」、今週の演習は「今週の演習 9/29」） */
export type PageNames = Map<string, string>;

export type LivePerson = {
  displayName: string;
  cells: WeeklyBoardCell[];
  /** いちばん最近手を動かしたところ。記録が無ければ null */
  now: { label: string; at: number } | null;
};

export type LiveProgress = { columns: string[]; people: LivePerson[]; serverNow: number };

/** 内部の呼び名 → 列の頭の短い札（確認1・練習2・演習3。ページの帯の「確認問題1」などを縮めたもの） */
const SHORT: Record<string, string> = { choose: '確認', modify: '練習', type: '練習', build: '演習', trace: '例題' };

export function columnLabel(kind: string, at: number): string {
  return `${SHORT[kind] ?? '問'}${at}`;
}

type Latest = { user_id: string; ref: string; at: number };

/**
 * 表の材料。`exerciseIds` はページの課題の並び、`kinds` は同じ並びの課題の種類、`pageId` はこのページの id。
 * `homes` は課題の id → どのページか（節の id・今週の演習の id・練習問題集の話題の id。「いま」がほかのページのときに使う）。
 */
export async function liveProgress(
  db: Db,
  cohortCode: string,
  pageId: string,
  exerciseIds: string[],
  kinds: string[],
  homes: Map<string, string>,
  names: PageNames,
  now: number,
): Promise<LiveProgress> {
  const columns = exerciseIds.map((_, i) => columnLabel(kinds[i] ?? '', i + 1));

  const members = await db
    .prepare(
      `SELECT u.id FROM users u JOIN cohorts c ON c.code = u.cohort_code
        WHERE u.cohort_code = ? AND ${MEMBER_WHERE}`,
    )
    .bind(cohortCode)
    .all<{ id: string }>();
  const memberIds = new Set(members.results.map((r) => r.id));

  const board = await weeklyBoard(db, cohortCode, exerciseIds);

  // 1人1行: いちばん新しい提出と、いちばん新しい活動した分（SQLite は MAX と同じ行の列を返す）
  const subs = await db
    .prepare(
      `SELECT s.user_id, s.exercise_id AS ref, MAX(s.created_at) AS at
         FROM submissions s JOIN users u ON u.id = s.user_id
        WHERE u.cohort_code = ? AND s.mode = 'learner'
        GROUP BY s.user_id`,
    )
    .bind(cohortCode)
    .all<Latest>();
  const acts = await db
    .prepare(
      `SELECT a.user_id, a.lesson_id AS ref, MAX(a.minute) AS at
         FROM activity_minutes a JOIN users u ON u.id = a.user_id
        WHERE u.cohort_code = ? AND a.mode = 'learner'
        GROUP BY a.user_id`,
    )
    .bind(cohortCode)
    .all<Latest>();
  const lastSub = new Map(subs.results.map((r) => [r.user_id, r]));
  const lastAct = new Map(acts.results.map((r) => [r.user_id, r]));

  const pageName = (page: string) => (page === pageId ? 'このページ' : page === 'home' ? 'マイページ' : (names.get(page) ?? 'ほかのページ'));

  const people: LivePerson[] = board.people
    .filter((p) => memberIds.has(p.userId))
    .map((p) => {
      const sub = lastSub.get(p.userId);
      const act = lastAct.get(p.userId);
      let current: LivePerson['now'] = null;
      // 活動した分は分の始まりの時刻。同じ分の中の提出があれば、どの問題かが分かる提出のほうを採る
      if (sub && (!act || sub.at >= act.at)) {
        const home = homes.get(sub.ref);
        const i = exerciseIds.indexOf(sub.ref);
        const label = i >= 0 ? columns[i] : home ? pageName(home) : 'ほかのページ';
        current = { label, at: sub.at };
      } else if (act) {
        current = { label: pageName(act.ref), at: act.at };
      }
      return { displayName: p.displayName, cells: p.cells, now: current };
    });

  return { columns, people, serverNow: now };
}
