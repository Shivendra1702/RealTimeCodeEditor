/**
 * User-facing copy for every join error the server can return
 * (see JOIN_ERRORS in server/src/constants/index.js) plus client-side
 * transport failures.
 */
export const JOIN_ERROR_MESSAGES = {
  INVALID_PAYLOAD: "Something went wrong while joining. Please try again.",
  INVALID_ROOM_ID: "That room ID isn't valid. Check the invite and try again.",
  INVALID_USERNAME: "That display name can't be used. Try a different one.",
  ROOM_FULL: "This room is full. Ask the host to make space, or start a new room.",
  SERVER_FULL: "The server is at capacity right now. Please try again shortly.",
  RATE_LIMITED: "You're sending requests too quickly. Give it a moment.",
  TIMEOUT: "The server took too long to respond. Check your connection.",
};

/**
 * Errors that warrant a quiet retry when they happen mid-session (rejoin).
 * ROOM_FULL is included because right after a network blip the seat is often
 * held by our own not-yet-evicted ghost socket — retrying succeeds once the
 * server notices the old connection is dead.
 */
export const REJOIN_RETRIABLE_ERRORS = new Set([
  "RATE_LIMITED",
  "ROOM_FULL",
  "SERVER_FULL",
]);
