/**
 * つまずきの記録（design/spec/55-stumbles.md 第5節。2026-10-02 決定）の数え方。
 *
 * **数え方はここに1つだけ置く。**運営の画面（/staff/stumbles/）の表も、書き出し
 * （/api/staff/stumbles-export）も、`buildStumbles` が作った同じ材料から作る。
 *
 * この module は**データベースも教材も読まない**（何も import しない）。行は呼ぶ側
 * （src/server/stumbles-data.ts）が引いて渡す。手で作った行を渡して確かめられるようにするため
 * （src/server/stumbles.test.ts。`node --test src/server/stumbles.test.ts`）。
 *
 * 時刻はすべてミリ秒。
 */

const MINUTE_MS = 60000;
const DAY_MS = 24 * 60 * MINUTE_MS;
/** 落ちたあと、通さないまま読み直しを待つ長さ（第5.3節） */
const REREAD_WINDOW_MS = DAY_MS;
/** 書き出しで1人・1課題につき出す提出の数（新しいほうから） */
const MAX_ATTEMPTS = 20;
/** 書き出しで1件のコードを切る長さ（字数） */
const CODE_MAX = 4000;

// ---------------------------------------------------------------- 材料の形

/** 提出1件（submissions の1行。学習者の側・見える範囲のメンバーだけ） */
export type StumbleSubmission = {
  userId: string;
  exerciseId: string;
  passed: boolean;
  /** 落ちたテストの番号（0から。記録のまま）。無ければ null */
  failedTest: number | null;
  errorType: string | null;
  code: string;
  at: number;
};

/** 活動した分1行（activity_minutes の1行） */
export type StumbleMinute = { userId: string; minute: number; lessonId: string; exerciseId: string };

/** 課題の呼び方と、どのページの課題か */
export type ExerciseInfo = { label: string; page: string; href: string };

/** 教材の節の呼び方と目安（分）。`order` は教材の中の並び（小さいほうが前の節） */
export type SectionInfo = { label: string; href: string; estimateMinutes: number; order: number };

/**
 * 課題と節の表。`sections` に入っているものだけが「教材の節」（今週の演習・練習問題集・メンバーの画面は入れない）。
 * 教材から消えた課題は `exercises` に無い。そのときは id をそのまま呼び名にする。
 */
export type StumbleCatalog = { exercises: Map<string, ExerciseInfo>; sections: Map<string, SectionInfo> };

export type ExercisePerson = {
  user: string;
  passed: boolean;
  /** 通すまでに落ちた回数。通していなければ落ちた回数ぜんぶ */
  failsBeforePass: number;
  /** その課題に取り組んでいた分の数（activity_minutes.exercise_id） */
  minutes: number;
  /** 古い順。ぜんぶ（書き出しで新しいほうから20件に切る） */
  attempts: StumbleSubmission[];
};

export type ExerciseStumble = {
  exerciseId: string;
  label: string;
  page: string;
  href: string;
  people: ExercisePerson[];
  submitted: number;
  passed: number;
  medianFails: number;
  /** 取り組んでいた分の記録がある人だけの中央の値。誰にも記録が無ければ null（この仕様より前の記録には無い） */
  medianMinutes: number | null;
  /** 多い落ち方。多い順に2つまで */
  topFails: { mode: string; count: number }[];
};

export type SectionPerson = { user: string; minutes: number; rereadAfterFail: string[] };

export type SectionStumble = {
  lessonId: string;
  label: string;
  href: string;
  estimateMinutes: number;
  people: SectionPerson[];
  readers: number;
  medianMinutes: number;
  /** 落ちたあとに読み直された回数（人・課題の組の数） */
  rereads: number;
  /** 読み直しのきっかけになった課題。多い順に3つまで */
  topTriggers: { exerciseId: string; label: string; count: number }[];
};

export type Stumbles = { exercises: ExerciseStumble[]; sections: SectionStumble[] };

// ---------------------------------------------------------------- 期間

/** 期間の切り替え（第5.1節）。7・28 の日数か、'all'。読めなければ初めの「この4週」 */
export type Days = 7 | 28 | 'all';

export function parseDays(raw: string | null | undefined): Days {
  if (raw === '7') return 7;
  if (raw === 'all') return 'all';
  return 28;
}

/** 期間の始まり。'all' なら 0（全部） */
export function periodStart(days: Days, now: number): number {
  return days === 'all' ? 0 : now - days * DAY_MS;
}

// ---------------------------------------------------------------- 小さな数え方

/** 中央の値。数が偶数なら真ん中の2つの平均。空なら null */
export function median(values: number[]): number | null {
  if (values.length === 0) return null;
  const sorted = [...values].sort((a, b) => a - b);
  const mid = Math.floor(sorted.length / 2);
  return sorted.length % 2 === 1 ? sorted[mid] : (sorted[mid - 1] + sorted[mid]) / 2;
}

