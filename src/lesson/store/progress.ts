/**
 * 進度と提出の記録（20-platform.md 第6.1節・第6.2節）。
 *
 * 置き場の本体は D1 だが、**画面が読むのは常に手元の控え**である。
 *
 *   画面 ──書く──▶ 手元（localStorage）──送る──▶ D1
 *    ▲                  │
 *    └────── 読む ───────┘
 *
 * 会場の回線が落ちても学習が止まらないこと、節を開くたびにサーバへ問い合わせないこと、
 * 送信に失敗しても消えないこと。この3つのために、書くのは必ず手元が先になる。
 *
 * 手元の控えは2つのものを持つ（第6.2節）。
 *
 *   owner … この控えが誰のものか。null なら「まだ誰のものでもない」。
 *           **null のときは1件も送らない。**入っていない人の進度は受けない（第9章の12）
 *   sent  … 節ごと・提出ごとに付ける「もう送った」の印。付いていないものだけを送るので、
 *           同じものを二度送らない
 *
 * 読み書きはすべて Promise で返す。localStorage は同期だが、D1 に寄せた実装へ
 * 差し替えるときに呼ぶ側を書き換えずに済むようにしてある。
 */

export type LessonState = 'none' | 'opened' | 'done';

export type Submission = {
  lessonId: string;
  exerciseId: string;
  /** 提出したコードそのまま。運営が読むので整形しない（第8.4節） */
  code: string;
  passed: boolean;
  /** 落ちたテストの番号。0始まり。通ったときは null */
  failedTest: number | null;
  /** 'NameError' など。エラーが出なかったときは null */
  errorType: string | null;
  at: number;
};

export type ExerciseResult = {
  passed: boolean;
  /** 落ちた回数。ヒントを出す判断に使う（第4.3節） */
  fails: number;
};

/** `GET /api/me` が返す節の形。 */
export type RemoteLesson = {
  lessonId: string;
  state: string;
  openedAt: number;
  doneAt: number | null;
  seconds: number;
};

/** `GET /api/me` が返す課題の結果の形（提出の記録から毎回作り直される。第6.1節）。 */
export type RemoteExercise = {
  exerciseId: string;
  passed: boolean;
  fails: number;
};

export interface ProgressStore {
  /** 節を開いた */
  openLesson(lessonId: string): Promise<void>;
  /** 節の課題を全部通した */
  finishLesson(lessonId: string): Promise<void>;
  lessonStates(lessonIds: string[]): Promise<Record<string, LessonState>>;
  /** 採点を1回走らせたら必ず呼ぶ */
  recordSubmission(submission: Submission): Promise<void>;
  exerciseResult(exerciseId: string): Promise<ExerciseResult>;

  owner(): Promise<string | null>;
  /** 手元を空にして owner を立てる（ログインする前の記録のとき・別の人のとき。第14.5節） */
  reset(userId: string | null): Promise<void>;
  /** サーバから引き写して合わせる（合わせ方は第6.1節の表） */
  merge(remote: { progress: RemoteLesson[]; exercises: RemoteExercise[] }): Promise<void>;
  /** 未送信を送る。全部送れたら true */
  flush(): Promise<boolean>;
  /** 節に滞在した秒数を足す */
  addSeconds(lessonId: string, seconds: number): Promise<void>;
}

type SavedLesson = {
  state: LessonState;
  openedAt: number;
  doneAt: number | null;
  /** 滞在の合計（秒）。合わせるときは大きいほうを採る。足さない（第6.1節） */
  seconds: number;
  sent: boolean;
};

type SavedSubmission = Submission & { sent: boolean };

type Saved = {
  owner: string | null;
  lessons: Record<string, SavedLesson>;
  exercises: Record<string, ExerciseResult>;
  submissions: SavedSubmission[];
};

const KEY = 'kit-lesson-progress-v1';
const MAX_SUBMISSIONS = 200;

/** POST には必ず付ける（第7.1節）。付けないと Astro が 403 を返す。 */
const JSON_HEADERS = { 'content-type': 'application/json' };

