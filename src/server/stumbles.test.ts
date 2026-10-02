/**
 * つまずきの記録の数え方（src/server/stumbles.ts）を、手で作った行で確かめる
 * （design/spec/55-stumbles.md 第7節）。
 *
 *   node --test src/server/stumbles.test.ts
 */
import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  buildStumbles,
  failMode,
  failsBeforePass,
  median,
  parseDays,
  periodStart,
  rereadsAfterFail,
  toExport,
  type StumbleCatalog,
  type StumbleMinute,
  type StumbleSubmission,
} from './stumbles.ts';

const MIN = 60000;
const HOUR = 60 * MIN;
const DAY = 24 * HOUR;
/** 分の切れ目にそろえた基準の時刻 */
const T0 = 1_790_000_000_000 - (1_790_000_000_000 % MIN);

/** 節 L2・L3・L1・L4（教材の中でこの順）と、L1 の課題 e1、今週の演習 W の課題 w1 */
const catalog: StumbleCatalog = {
  exercises: new Map([
    ['e1', { label: '1.1 練習1', page: 'L1', href: '/learn/lesson/l1/#e1' }],
    ['w1', { label: '今週の演習 10/6 問1', page: 'W', href: '/learn/weekly/W/#w1' }],
  ]),
  sections: new Map([
    ['L1', { label: '1.1 一', href: '/l1/', estimateMinutes: 10, order: 3 }],
    ['L2', { label: '1.2 二', href: '/l2/', estimateMinutes: 20, order: 1 }],
    ['L3', { label: '1.3 三', href: '/l3/', estimateMinutes: 5, order: 2 }],
    ['L4', { label: '1.4 四', href: '/l4/', estimateMinutes: 5, order: 4 }],
  ]),
};

function sub(userId: string, exerciseId: string, at: number, passed: boolean, extra: Partial<StumbleSubmission> = {}): StumbleSubmission {
  return { userId, exerciseId, passed, failedTest: passed ? null : 1, errorType: null, code: 'print(1)', at, ...extra };
}

function min(userId: string, minute: number, lessonId: string, exerciseId = ''): StumbleMinute {
  return { userId, minute, lessonId, exerciseId };
}

test('中央の値: 奇数・偶数・空', () => {
  assert.equal(median([3, 1, 2]), 2);
  assert.equal(median([4, 1, 2, 3]), 2.5);
  assert.equal(median([]), null);
});

test('通すまでに落ちた回数: 通した人と通していない人', () => {
  assert.equal(failsBeforePass([{ passed: false }, { passed: false }, { passed: true }, { passed: false }]), 2);
  assert.equal(failsBeforePass([{ passed: false }, { passed: false }, { passed: false }]), 3);
  assert.equal(failsBeforePass([{ passed: true }]), 0);
});

test('落ち方: エラーの種類 → テストの番号（1から） → どちらも無い', () => {
  assert.equal(failMode({ errorType: 'NameError', failedTest: 0 }), 'NameError');
  assert.equal(failMode({ errorType: null, failedTest: 1 }), 'テスト2 で不一致');
  assert.equal(failMode({ errorType: '', failedTest: 0 }), 'テスト1 で不一致');
  assert.equal(failMode({ errorType: null, failedTest: null }), 'テストの外で不合格');
});

test('期間: 7・28・all。読めなければ28', () => {
  assert.equal(parseDays('7'), 7);
  assert.equal(parseDays('all'), 'all');
  assert.equal(parseDays(null), 28);
  assert.equal(parseDays('99'), 28);
  assert.equal(periodStart(7, 10 * DAY), 3 * DAY);
  assert.equal(periodStart('all', 10 * DAY), 0);
});

