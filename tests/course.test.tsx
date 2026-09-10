import assert from 'node:assert/strict';
import test from 'node:test';
import { renderToString } from 'react-dom/server';
import { ACTIVATIONS } from '../src/sandbox/engine/activations';
import { batchGradient, datasetLoss } from '../src/sandbox/engine/trainer';
import { forward, cloneNetwork } from '../src/sandbox/engine/network';
import { initNetwork } from '../src/sandbox/engine/init';
import { STAGES } from '../src/sandbox/stages';
import { Experiment } from '../src/course/Experiments';
import { LESSONS } from '../src/course/curriculum';
import { accuracy, advanceRun, attention, backwardExample, batchEpoch, convolve, FILTERS, fitCurve, gradientWalk, lineLoss, newRun, pixelPattern, SPLITS, XOR } from '../src/course/math';
import { emptyProgress, isComplete, parseProgress, saveAnswer } from '../src/course/progress';

test('監修済みの3課題は元の解でクリアできる', () => {
  assert.equal(STAGES.length, 3);
  for (let i = 0; i < 3; i++) {
    const stage = STAGES[i], data = stage.data(stage.dataDefaults);
    const net = { layers: [{ w: [i === 2 ? [1, 1] : [.5, .5]], b: [i === 0 ? 0 : i === 1 ? .5 : -1.5], acts: [i === 2 ? 'step' as const : 'identity' as const] }] };
    assert.ok(datasetLoss(net, data, 'mse') <= stage.threshold);
    for (let row = 0; row < data.x.length; row++) assert.ok(Math.abs(forward(net, data.x[row]).output[0] - data.y[row][0]) < (stage.ticker?.tol ?? .02));
  }
  assert.equal(ACTIVATIONS.step.f(0), 1);
});

test('逆伝播の各勾配は、損失の数値微分と一致する', () => {
  const { net } = initNetwork({ sizes: [2, 3, 1], acts: ['tanh', 'sigmoid'] }, 'xavier', 77);
  const analytic = batchGradient(net, XOR, 'bce', [0, 1, 2, 3]).grad;
  const epsilon = 1e-5;
  for (let li = 0; li < net.layers.length; li++) {
    const layer = net.layers[li];
    for (let o = 0; o < layer.b.length; o++) {
      for (let i = -1; i < layer.w[o].length; i++) {
        const plus = cloneNetwork(net), minus = cloneNetwork(net);
        if (i === -1) { plus.layers[li].b[o] += epsilon; minus.layers[li].b[o] -= epsilon; }
        else { plus.layers[li].w[o][i] += epsilon; minus.layers[li].w[o][i] -= epsilon; }
        const numerical = (datasetLoss(plus, XOR, 'bce') - datasetLoss(minus, XOR, 'bce')) / (2 * epsilon);
        const actual = i === -1 ? analytic[li].b[o] : analytic[li].w[o][i];
        assert.ok(Math.abs(actual - numerical) < 1e-6, `layer ${li}, node ${o}, input ${i}`);
      }
    }
  }
});

test('勾配降下と逆伝播の操作目標は達成可能で、行き過ぎも再現する', () => {
  assert.ok(lineLoss(gradientWalk(0, .2, 10).at(-1)!) < .01);
  assert.ok(lineLoss(gradientWalk(0, 1.1, 1)[0]) > lineLoss(0));
  assert.ok(gradientWalk(0, 1.1, 1000).length < 1000);
  for (const w of [.2, .5, 1]) {
    const r = backwardExample(w);
    assert.ok(r.afterLoss < r.loss);
    assert.ok(Math.abs(r.grad.layers[0].dw[0][0] - 2 * (0.5 * w - 1) * w) < 1e-10);
  }
});

test('中間層ありのXOR学習と、独立したデータでの総合演習が到達目標を満たす', () => {
  let run = newRun(4, XOR);
  run = advanceRun(run, XOR, .03, 500);
  assert.equal(accuracy(run.net, XOR), 1);
  assert.ok(datasetLoss(run.net, XOR, 'bce') < .15);
  assert.ok(Math.abs(run.losses.at(-1)! - datasetLoss(run.net, XOR, 'bce')) < 1e-10, '履歴の損失は更新後のネットワークに対応する');
  const final = advanceRun(newRun(8, SPLITS.train, SPLITS.validation), SPLITS.train, .03, 500, SPLITS.validation);
  assert.ok(accuracy(final.net, SPLITS.validation) >= .85);
  assert.ok(accuracy(final.net, SPLITS.test) >= .8);
  const sets = Object.values(SPLITS).map((d) => new Set(d.x.map((x) => x.join(','))));
  for (let i = 0; i < sets.length; i++) for (let j = i + 1; j < sets.length; j++) assert.equal([...sets[i]].filter((p) => sets[j].has(p)).length, 0);
  const linear = advanceRun(newRun(0, XOR), XOR, .03, 1000);
  assert.ok(accuracy(linear.net, XOR) < 1, '中間層なしの線形分類器はXORを完全には分けられない');
});