/**
 * `keepalive` を付けられる本文の長さ。
 *
 * 節を離れるときの送信はページが消える途中で走るので、`keepalive` が無いと打ち切られる。
 * ただし `keepalive` の本文には 64KB の上限があり、超えると **fetch がその場で失敗する**。
 * 引き継ぎでまとめて送るときは超えうるので、長い束にだけ付けない。そちらは画面が
 * 生きている間に送るものなので、打ち切られる心配がない。
 */
const KEEPALIVE_MAX = 60000;

function emptySaved(): Saved {
  return { owner: null, lessons: {}, exercises: {}, submissions: [] };
}

function toNumber(value: unknown, fallback: number): number {
  return typeof value === 'number' && Number.isFinite(value) ? value : fallback;
}

/**
 * 手元の控えを読む。
 *
 * 古い形（owner も sent も seconds も無い v1）が残っていても読めるようにしてある。
 * owner が無いものは「まだ誰のものでもない」、sent が無いものは「まだ送っていない」に
 * 倒す。**送ったことにして倒すと、記録が一度もサーバへ行かないまま消える。**
 */
function read(): Saved {
  if (typeof localStorage === 'undefined') return emptySaved();
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) return emptySaved();
    const parsed = JSON.parse(raw) as Partial<Saved>;

    const lessons: Record<string, SavedLesson> = {};
    for (const [id, value] of Object.entries(parsed.lessons ?? {})) {
      const row = value as Partial<SavedLesson>;
      lessons[id] = {
        state: row.state === 'done' ? 'done' : 'opened',
        openedAt: toNumber(row.openedAt, Date.now()),
        doneAt: typeof row.doneAt === 'number' ? row.doneAt : null,
        seconds: Math.max(0, Math.floor(toNumber(row.seconds, 0))),
        sent: row.sent === true,
      };
    }

    const submissions: SavedSubmission[] = [];
    for (const value of parsed.submissions ?? []) {
      const row = value as Partial<SavedSubmission>;
      if (typeof row.exerciseId !== 'string' || typeof row.at !== 'number') continue;
      submissions.push({
        lessonId: String(row.lessonId ?? ''),
        exerciseId: row.exerciseId,
        code: String(row.code ?? ''),
        passed: row.passed === true,
        failedTest: typeof row.failedTest === 'number' ? row.failedTest : null,
        errorType: typeof row.errorType === 'string' ? row.errorType : null,
        at: row.at,
        sent: row.sent === true,
      });
    }

    return {
      owner: typeof parsed.owner === 'string' ? parsed.owner : null,
      lessons,
      exercises: parsed.exercises ?? {},
      submissions,
    };
  } catch {
    return emptySaved();
  }
}

function write(saved: Saved): void {
  if (typeof localStorage === 'undefined') return;
  try {
    localStorage.setItem(KEY, JSON.stringify(saved));
  } catch {
    /* 容量超過や保存禁止のときは黙って諦める。学習そのものは続けられる */
  }
}

/**
 * 送る。**投げっぱなしにせず、通ったかどうかだけを返す。**
 * 通らなかったら手元に残るだけで、画面には何も起きない（学習を止めない）。
 */
async function post(path: string, body: unknown): Promise<boolean> {
  try {
    const text = JSON.stringify(body);
    const res = await fetch(path, {
      method: 'POST',
      headers: JSON_HEADERS,
      body: text,
      keepalive: text.length < KEEPALIVE_MAX,
    });
    return res.ok;
  } catch {
    return false;
  }
}

/** 2つの時刻のうち早いほう。片方が無ければもう片方（NULL に引きずられないため）。 */
function earlier(a: number | null, b: number | null): number | null {
  if (a === null) return b;
  if (b === null) return a;
  return Math.min(a, b);
}

class LocalProgressStore implements ProgressStore {
  async openLesson(lessonId: string): Promise<void> {
    const saved = read();
    if (saved.lessons[lessonId]) return;
    saved.lessons[lessonId] = { state: 'opened', openedAt: Date.now(), doneAt: null, seconds: 0, sent: false };
    write(saved);
  }

