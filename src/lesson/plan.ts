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

export type PlanMeetRow = {
  kind: 'meet';
  /** 表に出す回の番号。「1」や、まとめた行の「18〜22」 */
  no: string;
  /** この行が始まる日 */
  date: string;
  /** 複数回をまとめた行（3月の月例コンペ）の、最後の日。無ければ1回だけの行 */
  until?: string;
  title: string;
  /** 空なら目標の列を出さない */
  goal: string;
  /** 節目の目標（第21.2節「太字」） */
  big?: boolean;
  /** オンラインの回（第21.2節「オンラインの札」） */
  online?: boolean;
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
  { kind: 'meet', no: '1', date: '2026-09-29', title: '入口1 予測と正解率 ／ Python の復習6問', goal: '登録を済ませ、目的を共有する' },
  { kind: 'meet', no: '2', date: '2026-10-06', title: 'numpy① 配列・平均・条件で取り出す ／ 入口2 規則で予測する', goal: '' },
  { kind: 'meet', no: '3', date: '2026-10-13', title: 'numpy② 2次元の表・軸・reshape ／ 入口3 規則を自動で探す', goal: '' },
  { kind: 'meet', no: '4', date: '2026-10-20', title: '予測を関数にする・損失 ／ 入口4 合わせすぎ', goal: '' },
  { kind: 'meet', no: '5', date: '2026-10-27', title: '候補を全部試す ／ pandas① Titanic の表を読む', goal: '' },
  { kind: 'off', date: '2026-11-03', title: '休み（文化の日）' },
  { kind: 'meet', no: '6', date: '2026-11-10', title: '傾き ／ pandas② 欠けた値・文字を数に', goal: '' },
  { kind: 'meet', no: '7', date: '2026-11-17', title: '勾配降下 ／ scikit-learn① fit と predict', goal: '' },
  {
    kind: 'meet',
    no: '8',
    date: '2026-11-24',
    title: '線形回帰 ／ scikit-learn② 学習用とテスト用',
    goal: '線形回帰を自分で書ける',
    big: true,
  },
  {
    kind: 'meet',
    no: '9',
    date: '2026-12-01',
    title: '標準化・学習用とテスト用 ／ Titanic① まず1回提出',
    goal: '全員が1回提出する',
    big: true,
  },
  { kind: 'meet', no: '10', date: '2026-12-08', title: '過学習 ／ Titanic② 特徴を足す・モデルを変える', goal: '' },
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
