/** Origin tag for changes applied from the network — never re-broadcast. */
export const REMOTE_ORIGIN = "remote";

export const isLocalOrigin = (origin) =>
  origin !== REMOTE_ORIGIN && origin !== "setValue";

/**
 * Applies a full remote document to a CodeMirror instance as a minimal edit
 * (common prefix/suffix diff) instead of setValue(). This keeps the local
 * cursor, selection and scroll position stable when the change is elsewhere
 * in the document — the difference between "usable" and "unusable" when two
 * people type at once.
 */
export const applyRemoteCode = (cm, nextCode) => {
  const prev = cm.getValue();
  if (prev === nextCode) return;

  const prevLen = prev.length;
  const nextLen = nextCode.length;
  const minLen = Math.min(prevLen, nextLen);

  let start = 0;
  while (start < minLen && prev[start] === nextCode[start]) start += 1;

  let endPrev = prevLen;
  let endNext = nextLen;
  while (
    endPrev > start &&
    endNext > start &&
    prev[endPrev - 1] === nextCode[endNext - 1]
  ) {
    endPrev -= 1;
    endNext -= 1;
  }

  cm.replaceRange(
    nextCode.slice(start, endNext),
    cm.posFromIndex(start),
    cm.posFromIndex(endPrev),
    REMOTE_ORIGIN
  );
};
