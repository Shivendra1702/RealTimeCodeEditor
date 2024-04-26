import { io } from "socket.io-client";

export const initSocket = async () => {
  const options = {
    transports: ["websocket"],
    timeout: 10000,
    reconnectionAttempts: "Infinity",
    "force new connection": true,
  };
  return io("http://localhost:5000", options);
};
