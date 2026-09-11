/** 画面上で一意な id を作る。入力欄と label を結ぶためだけに使う。 */
let seq = 0;

export function nextId(prefix: string): string {
  seq += 1;
  return `${prefix}-${seq}`;
}
