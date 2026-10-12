import assert from 'node:assert/strict';
import { test } from 'node:test';
import { navigationTarget } from '../src/book-navigation.js';

test('five rapid commands retain all five steps while the first turn is active', () => {
  let destination = null;
  for (let i = 0; i < 5; i++) {
    destination = navigationTarget({ destination, position: 0, motionTarget: i ? 1 : null, direction: 1, last: 7 });
  }
  assert.equal(destination, 5);
});

test('opposite commands cancel queued steps without reversing an in-flight sheet', () => {
  assert.equal(navigationTarget({ destination: 4, position: 0, motionTarget: 1, direction: -1, last: 7 }), 3);
  assert.equal(navigationTarget({ destination: 1, position: 0, motionTarget: 1, direction: -1, last: 7 }), 0);
});

test('a command during a direct drag starts from the active destination', () => {
  assert.equal(navigationTarget({ destination: null, position: 2, motionTarget: 3, direction: 1, last: 7 }), 4);
});

test('compact navigation includes both sides and clamps at book boundaries', () => {
  assert.equal(navigationTarget({ destination: 14, position: 12, motionTarget: 13, direction: 1, last: 15 }), 15);
  assert.equal(navigationTarget({ destination: 15, position: 12, motionTarget: 13, direction: 1, last: 15 }), 15);
  assert.equal(navigationTarget({ destination: null, position: 0, direction: -1, last: 15 }), 0);
});