  async finishLesson(lessonId: string): Promise<void> {
    const saved = read();
    const base: SavedLesson = saved.lessons[lessonId] ?? {
      state: 'opened',
      openedAt: Date.now(),
      doneAt: null,
      seconds: 0,
      sent: false,
    };
    // 既に done で時刻も入っているなら、中身は変わらない。送った印もそのまま残す
    // （変わっていないものを送り直さないため）
    const changed = base.state !== 'done' || base.doneAt === null;
    saved.lessons[lessonId] = {
      ...base,
      state: 'done',
      doneAt: base.doneAt ?? Date.now(),
      sent: changed ? false : base.sent,
    };
    write(saved);
  }

  async lessonStates(lessonIds: string[]): Promise<Record<string, LessonState>> {
    const saved = read();
    const out: Record<string, LessonState> = {};
    for (const id of lessonIds) out[id] = saved.lessons[id]?.state ?? 'none';
    return out;
  }

  async recordSubmission(submission: Submission): Promise<void> {
    const saved = read();
    // 提出があるのに節の記録が無い、という形にしない。出たあと（手元を空にしたあと）
    // 読み続けて課題を通すとこうなる。節が欠けると、右レールの印も付かず、
    // 入り直したときの「手元に進度があるか」（第6.2節）にも数えられない
    if (submission.lessonId !== '' && !saved.lessons[submission.lessonId]) {
      saved.lessons[submission.lessonId] = {
        state: 'opened',
        openedAt: Date.now(),
        doneAt: null,
        seconds: 0,
        sent: false,
      };
    }
    saved.submissions.push({ ...submission, sent: false });
    if (saved.submissions.length > MAX_SUBMISSIONS) {
      saved.submissions = saved.submissions.slice(-MAX_SUBMISSIONS);
    }
    const current = saved.exercises[submission.exerciseId] ?? { passed: false, fails: 0 };
    saved.exercises[submission.exerciseId] = {
      passed: current.passed || submission.passed,
      fails: submission.passed ? current.fails : current.fails + 1,
    };
    write(saved);
  }

  async exerciseResult(exerciseId: string): Promise<ExerciseResult> {
    const saved = read();
    return saved.exercises[exerciseId] ?? { passed: false, fails: 0 };
  }

  async owner(): Promise<string | null> {
    return read().owner;
  }

  async reset(userId: string | null): Promise<void> {
    write({ ...emptySaved(), owner: userId });
  }

  /**
   * サーバの記録を手元へ引き写す。合わせ方は第6.1節の表のとおり。
   *
   *   節の状態     … done が opened に勝つ
   *   開いた時刻   … 早いほう
   *   滞在の秒数   … 大きいほう。足さない
   *   課題の結果   … passed は1回でもあれば通った。fails は大きいほう
   *
   * 引き写して**増えた**節には送った印を付ける（サーバに既にあるものなので）。
   * 元からあった節の印は触らない。未送信のまま残っているものは、次の flush で送る。
   */
  async merge(remote: { progress: RemoteLesson[]; exercises: RemoteExercise[] }): Promise<void> {
    const saved = read();

    for (const row of remote.progress ?? []) {
      const id = String(row?.lessonId ?? '');
      if (id === '') continue;
      const state: LessonState = row.state === 'done' ? 'done' : 'opened';
      const openedAt = toNumber(row.openedAt, Date.now());
      const doneAt = typeof row.doneAt === 'number' ? row.doneAt : null;
      const seconds = Math.max(0, Math.floor(toNumber(row.seconds, 0)));

      const current = saved.lessons[id];
      if (!current) {
        saved.lessons[id] = { state, openedAt, doneAt, seconds, sent: true };
        continue;
      }
      saved.lessons[id] = {
        state: current.state === 'done' || state === 'done' ? 'done' : 'opened',
        openedAt: Math.min(current.openedAt, openedAt),
        doneAt: earlier(current.doneAt, doneAt),
        seconds: Math.max(current.seconds, seconds),
        sent: current.sent,
      };
    }

    for (const row of remote.exercises ?? []) {
      const id = String(row?.exerciseId ?? '');
      if (id === '') continue;
      const current = saved.exercises[id] ?? { passed: false, fails: 0 };
      saved.exercises[id] = {
        passed: current.passed || row.passed === true,
        // 大きいほうを採る。足すと、送り直した提出のぶんだけ落ちた回数が増えていく
        fails: Math.max(current.fails, Math.max(0, Math.floor(toNumber(row.fails, 0)))),
      };
    }

    write(saved);
  }

