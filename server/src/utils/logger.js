const LEVELS = { debug: 10, info: 20, warn: 30, error: 40 };

const threshold =
  LEVELS[(process.env.LOG_LEVEL || "").toLowerCase()] ??
  (process.env.NODE_ENV === "production" ? LEVELS.info : LEVELS.debug);

const write = (level, message, meta) => {
  if (LEVELS[level] < threshold) return;
  const line = `${new Date().toISOString()} [${level.toUpperCase()}] ${message}`;
  const args = meta === undefined ? [line] : [line, meta];
  // eslint-disable-next-line no-console
  (level === "error" ? console.error : console.log)(...args);
};

export const logger = {
  debug: (msg, meta) => write("debug", msg, meta),
  info: (msg, meta) => write("info", msg, meta),
  warn: (msg, meta) => write("warn", msg, meta),
  error: (msg, meta) => write("error", msg, meta),
};
