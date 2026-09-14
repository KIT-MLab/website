/**
 * 運営の画面が読む口の土台（20-platform.md 第5.4節・第8章）。
 *
 * ここに置くのは2つだけ。**入ってよいかどうか**（ロール）と、**誰の記録を見てよいか**
 * （範囲）である。ルート（src/pages/api/staff/*.ts）はこの2つを並べるだけで済ませ、
 * 同じ判定を何度も書き写さないようにしてある。書き写すと、片方だけ直したときに
 * 別の所属の記録が漏れる。
 *
 * 範囲を「SQL の条件と束縛する値」の形で返しているのは、**利用者ごとに問い合わせを
 * 回さないため**である。先に利用者の一覧を引いてから1人ずつ進度を引くと、30人で31回に
 * なる。進度の表そのものを users に繋いで同じ条件で絞れば1回で済む。
 *
 * 時刻はすべてミリ秒（第6章）。
 */
import type { CurrentUser } from './auth';
import { currentUser } from './auth';

/**
 * 運営以上であることを確かめる。合わなければ null（例外にしない）。
 *
 * 入っていない人も、学生も、同じ null になる。**どちらなのかを呼ぶ側に伝えない。**
 * 運営の画面は学生には存在しない画面なので、断り方を分ける意味がない（第8章）。
 */
export async function requireStaff(request: Request): Promise<CurrentUser | null> {
  const user = await currentUser(request);
  if (!user) return null;
  return user.role === 'staff' || user.role === 'admin' ? user : null;
}

/** 管理者であることを確かめる。ロールの付け外しだけがこちらを使う（第5.4節）。 */
export async function requireAdmin(request: Request): Promise<CurrentUser | null> {
  const user = await currentUser(request);
  return user && user.role === 'admin' ? user : null;
}

/**
 * 誰の記録を見てよいかの範囲（第5.4節）。
 *
 *   運営   … **自分と同じ所属の利用者だけ**
 *   管理者 … 全部
 *
 * `where` は `users` を `u` という別名で繋いだ問い合わせにそのまま挟める形にしてある。
 * 進度も提出も `JOIN users u ON u.id = ?.user_id` を足せば同じ条件で絞れる。
 *
 * 管理者のときに `1 = 1` を返しているのは、呼ぶ側に「条件があるときと無いとき」の
 * 分岐を書かせないため。分岐を書かせると、片方で条件を挟み忘れたときに静かに全部見える。
 */
export type Visible = { where: string; binds: string[] };

export function visibleUsers(user: CurrentUser): Visible {
  if (user.role === 'admin') return { where: '1 = 1', binds: [] };
  return { where: 'u.cohort_code = ?', binds: [user.cohort.code] };
}
