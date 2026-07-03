import "dotenv/config";

const num = (value, fallback) => {
  const n = Number(value);
  return Number.isFinite(n) && n > 0 ? n : fallback;
};

const list = (value, fallback) => {
  if (!value) return fallback;
  const items = value
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean);
  return items.length ? items : fallback;
};

export const config = {
  port: num(process.env.PORT, 5000),
  nodeEnv: process.env.NODE_ENV || "development",
  /** Comma-separated allowlist. "*" keeps the demo-friendly open default. */
  corsOrigins: list(process.env.CORS_ORIGIN, ["*"]),
  maxUsersPerRoom: num(process.env.MAX_USERS_PER_ROOM, 12),
  maxRooms: num(process.env.MAX_ROOMS, 500),
  /** Hard ceiling for a single document, in bytes. */
  maxCodeBytes: num(process.env.MAX_CODE_BYTES, 256 * 1024),
  /** How long an empty room keeps its document before being deleted. */
  emptyRoomTtlMs: num(process.env.EMPTY_ROOM_TTL_MS, 10 * 60 * 1000),
  /** Rooms idle longer than this are swept even if occupied sockets leaked. */
  staleRoomTtlMs: num(process.env.STALE_ROOM_TTL_MS, 24 * 60 * 60 * 1000),
  /** Socket.IO payload ceiling — keep comfortably above maxCodeBytes. */
  maxHttpBufferSize: num(process.env.MAX_HTTP_BUFFER_SIZE, 1e6),
};
