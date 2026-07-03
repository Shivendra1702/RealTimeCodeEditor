/**
 * Socket protocol. Mirrored in client/src/constants/socketEvents.js — keep in sync.
 */
export const ACTIONS = {
  JOIN: "join", // client -> server (ack-based)
  LEAVE: "leave", // client -> server
  USER_JOINED: "user:joined", // server -> others in room
  USER_LEFT: "user:left", // server -> others in room
  CODE_CHANGE: "code:change", // bidirectional
  LANGUAGE_CHANGE: "language:change", // bidirectional
  TYPING: "typing", // bidirectional
  CURSOR_MOVE: "cursor:move", // bidirectional
};

/** Language ids the room will accept. Mirrored in client/src/constants/languages.js. */
export const LANGUAGE_IDS = [
  "javascript",
  "typescript",
  "python",
  "html",
  "css",
  "json",
  "markdown",
  "java",
  "c",
  "cpp",
  "go",
  "rust",
  "sql",
  "shell",
];

export const DEFAULT_LANGUAGE = "javascript";

/** Distinct, accessible-on-dark hues assigned to participants. */
export const USER_COLORS = [
  "#7C8CF8",
  "#34D399",
  "#F472B6",
  "#FBBF24",
  "#22D3EE",
  "#A78BFA",
  "#FB923C",
  "#4ADE80",
  "#E879F9",
  "#38BDF8",
  "#F87171",
  "#FACC15",
];

export const JOIN_ERRORS = {
  INVALID_PAYLOAD: "INVALID_PAYLOAD",
  INVALID_ROOM_ID: "INVALID_ROOM_ID",
  INVALID_USERNAME: "INVALID_USERNAME",
  ROOM_FULL: "ROOM_FULL",
  SERVER_FULL: "SERVER_FULL",
};
