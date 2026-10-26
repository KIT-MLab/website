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
   * ここから下は今週のページ（`/learn/week/`。第25.4節・design/spec/54-week-pace.md）が読む。どれも省いてよい。
   * `teach` と `together` を両方とも省いた行は、`title` を「／」で分けて前半・後半の言葉にする。
   * `before` は「この回の前に（予習）」、`after` は「この回のあとに（復習）」の欄。
   * 集まりで扱わない Python の復習は、ここではなく `SELF_REVIEW` に書く。
   */
  teach?: PlanTeach;
  together?: PlanTogether[];
  /** この回の前に読んでおく節（節の frontmatter の id） */
  before?: { lessons?: string[] };
  /** この回のあとに解く、この回で扱ったことの練習問題集の範囲と、今週の演習（weekly の id） */
  after?: { practice?: PlanPractice[]; weekly?: string[]; lessons?: string[] };
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
    title: 'タイタニック1 予測と正解率 ／ Python の復習6問',
    goal: '登録を済ませ、目的を共有する',
    teach: { lessons: ['python-08q-accuracy'] },
    together: [{ label: '今週の演習（Python の復習6問）', weekly: 'weekly-2026-09-29' }],
  },
  {
    kind: 'meet',
    no: '2',
    date: '2026-10-06',
    title: 'numpy① 配列・平均・条件で取り出す ／ タイタニック2 規則で予測する',
    goal: '',
    teach: { label: 'numpy① 配列・平均・条件で取り出す', lessons: ['python-07-array', 'python-07-agg', 'python-07-select'] },
    together: [{ lesson: 'python-08q-rule' }],
    before: { lessons: ['python-07-array'] },
    after: {
      practice: [
        { chapter: '07-array', topics: ['array'], levels: [1, 2, 3] },
        { chapter: '07-array', topics: ['stats'], levels: [1, 2] },
        { chapter: '07-array', topics: ['select'], levels: [1, 2] },
      ],
    },
  },
  // 2026-10-13 の組み直し（design/proposals/replan-2026-10-13.md、代表が方向を決めた）。前半は numpy・pandas・scikit-learn を
  // その場で解く時間、後半は15分ほどで機械学習の考え方（タイタニック。コードはほぼ書かない）。数学寄りの節は今年の集まりから外した
  {
    kind: 'meet',
    no: '3',
    date: '2026-10-13',
    title: 'numpy① 配列・集計・条件で取り出す ／ 考え方: 規則と正解率（タイタニック2）',
    goal: '',
    teach: { label: 'numpy① 配列・集計・条件で取り出す', lessons: ['python-07-array', 'python-07-agg', 'python-07-select'] },
    together: [{ label: '考え方: 規則と正解率（タイタニック2）', lesson: 'python-08q-rule' }],
    before: { lessons: ['python-07-array'] },
    after: {
      practice: [{ chapter: '07-array', levels: [1] }],
    },
  },
  {
    kind: 'meet',
    no: '4',
    date: '2026-10-20',
    title: 'numpy② スライス・2次元配列・軸 ／ 考え方: 学習とは数を選ぶこと（タイタニック3）',
    goal: '',
    teach: { label: 'numpy② スライス・2次元配列・軸', lessons: ['python-07-slice', 'python-07-shape', 'python-07-stats'] },
    together: [{ label: '考え方: 学習とは数を選ぶこと（タイタニック3）', lesson: 'python-08q-learn' }],
    before: { lessons: ['python-07-slice'] },
    after: {
      practice: [{ chapter: '07-array', levels: [1] }],
    },
  },
  {
    kind: 'meet',
    no: '5',
    date: '2026-10-27',
    title: 'numpy③ 2次元のインデックス・reshape・ブロードキャスト ／ 考え方: 合わせすぎ（タイタニック4）',
    goal: '',
    teach: { label: 'numpy③ 2次元のインデックス・reshape・ブロードキャスト', lessons: ['python-08-index', 'python-08-broadcast', 'python-08-reshape'] },
    together: [{ label: '考え方: 合わせすぎ（タイタニック4）', lesson: 'python-08q-overfit' }],
    before: { lessons: ['python-08-index'] },
    after: {
      practice: [{ chapter: '08-table', levels: [1] }],
      // 今週の演習 10/20（第7〜8章と練習編2）は、第8章を集まりでやった 10/27 のあとに出す（2026-10-20 代表）
      weekly: ['weekly-2026-10-20'],
    },
  },
  { kind: 'off', date: '2026-11-03', title: '休み（文化の日）' },
  // 2026-10-27 代表「案の通りにしよう」（design/proposals/replan-2026-10-20.md）。11/10 から今年度の芯は機械学習（第12〜15章）。
  // 前提の節（第9〜11章）は、使う回の「予習」の欄に置き、集まりでは短く入れる。道具（pandas・scikit-learn）は1月末から、Kaggle は2〜3月
  {
    kind: 'meet',
    no: '6',
    date: '2026-11-10',
    title: '機械学習の全体図（30分） ／ 予測を関数にする',
    goal: '機械学習の流れを自分の言葉で言える',
    big: true,
    // 前半は全体図の3節を10分ずつ（30分まるごと。2026-10-13 代表「30分でまとめてやるほうが、学習者の頭の中がごちゃごちゃしない」）
    teach: { label: '機械学習の全体図（30分）', lessons: ['python-mlmap-what', 'python-mlmap-learn', 'python-mlmap-flow'] },
    together: [{ lesson: 'python-12-model' }],
    before: { lessons: ['python-mlmap-what'] },
    after: { lessons: ['python-12-model'] },
  },
  {
    kind: 'meet',
    no: '7',
    date: '2026-11-17',
    title: '損失 ／ パラメータの候補を全部試す（学習は数を選ぶこと）',
    goal: '',
    teach: { label: '損失', lessons: ['python-12-loss'] },
    together: [{ lesson: 'python-12-search' }],
    after: { lessons: ['python-12-loss', 'python-12-search'] },
  },
  {
    kind: 'meet',
    no: '8',
    date: '2026-11-24',
    title: '全部は試せない ／ 勾配降下法',
    goal: '',
    teach: { label: '全部は試せない', lessons: ['python-12-count'] },
    together: [{ lesson: 'python-13-descent' }],
    // 前提（傾き・微分の符号）は第10章1〜3節。集まりでは短く入れる
    before: { lessons: ['python-10-rate', 'python-10-derivative', 'python-10-direction'] },
    after: { lessons: ['python-13-descent'] },
  },
  {
    kind: 'meet',
    no: '9',
    date: '2026-12-01',
    title: '学習率 ／ 直線を学習する（線形回帰）',
    goal: '線形回帰を自分で書ける',
    big: true,
    teach: { label: '学習率', lessons: ['python-13-rate'] },
    together: [{ lesson: 'python-13-linear' }],
    // 前提（偏微分）は第10章4節
    before: { lessons: ['python-10-partial'] },
    after: { lessons: ['python-13-rate', 'python-13-linear'] },
  },
  {
    kind: 'meet',
    no: '10',
    date: '2026-12-08',
    title: '入力が複数の線形回帰 ／ 標準化',
    goal: '',
    teach: { label: '入力が複数の線形回帰', lessons: ['python-13-multi'] },
    together: [{ lesson: 'python-13-standardize' }],
    // 前提（行列とベクトルの積・標準偏差）は第9章3節・第11章5節
    before: { lessons: ['python-09-matvec', 'python-11-spread'] },
    after: { lessons: ['python-13-multi', 'python-13-standardize'] },
  },
  {
    kind: 'meet',
    no: '11',
    date: '2026-12-15',
    title: '合否をラベルで表す ／ シグモイド関数',
    goal: '',
    teach: { label: '合否をラベルで表す', lessons: ['python-14-label'] },
    together: [{ lesson: 'python-14-sigmoid' }],
    // 前提（指数関数）は第11章3節
    before: { lessons: ['python-11-exp'] },
    after: { lessons: ['python-14-label', 'python-14-sigmoid'] },
  },
  {
    kind: 'meet',
    no: '12',
    date: '2026-12-22',
    title: '交差エントロピー ／ ロジスティック回帰',
    goal: '分類を自分で書ける',
    big: true,
    teach: { label: '交差エントロピー', lessons: ['python-14-entropy'] },
    together: [{ lesson: 'python-14-logistic' }],
    // 前提（対数）は第11章4節
    before: { lessons: ['python-11-log'] },
    after: { lessons: ['python-14-entropy', 'python-14-logistic'] },
  },
  { kind: 'off', date: '2026-12-29', dateLabel: '12/29・1/5', title: '冬休み' },
  {
    kind: 'meet',
    no: '13',
    date: '2027-01-12',
    title: '訓練データとテストデータ ／ 過学習',
    goal: '',
    teach: { label: '訓練データとテストデータ', lessons: ['python-15-split'] },
    together: [{ lesson: 'python-15-overfit' }],
    after: { lessons: ['python-15-split', 'python-15-overfit'] },
  },
  {
    kind: 'meet',
    no: '14',
    date: '2027-01-19',
    title: '正解率とベースライン ／ 混同行列',
    goal: '学習と評価の流れを自分のコードで説明できる',
    big: true,
    teach: { label: '正解率とベースライン', lessons: ['python-15-accuracy'] },
    together: [{ lesson: 'python-15-confusion' }],
    after: { lessons: ['python-15-accuracy', 'python-15-confusion'] },
  },
  {
    kind: 'meet',
    no: '15',
    date: '2027-01-26',
    title: '自分で作ったものを道具で: pandas ／ scikit-learn',
    goal: '',
    teach: { label: 'pandas 1・2', lessons: ['python-15q-read', 'python-15q-select'] },
    together: [{ lesson: 'python-15r-fit' }],
  },
  { kind: 'off', date: '2027-02-02', dateLabel: '2/2・2/9', title: '試験の前の週と試験期間' },
  {
    kind: 'meet',
    no: '16',
    date: '2027-02-16',
    title: 'pandas 3・4 ／ scikit-learn 2〜4',
    goal: '',
    online: true,
    teach: { label: 'pandas 3・4', lessons: ['python-15q-missing', 'python-15q-encode'] },
    together: [{ lesson: 'python-15r-features' }, { lesson: 'python-15r-split' }, { lesson: 'python-15r-depth' }],
  },
  { kind: 'meet', no: '17', date: '2027-02-23', title: 'Kaggle に提出① まず1回提出', goal: '全員が1回提出する', big: true, online: true },
  {
    kind: 'meet',
    no: '18〜22',
    date: '2027-03-02',
    until: '2027-03-30',
    title: 'Kaggle に提出②③・練習のコンペ・発表の資料づくり',
    goal: '全員が自分の名前で提出する・報告の材料をまとめる',
    big: true,
    online: true,
  },
];

