import { ACTIONS, JOIN_ERRORS } from "../constants/index.js";
import { logger } from "../utils/logger.js";
import { TokenBucket } from "./rateLimiter.js";
import {
  isValidCode,
  isValidCursor,
  isValidLanguage,
  isValidRoomId,
  sanitizeUsername,
} from "../utils/validation.js";

/**
 * Wires all realtime handlers. The server is the source of truth for room
 * membership and document state; clients never decide who is in a room.
 */
export const registerSocketHandlers = (io, store, config) => {
  io.on("connection", (socket) => {
    const bucket = new TokenBucket();
    logger.debug(`socket connected: ${socket.id}`);

    const guard = () => {
      if (bucket.consume()) return true;
      if (bucket.abusive) {
        logger.warn(`disconnecting abusive socket: ${socket.id}`);
        socket.disconnect(true);
      }
      return false;
    };

    /** Every room-scoped event trusts only the server-side association. */
    const currentRoom = () =>
      socket.data.roomId ? store.getRoom(socket.data.roomId) : null;

    socket.on(ACTIONS.JOIN, (payload, ack) => {
      if (typeof ack !== "function") return; // protocol requires an ack
      if (!guard()) return ack({ ok: false, error: "RATE_LIMITED" });
      if (!payload || typeof payload !== "object") {
        return ack({ ok: false, error: JOIN_ERRORS.INVALID_PAYLOAD });
      }

      // Idempotent re-join: a client retrying JOIN on the same socket gets
      // the current state back instead of an error.
      if (socket.data.roomId) {
        const room = store.getRoom(socket.data.roomId);
        const user = room?.users.get(socket.id);
        if (room && user && socket.data.roomId === payload.roomId) {
          return ack({
            ok: true,
            self: user,
            users: store.getUsers(room.id),
            code: room.code,
            language: room.language,
            renamed: false,
            created: false,
          });
        }
        return ack({ ok: false, error: JOIN_ERRORS.INVALID_PAYLOAD });
      }

      const { roomId } = payload;
      if (!isValidRoomId(roomId)) {
        return ack({ ok: false, error: JOIN_ERRORS.INVALID_ROOM_ID });
      }
      const username = sanitizeUsername(payload.username);
      if (!username) {
        return ack({ ok: false, error: JOIN_ERRORS.INVALID_USERNAME });
      }

      // Self-heal: evict members whose sockets are gone (e.g. a network blip
      // where the server never saw the old connection close). Frees seats
      // and usernames before capacity / duplicate-name checks run.
      const existing = store.getRoom(roomId);
      if (existing) {
        for (const staleId of [...existing.users.keys()]) {
          if (!io.sockets.sockets.has(staleId)) {
            const left = store.leave(roomId, staleId);
            if (left) {
              io.to(roomId).emit(ACTIONS.USER_LEFT, {
                socketId: staleId,
                username: left.user.username,
                users: store.getUsers(roomId),
              });
              logger.warn(`evicted ghost socket ${staleId} from ${roomId}`);
            }
          }
        }
      }

      const result = store.join(roomId, socket.id, username);
      if (!result.ok) {
        return ack({ ok: false, error: result.error });
      }

      socket.join(roomId);
      socket.data.roomId = roomId;
      socket.data.username = result.user.username;

      const users = store.getUsers(roomId);
      socket.to(roomId).emit(ACTIONS.USER_JOINED, { user: result.user, users });
      logger.info(
        `${result.user.username} joined ${roomId} (${users.length} online)`
      );

      ack({
        ok: true,
        self: result.user,
        users,
        code: result.room.code,
        language: result.room.language,
        renamed: result.renamed,
        // Lets a reconnecting client distinguish "room was recreated after a
        // restart/expiry" (safe to push its document back) from "the room is
        // live and its document is legitimately empty".
        created: result.created,
      });
    });

    socket.on(ACTIONS.CODE_CHANGE, (payload, ack) => {
      // Every outcome is acked so clients can track in-flight edits (their
      // convergence guard) and surface rejected changes instead of silently
      // diverging from the room.
      const done = (result) => {
        if (typeof ack === "function") ack(result);
      };

      if (!guard()) return done({ ok: false, error: "RATE_LIMITED" });
      const room = currentRoom();
      if (!room) return done({ ok: false, error: "NOT_IN_ROOM" });
      const code = payload?.code;
      if (typeof code !== "string") {
        return done({ ok: false, error: "INVALID_PAYLOAD" });
      }
      if (!isValidCode(code, config.maxCodeBytes)) {
        return done({ ok: false, error: "DOC_TOO_LARGE" });
      }

      store.setCode(room.id, code);

      // The sender's cursor rides along with the edit so receivers can move
      // the remote caret atomically with the text — a separate (throttled)
      // cursor event would visibly trail behind fast typing.
      const user = room.users.get(socket.id);
      const broadcast = {
        code,
        socketId: socket.id,
        username: user?.username,
        color: user?.color,
      };
      if (isValidCursor(payload.cursor)) {
        broadcast.cursor = {
          line: payload.cursor.line,
          ch: payload.cursor.ch,
        };
      }
      socket.to(room.id).emit(ACTIONS.CODE_CHANGE, broadcast);
      done({ ok: true });
    });

    socket.on(ACTIONS.LANGUAGE_CHANGE, (payload) => {
      if (!guard()) return;
      const room = currentRoom();
      if (!room) return;
      const language = payload?.language;
      if (!isValidLanguage(language) || room.language === language) return;

      store.setLanguage(room.id, language);
      socket.to(room.id).emit(ACTIONS.LANGUAGE_CHANGE, {
        language,
        username: socket.data.username,
      });
    });

    socket.on(ACTIONS.TYPING, () => {
      if (!guard()) return;
      const room = currentRoom();
      if (!room) return;
      socket.to(room.id).emit(ACTIONS.TYPING, {
        socketId: socket.id,
        username: socket.data.username,
      });
    });

    socket.on(ACTIONS.CURSOR_MOVE, (payload) => {
      if (!guard()) return;
      const room = currentRoom();
      if (!room) return;
      if (!isValidCursor(payload?.cursor)) return;

      const user = room.users.get(socket.id);
      if (!user) return;
      socket.to(room.id).emit(ACTIONS.CURSOR_MOVE, {
        socketId: socket.id,
        username: user.username,
        color: user.color,
        cursor: { line: payload.cursor.line, ch: payload.cursor.ch },
      });
    });

    const leaveRoom = () => {
      const roomId = socket.data.roomId;
      if (!roomId) return;
      const left = store.leave(roomId, socket.id);
      socket.leave(roomId);
      socket.data.roomId = null;
      socket.data.username = null;
      if (!left) return;

      socket.to(roomId).emit(ACTIONS.USER_LEFT, {
        socketId: socket.id,
        username: left.user.username,
        users: store.getUsers(roomId),
      });
      logger.info(
        `${left.user.username} left ${roomId} (${left.remaining} online)`
      );
    };

    socket.on(ACTIONS.LEAVE, () => {
      if (!guard()) return;
      leaveRoom();
    });

    socket.on("disconnecting", leaveRoom);

    socket.on("disconnect", (reason) => {
      logger.debug(`socket disconnected: ${socket.id} (${reason})`);
    });
  });
};
