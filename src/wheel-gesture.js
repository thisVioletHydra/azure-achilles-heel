export function createWheelGesture() {
  let distanceSum = 0;
  let lastAt = -Infinity;
  let used = false;
  let direction = 0;
  let peak = 0;
  let committedAt = -Infinity;
  let risingSince = null;
  let valley = Infinity;
  let armed = false;

  return function acceptWheel({ distance, time }) {
    const nextDirection = Math.sign(distance);
    const amplitude = Math.abs(distance);
    if (used && amplitude <= Math.max(4, peak * .25)) armed = true;
    if (armed) valley = Math.min(valley, amplitude);
    if (armed && amplitude > valley * 2 + 8) risingSince ??= time;
    else risingSince = null;
    // Confirm renewed input across several frames, even after a very brief trough.
    const newStroke = used && armed && time - committedAt > 160 && risingSince !== null && time - risingSince >= 24;
    if (time - lastAt > 120 || nextDirection !== direction || newStroke) {
      distanceSum = 0;
      used = false;
      peak = 0;
      risingSince = null;
      valley = Infinity;
      armed = false;
    }
    lastAt = time;
    direction = nextDirection;
    peak = Math.max(peak, amplitude);
    if (used) return 0;
    distanceSum += distance;
    if (Math.abs(distanceSum) < 28) return 0;
    used = true;
    committedAt = time;
    return direction;
  };
}
