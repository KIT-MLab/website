/**
 * タイタニック1 のスライド（design/spec/53-ml-intro.md 第10節）。9/29 の集まりで運営が前で送る。
 *
 * 前半の6枚は、節の本文にあるタイタニック号の背景の2段落（第8節）を短く大きな字にしたもの。
 * **本文に無い事実は足さない。**後半の5枚は人の図（案B 横一列）。
 *
 * 人数は Kaggle の train.csv（891人）を性別と等級で数えたもの（2026-09-28 に Python で確かめた）。
 * 図の人の形1つは約10人（組ごとに四捨五入）。ラベルの人数はここの本当の数から出す。
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
    { kind: 'text', title: 'タイタニック号', lines: ['イギリスの大型客船'] },
    { kind: 'text', title: '1912年4月、最初の航海', lines: ['イギリスのサウサンプトンからニューヨークへ', '途中で氷山にぶつかって沈んだ'] },
    { kind: 'text', title: '乗っていたのは約2,200人', lines: ['1,500人以上が亡くなった'] },
    { kind: 'text', title: '救命ボートは約1,200人分', lines: ['全員分はなかった'] },
    { kind: 'text', title: '客室は1等・2等・3等', lines: ['ボートには「女性と子どもを先に」という方針で乗せた'] },
    { kind: 'text', title: 'ここで使うデータ', lines: ['乗客の名簿のうち891人分', 'Kaggle（機械学習のコンペのサイト）が練習用に配っている'] },
    // ここで1つ目の予想ボード → 答え合わせ（<Facilitate> の進め方）
    { kind: 'picto', title: '乗客 891人', by: 'all', reveal: false },
    { kind: 'picto', title: '生き残ったのは 342人', by: 'all', reveal: true },
    // ここで2つ目の予想ボード → 答え合わせ
    { kind: 'picto', title: '女性と男性に分けると', sub: '女性は4人に3人、男性は5人に1人が生き残った', by: 'sex', reveal: true },
    { kind: 'picto', title: '客室の等級で分けると', sub: '1等ほど多く生き残った', by: 'pclass', reveal: true },
    { kind: 'picto', title: '性別と等級を組み合わせると', sub: '1等・2等の女性は、ほとんどが生き残った', by: 'sex-pclass', reveal: true },
  ],
};
