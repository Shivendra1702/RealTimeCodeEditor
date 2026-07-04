import express from "express";
import { securityHeaders } from "./middleware/securityHeaders.js";
import { registerStaticClient } from "./middleware/staticClient.js";
import { createHealthRoutes } from "./routes/healthRoutes.js";

/** Composes the HTTP layer: middleware → routes → static client fallback. */
export const createApp = (store) => {
  const app = express();
  app.disable("x-powered-by");

  app.use(securityHeaders);
  app.use(createHealthRoutes(store));
  registerStaticClient(app);

  return app;
};
