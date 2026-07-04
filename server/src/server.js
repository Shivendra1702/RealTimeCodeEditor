import http from "node:http";
import { Server } from "socket.io";
import { createApp } from "./app.js";
import { registerSocketHandlers } from "./realtime/socketHandlers.js";
import { RoomStore } from "./store/roomStore.js";

/**
 * Builds the full server (HTTP + Socket.IO + room store) without binding a
 * port, so tests can spin it up on an ephemeral port.
 */
export const createServer = (config) => {
  const store = new RoomStore(config);
  const app = createApp(store);
  const httpServer = http.createServer(app);

  const io = new Server(httpServer, {
    cors: {
      origin: config.corsOrigins.includes("*") ? "*" : config.corsOrigins,
      methods: ["GET", "POST"],
    },
    maxHttpBufferSize: config.maxHttpBufferSize,
    serveClient: false,
  });

  registerSocketHandlers(io, store, config);

  const close = async () => {
    store.dispose();
    io.disconnectSockets(true);
    await new Promise((resolve) => io.close(resolve));
  };

  return { app, httpServer, io, store, close };
};
