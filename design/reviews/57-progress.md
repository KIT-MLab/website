# 仕様 57（節にファイルを添える）の進み具合

## 2026-10-03
- 前の担当の types.ts の書きかけ（FILES_MESSAGE・RunError の files・LessonFile）はそのまま使う。1か所の空白だけ直した
- 残り: 実行係（runner・worker）、口 /api/lesson-file、content.config・data.ts、build:tests・pyodide-node、check:lessons、第4節の計測、第6節の確かめ
- 実装した: runner（ファイルを取る・Worker の started を受けてから見張る）、worker（placeFiles・_kit_preimport を見張りの前に）、shared/grade/ExerciseBox（files の知らせ）、data.ts・content.config の files、/api/lesson-file、build-tests・pyodide-node（files を置く）、check-lessons 検査26
- 第4節: 直す前、温まったキャッシュでも pandas＋sklearn を1回で import すると 8008ms で時間切れ（再現した）
- 残り: Node の確かめ、ブラウザの確かめ、npm run build と dist の CSV 探し、一時の節を消す
- Node・ブラウザの確かめは済み。一時の節2つと手元 D1 の section_status の行は消した。手元に試しのアカウント u_MM8KQG（TEST-INTERNAL）が残っている
- 残り: npm run build と dist の CSV 探し
- npm run build 通った（99節）。dist/client に CSV の中身なし、dist/server の lesson-file の束にだけある。終わり
