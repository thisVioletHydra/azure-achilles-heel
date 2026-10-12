// One owner for the frame handle, including suspension from inside a frame.
export function createFrameLoop(tick, { request = requestAnimationFrame, cancel = cancelAnimationFrame, now = () => performance.now() } = {}) {
  let active = false;
  let handle = null;
  let previous = 0;
  function frame(time) {
    handle = null;
    if (!active) return;
    const dt = Math.min((time - previous) / 1000 || .016, .05);
    previous = time;
    tick(time, dt);
    if (active && handle === null) handle = request(frame);
  }
  return {
    start() {
      if (active) return;
      active = true;
      previous = now();
      handle = request(frame);
    },
    stop() {
      active = false;
      if (handle !== null) cancel(handle);
      handle = null;
    },
  };
}
