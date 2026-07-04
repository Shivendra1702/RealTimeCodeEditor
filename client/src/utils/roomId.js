/**
 * Friendly, phone-readable room codes like "kfm4-x2rq-7dpn".
 * Ambiguous characters (0/o, 1/l/i) are excluded.
 */
const ALPHABET = "23456789abcdefghjkmnpqrstuvwxyz";

const segment = (length) =>
  Array.from(
    crypto.getRandomValues(new Uint32Array(length)),
    (n) => ALPHABET[n % ALPHABET.length]
  ).join("");

export const generateRoomId = () => `${segment(4)}-${segment(4)}-${segment(4)}`;

/** Mirrors the server-side rule; also accepts legacy UUID room ids. */
const ROOM_ID_RE = /^[A-Za-z0-9][A-Za-z0-9-]{2,62}[A-Za-z0-9]$/;

export const isValidRoomId = (roomId) =>
  typeof roomId === "string" && ROOM_ID_RE.test(roomId.trim());

export const normalizeRoomId = (roomId) => roomId.trim();
