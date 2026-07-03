import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import express from "express";
import { logger } from "../utils/logger.js";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const CLIENT_DIST = path.resolve(__dirname, "../../../client/dist");

/**
 * In single-service deployments the built client sits in client/dist; serve
 * it with an SPA fallback so /editor/:roomId deep links resolve. No-op when
 * no build exists (split deployments, local dev).
 */
export const registerStaticClient = (app) => {
  if (!fs.existsSync(path.join(CLIENT_DIST, "index.html"))) {
    logger.info("no client build found — running as API/socket server only");
    app.get("/", (req, res) => {
      res.json({ name: "CodeTogether API", health: "/health" });
    });
    return;
  }

  app.use(express.static(CLIENT_DIST, { maxAge: "1h", index: "index.html" }));
  app.get("*", (req, res, next) => {
    if (req.path.startsWith("/socket.io")) return next();
    res.sendFile(path.join(CLIENT_DIST, "index.html"));
  });
};
