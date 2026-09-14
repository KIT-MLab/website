/**
 * ロールの変更（20-platform.md 第5.4節・第7章）。
 *
 * 管理者だけが使える。利用者IDを入れて「運営にする」を押す、その1画面ぶんの口である。
 * 所属の範囲は掛けない。**運営ロールの付与と剥奪は管理者だけができること**（第5.4節）で、
 * 管理者の範囲は全部だからである。
 *
 * **自分の管理者は外せない。**外した瞬間に管理者が0人になると、誰も誰かを管理者に
 * 戻せなくなる。他に管理者が居るかどうかを数えて判じる手もあるが、数えたあとで
 * その人が消える隙間が残るうえ、「自分を外せない」のほうが読んで分かる。
 * 別の管理者に外してもらえばよい。
 *
 * 断りの応答は `{ error, field? }`（第7.1節）。`field` は画面がどの欄の下に文を出すかを
 * 選ぶためだけのもので、画面に文面の中身を読ませて振り分けさせない。
 */
import type { APIRoute } from 'astro';
import { json, normalizeUserId, readJsonObject, serverConfig } from '../../../server/auth';
import { requireAdmin } from '../../../server/staff';

export const prerender = false;

/** 付けられるロール。第6章の `users.role` の値と同じ3つ。 */
const ROLES = ['student', 'staff', 'admin'];

export const POST: APIRoute = async ({ request }) => {
  const config = serverConfig();
  if (!config) return json({ error: 'サーバの設定が足りません。' }, 500);
  const { db } = config;

  const me = await requireAdmin(request);
  if (!me) return json({ error: '管理者の画面です。' }, 403);

  const body = await readJsonObject(request);
  if (!body) return json({ error: '送信された内容を読み取れませんでした。' }, 400);

  // 利用者IDは紙から打ち直される前提のもの（第5.3節）。ログインと同じに揃える。
  const id = normalizeUserId(String(body.id ?? ''));
  if (id === '') return json({ error: '利用者IDを入れてください。', field: 'id' }, 400);

  const role = String(body.role ?? '');
  if (!ROLES.includes(role)) return json({ error: 'ロールが違います。', field: 'role' }, 400);

  // 自分の管理者を外す操作だけは、相手が居るかどうかより先に断る。
  if (id === me.id && role !== 'admin') {
    return json({ error: '自分の管理者を外すことはできません。', field: 'id' }, 403);
  }

  const target = await db.prepare('SELECT id FROM users WHERE id = ?').bind(id).first<{ id: string }>();
  if (!target) return json({ error: '見つかりません。', field: 'id' }, 404);

  await db.prepare('UPDATE users SET role = ? WHERE id = ?').bind(role, id).run();

  return json({ id, role }, 200);
};