/**
 * 各自で進める Python の復習（design/spec/54-week-pace.md 第3.2節）。集まりでは扱わず、
 * 今週のページのいちばん上の帯に、目安の日と進み具合（練習問題集の★1・★2を通した割合）を出す。
 */
export type SelfReviewRow = {
  /** 帯に出す名前。「第3〜4章」 */
  label: string;
  /** 目安の日（'YYYY-MM-DD'。集まりの日） */
  by: string;
  /** 教材の章（章のディレクトリ名）。帯から、その章の最初の節と、練習問題集のその章へつなぐ */
  chapters: string[];
  /** 仕上げに解く今週の演習の回（weekly の id）。無くてよい */
  weekly?: string;
  /** 章の途中から読む行のとき、「教材」のリンクの行き先にする節（節の id）。無ければ章の最初の節 */
  from?: string;
  /** 進み具合に数える練習問題集の話題。無ければ章の話題ぜんぶ */
  topics?: string[];
};

export const SELF_REVIEW: SelfReviewRow[] = [
  { label: '第1〜2章', by: '2026-09-29', chapters: ['01-python', '02-numbers'], weekly: 'weekly-2026-09-29' },
  { label: '第3〜4章', by: '2026-10-06', chapters: ['03-branch', '04-loop'], weekly: 'weekly-2026-10-06' },
  // 第6章（エラーを読む）は目安に入れない。練習問題集も作らない（2026-10-03 代表の決定）
  // 2026-10-13 の組み直しで、第5章の目安を家の課題（HOMEWORK）と同じ 10/20 にそろえた。第8章は集まりで扱うので帯から外した
  { label: '第5章', by: '2026-10-20', chapters: ['05-function'], weekly: 'weekly-2026-10-13' },
];