test('課題ごと: 通した人と通していない人、落ちた回数・かかった分の中央、多い落ち方', () => {
  const subs = [
    // a: 2回落ちて通す
    sub('a', 'e1', T0, false, { failedTest: 1 }),
    sub('a', 'e1', T0 + MIN, false, { errorType: 'NameError' }),
    sub('a', 'e1', T0 + 2 * MIN, true),
    // b: 4回落ちて通していない
    sub('b', 'e1', T0, false, { failedTest: 1 }),
    sub('b', 'e1', T0 + MIN, false, { failedTest: 1 }),
    sub('b', 'e1', T0 + 2 * MIN, false, { failedTest: 1 }),
    sub('b', 'e1', T0 + 3 * MIN, false, { errorType: 'NameError' }),
    // c: 1回で通す
    sub('c', 'w1', T0, true),
  ];
  const minutes = [min('a', T0, 'L1', 'e1'), min('a', T0 + MIN, 'L1', 'e1'), min('a', T0 + 2 * MIN, 'L1', 'e1'), min('b', T0, 'L1', 'e1')];
  const data = buildStumbles(subs, minutes, catalog, 0);

  assert.deepEqual(data.exercises.map((e) => e.exerciseId), ['e1', 'w1']);
  const e1 = data.exercises[0];
  assert.equal(e1.label, '1.1 練習1');
  assert.equal(e1.submitted, 2);
  assert.equal(e1.passed, 1);
  assert.equal(e1.medianFails, 3); // a=2, b=4
  assert.equal(e1.medianMinutes, 2); // a=3, b=1
  assert.deepEqual(e1.topFails, [
    { mode: 'テスト2 で不一致', count: 4 },
    { mode: 'NameError', count: 2 },
  ]);
  const w1 = data.exercises[1];
  assert.equal(w1.medianFails, 0);
  assert.equal(w1.medianMinutes, null); // 取り組んでいた分の記録が無い（この仕様より前の記録）
  assert.deepEqual(w1.topFails, []);
});

test('課題ごとの並び: 落ちた回数（中央）が同じなら通していない人の多い順', () => {
  const subs = [
    sub('a', 'e1', T0, false),
    sub('a', 'e1', T0 + MIN, true),
    sub('a', 'w1', T0, false),
    sub('b', 'w1', T0, false),
    sub('b', 'w1', T0 + MIN, true),
  ];
  // e1: 中央1・通していない0。w1: a=1(通していない), b=1 → 中央1・通していない1
  const data = buildStumbles(subs, [], catalog, 0);
  assert.deepEqual(data.exercises.map((e) => e.exerciseId), ['w1', 'e1']);
});

test('読み直し: 同じ人が同じ節へ2度戻っても1回', () => {
  const subs = [sub('a', 'w1', T0, false)];
  const minutes = [min('a', T0 + 5 * MIN, 'L2'), min('a', T0 + 6 * MIN, 'W'), min('a', T0 + 30 * MIN, 'L2')];
  assert.deepEqual(rereadsAfterFail(subs, minutes, catalog), [{ userId: 'a', exerciseId: 'w1', lessonId: 'L2' }]);
});

test('読み直し: 2度落としてから同じ節へ戻っても、同じ人・同じ課題・同じ節は1回', () => {
  const subs = [sub('a', 'w1', T0, false), sub('a', 'w1', T0 + MIN, false)];
  const minutes = [min('a', T0 + 5 * MIN, 'L2')];
  assert.equal(rereadsAfterFail(subs, minutes, catalog).length, 1);
});

test('読み直し: 通したあとに戻ったものは数えない', () => {
  const subs = [sub('a', 'w1', T0, false), sub('a', 'w1', T0 + 10 * MIN, true)];
  const minutes = [min('a', T0 + 3 * MIN, 'L2'), min('a', T0 + 20 * MIN, 'L3')];
  assert.deepEqual(rereadsAfterFail(subs, minutes, catalog), [{ userId: 'a', exerciseId: 'w1', lessonId: 'L2' }]);
});

test('読み直し: 通していなければ24時間まで。過ぎてから戻ったものは数えない', () => {
  const subs = [sub('a', 'w1', T0, false)];
  const minutes = [min('a', T0 + 23 * HOUR, 'L2'), min('a', T0 + 25 * HOUR, 'L3')];
  assert.deepEqual(rereadsAfterFail(subs, minutes, catalog), [{ userId: 'a', exerciseId: 'w1', lessonId: 'L2' }]);
});

test('読み直し: 課題と同じページ（節の中の課題がその節）は数えない。ほかの節は数える', () => {
  const subs = [sub('a', 'e1', T0, false)];
  const minutes = [min('a', T0 + MIN, 'L1', 'e1'), min('a', T0 + 2 * MIN, 'L1'), min('a', T0 + 3 * MIN, 'L2')];
  assert.deepEqual(rereadsAfterFail(subs, minutes, catalog), [{ userId: 'a', exerciseId: 'e1', lessonId: 'L2' }]);
});

test('読み直し: 落としていない人・落とす前・節でないページ（今週の演習・メンバーの画面）は数えない', () => {
  const subs = [sub('a', 'w1', T0, true), sub('b', 'w1', T0 + HOUR, false)];
  const minutes = [
    min('a', T0 + MIN, 'L2'), // 落としていない
    min('b', T0, 'L2'), // 落とす前（区切りの分は t を含む分から）
    min('b', T0 + HOUR + MIN, 'W'),
    min('b', T0 + HOUR + 2 * MIN, 'home'),
  ];
  assert.deepEqual(rereadsAfterFail(subs, minutes, catalog), []);
});

