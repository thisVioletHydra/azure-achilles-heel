export function createWheelGesture() {
  let distanceSum = 0;
  let lastAt = -Infinity;
  let used = false;
  let direction = 0;
  let peak = 0;
  let committedAt = -Infinity;
  let quietSince = null;
  let valley = Infinity;
  let armed = false;

  return function acceptWheel({ distance, time }) {
    const nextDirection = Math.sign(distance);
    const amplitude = Math.abs(distance);
    if (used && !armed) {
      if (amplitude <= Math.max(4, peak * .25)) {
        quietSince ??= time;
        valley = Math.min(valley, amplitude);
        armed = time - quietSince >= 80;
      } else {
        quietSince = null;
        valley = Infinity;
      }
    }
    if (armed) valley = Math.min(valley, amplitude);
    // Keep the quiet trough while the next stroke accelerates gradually.
    const newStroke = used && armed && time - committedAt > 160 && amplitude > valley * 2 + 8;
    if (time - lastAt > 120 || nextDirection !== direction || newStroke) {
      distanceSum = 0;
      used = false;
      peak = 0;
      quietSince = null;
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
