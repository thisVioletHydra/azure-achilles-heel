export function navigationTarget({ destination, position, motionTarget, direction, last }) {
  return Math.max(0, Math.min(last, (destination ?? motionTarget ?? position) + direction));
}
