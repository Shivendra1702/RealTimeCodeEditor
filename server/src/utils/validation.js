import { LANGUAGE_IDS } from "../constants/index.js";

/**
 * Room ids: 4–64 chars of alphanumerics and hyphens, starting/ending with an
 * alphanumeric. Accepts both the friendly "kfm-x2rq-7dp" codes the client
 * generates and legacy UUID v4 ids.
 */
const ROOM_ID_RE = /^[A-Za-z0-9][A-Za-z0-9-]{2,62}[A-Za-z0-9]$/;

/** Letters (any script), numbers, spaces and . _ ' - between 1 and 24 chars. */
const USERNAME_RE = /^[\p{L}\p{N} ._'-]{1,24}$/u;

export const isValidRoomId = (roomId) =>
  typeof roomId === "string" && ROOM_ID_RE.test(roomId);

/**
 * Normalizes a username (trim, collapse whitespace) and validates it.
 * Returns the cleaned name or null when unusable.
 */
export const sanitizeUsername = (username) => {
  if (typeof username !== "string") return null;
  const cleaned = username.trim().replace(/\s+/g, " ").slice(0, 24);
  return USERNAME_RE.test(cleaned) ? cleaned : null;
};

export const isValidLanguage = (language) => LANGUAGE_IDS.includes(language);

export const isValidCode = (code, maxBytes) =>
  typeof code === "string" && Buffer.byteLength(code, "utf8") <= maxBytes;

export const isValidCursor = (cursor) =>
  !!cursor &&
  typeof cursor === "object" &&
  Number.isInteger(cursor.line) &&
  Number.isInteger(cursor.ch) &&
  cursor.line >= 0 &&
  cursor.line <= 500_000 &&
  cursor.ch >= 0 &&
  cursor.ch <= 500_000;
