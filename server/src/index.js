import { config } from "./config/index.js";
import { logger } from "./utils/logger.js";
import { createServer } from "./server.js";

const { httpServer, close } = createServer(config);

httpServer.listen(config.port, () => {
  logger.info(
    `CodeTogether server listening on :${config.port} (${config.nodeEnv})`
  );
});

let shuttingDown = false;
const shutdown = async (signal) => {
  if (shuttingDown) return;
  shuttingDown = true;
  logger.info(`${signal} received — shutting down gracefully`);
  const forceExit = setTimeout(() => process.exit(1), 10_000);
  forceExit.unref();
  try {
    await close();
    await new Promise((resolve) => httpServer.close(resolve));
    process.exit(0);
  } catch (err) {
    logger.error("shutdown error", err);
    process.exit(1);
  }
};

process.on("SIGINT", () => shutdown("SIGINT"));
process.on("SIGTERM", () => shutdown("SIGTERM"));
process.on("unhandledRejection", (reason) => {
  logger.error("unhandled rejection", reason);
});
process.on("uncaughtException", (err) => {
  logger.error("uncaught exception", err);
  shutdown("uncaughtException");
});
