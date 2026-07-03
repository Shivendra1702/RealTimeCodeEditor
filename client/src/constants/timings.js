/** Every user-tunable delay in one place — no magic numbers in components. */

/** How long a JOIN ack may take before we consider it failed. */
export const JOIN_ACK_TIMEOUT_MS = 8_000;

/** Delay before quietly retrying a failed mid-session rejoin. */
export const REJOIN_RETRY_DELAY_MS = 3_000;

/** How long a peer stays marked as "typing" after their last signal. */
export const TYPING_INDICATOR_TTL_MS = 1_800;

/** Minimum gap between outgoing typing signals. */
export const TYPING_EMIT_INTERVAL_MS = 1_200;

/** Minimum gap between outgoing cursor positions. */
export const CURSOR_EMIT_INTERVAL_MS = 90;

/** How long a remote cursor shows its name label after moving. */
export const CURSOR_LABEL_FADE_MS = 2_500;

/** How long copy buttons show their success state. */
export const COPY_FEEDBACK_MS = 2_000;

/** Default toast lifetime. */
export const TOAST_DURATION_MS = 3_200;
