import { Router } from "express";
import { createHealthController } from "../controllers/healthController.js";

export const createHealthRoutes = (store) => {
  const router = Router();
  router.get("/health", createHealthController(store));
  return router;
};
