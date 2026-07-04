import { useCallback, useEffect, useRef, useState } from "react";

import { createSocket } from "../services/socketClient";

export const SOCKET_STATUS = {
  CONNECTING: "connecting",
  CONNECTED: "connected",
  RECONNECTING: "reconnecting",
  FAILED: "failed",
};

/**
 * Owns the socket lifecycle for a page. Reconnection is handled by
 * Socket.IO; this hook just translates transport events into a simple
 * status the UI can render honestly.
 */
export const useSocket = () => {
  const socketRef = useRef(null);
  const [status, setStatus] = useState(SOCKET_STATUS.CONNECTING);

  useEffect(() => {
    const socket = createSocket();
    socketRef.current = socket;
    setStatus(SOCKET_STATUS.CONNECTING);

    const onConnect = () => setStatus(SOCKET_STATUS.CONNECTED);
    const onDisconnect = () => setStatus(SOCKET_STATUS.RECONNECTING);
    const onReconnectFailed = () => setStatus(SOCKET_STATUS.FAILED);
    const onConnectError = () => {
      // `active` means the manager will keep retrying on its own.
      setStatus(
        socket.active ? SOCKET_STATUS.RECONNECTING : SOCKET_STATUS.FAILED
      );
    };

    socket.on("connect", onConnect);
    socket.on("disconnect", onDisconnect);
    socket.on("connect_error", onConnectError);
    socket.io.on("reconnect_failed", onReconnectFailed);

    return () => {
      socketRef.current = null;
      socket.off("connect", onConnect);
      socket.off("disconnect", onDisconnect);
      socket.off("connect_error", onConnectError);
      socket.io.off("reconnect_failed", onReconnectFailed);
      socket.disconnect();
    };
  }, []);

  /** Manual retry after reconnection gives up. */
  const retry = useCallback(() => {
    const socket = socketRef.current;
    if (socket && !socket.connected) {
      setStatus(SOCKET_STATUS.CONNECTING);
      socket.connect();
    }
  }, []);

  return { socketRef, status, retry };
};
