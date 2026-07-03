import { io } from "socket.io-client";

import { SERVER_URL } from "../config/env";

const CONNECT_TIMEOUT_MS = 10_000;
const RECONNECTION_ATTEMPTS = 15;
const RECONNECTION_DELAY_MS = 500;
const RECONNECTION_DELAY_MAX_MS = 4_000;

/**
 * Builds the app's Socket.IO connection. Reconnection tuning lives here so
 * transport policy stays out of React code.
 */
export const createSocket = () =>
  io(SERVER_URL, {
    transports: ["websocket", "polling"],
    timeout: CONNECT_TIMEOUT_MS,
    reconnectionAttempts: RECONNECTION_ATTEMPTS,
    reconnectionDelay: RECONNECTION_DELAY_MS,
    reconnectionDelayMax: RECONNECTION_DELAY_MAX_MS,
  });
