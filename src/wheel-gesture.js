export const SWIPE = Object.freeze({
  WHEEL_MIN_DISTANCE: 100,
  WHEEL_MIN_VELOCITY: .25,
  HORIZONTAL_RATIO: 1.5,
  TOUCH_MIN_DISTANCE: 60,
  TOUCH_MIN_SHARE: .18,
  FLICK_MIN_VELOCITY: .4,
  FLICK_MIN_DISTANCE: 30,
});

export function isHorizontalWheel(dx, dy) {
  return dx !== 0 && Math.abs(dx) > Math.abs(dy) * SWIPE.HORIZONTAL_RATIO;
}

export function swipeDirection({ distance, velocity, pageWidth }) {
  const threshold = Math.max(SWIPE.TOUCH_MIN_DISTANCE, pageWidth * SWIPE.TOUCH_MIN_SHARE);
  const intentional = Math.abs(distance) >= threshold ||
    (Math.abs(distance) >= SWIPE.FLICK_MIN_DISTANCE && Math.abs(velocity) >= SWIPE.FLICK_MIN_VELOCITY && Math.sign(velocity) === Math.sign(distance));
  return intentional ? -Math.sign(distance) : 0;
}

export function createWheelGesture() {
  let lastAt = -Infinity;
  let direction = 0;
  let locked = false;
  let sum = 0, startedAt = 0, peak = 0;
  let committedAt = -Infinity;
  let reverseSum = 0, reverseAt = 0;
  let valley = Infinity, level = Infinity, risingSince = null, risingSum = 0;
  let history = [];

  function clearRise() {
    risingSince = null;
    risingSum = 0;
  }
  function reset(time, sign) {
    direction = sign;
    locked = false;
    sum = 0;
    startedAt = time;
    peak = 0;
    reverseSum = 0;
    valley = level = Infinity;
    history = [];
    clearRise();
  }
  function sufficient(distance, since, time) {
    return distance >= SWIPE.WHEEL_MIN_DISTANCE && distance / Math.max(16, time - since) >= SWIPE.WHEEL_MIN_VELOCITY;
  }
  function commit(time, sign) {
    direction = sign;
    locked = true;
    committedAt = time;
    reverseSum = 0;
    valley = level = Infinity;
    clearRise();
    return sign;
  }

  return function acceptWheel({ distance, time }) {
    if (!Number.isFinite(time) || !Number.isFinite(distance)) return 0;
    time = Math.max(time, lastAt);
    // Vertical/no-motion frames maintain stream continuity, never re-arm it.
    if (distance === 0) { lastAt = time; return 0; }
    const previousAt = lastAt;
    const sign = Math.sign(distance);
    const amplitude = Math.abs(distance);
    if (time - lastAt > 180) reset(time, sign);
    lastAt = time;

    if (locked && sign !== direction) {
      if (!reverseSum) reverseAt = time;
      reverseSum += amplitude;
      clearRise();
      if (!sufficient(reverseSum, reverseAt, time)) return 0;
      peak = amplitude;
      history = [];
      return commit(time, sign);
    }
    reverseSum = 0;
    if (!locked) {
      if (sign !== direction) reset(time, sign);
      sum += amplitude;
      peak = Math.max(peak, amplitude);
      history.push(amplitude);
      history = history.slice(-3);
      return sufficient(sum, startedAt, time) ? commit(time, sign) : 0;
    }

    if (amplitude <= Math.max(4, peak * .25)) {
      valley = Math.min(valley, amplitude);
      // A sustained trough replaces the pre-trough level with its quieter
      // three-event level; isolated coalesced dips cannot lower that reference.
      level = Math.min(level, Math.max(...history, amplitude));
    }
    const threshold = Math.max(valley * 2 + 8, level * 1.25 + 6);
    if (amplitude > threshold) {
      if (risingSince === null) risingSince = previousAt;
      risingSum += amplitude;
      if (time - committedAt >= 160 && time - risingSince >= 24 && sufficient(risingSum, risingSince, time)) {
        peak = amplitude;
        history = [];
        return commit(time, sign);
      }
    } else clearRise();
    history.push(amplitude);
    history = history.slice(-3);
    peak = Math.max(peak, amplitude);
    return 0;
  };
}
