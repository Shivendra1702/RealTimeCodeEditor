import { DEFAULT_LANGUAGE, USER_COLORS } from "../constants/index.js";
import { logger } from "../utils/logger.js";

/**
 * In-memory, authoritative store for room state (document, language,
 * participants). Single-process by design; swap for Redis if scaling out.
 */
export class RoomStore {
  constructor({ maxUsersPerRoom, maxRooms, emptyRoomTtlMs, staleRoomTtlMs }) {
    this.rooms = new Map();
    this.maxUsersPerRoom = maxUsersPerRoom;
    this.maxRooms = maxRooms;
    this.emptyRoomTtlMs = emptyRoomTtlMs;
    this.staleRoomTtlMs = staleRoomTtlMs;
    this.sweeper = setInterval(() => this.sweepStaleRooms(), 60 * 60 * 1000);
    // Never keep the process alive just for the sweeper.
    if (typeof this.sweeper.unref === "function") this.sweeper.unref();
  }

  /** @returns {{ok: true, room, user, renamed: boolean, created: boolean} | {ok: false, error: string}} */
  join(roomId, socketId, username) {
    let room = this.rooms.get(roomId);
    let created = false;

    if (!room) {
      if (this.rooms.size >= this.maxRooms) {
        return { ok: false, error: "SERVER_FULL" };
      }
      created = true;
      room = {
        id: roomId,
        code: "",
        language: DEFAULT_LANGUAGE,
        users: new Map(),
        createdAt: Date.now(),
        lastActivity: Date.now(),
        deletionTimer: null,
      };
      this.rooms.set(roomId, room);
      logger.info(`room created: ${roomId}`);
    }

    if (room.deletionTimer) {
      clearTimeout(room.deletionTimer);
      room.deletionTimer = null;
    }

    if (room.users.size >= this.maxUsersPerRoom) {
      return { ok: false, error: "ROOM_FULL" };
    }

    const { name, renamed } = this.#uniqueName(room, username);
    const user = {
      socketId,
      username: name,
      color: this.#nextColor(room),
      joinedAt: Date.now(),
    };
    room.users.set(socketId, user);
    room.lastActivity = Date.now();
    return { ok: true, room, user, renamed, created };
  }

  /** @returns {{user, room, remaining: number} | null} */
  leave(roomId, socketId) {
    const room = this.rooms.get(roomId);
    if (!room) return null;
    const user = room.users.get(socketId);
    if (!user) return null;
    room.users.delete(socketId);
    room.lastActivity = Date.now();

    if (room.users.size === 0) {
      // Keep the document around briefly so a refresh doesn't lose work.
      room.deletionTimer = setTimeout(() => {
        this.rooms.delete(roomId);
        logger.info(`room expired: ${roomId}`);
      }, this.emptyRoomTtlMs);
      if (typeof room.deletionTimer.unref === "function") {
        room.deletionTimer.unref();
      }
    }
    return { user, room, remaining: room.users.size };
  }

  getRoom(roomId) {
    return this.rooms.get(roomId) ?? null;
  }

  getUsers(roomId) {
    const room = this.rooms.get(roomId);
    if (!room) return [];
    return [...room.users.values()].map(({ socketId, username, color }) => ({
      socketId,
      username,
      color,
    }));
  }

  setCode(roomId, code) {
    const room = this.rooms.get(roomId);
    if (!room) return false;
    room.code = code;
    room.lastActivity = Date.now();
    return true;
  }

  setLanguage(roomId, language) {
    const room = this.rooms.get(roomId);
    if (!room) return false;
    room.language = language;
    room.lastActivity = Date.now();
    return true;
  }

  stats() {
    let users = 0;
    for (const room of this.rooms.values()) users += room.users.size;
    return { rooms: this.rooms.size, users };
  }

  sweepStaleRooms() {
    const cutoff = Date.now() - this.staleRoomTtlMs;
    for (const [roomId, room] of this.rooms) {
      // Never sweep occupied rooms — idle users are still users. Leaked
      // memberships (dead sockets) are evicted by the join-time ghost check.
      if (room.users.size > 0) continue;
      if (room.lastActivity < cutoff) {
        if (room.deletionTimer) clearTimeout(room.deletionTimer);
        this.rooms.delete(roomId);
        logger.warn(`room swept (stale): ${roomId}`);
      }
    }
  }

  dispose() {
    clearInterval(this.sweeper);
    for (const room of this.rooms.values()) {
      if (room.deletionTimer) clearTimeout(room.deletionTimer);
    }
    this.rooms.clear();
  }

  /** Resolves duplicate display names: "Alex" -> "Alex 2". */
  #uniqueName(room, username) {
    const taken = new Set(
      [...room.users.values()].map((u) => u.username.toLowerCase())
    );
    if (!taken.has(username.toLowerCase())) {
      return { name: username, renamed: false };
    }
    for (let n = 2; n < 100; n += 1) {
      const candidate = `${username.slice(0, 20)} ${n}`;
      if (!taken.has(candidate.toLowerCase())) {
        return { name: candidate, renamed: true };
      }
    }
    return { name: `${username.slice(0, 16)} ${Date.now() % 1000}`, renamed: true };
  }

  /** Picks the first palette color not already in use in the room. */
  #nextColor(room) {
    const used = new Set([...room.users.values()].map((u) => u.color));
    return (
      USER_COLORS.find((c) => !used.has(c)) ??
      USER_COLORS[room.users.size % USER_COLORS.length]
    );
  }
}
