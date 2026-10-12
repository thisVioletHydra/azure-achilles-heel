import assert from 'node:assert/strict';
import { test } from 'node:test';
import { createWheelGesture, isHorizontalWheel, swipeDirection } from '#wheel-gesture';

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
  assert.equal(acceptWheel({ time: -100, distance: 120 }), 1);
  const accepted = gentleRestart.map(([time, distance]) => ({ time, direction: acceptWheel({ time, distance }) })).filter(event => event.direction);
  assert.equal(accepted.length, 1);
  assert.equal(accepted[0].direction, 1);
  assert.ok(accepted[0].time >= 424 && accepted[0].time <= 616, 'Gradual restart must be accepted during acceleration');
});

test('rapid physical strokes restart after troughs shorter than 80 milliseconds', () => {
  const acceptWheel = createWheelGesture();
  const events = [[3,-40],[11,-22],[20,-32],[27,-52],[36,-60],[45,-68],[53,-72],[61,-68],[69,-70],[77,-78],[86,-72],[95,-72],[102,-72],[111,-68],[120,-64],[128,-64],[136,-60],[145,-60],[153,-56],[203,-4],[211,-8],[220,-16],[227,-16],[236,-34],[245,-38],[252,-42],[261,-34],[270,-44],[278,-34],[286,-38],[295,-20],[303,-20],[311,-22],[320,-4],[328,-32],[336,-38],[345,-42],[353,-46],[361,-48],[370,-46],[378,-52],[386,-52],[395,-52],[402,-50],[411,-46],[420,-46],[428,-44],[478,-6],[486,-12],[495,-20],[502,-36],[511,-38],[520,-20],[528,-76],[536,-44],[545,-36],[553,-24],[561,-28],[570,-52],[578,-62],[586,-68],[594,-72]];
  const accepted = events.map(([time, distance]) => acceptWheel({ time, distance })).filter(Boolean);
  assert.deepEqual(accepted, [-1, -1, -1, -1]);
});

test('a fading inertia tail does not advance another page', () => {
  const acceptWheel = createWheelGesture();
  assert.equal(acceptWheel({ time: 0, distance: 120 }), 1);
  const tail = [40,30,20,16,12,8,6,4,2,2,2,2,2];
  assert.deepEqual(tail.map((distance, index) => acceptWheel({ time: (index + 1) * 20, distance })).filter(Boolean), []);
});

test('direction reversal is accepted without waiting for a quiet tail', () => {
  const acceptWheel = createWheelGesture();
  assert.equal(acceptWheel({ time: 0, distance: 120 }), 1);
  assert.equal(acceptWheel({ time: 8, distance: -120 }), -1);
  assert.equal(acceptWheel({ time: 16, distance: 120 }), 1);
});

test('a 1.4 second coalesced, bumpy inertia tail produces only one turn', () => {
  const accept = createWheelGesture();
  const accepted = [accept({ distance: 120, time: 0 })];
  const bumps = [20,4,20,22,14,6,20,18];
  for (let time = 16, i = 0; time <= 1400; time += 16, i++) accepted.push(accept({ distance: bumps[i % bumps.length], time }));
  assert.deepEqual(accepted.filter(Boolean), [1]);
});

test('an isolated valley in an inertia tail does not re-arm navigation', () => {
  const accept = createWheelGesture();
  assert.equal(accept({ distance: 120, time: 0 }), 1);
  const tail = [40,32,30,4,28,22,26,20,24,18,22,14,20,12,18,8,16,4,14,4,12];
  assert.deepEqual(tail.map((distance,i) => accept({ distance,time:(i+1)*20 })).filter(Boolean), []);
});

test('one opposite-sign frame cannot release a committed stream', () => {
  const accept = createWheelGesture();
  assert.equal(accept({ distance: 120,time:0 }), 1);
  const tail = [[16,20],[32,-8],[48,22],[64,20],[80,18],[96,16]];
  assert.deepEqual(tail.map(([time,distance]) => accept({ distance,time })).filter(Boolean), []);
});

test('vertical frames and a 136 ms gap maintain the committed stream', () => {
  const accept = createWheelGesture();
  assert.equal(accept({ distance:120,time:0 }), 1);
  for (const time of [16,32,100,236]) assert.equal(accept({ distance:0,time }), 0);
  for (let time=252;time<600;time+=16) assert.equal(accept({distance:20,time}),0);
});

test('a 150 ms delivery gap cannot turn an inertia tail into a new stroke', () => {
  const accept = createWheelGesture();
  assert.equal(accept({ distance:120,time:0 }),1);
  for (const time of [150,166,182,198,214,230]) assert.equal(accept({distance:20,time}),0);
});

test('a second deliberate swipe after more than 180 ms of silence is accepted', () => {
  const accept = createWheelGesture();
  assert.equal(accept({distance:120,time:0}),1);
  assert.equal(accept({distance:120,time:181}),1);
});

test('a light trackpad contact does not turn a page', () => {
  const accept = createWheelGesture();
  assert.deepEqual([8,12,6,4].map((distance,i)=>accept({distance,time:i*16})).filter(Boolean),[]);
});

test('slow continuous trackpad drift never meets the velocity threshold', () => {
  const accept = createWheelGesture();
  for(let time=0;time<=4000;time+=40) assert.equal(accept({distance:2,time}),0);
});

test('a confident wheel swipe accumulates distance before committing once', () => {
  const accept = createWheelGesture();
  assert.deepEqual([30,40,40,30].map((distance,i)=>accept({distance,time:i*16})),[0,0,1,0]);
});

test('horizontal intent rejects zero, vertical, and near-diagonal wheel input', () => {
  assert.equal(isHorizontalWheel(0,0),false);
  assert.equal(isHorizontalWheel(15,10),false);
  assert.equal(isHorizontalWheel(20,16),false);
  assert.equal(isHorizontalWheel(-20,10),true);
});

test('touch intent requires distance proportional to the viewport or a deliberate flick', () => {
  assert.equal(swipeDirection({distance:-20,velocity:-1,pageWidth:412}),0);
  assert.equal(swipeDirection({distance:-40,velocity:-.1,pageWidth:412}),0);
  assert.equal(swipeDirection({distance:-70,velocity:-.1,pageWidth:412}),0);
  assert.equal(swipeDirection({distance:-80,velocity:-.1,pageWidth:412}),1);
  assert.equal(swipeDirection({distance:40,velocity:.5,pageWidth:412}),-1);
  assert.equal(swipeDirection({distance:-40,velocity:.5,pageWidth:412}),0);
});