/** 通すまでに落ちた回数。`attempts` は古い順。通していなければ落ちた回数ぜんぶ */
export function failsBeforePass(attempts: { passed: boolean }[]): number {
  let fails = 0;
  for (const a of attempts) {
    if (a.passed) return fails;
    fails += 1;
  }
  return fails;
}

/**
 * 落ち方（第5.2節）。エラーの種類があればそれ、無ければ「テストn で不一致」。
 * n は学習者の画面の「ケースn」と同じ1からの番号（記録は0から）。
 * テストの番号も無い落ち方（使ってはいけない書き方・貼り付けが無い）は「テストの外で不合格」。
 */
export function failMode(s: { failedTest: number | null; errorType: string | null }): string {
  if (s.errorType) return s.errorType;
  if (s.failedTest !== null) return `テスト${s.failedTest + 1} で不一致`;
  return 'テストの外で不合格';
}

/** 数えたものを多い順に `limit` 個まで。同じ数なら先に出てきたほう */
function top(counts: Map<string, number>, limit: number): [string, number][] {
  return [...counts].sort((a, b) => b[1] - a[1]).slice(0, limit);
}

function bump(counts: Map<string, number>, key: string): void {
  counts.set(key, (counts.get(key) ?? 0) + 1);
}

// ---------------------------------------------------------------- 落ちたあとに読み直した

export type Reread = { userId: string; exerciseId: string; lessonId: string };

/**
 * 落ちたあとに読み直した（第5.3節）。
 *
 * ある人が課題 E を落とした時刻 t から、「その人が E を通した時刻」と「t から24時間」の早いほうまでの間に、
 * E が載っているページとは別の教材の節 L で活動した分が1つでもあれば「E のあとに L を読み直した」を1回。
 * 同じ人・同じ E・同じ L は何度行き来しても1回。落としていない人は数えない。
 * E が教材の節の課題のときは、その節より**前の節**だけを数える（通さないまま先の節へ進んだのは、読み直しではない）。
 *
 * 活動した分は分の始まりの時刻なので、t を含む分（始まりが t より前でも、終わりが t より後）から数える。
 * 区切りの時刻ちょうどに始まる分は数えない。
 */
export function rereadsAfterFail(
  subs: StumbleSubmission[],
  minutes: StumbleMinute[],
  catalog: StumbleCatalog,
): Reread[] {
  const minutesByUser = new Map<string, StumbleMinute[]>();
  for (const m of minutes) {
    if (!catalog.sections.has(m.lessonId)) continue;
    const list = minutesByUser.get(m.userId) ?? [];
    list.push(m);
    minutesByUser.set(m.userId, list);
  }

  const seen = new Set<string>();
  const out: Reread[] = [];
  for (const fail of subs) {
    if (fail.passed) continue;
    const reads = minutesByUser.get(fail.userId);
    if (!reads) continue;
    let end = fail.at + REREAD_WINDOW_MS;
    for (const s of subs) {
      if (s.passed && s.userId === fail.userId && s.exerciseId === fail.exerciseId && s.at > fail.at && s.at < end) end = s.at;
    }
    const page = catalog.exercises.get(fail.exerciseId)?.page ?? '';
    const pageOrder = catalog.sections.get(page)?.order;
    for (const m of reads) {
      if (m.lessonId === page) continue;
      if (pageOrder !== undefined && catalog.sections.get(m.lessonId)!.order > pageOrder) continue;
      if (m.minute + MINUTE_MS <= fail.at || m.minute >= end) continue;
      const key = `${fail.userId}\n${fail.exerciseId}\n${m.lessonId}`;
      if (seen.has(key)) continue;
      seen.add(key);
      out.push({ userId: fail.userId, exerciseId: fail.exerciseId, lessonId: m.lessonId });
    }
  }
  return out;
}

// ---------------------------------------------------------------- 全体

/**
 * 表と書き出しの材料（第5.2節・第5.3節・第5.4節）。`since` より前の提出・活動した分は数えない。
 *
 * 課題ごと: 期間の中に提出が1つでもあった課題。並びは落ちた回数（中央）の多い順、同じなら通していない人の多い順。
 * 節ごと: 期間の中に活動した分が1つでもあった教材の節。並びは落ちたあとに読み直された回数の多い順、
 * 同じなら「かかった分（中央）÷ 目安」の大きい順。
 */