test('細かいモデルの過学習と、正則化による検証損失の改善を再現する', () => {
  const simple = fitCurve(0, 0), complex = fitCurve(18, 0), regularized = fitCurve(18, .001), balanced = fitCurve(4, .001);
  assert.ok(complex.trainLoss < 1e-6);
  assert.ok(complex.validationLoss > .01);
  assert.ok(regularized.validationLoss < complex.validationLoss / 5);
  assert.ok(balanced.validationLoss < .01);
  assert.ok(simple.validationLoss > balanced.validationLoss * 10);
});

test('ミニバッチは1周で全例を1回ずつ使う', () => {
  for (const size of [1, 2, 8]) {
    const steps = batchEpoch(0, size);
    assert.equal(steps.length, 8 / size);
    assert.deepEqual(steps.flatMap((s) => s.indices).sort(), [0, 1, 2, 3, 4, 5, 6, 7]);
    assert.ok(steps.every((s) => Number.isFinite(s.w)));
  }
  const full = batchEpoch(0, 8)[0];
  // Σ(x*y) = 6.9。w=0で勾配=-2*6.9/8=-1.725、学習率0.1で+0.1725。
  assert.ok(Math.abs(full.w - .1725) < 1e-10);
});

test('CNNとAttentionの表示値は定義通りの計算になる', () => {
  assert.deepEqual(convolve(pixelPattern('vertical'), FILTERS.vertical), [3, 3, 0, 3, 3, 0, 3, 3, 0]);
  assert.ok(convolve(pixelPattern('vertical'), FILTERS.horizontal).every((n) => n === 0));
  assert.ok(convolve(pixelPattern('horizontal'), FILTERS.vertical).every((n) => n === 0));
  const a = attention([3, 0]), b = attention([0, 3]), neutral = attention([0, 0]);
  assert.ok(Math.abs(a.weights.reduce((s, v) => s + v, 0) - 1) < 1e-10);
  assert.ok(a.weights[0] > a.weights[1] && b.weights[1] > b.weights[0]);
  assert.ok(neutral.weights.every((v) => Math.abs(v - 1 / 3) < 1e-10));
  assert.ok(Math.abs(a.output[0] + a.output[1] - 1) < 1e-10);
});

test('クイズを解き直しても初回答を保持し、体験なしで完了にならない', () => {
  let p = emptyProgress();
  const lesson = LESSONS[0], q = lesson.questions[0];
  p = saveAnswer(p, lesson.id, q.id, (q.answer + 1) % 3);
  p = saveAnswer(p, lesson.id, q.id, q.answer);
  const a = p.lessons[lesson.id].answers[q.id];
  assert.notEqual(a.first, q.answer); assert.equal(a.last, q.answer); assert.equal(a.attempts, 2); assert.equal(a.solved, true);
  p = saveAnswer(p, lesson.id, lesson.questions[1].id, lesson.questions[1].answer);
  assert.equal(isComplete(p, lesson.id), false);
  p.lessons[lesson.id].experienced = true;
  assert.equal(isComplete(p, lesson.id), true);
  assert.deepEqual(parseProgress(JSON.stringify(p)), p);
  assert.deepEqual(parseProgress(null), emptyProgress());
  assert.throws(() => parseProgress('not json'));
  assert.throws(() => parseProgress('{"version":99}'));
  assert.equal(saveAnswer(p, lesson.id, q.id, 500), p);
  const corrupt = JSON.parse(JSON.stringify(p)); corrupt.lessons.weights.answers[q.id].last = 99;
  assert.equal(parseProgress(JSON.stringify(corrupt)).lessons.weights.answers[q.id], undefined);
});

test('全ステージに確認問題と解説があり、実験はサーバー側で描画できる', () => {
  assert.equal(new Set(LESSONS.map((s) => s.id)).size, 16);
  for (const [i, lesson] of LESSONS.entries()) {
    assert.equal(lesson.questions.length, 2);
    assert.ok(lesson.detail.length > 40);
    for (const q of lesson.questions) { assert.equal(q.feedback.length, q.choices.length); assert.ok(q.answer >= 0 && q.answer < q.choices.length); }
    if (i < 15) assert.ok(renderToString(<Experiment stage={i} onSolved={() => {}} />).length > 500);
  }
});
