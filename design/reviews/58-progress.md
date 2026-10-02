# 58 メンバーだけの章を足せるようにする（作業の控え）

2026-10-03。`design/spec/56-tools-curriculum.md` 第5節 A。`15q-pandas`（pandas）・`15r-sklearn`（scikit-learn）を足す。

- [x] 読んだ: HANDOFF・53 第2/8/11/12節・56 第5節A・parts.mjs・chapters.ts・section-refs.mjs。`INTRO_CHAPTER` / `isIntroChapter` / `タイタニック` を全部検索した
  - 多くはもう `MEMBERS_ONLY_CHAPTERS` / `isMembersOnlyChapter` を見ている。直すのは: 節の呼び方（chapters.ts・section-refs.mjs・combos.mjs）、本文の参照の正規表現（section-refs.mjs・shared.tsx・検査20 の2か所）、節のページの `isIntro`、プロジェクトの教材のページ（節の無い章を出さない）、章の題（chapterTitle）
- [ ] parts.mjs に表を置く
- [ ] 呼び方・参照・ページを直す
- [ ] 一時の節で確かめる（build・画面）→ 一時の節を消す → build
- [x] parts.mjs に表（PROJECT_CHAPTERS。Kaggle に提出も足した）、呼び方・参照・ページを直した
- [ ] 一時の節 15q-pandas/01-zz.mdx を置いた（消すこと）。build と画面で確かめる
- [x] 確かめた（build・メンバー/運営/入っていない人の画面・本文のリンク・タイタニックの参照の当たりが前と同じ）。手元の D1 に足した section_status の行と一時の節を消し、消したあとも build が通る（2026-10-03）
