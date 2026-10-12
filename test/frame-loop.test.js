import assert from 'node:assert/strict';
import { test } from 'node:test';
import { createFrameLoop } from '../src/frame-loop.js';

function scheduler() {
  const pending = new Map();
  let id = 0;
  return {
    pending,
    request(fn) { pending.set(++id, fn); return id; },
    cancel(id) { pending.delete(id); },
    now: () => 100,
    advance(time) { const callbacks = [...pending.values()]; pending.clear(); callbacks.forEach(fn => fn(time)); },
  };
}

test('pause cancels rendering and repeated resume cannot create duplicate loops', () => {
  const clock = scheduler();
  const deltas = [];
  const loop = createFrameLoop((time, dt) => deltas.push(dt), clock);
  loop.start(); loop.start();
  assert.equal(clock.pending.size, 1);
  clock.advance(116);
  assert.equal(deltas.length, 1);
  loop.stop();
  assert.equal(clock.pending.size, 0);
  clock.advance(10000);
  assert.equal(deltas.length, 1);
  loop.start(); loop.start();
  clock.advance(10116);
  assert.equal(clock.pending.size, 1);
  assert.equal(deltas.length, 2);
  assert(deltas[1] <= .05, 'Resuming after a long pause must not jump the camera');
});

test('suspending inside a frame does not schedule a replacement', () => {
  const clock = scheduler();
  const loop = createFrameLoop(() => loop.stop(), clock);
  loop.start();
  clock.advance(116);
  assert.equal(clock.pending.size, 0);
});
