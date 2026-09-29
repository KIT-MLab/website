/**
 * タイタニック1 のスライド（design/spec/53-ml-intro.md 第10節）。9/29 の集まりで運営が前で送る。
 *
 * 前半の8枚はタイタニック号の背景（写真・航路の地図・短い文字。2026-09-29 利用者の依頼で書き直した）。
 * **事実は依頼に書かれたものだけ。**note は運営にだけ見える話すこと（メンバー・学習者の HTML には入らない）。
 * 後半の5枚は人の図（案B 横一列）。
 *
 * 人数は Kaggle の train.csv（891人）を性別と等級で数えたもの（2026-09-28 に Python で確かめた）。
 * 図の人の形1つは約10人（組ごとに四捨五入）。ラベルの人数はここの本当の数から出す。
 *
 * 写真と絵は public/learn/titanic/ にある（Wikimedia Commons のパブリックドメイン。幅800pxに縮めた）。
 * 出航の写真は Commons の「RMS Titanic 3.jpg」（F. G. O. スチュアート撮影、1912年4月10日）、
 * 沈む絵は「Stöwer Titanic.jpg」（ヴィリー・シュテーヴァー、1912年。雑誌 Die Gartenlaube の想像の絵）。
 *
 * **このファイルはサーバ（節のページの組み立てと /api/slides）と検査（check-lessons 検査25）だけが読む。**
 * 画面のスクリプト（src/lesson/slides.ts）から import しないこと（ブラウザに配る物に入ってしまう）。
 */

/** 性別と等級の6つの組。n は乗客、s は生き残った人 */
const CELLS = [
  { sex: '女性', pclass: 1, n: 94, s: 91 },
  { sex: '女性', pclass: 2, n: 76, s: 70 },
  { sex: '女性', pclass: 3, n: 144, s: 72 },
  { sex: '男性', pclass: 1, n: 122, s: 45 },
  { sex: '男性', pclass: 2, n: 108, s: 17 },
  { sex: '男性', pclass: 3, n: 347, s: 47 },
];

export default {
  cells: CELLS,
  slides: [
    {
      kind: 'image',
      title: '1912年4月10日、イギリスのサウサンプトンを出航',
      src: '/learn/titanic/titanic-southampton-1912.jpg',
      alt: '4本の煙突がある大きな客船が港の海を進んでいる白黒の写真',
      credit: '写真: F. G. O. スチュアート（1912年）／ Wikimedia Commons（パブリックドメイン）',
      note: 'タイタニック号はイギリスの大型客船で、これが最初の航海。',
    },
    { kind: 'map', title: 'サウサンプトンから、ニューヨークへ向かう最初の航海', step: 'southampton' },
    {
      kind: 'map',
      title: '途中で2つの港に寄り、乗客を乗せた',
      lines: ['4月10日の夜 フランスのシェルブール', '4月11日 アイルランドのクイーンズタウン'],
      step: 'queenstown',
      note: 'フランスのシェルブール、アイルランドのクイーンズタウン（今のコーブ）に寄って乗客を乗せた。',
    },
    {
      kind: 'map',
      title: '4月14日の夜、氷山にぶつかる',
      step: 'sink',
      note: '氷山にぶつかったのは4月14日の夜11時40分ごろ（船の時刻）、沈んだのは15日の午前2時20分ごろ。その日は氷山の警告が何度も届いていた。',
    },
    {
      kind: 'text',
      title: '約2,200人が乗り、1,500人以上が亡くなった',
      lines: ['救命ボートは約1,200人分しかなかった'],
      note: '「ボートが全員分あったら？」と問いかけてもよい。',
    },
    {
      kind: 'image',
      title: '沈むタイタニック号を想像で描いた絵（1912年、ドイツの雑誌）',
      src: '/learn/titanic/stower-1912.jpg',
      alt: '船首から傾いて沈んでいく大きな客船と、手前で救命ボートをこぐ人たち、遠くの氷山を描いた白黒の絵',
      credit: '絵: ヴィリー・シュテーヴァー（1912年）／ Wikimedia Commons（パブリックドメイン）',
      note: '写真ではなく、話を聞いて描いた想像の絵であること。',
    },
    { kind: 'text', title: '客室は1等・2等・3等', lines: ['ボートには「女性と子どもを先に」'] },
    {
      kind: 'text',
      title: 'ここで使うデータ',
      lines: ['Kaggle が練習用に配っている、乗客891人の記録'],
      note: '次の予想ボードへつなぐ（「では、891人のうち何%が生き残ったと思う？」）。',
    },
    // ここで1つ目の予想ボード → 答え合わせ（<Facilitate> の進め方）
    { kind: 'picto', title: '乗客 891人', by: 'all', reveal: false },
    { kind: 'picto', title: '生き残ったのは 342人', by: 'all', reveal: true },
    // ここで2つ目の予想ボード → 答え合わせ
    { kind: 'picto', title: '女性と男性に分けると', sub: '女性は4人に3人、男性は5人に1人が生き残った', by: 'sex', reveal: true },
    { kind: 'picto', title: '客室の等級で分けると', sub: '1等ほど多く生き残った', by: 'pclass', reveal: true },
    { kind: 'picto', title: '性別と等級を組み合わせると', sub: '1等・2等の女性は、ほとんどが生き残った', by: 'sex-pclass', reveal: true },
  ],
};
