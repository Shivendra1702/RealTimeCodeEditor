import { MAX_RECENT_ROOMS, STORAGE_KEYS } from "../constants/storageKeys";

/** localStorage helpers that never throw (private mode, quota, SSR). */

const get = (key, fallback) => {
  try {
    const raw = window.localStorage.getItem(key);
    return raw === null ? fallback : JSON.parse(raw);
  } catch {
    return fallback;
  }
};

const set = (key, value) => {
  try {
    window.localStorage.setItem(key, JSON.stringify(value));
  } catch {
    /* best-effort: persistence is a nicety, never a requirement */
  }
};

export const loadUsername = () => {
  const value = get(STORAGE_KEYS.USERNAME, "");
  return typeof value === "string" ? value : "";
};

export const saveUsername = (username) => set(STORAGE_KEYS.USERNAME, username);

/** @returns {Array<{roomId: string, lastJoined: number}>} newest first */
export const loadRecentRooms = () => {
  const value = get(STORAGE_KEYS.RECENT_ROOMS, []);
  if (!Array.isArray(value)) return [];
  return value.filter(
    (r) => r && typeof r.roomId === "string" && typeof r.lastJoined === "number"
  );
};

export const rememberRoom = (roomId) => {
  const rooms = loadRecentRooms().filter((r) => r.roomId !== roomId);
  rooms.unshift({ roomId, lastJoined: Date.now() });
  set(STORAGE_KEYS.RECENT_ROOMS, rooms.slice(0, MAX_RECENT_ROOMS));
};

export const forgetRoom = (roomId) => {
  set(
    STORAGE_KEYS.RECENT_ROOMS,
    loadRecentRooms().filter((r) => r.roomId !== roomId)
  );
};
