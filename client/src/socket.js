import { io } from "socket.io-client";

export const initSocket = async () => {
  const options = {
    transports: ["websocket"],
    timeout: 10000,
    reconnectionAttempts: "Infinity",
    "force new connection": true,
  };
  return io(import.meta.env.VITE_BACKEND_URL, options);
};
