/**
 * 今後の予定（20-platform.md 第21章）。
 *
 * **予定はこのファイルに直書きする（第21.3節）。** 変わったら書き直して push する。
 * リポジトリは公開なので GitHub からは誰でも読めるが、画面はメンバーにしか出さない
 * （`/learn/plan/` と `GET /api/plan/next` の両方でメンバーかどうかを見る）。
 *
 * 日付はすべて `'YYYY-MM-DD'` の文字列で持つ。集まりは火曜の予定であって、時刻を持つ
 * 「いつの瞬間か」ではないので、`meetings` テーブルのようにミリ秒（UTC）には変換しない。
 * 文字列のまま比べれば日付の前後が分かる（ISO の並びは辞書順 = 日付順）。
 */

/**
 * 前半（教える。第25.2節）。`lessons` は節の frontmatter の id。`label` はまとめの短い言葉
 * （「numpy① 配列・平均・条件で取り出す」）。どちらか片方だけでもよい。
 */
export type PlanTeach = { label?: string; lessons?: string[] };

/**
 * 後半（みんなでやる。第25.2節）。行き先は多くて1つ: 節（`lesson`）・今週の演習（`weekly`）・
 * 外のページ（`url`）。`label` を省くと、`lesson` なら節の呼び方と題、`weekly` なら回の題から作る。
 */
export type PlanTogether = { label?: string; lesson?: string; weekly?: string; url?: string };

/**
 * 練習問題集の範囲（第25.5節）。`chapter` は章のディレクトリ名。`topics` を省くとその章の話題を全部。
 * `levels` は解いてほしい★の段。
 */
export type PlanPractice = { chapter: string; topics?: string[]; levels: (1 | 2 | 3)[] };

export type PlanMeetRow = {
  kind: 'meet';
  /** 表に出す回の番号。「1」や、まとめた行の「18〜22」 */
  no: string;
  /** この行が始まる日 */
  date: string;
  /** 複数回をまとめた行（3月の月例コンペ）の、最後の日。無ければ1回だけの行 */
  until?: string;
  /** `/learn/plan/` の表の「やること」（「／」の左が前半、右が後半。第25.2節） */
  title: string;
  /** 空なら目標の列を出さない */
  goal: string;
  /** 節目の目標（第21.2節「太字」） */
  big?: boolean;
  /** オンラインの回（第21.2節「オンラインの札」） */
  online?: boolean;
  /*
   * ここから下は今週のページ（`/learn/week/`。第25.4節）が読む。どれも省いてよい。
   * `teach` と `together` を両方とも省いた行は、`title` を「／」で分けて前半・後半の言葉にする。
   * `prep` `practice` `review` は**この回までに**やること（「それまでに」の欄）。
   */
  teach?: PlanTeach;
  together?: PlanTogether[];
  /** 予習する教材の節（節の frontmatter の id） */
  prep?: string[];
  /** 解いてほしい練習問題集の範囲 */
  practice?: PlanPractice[];
  /** 復習する今週の演習（weekly の id） */
  review?: string[];
};

export type PlanOffRow = {
  kind: 'off';
  date: string;
  /** 表に出す日付。省略時は `date` から `9/29` の形を作る。複数の日をまとめる行だけ書く */
  dateLabel?: string;
  title: string;
};

export type PlanRow = PlanMeetRow | PlanOffRow;