  /**
   * 未送信を送る。全部送れたら true。
   *
   * **入っていなければ（owner が null）何も送らず true を返す。**送る先が無いので、
   * 失敗ではない。出るときの判断（第6.2節「送りきれなかったら空にしない」）が
   * この true / false を見る。
   *
   * 送っている間に画面が手元を書き換えることがある（30秒の送信と採点が重なるなど）。
   * 送った印は、**送った中身のまま変わっていないものにだけ**付ける。変わっていたら
   * 未送信のまま残し、次の送信で改めて送る。
   */
  async flush(): Promise<boolean> {
    const saved = read();
    if (saved.owner === null) return true;
    const me = saved.owner;

    const lessons = Object.entries(saved.lessons).filter(([, row]) => !row.sent);
    const submissions = saved.submissions.filter((row) => !row.sent);
    if (lessons.length === 0 && submissions.length === 0) return true;

    let all = true;

    if (lessons.length > 0) {
      const ok = await post('/api/progress', {
        lessons: lessons.map(([lessonId, row]) => ({
          lessonId,
          state: row.state,
          openedAt: row.openedAt,
          doneAt: row.doneAt,
          seconds: row.seconds,
        })),
      });
      if (ok) markLessonsSent(me, lessons);
      else all = false;
    }

    if (submissions.length > 0) {
      const ok = await post('/api/submit', {
        submissions: submissions.map((row) => ({
          lessonId: row.lessonId,
          exerciseId: row.exerciseId,
          code: row.code,
          passed: row.passed,
          failedTest: row.failedTest,
          errorType: row.errorType,
          at: row.at,
        })),
      });
      if (ok) markSubmissionsSent(me, submissions);
      else all = false;
    }

    return all;
  }

  async addSeconds(lessonId: string, seconds: number): Promise<void> {
    const add = Math.floor(seconds);
    if (!(add > 0)) return;
    const saved = read();
    const base: SavedLesson = saved.lessons[lessonId] ?? {
      state: 'opened',
      openedAt: Date.now(),
      doneAt: null,
      seconds: 0,
      sent: false,
    };
    saved.lessons[lessonId] = { ...base, seconds: base.seconds + add, sent: false };
    write(saved);
  }
}

/**
 * 送り終えた節に印を付ける。
 *
 * 送っている間に owner が変わっていたら（別の人が入った、出た）、何もしない。
 * 前の人の送信の結果で、いまの控えに印を付けてはいけない。
 */
function markLessonsSent(me: string, sent: [string, SavedLesson][]): void {
  const saved = read();
  if (saved.owner !== me) return;
  for (const [id, snapshot] of sent) {
    const now = saved.lessons[id];
    if (!now) continue;
    // 送っている間に変わっていたら印を付けない（次の送信で改めて送る）
    if (now.state !== snapshot.state || now.seconds !== snapshot.seconds || now.doneAt !== snapshot.doneAt) continue;
    now.sent = true;
  }
  write(saved);
}

/** 送り終えた提出に印を付ける。1件は (exerciseId, at) で見分ける（サーバの重複判定と同じ鍵）。 */
function markSubmissionsSent(me: string, sent: SavedSubmission[]): void {
  const saved = read();
  if (saved.owner !== me) return;
  const keys = new Set(sent.map((row) => `${row.exerciseId}\u0000${row.at}`));
  for (const row of saved.submissions) {
    if (keys.has(`${row.exerciseId}\u0000${row.at}`)) row.sent = true;
  }
  write(saved);
}

let store: ProgressStore = new LocalProgressStore();

export function getProgressStore(): ProgressStore {
  return store;
}

/** D1 の実装に差し替えるための口。 */
export function setProgressStore(next: ProgressStore): void {
  store = next;
}
