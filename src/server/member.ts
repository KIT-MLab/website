/**
 * メンバーの画面と活動の記録が共通で使うもの（20-platform.md 第13章）。
 *
 * ・誰がメンバーか（第13.1節）
 * ・日本時間での日時の出し方と、週の区切り（第13.3節・第13.7節）
 * ・節の id から「7.2 形と2次元配列」とリンクを作る表
 *
 * **日時は必ず Asia/Tokyo で出す。**Worker は UTC で動くので、`timeZone` を渡し忘れると
 * 朝9時より前の予定が前の日の日付で出る。ここを通さずに日時を文字にしないこと。
 */
import type { CurrentUser } from './auth';
import { lessonHref, practiceSectionLabel } from '../lesson/chapters';

// ---------------------------------------------------------------- メンバー

/**
 * メンバー = 所属の kind が internal、または ロールが staff か admin（第13.1節）。
 * 画面（/api/me の `member`）とメンバーの画面の判定はこれだけを見る。
 */
export function isMember(user: Pick<CurrentUser, 'role' | 'cohort'>): boolean {
  return user.cohort.kind === 'internal' || user.role === 'staff' || user.role === 'admin';
}

/**
 * 上の isMember を SQL の条件にしたもの。`users` を `u`、`cohorts` を `c` という別名で
 * 繋いだ問い合わせに挟む。**isMember を直したらここも直すこと。**
 * 運営の「活動」の画面で、メンバーでない人の行を LIMIT の前に落とすために要る。
 */
export const MEMBER_WHERE = "(c.kind = 'internal' OR u.role IN ('staff', 'admin'))";

// ---------------------------------------------------------------- 日本時間

const TZ = 'Asia/Tokyo';
const HOUR_MS = 60 * 60 * 1000;
const DAY_MS = 24 * HOUR_MS;
/** 日本時間は UTC より9時間進んでいる。夏時間は無い */
const JST_OFFSET_MS = 9 * HOUR_MS;

const dateTimeFormat = new Intl.DateTimeFormat('ja-JP', {
  timeZone: TZ,
  month: 'numeric',
  day: 'numeric',
  weekday: 'short',
  hour: 'numeric',
  minute: '2-digit',
  hourCycle: 'h23',
});

const formFormat = new Intl.DateTimeFormat('en-CA', {
  timeZone: TZ,
  year: 'numeric',
  month: '2-digit',
  day: '2-digit',
  hour: '2-digit',
  minute: '2-digit',
  hourCycle: 'h23',
});

function parts(format: Intl.DateTimeFormat, ms: number): Record<string, string> {
  const out: Record<string, string> = {};
  for (const part of format.formatToParts(ms)) out[part.type] = part.value;
  return out;
}

/** `10月1日（木）18:00`（第13.3節の表記）。 */
export function jstDateTime(ms: number): string {
  const p = parts(dateTimeFormat, ms);
  return `${p.month}月${p.day}日（${p.weekday}）${p.hour}:${p.minute}`;
}

/** `10月1日（木）`。これまでの回の「日付」に使う。 */
export function jstDate(ms: number): string {
  const p = parts(dateTimeFormat, ms);
  return `${p.month}月${p.day}日（${p.weekday}）`;
}

/** 編集の欄に入れる値。`{ date: '2026-10-01', time: '18:00' }`（日本時間）。 */
export function jstFormValues(ms: number): { date: string; time: string } {
  const p = parts(formFormat, ms);
  return { date: `${p.year}-${p.month}-${p.day}`, time: `${p.hour}:${p.minute}` };
}

/**
 * 日付と時刻の欄（日本時間）をミリ秒（UTC）にする。読めなければ null。
 * 2月30日のような存在しない日は、Date が繰り上げた結果と突き合わせて断る。
 */
export function parseJst(date: string, time: string): number | null {
  const d = /^(\d{4})-(\d{2})-(\d{2})$/.exec(date.trim());
  const t = /^(\d{1,2}):(\d{2})$/.exec(time.trim());
  if (!d || !t) return null;
  const [y, mo, da, h, mi] = [Number(d[1]), Number(d[2]), Number(d[3]), Number(t[1]), Number(t[2])];
  if (h > 23 || mi > 59) return null;
  const local = Date.UTC(y, mo - 1, da, h, mi);
  const check = new Date(local);
  if (check.getUTCFullYear() !== y || check.getUTCMonth() !== mo - 1 || check.getUTCDate() !== da) return null;
  return local - JST_OFFSET_MS;
}

/** その時刻を含む週の始まり（月曜0時、日本時間）をミリ秒（UTC）で返す（第13.7節）。 */
export function weekStart(ms: number): number {
  const local = ms + JST_OFFSET_MS;
  const dayStart = Math.floor(local / DAY_MS) * DAY_MS;
  // 1970-01-01 は木曜。月曜を0として数えると (日数 + 3) % 7
  const sinceMonday = (Math.floor(local / DAY_MS) + 3) % 7;
  return dayStart - sinceMonday * DAY_MS - JST_OFFSET_MS;
}

export const WEEK_MS = 7 * DAY_MS;

/** 分の数 → `1時間10分`（第13.7節）。1時間未満は `25分`、ちょうどなら `2時間`。 */
export function durationLabel(minutes: number): string {
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  if (h === 0) return `${m}分`;
  return m === 0 ? `${h}時間` : `${h}時間${m}分`;
}

// ---------------------------------------------------------------- 節の呼び方

export type LessonRef = { no: string; title: string; href: string };

/**
 * 節の id → `{ no: '7.2', title, href }`。
 *
 * 渡す一覧は節の並び順（ファイル名の順）であること。節の番号は章ごとに1から数える
 * （運営の画面の sectionNumbers と同じ数え方）。章の番号はディレクトリ名の頭の数字。
 * 練習編（04p-practice1 など）は `練習1-2` になる（20-platform.md 第15.1節）。
 */
export function lessonIndex(
  ordered: { entryId: string; lessonId: string; chapter: string; title: string }[],
): Map<string, LessonRef> {
  const out = new Map<string, LessonRef>();
  const count = new Map<string, number>();
  for (const lesson of ordered) {
    const n = (count.get(lesson.chapter) ?? 0) + 1;
    count.set(lesson.chapter, n);
    const chapterNo = Number.parseInt(lesson.chapter, 10);
    // 練習編は「練習1-2」と呼ぶ（第15.1節）。頭の数字（04p の 4）で「4.2」にしない
    const practice = practiceSectionLabel(lesson.chapter, n);
    out.set(lesson.lessonId, {
      no: practice ?? (Number.isNaN(chapterNo) ? String(n) : `${chapterNo}.${n}`),
      title: lesson.title,
      href: lessonHref(lesson.entryId),
    });
  }
  return out;
}