/**
 * 今週の課題（2026-10-13 代表の決定。学習の一覧 /learn/ のいちばん上の帯、案A）。
 * 集まりで代表が出す「次の集まりまでにやる1つ」。メンバーにだけ、まだ解いていない問題の数と
 * 「次の1問を解く」を出す。帯に出すのは、`by` が今日より後の行のうち最も早い1行（集まりの日には次の週の行）。
 * まずは練習問題集の★1だけを出す（代表「まずは星一の問題だけでも進めてもらう」）。
 */
export type HomeworkRow = {
  /** 締め切り（次の集まりの日。'YYYY-MM-DD'） */
  by: string;
  /** 帯の題。「第5章 練習問題 ★1」 */
  label: string;
  /** 練習問題集の範囲（今週のページの「復習」と同じ形） */
  practice: PlanPractice[];
  /** 練習問題集の無い章（第12章以降）で、課題にする節（節の id）。その節の問題を全部出す（2026-10-27） */
  lessons?: string[];
  /** 余裕がある人向けの範囲（★2・★3 など）。帯に「余裕があれば」として添える */
  extra?: { label: string; practice: PlanPractice[] };
};

export const HOMEWORK: HomeworkRow[] = [
  {
    by: '2026-10-20',
    label: '第5章 関数 の練習問題 ★1',
    practice: [{ chapter: '05-function', levels: [1] }],
    extra: { label: '★2・★3', practice: [{ chapter: '05-function', levels: [2, 3] }] },
  },
  {
    by: '2026-10-27',
    label: '第7章 numpy の配列 の練習問題 ★1',
    practice: [{ chapter: '07-array', levels: [1] }],
    extra: { label: '★2・★3', practice: [{ chapter: '07-array', levels: [2, 3] }] },
  },
  {
    by: '2026-11-10',
    label: '第8章 numpy の2次元配列と形 の練習問題 ★1',
    practice: [{ chapter: '08-table', levels: [1] }],
    extra: { label: '★2・★3', practice: [{ chapter: '08-table', levels: [2, 3] }] },
  },
  // 11/10 から第12〜15章。練習問題集が無いので、その回で扱った節の問題を課題にする（plan の after.lessons と同じ）
  { by: '2026-11-17', label: '12.1 予測を関数にする の問題', practice: [], lessons: ['python-12-model'] },
  { by: '2026-11-24', label: '12.2 損失・12.3 パラメータの候補を全部試す の問題', practice: [], lessons: ['python-12-loss', 'python-12-search'] },
  { by: '2026-12-01', label: '13.1 勾配降下法 の問題', practice: [], lessons: ['python-13-descent'] },
  { by: '2026-12-08', label: '13.2 学習率・13.3 線形回帰 の問題', practice: [], lessons: ['python-13-rate', 'python-13-linear'] },
  { by: '2026-12-15', label: '13.4 入力が複数の線形回帰・13.5 標準化 の問題', practice: [], lessons: ['python-13-multi', 'python-13-standardize'] },
  { by: '2026-12-22', label: '14.1 ラベル・14.2 シグモイド関数 の問題', practice: [], lessons: ['python-14-label', 'python-14-sigmoid'] },
  { by: '2027-01-12', label: '14.3 交差エントロピー・14.4 ロジスティック回帰 の問題', practice: [], lessons: ['python-14-entropy', 'python-14-logistic'] },
  { by: '2027-01-19', label: '15.1 訓練データとテストデータ・15.2 過学習 の問題', practice: [], lessons: ['python-15-split', 'python-15-overfit'] },
  { by: '2027-01-26', label: '15.3 正解率・15.4 混同行列 の問題', practice: [], lessons: ['python-15-accuracy', 'python-15-confusion'] },
];

