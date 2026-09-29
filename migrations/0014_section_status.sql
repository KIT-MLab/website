-- 節ごとの公開（design/spec/53-ml-intro.md 第12節。2026-09-29 決定）。
--
-- プロジェクトの教材の章（scripts/parts.mjs の PROJECT_PARTS。いまはタイタニック演習の 08q-mlintro だけ）は、
-- 節を1つずつ決まった集まりで使うので、**節ごとに**公開する。ほかの章は今までどおり chapter_status で章ごと。
--
-- section_status: 節（lesson の id）ごとの公開状態。chapter_status と同じ形・同じ決まりで、
-- **行が無ければ準備中**。行があるときだけ public の値を見る。
-- プロジェクトの教材の章では chapter_status の行は見ない（残っていても効かない）。
--
-- 本番で 08q-mlintro をもう公開していたら、いま見えているもの（タイタニック1）が消えないよう、
-- タイタニック1（python-08q-accuracy）だけを公開にしておく。タイタニック2〜4 は準備中のまま。
-- 公開した人・時刻は章の行のものを写す（updated_by が users を指すため）。

CREATE TABLE section_status (
  lesson_id  TEXT PRIMARY KEY,
  public     INTEGER NOT NULL DEFAULT 0,
  updated_at INTEGER NOT NULL,
  updated_by TEXT NOT NULL REFERENCES users(id)
);

INSERT INTO section_status (lesson_id, public, updated_at, updated_by)
  SELECT 'python-08q-accuracy', 1, updated_at, updated_by
    FROM chapter_status
   WHERE chapter = '08q-mlintro' AND public = 1;