export function buildStumbles(
  allSubs: StumbleSubmission[],
  allMinutes: StumbleMinute[],
  catalog: StumbleCatalog,
  since: number,
): Stumbles {
  const subs = allSubs.filter((s) => s.at >= since).sort((a, b) => a.at - b.at);
  const minutes = allMinutes.filter((m) => m.minute >= since);

  // --- 課題ごと
  const exMinutes = new Map<string, number>(); // 課題\n人 → 分の数
  for (const m of minutes) if (m.exerciseId) bump(exMinutes, `${m.exerciseId}\n${m.userId}`);

  const byExercise = new Map<string, Map<string, StumbleSubmission[]>>();
  for (const s of subs) {
    const people = byExercise.get(s.exerciseId) ?? new Map<string, StumbleSubmission[]>();
    const list = people.get(s.userId) ?? [];
    list.push(s);
    people.set(s.userId, list);
    byExercise.set(s.exerciseId, people);
  }

  const exercises: ExerciseStumble[] = [];
  for (const [exerciseId, peopleMap] of byExercise) {
    const info = catalog.exercises.get(exerciseId);
    const people: ExercisePerson[] = [...peopleMap].map(([user, attempts]) => ({
      user,
      passed: attempts.some((a) => a.passed),
      failsBeforePass: failsBeforePass(attempts),
      minutes: exMinutes.get(`${exerciseId}\n${user}`) ?? 0,
      attempts,
    }));
    const modes = new Map<string, number>();
    for (const p of people) for (const a of p.attempts) if (!a.passed) bump(modes, failMode(a));
    exercises.push({
      exerciseId,
      label: info?.label ?? exerciseId,
      page: info?.page ?? '',
      href: info?.href ?? '',
      people,
      submitted: people.length,
      passed: people.filter((p) => p.passed).length,
      medianFails: median(people.map((p) => p.failsBeforePass)) ?? 0,
      medianMinutes: median(people.filter((p) => p.minutes > 0).map((p) => p.minutes)),
      topFails: top(modes, 2).map(([mode, count]) => ({ mode, count })),
    });
  }
  exercises.sort((a, b) => b.medianFails - a.medianFails || b.submitted - b.passed - (a.submitted - a.passed));

  // --- 節ごと
  const rereads = rereadsAfterFail(subs, minutes, catalog);
  const bySection = new Map<string, Map<string, number>>(); // 節 → 人 → 分の数
  for (const m of minutes) {
    if (!catalog.sections.has(m.lessonId)) continue;
    const people = bySection.get(m.lessonId) ?? new Map<string, number>();
    bump(people, m.userId);
    bySection.set(m.lessonId, people);
  }

  const sections: SectionStumble[] = [];
  for (const [lessonId, peopleMap] of bySection) {
    const info = catalog.sections.get(lessonId)!;
    const mine = rereads.filter((r) => r.lessonId === lessonId);
    const people: SectionPerson[] = [...peopleMap].map(([user, n]) => ({
      user,
      minutes: n,
      rereadAfterFail: mine.filter((r) => r.userId === user).map((r) => r.exerciseId),
    }));
    const triggers = new Map<string, number>();
    for (const r of mine) bump(triggers, r.exerciseId);
    sections.push({
      lessonId,
      label: info.label,
      href: info.href,
      estimateMinutes: info.estimateMinutes,
      people,
      readers: people.length,
      medianMinutes: median(people.map((p) => p.minutes)) ?? 0,
      rereads: mine.length,
      topTriggers: top(triggers, 3).map(([exerciseId, count]) => ({
        exerciseId,
        label: catalog.exercises.get(exerciseId)?.label ?? exerciseId,
        count,
      })),
    });
  }
  const ratio = (s: SectionStumble) => (s.estimateMinutes > 0 ? s.medianMinutes / s.estimateMinutes : 0);
  sections.sort((a, b) => b.rereads - a.rereads || ratio(b) - ratio(a));

  return { exercises, sections };
}

// ---------------------------------------------------------------- 書き出し

/** コードを字数（符号位置）で切る。src/pages/api/submit.ts の切り方と同じ考え方（印は付けない） */
function clip(code: string): string {
  if (code.length <= CODE_MAX) return code;
  return [...code].slice(0, CODE_MAX).join('');
}

/**
 * 書き出しの JSON（第5.4節）。**名前（表示名）は入れない。利用者の id だけ。**
 * `attempts` は古い順で、1人・1課題につき新しいほうから20件まで。
 */
export function toExport(data: Stumbles, days: Days, now: number) {
  return {
    exportedAt: now,
    days,
    exercises: data.exercises.map((e) => ({
      exerciseId: e.exerciseId,
      label: e.label,
      page: e.page,
      people: e.people.map((p) => ({
        user: p.user,
        passed: p.passed,
        failsBeforePass: p.failsBeforePass,
        minutes: p.minutes,
        attempts: p.attempts.slice(-MAX_ATTEMPTS).map((a) => ({
          at: a.at,
          passed: a.passed,
          failedTest: a.failedTest,
          errorType: a.errorType ?? '',
          code: clip(a.code),
        })),
      })),
    })),
    sections: data.sections.map((s) => ({
      lessonId: s.lessonId,
      label: s.label,
      estimateMinutes: s.estimateMinutes,
      people: s.people.map((p) => ({ user: p.user, minutes: p.minutes, rereadAfterFail: p.rereadAfterFail })),
    })),
  };
}