/** ページ上の1段落の説明（第21.2節）。 */
export const PLAN_INTRO = '毎週火曜・70分。前半はその場で手を動かして解き、後半の15分ほどで機械学習の考え方を話し合います（やることの「／」の左が前半、右が後半）。毎週の課題は、学習のページのいちばん上に出ます。';

/** 目標の枠（第21.2節）。 */
export const PLAN_GOAL = {
  headline: '機械学習を自分で作って説明でき、3月に全員が自分の名前で Kaggle に提出する',
  body: '11月〜1月に、機械学習の芯（モデル・損失・勾配降下法・線形回帰・分類・評価）を自分で作る。2月に Titanic で全員が1回提出し、3月を本番にする。',
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
 * 今週のページの3列と、その下に畳む行（design/spec/54-week-pace.md 第4.1節）。
 * 列は「前回・今回・次回」。今回は `nextMeeting` と同じ規則。前回が無い（最初の回より前）ときは
 * 「今回・次回・その次」。`later` は3列より後ろの行（休みの行も、表の順のまま）。
 * 前回より前の回は出さない。全部の回が終わっていれば列も `later` も空。
 */
export function weekColumns(rows: PlanRow[], todayJst: string): { now: PlanMeetRow | null; columns: { row: PlanMeetRow; tag: string }[]; later: PlanRow[] } {
  const now = nextMeeting(rows, todayJst);
  if (!now) return { now: null, columns: [], later: [] };
  const meets = rows.filter((r): r is PlanMeetRow => r.kind === 'meet');
  const at = meets.indexOf(now);
  const prev = at > 0 ? meets[at - 1] : null;
  const shown = prev ? meets.slice(at - 1, at + 2) : meets.slice(at, at + 3);
  const tags = prev ? ['前回', '今回', '次回'] : ['今回', '次回', 'その次'];
  const columns = shown.map((row, i) => ({ row, tag: tags[i] }));
  const later = rows.slice(rows.indexOf(shown[shown.length - 1]) + 1);
  return { now, columns, later };
}

/**
 * 各自で進める復習の帯の印（design/spec/54-week-pace.md 第4.3節）。`nowDate` は今回の集まりの日
 * （全部の回が終わっていれば null）。目安の日が今回と同じ行が「今週はここ」、今回より前の行が
 * 「目安を過ぎた行」（100% でなければ「残っています」の札を出す候補）。
 */
export function selfReviewMarks(nowDate: string | null): { row: SelfReviewRow; here: boolean; overdue: boolean }[] {
  return SELF_REVIEW.map((row) => ({
    row,
    here: nowDate !== null && row.by === nowDate,
    overdue: nowDate === null || row.by < nowDate,
  }));
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
  /** この回の前に（予習） */
  before: WeekLink[];
  teachLabel: string;
  teach: WeekLink[];
  together: WeekLink[];
  /** この回のあとに（復習）。練習問題集の話題ごとの行と、今週の演習 */
  after: WeekLink[];
};
