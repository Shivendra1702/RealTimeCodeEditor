/** Leading + trailing throttle. `cancel()` drops any pending trailing call. */
export const throttle = (fn, wait) => {
  let last = 0;
  let timer = null;
  let lastArgs = null;

  const invoke = () => {
    last = Date.now();
    timer = null;
    fn(...lastArgs);
  };

  const throttled = (...args) => {
    lastArgs = args;
    const remaining = wait - (Date.now() - last);
    if (remaining <= 0) {
      if (timer) {
        clearTimeout(timer);
        timer = null;
      }
      invoke();
    } else if (!timer) {
      timer = setTimeout(invoke, remaining);
    }
  };

  throttled.cancel = () => {
    if (timer) clearTimeout(timer);
    timer = null;
  };

  return throttled;
};