export const PLAN: PlanRow[] = [
  {
    kind: 'meet',
    no: '1',
    date: '2026-09-29',
    title: '入口1 予測と正解率 ／ Python の復習6問',
    goal: '登録を済ませ、目的を共有する',
    teach: { lessons: ['python-08q-accuracy'] },
    together: [{ label: '今週の演習（Python の復習6問）', weekly: 'weekly-2026-09-29' }],
    practice: [
      { chapter: '01-python', levels: [1, 2] },
      { chapter: '02-numbers', levels: [1, 2] },
    ],
  },
  {
    kind: 'meet',
    no: '2',
    date: '2026-10-06',
    title: 'numpy① 配列・平均・条件で取り出す ／ 入口2 規則で予測する',
    goal: '',
    teach: { label: 'numpy① 配列・平均・条件で取り出す', lessons: ['python-07-array', 'python-07-stats', 'python-07-select'] },
    together: [{ lesson: 'python-08q-rule' }],
    prep: ['python-07-array'],
    practice: [
      { chapter: '03-branch', levels: [1, 2] },
      { chapter: '04-loop', levels: [1, 2] },
    ],
    review: ['weekly-2026-09-29'],
  },
  {
    kind: 'meet',
    no: '3',
    date: '2026-10-13',
    title: 'numpy② 2次元の表・軸・reshape ／ 入口3 規則を自動で探す',
    goal: '',
    teach: { label: 'numpy② 2次元の表・軸・reshape', lessons: ['python-07-shape', 'python-08-index', 'python-08-reshape'] },
    together: [{ lesson: 'python-08q-learn' }],
    prep: ['python-07-shape'],
    practice: [
      { chapter: '05-function', levels: [1, 2] },
      { chapter: '06-error', levels: [1, 2] },
    ],
    review: ['weekly-2026-10-06'],
  },
  {
    kind: 'meet',
    no: '4',
    date: '2026-10-20',
    title: '予測を関数にする・損失 ／ 入口4 合わせすぎ',
    goal: '',
    teach: { label: '予測を関数にする・損失', lessons: ['python-12-model', 'python-12-loss'] },
    together: [{ lesson: 'python-08q-overfit' }],
    prep: ['python-12-model'],
    practice: [
      { chapter: '07-array', levels: [1, 2] },
      { chapter: '08-table', levels: [1, 2] },
    ],
    review: ['weekly-2026-10-13'],
  },
  { kind: 'meet', no: '5', date: '2026-10-27', title: '候補を全部試す ／ pandas① Titanic の表を読む', goal: '', review: ['weekly-2026-10-20'] },
  { kind: 'off', date: '2026-11-03', title: '休み（文化の日）' },
  { kind: 'meet', no: '6', date: '2026-11-10', title: '傾き ／ pandas② 欠けた値・文字を数に', goal: '' },
  { kind: 'meet', no: '7', date: '2026-11-17', title: '勾配降下法 ／ scikit-learn① fit と predict', goal: '' },
  {
    kind: 'meet',
    no: '8',
    date: '2026-11-24',
    title: '線形回帰 ／ scikit-learn② 訓練データとテストデータ',
    goal: '線形回帰を自分で書ける',
    big: true,
  },
  {
    kind: 'meet',
    no: '9',
    date: '2026-12-01',
    title: '標準化・訓練データとテストデータ ／ Titanic① まず1回提出',
    goal: '全員が1回提出する',
    big: true,
  },
  { kind: 'meet', no: '10', date: '2026-12-08', title: '過学習 ／ Titanic② 特徴量を足す・モデルを変える', goal: '' },
  { kind: 'meet', no: '11', date: '2026-12-15', title: '分類・シグモイド ／ Titanic③ 点数を並べる', goal: '' },
  { kind: 'meet', no: '12', date: '2026-12-22', title: 'ロジスティック回帰 ／ 過去の月例コンペで練習', goal: '1月の段取りを決める' },
  { kind: 'off', date: '2026-12-29', dateLabel: '12/29・1/5', title: '冬休み' },
  { kind: 'meet', no: '13', date: '2027-01-12', title: '正解率と混同行列 ／ 1月の月例コンペ①', goal: '初めての本番', big: true },
  { kind: 'meet', no: '14', date: '2027-01-19', title: '1月の月例コンペ②', goal: '' },
  {
    kind: 'meet',
    no: '15',
    date: '2027-01-26',
    title: '1月の月例コンペ③',
    goal: '全員が自分の名前で提出する',
    big: true,
  },
  { kind: 'off', date: '2027-02-02', dateLabel: '2/2・2/9', title: '試験の前の週と試験期間' },
  { kind: 'meet', no: '16', date: '2027-02-16', title: '1月の振り返り', goal: '', online: true },
  { kind: 'meet', no: '17', date: '2027-02-23', title: '3月に向けた練習・発表の準備', goal: '', online: true },
  {
    kind: 'meet',
    no: '18〜22',
    date: '2027-03-02',
    until: '2027-03-30',
    title: '3月の月例コンペ・発表の資料づくり',
    goal: '全員が提出する・報告の材料をまとめる',
    big: true,
    online: true,
  },
];

/** ページ上の1段落の説明（第21.2節）。 */
export const PLAN_INTRO = '毎週火曜・70分。前半30分で新しいことを教え、後半30分でみんなで取り組みます（やることの「／」の左が前半、右が後半）。Python の復習は家で進めます。';

/** 目標の枠（第21.2節）。 */
export const PLAN_GOAL = {
  headline: '3月の月例コンペに、全員が自分の名前で提出する',
  body: 'その前に、12月に Titanic で全員が1回提出し、1月の月例コンペを初めての本番にする。',
};

