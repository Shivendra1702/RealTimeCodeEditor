/**
 * All environment access lives here — the rest of the app imports resolved
 * values, never `import.meta.env` directly.
 */
const DEV_SERVER_FALLBACK = "http://localhost:5000";

export const SERVER_URL =
  import.meta.env.VITE_SERVER_URL ||
  (import.meta.env.DEV ? DEV_SERVER_FALLBACK : window.location.origin);
