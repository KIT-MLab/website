-- 活動した分に、その分に取り組んでいた課題を添える（design/spec/55-stumbles.md 第3.1節。2026-10-02 決定）。
--
-- 課題に取り組んでいない分（本文を読んでいる）は空のまま。この仕様より前の行も空。
-- 「みんなの進み具合」の「いま」（提出する前でも、どの課題にいるか）と、運営の「つまずきの記録」
-- （課題ごとのかかった分）が読む。
--
-- **本番への適用は代表が行う。適用してから push する**（適用の前に新しいコードが動くと /api/activity が落ちる）。

ALTER TABLE activity_minutes ADD COLUMN exercise_id TEXT NOT NULL DEFAULT '';
