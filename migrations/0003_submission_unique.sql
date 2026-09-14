-- 同じ提出が2行にならないようにする（20-platform.md 第6.1節）。
--
-- 画面は送れなかった提出を手元に残して次に送り直す。応答だけが届かなかったときは
-- 既に入っている提出をもう一度送ることになる。そのまま2行になると「同じ課題を5回
-- 落とした」の判定（第9章の9）が狂い、詰まっていない人が詰まって見える。
--
-- 入れる側は INSERT OR IGNORE を使う。二度目は黙って捨てられる。

CREATE UNIQUE INDEX submissions_once
  ON submissions (user_id, exercise_id, created_at);
