import assert from 'node:assert/strict';
import { test } from 'node:test';
import { createWheelGesture } from '#wheel-gesture';

// Physical MacBook trackpad input recorded in the Codex browser.
const jitter = [[0,4],[9,6],[16,8],[25,10],[34,12],[42,10],[50,4],[58,20],[67,16],[75,4],[83,18],[91,22],[100,22],[109,24],[117,22],[125,24],[134,28],[142,26]];
const gentleRestart = [[8,6],[16,6],[24,6],[33,6],[41,4],[49,4],[58,4],[66,4],[74,4],[83,8],[91,4],[99,4],[108,4],[116,4],[124,4],[133,2],[149,6],[166,4],[183,4],[199,4],[216,4],[233,2],[249,2],[266,2],[283,2],[299,2],[316,2],[349,2],[416,2],[424,4],[432,8],[440,6],[449,6],[457,8],[466,8],[474,8],[483,12],[491,14],[499,16],[507,14],[516,8],[524,18],[532,6],[541,10],[549,14],[557,4],[566,14],[574,18],[583,18],[591,18],[599,18],[608,18],[616,22],[624,22],[633,22],[641,20],[648,20],[657,18],[665,16],[674,16],[683,16],[691,16],[698,16],[708,14],[715,14],[724,14],[732,14],[741,12],[749,12]];

test('amplitude jitter within one physical stroke produces one navigation', () => {
  const acceptWheel = createWheelGesture();
  const accepted = jitter.map(([time, distance]) => acceptWheel({ time, distance })).filter(Boolean);
  assert.deepEqual(accepted, [1]);
});

test('gradual restart is detected while the previous stroke still emits inertia', () => {
  const acceptWheel = createWheelGesture();
  assert.equal(acceptWheel({ time: -100, distance: 60 }), 1);
  const accepted = gentleRestart.map(([time, distance]) => ({ time, direction: acceptWheel({ time, distance }) })).filter(event => event.direction);
  assert.deepEqual(accepted, [{ time: 499, direction: 1 }]);
});

test('a fading inertia tail does not advance another page', () => {
  const acceptWheel = createWheelGesture();
  assert.equal(acceptWheel({ time: 0, distance: 60 }), 1);
  const tail = [40,30,20,16,12,8,6,4,2,2,2,2,2];
  assert.deepEqual(tail.map((distance, index) => acceptWheel({ time: (index + 1) * 20, distance })).filter(Boolean), []);
});

test('direction reversal is accepted without waiting for a quiet tail', () => {
  const acceptWheel = createWheelGesture();
  assert.equal(acceptWheel({ time: 0, distance: 60 }), 1);
  assert.equal(acceptWheel({ time: 8, distance: -60 }), -1);
  assert.equal(acceptWheel({ time: 16, distance: 60 }), 1);
});