test('読み直し: 落とした時刻を含む分は数える', () => {
  const subs = [sub('a', 'w1', T0 + 30000, false)];
  assert.equal(rereadsAfterFail(subs, [min('a', T0, 'L2')], catalog).length, 1);
});

test('節ごと: 読んだ人・かかった分（中央）・読み直し・きっかけ・並び。節でない id は入れない', () => {
  const subs = [sub('a', 'w1', T0, false), sub('b', 'w1', T0, false), sub('b', 'e1', T0, false)];
  const minutes = [
    min('a', T0 + MIN, 'L2'),
    min('a', T0 + 2 * MIN, 'L2'),
    min('b', T0 + MIN, 'L2'),
    min('b', T0 + 2 * MIN, 'L1'),
    min('b', T0 + 3 * MIN, 'L3'),
    min('b', T0 + 4 * MIN, 'L3'),
    min('b', T0 + 5 * MIN, 'W'),
    min('b', T0 + 6 * MIN, 'practice-01-print'),
    min('b', T0 + 7 * MIN, 'home'),
  ];
  const data = buildStumbles(subs, minutes, catalog, 0);
  // L2: a(w1)・b(w1, e1) → 3回。L3: b(w1, e1) → 2回。L1: b(w1) → 1回（e1 は同じページ）
  assert.deepEqual(data.sections.map((s) => [s.lessonId, s.rereads]), [['L2', 3], ['L3', 2], ['L1', 1]]);
  const l2 = data.sections[0];
  assert.equal(l2.readers, 2);
  assert.equal(l2.medianMinutes, 1.5);
  assert.deepEqual(l2.topTriggers, [
    { exerciseId: 'w1', label: '今週の演習 10/6 問1', count: 2 },
    { exerciseId: 'e1', label: '1.1 練習1', count: 1 },
  ]);
  assert.deepEqual(l2.people.find((p) => p.user === 'b')?.rereadAfterFail, ['w1', 'e1']);
});

test('節ごとの並び: 読み直しが同じなら、かかった分（中央）÷ 目安の大きい順', () => {
  // L2: 4分 ÷ 20 = 0.2、L3: 2分 ÷ 5 = 0.4
  const minutes = [...[0, 1, 2, 3].map((i) => min('a', T0 + i * MIN, 'L2')), ...[0, 1].map((i) => min('a', T0 + i * MIN, 'L3'))];
  const data = buildStumbles([], minutes, catalog, 0);
  assert.deepEqual(data.sections.map((s) => s.lessonId), ['L3', 'L2']);
});

test('期間: 始まりより前の提出・活動した分は数えない', () => {
  const since = T0;
  const subs = [sub('a', 'e1', T0 - MIN, false), sub('a', 'w1', T0, false)];
  const minutes = [min('a', T0 - MIN, 'L2'), min('a', T0 + MIN, 'L3', 'w1')];
  const data = buildStumbles(subs, minutes, catalog, since);
  assert.deepEqual(data.exercises.map((e) => e.exerciseId), ['w1']);
  assert.deepEqual(data.sections.map((s) => s.lessonId), ['L3']);
  assert.equal(data.exercises[0].medianMinutes, 1);
});

test('書き出し: 名前を入れない・提出は古い順で新しいほうから20件・コードは4000字で切る', () => {
  const subs = Array.from({ length: 25 }, (_, i) => sub('u_7QK3M9', 'e1', T0 + i * MIN, false, { code: i === 24 ? 'x'.repeat(5000) : `#${i}` }));
  const out = toExport(buildStumbles(subs, [], catalog, 0), 28, T0);
  assert.equal(out.days, 28);
  const person = out.exercises[0].people[0];
  assert.deepEqual(Object.keys(person).sort(), ['attempts', 'failsBeforePass', 'minutes', 'passed', 'user']);
  assert.equal(person.attempts.length, 20);
  assert.equal(person.attempts[0].code, '#5');
  assert.ok(person.attempts[0].at < person.attempts[19].at);
  assert.equal(person.attempts[19].code.length, 4000);
  assert.equal(person.attempts[0].errorType, '');
  assert.equal(person.failsBeforePass, 25);
});

test('落ちたあとに読み直した: 通さないまま先の節へ進んだのは数えない（今週の演習の課題なら、どの節でも数える）', () => {
  const subs = [sub('u1', 'e1', T0, false), sub('u1', 'w1', T0, false)];
  const minutes = [min('u1', T0 + 5 * MIN, 'L4')];
  assert.deepEqual(rereadsAfterFail(subs, minutes, catalog), [{ userId: 'u1', exerciseId: 'w1', lessonId: 'L4' }]);
});
