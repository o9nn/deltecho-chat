"use strict";
export function truncateText(text, max_len) {
  if (text.length > max_len) {
    return text.slice(0, max_len) + "\u2026";
  } else {
    return text;
  }
}
export function isInviteLink(url) {
  return url.startsWith("https://i.delta.chat/") && url.includes("#");
}
export function throttle(fn, wait) {
  let inThrottle, timeout, lastTime;
  const ret = (...args) => {
    if (!inThrottle) {
      fn(...args);
      lastTime = performance.now();
      inThrottle = true;
    } else {
      clearTimeout(timeout);
      timeout = setTimeout(
        () => {
          fn(...args);
          lastTime = performance.now();
        },
        Math.max(wait - (performance.now() - lastTime), 0)
      );
    }
  };
  ret.cancel = () => {
    clearTimeout(timeout);
  };
  return ret;
}
//# sourceMappingURL=util.js.map