const WEEKDAY_KANJI = ['日', '月', '火', '水', '木', '金', '土'];

function monthDayWeekday(iso: string): { month: number; day: number; weekday: string } {
  const [y, m, d] = iso.split('-').map(Number);
  const weekday = WEEKDAY_KANJI[new Date(Date.UTC(y, m - 1, d)).getUTCDay()];
  return { month: m, day: d, weekday };
}

/**
 * 複数回をまとめた行（`until` がある行）の日付は「3/2〜3/30」。1日だけの回のような
 * 曜日は付けられないので、`tableDateLabel` `entranceDateLabel` の両方がここを通す。
 */
function rangeDateLabel(row: PlanMeetRow): string | null {
  if (!row.until) return null;
  const from = monthDayWeekday(row.date);
  const to = monthDayWeekday(row.until);
  return `${from.month}/${from.day}〜${to.month}/${to.day}`;
}

/** 表の日付列に出す形（`9/29 火`）。休みの行でまとめた日付は `dateLabel` をそのまま使う。 */
export function tableDateLabel(row: PlanRow): string {
  if (row.kind === 'off' && row.dateLabel) return row.dateLabel;
  const range = row.kind === 'meet' ? rangeDateLabel(row) : null;
  if (range) return range;
  const { month, day, weekday } = monthDayWeekday(row.date);
  return row.kind === 'meet' ? `${month}/${day} ${weekday}` : `${month}/${day}`;
}

/** 入口の行に出す形（`9/29（火）`。第21.1節）。まとめた行なら `tableDateLabel` と同じ「3/2〜3/30」。 */
export function entranceDateLabel(row: PlanMeetRow): string {
  const range = rangeDateLabel(row);
  if (range) return range;
  const { month, day, weekday } = monthDayWeekday(row.date);
  return `${month}/${day}（${weekday}）`;
}

/**
 * 次回にあたる行（第21.1節）。
 *
 * 集まりの行（`kind: 'meet'`）を順に見て、その行の最後の日（`until` があればそれ、
 * 無ければ `date`）が今日以降になっている**最初の**行を返す。複数回をまとめた行
 * （3/2〜3/30）は、前の回（2/23）が終わったあと、まとめた行の最後の日（3/30）までの
 * 間ずっと次回のままになる。全部の回が終わっていれば `null`。
 *
 * `todayJst` は `'YYYY-MM-DD'`（日本時間の今日）。その日のうちは、その日の回を
 * 次回として出す（文字列の比較は `<=` を使うので、最後の日を含む）。
 */
export function nextMeeting(rows: PlanRow[], todayJst: string): PlanMeetRow | null {
  for (const row of rows) {
    if (row.kind !== 'meet') continue;
    const end = row.until ?? row.date;
    if (todayJst <= end) return row;
  }
  return null;
}

/**
 * 今週のページ（第25.4節）に出す行。次回（`nextMeeting` と同じ規則）から後ろの行を、
 * 休みの行も含めて表の順に返す。先頭は必ず集まりの行。全部の回が終わっていれば空。
 */
export function upcomingRows(rows: PlanRow[], todayJst: string): PlanRow[] {
  const next = nextMeeting(rows, todayJst);
  if (!next) return [];
  return rows.slice(rows.indexOf(next));
}

/**
 * `teach` も `together` も書いていない行の、前半・後半の言葉（第25.2節「／の左が前半、右が後半」）。
 * 「／」が無い行は、全部を後半（みんなでやる）とみなす。
 */
export function titleHalves(row: PlanMeetRow): { teach: string; together: string } {
  const at = row.title.indexOf('／');
  if (at < 0) return { teach: '', together: row.title.trim() };
  return { teach: row.title.slice(0, at).trim(), together: row.title.slice(at + 1).trim() };
}

/* --- 今週のページ（第25.4節）の1回ぶんの見た目の材料。src/pages/learn/week.astro が組み、
   src/components/lesson/WeekMeeting.astro が描く --- */

export type WeekLink = {
  label: string;
  /** null ならリンクにしない */
  href: string | null;
  /** リンクにしないときの札（「準備中」など）や、添える一言 */
  note?: string;
  /** 進み具合の棒を出すときの課題の id */
  exIds?: string[];
  /** 外のページ */
  external?: boolean;
};

export type WeekView = {
  teachLabel: string;
  teach: WeekLink[];
  together: WeekLink[];
  prep: WeekLink[];
  practice: WeekLink[];
  review: WeekLink[];
};
