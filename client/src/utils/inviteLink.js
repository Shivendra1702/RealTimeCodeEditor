/** Canonical share URL for a room — one definition for every copy button. */
export const buildInviteLink = (roomId) =>
  `${window.location.origin}/editor/${encodeURIComponent(roomId)}`;
