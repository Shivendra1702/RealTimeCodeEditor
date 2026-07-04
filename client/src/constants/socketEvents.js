/**
 * Socket protocol event names. Mirrored in server/src/constants/index.js —
 * keep in sync.
 */
export const ACTIONS = {
  JOIN: "join",
  LEAVE: "leave",
  USER_JOINED: "user:joined",
  USER_LEFT: "user:left",
  CODE_CHANGE: "code:change",
  LANGUAGE_CHANGE: "language:change",
  TYPING: "typing",
  CURSOR_MOVE: "cursor:move",
};
