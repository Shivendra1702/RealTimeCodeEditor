/** Mirrors server/src/utils/validation.js — letters, numbers, space . _ ' - (1–24). */
const USERNAME_RE = /^[\p{L}\p{N} ._'-]{1,24}$/u;

export const sanitizeUsername = (username) => {
  if (typeof username !== "string") return null;
  const cleaned = username.trim().replace(/\s+/g, " ").slice(0, 24);
  return USERNAME_RE.test(cleaned) ? cleaned : null;
};
