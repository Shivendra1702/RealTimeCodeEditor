import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import toast from "react-hot-toast";

import { JOIN_ERROR_MESSAGES, REJOIN_RETRIABLE_ERRORS } from "../constants/joinErrors";
import { DEFAULT_LANGUAGE, getLanguage } from "../constants/languages";
import { ACTIONS } from "../constants/socketEvents";
import {
  CURSOR_EMIT_INTERVAL_MS,
  JOIN_ACK_TIMEOUT_MS,
  REJOIN_RETRY_DELAY_MS,
  TYPING_EMIT_INTERVAL_MS,
  TYPING_INDICATOR_TTL_MS,
} from "../constants/timings";
import { rememberRoom } from "../utils/storage";
import { throttle } from "../utils/throttle";
import { useSocket } from "./useSocket";

export const SESSION_PHASE = {
  JOINING: "joining",
  READY: "ready",
  ERROR: "error",
};

/**
 * Everything about being *in a room*: connecting, joining (with retry and
 * reconnect semantics), membership, language, typing presence, and the
 * outbound emitters. The editor page stays a pure view over this state.
 *
 * @param {{roomId: string, username: string, editorRef: import("react").RefObject}} params
 *   `editorRef` must expose the CodeEditor imperative API (applyRemote,
 *   setInitialCode, updateRemoteCursor, removeRemoteCursor).
 */
export const useCollabSession = ({ roomId, username, editorRef }) => {
  const { socketRef, status, retry } = useSocket();

  const [phase, setPhase] = useState(SESSION_PHASE.JOINING);
  const [joinError, setJoinError] = useState(null);
  const [users, setUsers] = useState([]);
  const [selfId, setSelfId] = useState(null);
  const [language, setLanguage] = useState(DEFAULT_LANGUAGE);
  const [typing, setTyping] = useState({}); // socketId -> username

  const codeRef = useRef("");
  const pendingCodeRef = useRef(null); // join ack arrived before editor mount
  const hasJoinedRef = useRef(false);
  const leavingRef = useRef(false);
  const rejoinTimerRef = useRef(null);
  const typingTimersRef = useRef(new Map());
  const languageRef = useRef(DEFAULT_LANGUAGE);
  // Convergence guard: while our own edits are in flight (emitted, not yet
  // acked), incoming snapshots predate them server-side — applying one would
  // clobber our newer text and, since remote applies are never re-emitted,
  // leave this client permanently diverged from the room.
  const inFlightEditsRef = useRef(0);
  const sizeWarnedRef = useRef(false);

  useEffect(() => {
    languageRef.current = language;
  }, [language]);

  const clearTypingFor = useCallback((socketId) => {
    const timer = typingTimersRef.current.get(socketId);
    if (timer) clearTimeout(timer);
    typingTimersRef.current.delete(socketId);
    setTyping((prev) => {
      if (!(socketId in prev)) return prev;
      const next = { ...prev };
      delete next[socketId];
      return next;
    });
  }, []);

  const clearAllTyping = useCallback(() => {
    for (const timer of typingTimersRef.current.values()) clearTimeout(timer);
    typingTimersRef.current.clear();
    setTyping({});
  }, []);

  // ——— Outbound (throttled) emitters ————————————————————————————
  const emitCursor = useMemo(
    () =>
      throttle((pos) => {
        const socket = socketRef.current;
        if (socket?.connected) socket.emit(ACTIONS.CURSOR_MOVE, { cursor: pos });
      }, CURSOR_EMIT_INTERVAL_MS),
    [socketRef]
  );

  const emitTyping = useMemo(
    () =>
      throttle(() => {
        const socket = socketRef.current;
        if (socket?.connected) socket.emit(ACTIONS.TYPING);
      }, TYPING_EMIT_INTERVAL_MS),
    [socketRef]
  );

  useEffect(
    () => () => {
      emitCursor.cancel();
      emitTyping.cancel();
    },
    [emitCursor, emitTyping]
  );

  // ——— Socket wiring ————————————————————————————————————————————
  useEffect(() => {
    const socket = socketRef.current;
    if (!socket) return undefined;

    const joinRoom = () => {
      // A fresh (re)join supersedes any scheduled retry and any in-flight
      // edit accounting from the previous connection.
      clearTimeout(rejoinTimerRef.current);
      inFlightEditsRef.current = 0;

      const scheduleRejoinRetry = () => {
        clearTimeout(rejoinTimerRef.current);
        rejoinTimerRef.current = setTimeout(() => {
          if (!leavingRef.current && socket.connected) joinRoom();
        }, REJOIN_RETRY_DELAY_MS);
      };

      socket
        .timeout(JOIN_ACK_TIMEOUT_MS)
        .emit(ACTIONS.JOIN, { roomId, username }, (timeoutErr, res) => {
          if (leavingRef.current) return;
          const isRejoin = hasJoinedRef.current;

          if (timeoutErr || (isRejoin && REJOIN_RETRIABLE_ERRORS.has(res?.error))) {
            // Transient failure. Mid-session we retry quietly instead of
            // tearing the editor down; only a first join hard-fails.
            if (isRejoin) {
              scheduleRejoinRetry();
              return;
            }
            setJoinError(JOIN_ERROR_MESSAGES.TIMEOUT);
            setPhase(SESSION_PHASE.ERROR);
            return;
          }
          if (!res?.ok) {
            setJoinError(
              JOIN_ERROR_MESSAGES[res?.error] ??
                JOIN_ERROR_MESSAGES.INVALID_PAYLOAD
            );
            setPhase(SESSION_PHASE.ERROR);
            return;
          }

          hasJoinedRef.current = true;
          setSelfId(res.self.socketId);
          setUsers(res.users);
          // Presence state from the previous connection is stale: peers may
          // have left (or moved) while we were away and we missed the events.
          clearAllTyping();
          editorRef.current?.clearRemoteCursors();

          if (!isRejoin) {
            setLanguage(res.language);
            codeRef.current = res.code;
            if (editorRef.current) {
              editorRef.current.setInitialCode(res.code);
            } else {
              pendingCodeRef.current = res.code;
            }
            rememberRoom(roomId);
            setPhase(SESSION_PHASE.READY);
            if (res.renamed) {
              toast(`That name was taken — you're "${res.self.username}" here.`, {
                icon: "✏️",
              });
            }
          } else if (res.created && codeRef.current) {
            // The server recreated the room (restart or empty-room expiry
            // while we were away) — push our document (and language) back.
            // `created` is explicit so a live room whose document was
            // deliberately cleared is never overwritten with stale content.
            socket.emit(ACTIONS.CODE_CHANGE, { code: codeRef.current });
            if (languageRef.current !== res.language) {
              socket.emit(ACTIONS.LANGUAGE_CHANGE, {
                language: languageRef.current,
              });
            }
            setPhase(SESSION_PHASE.READY);
            toast.success("Reconnected — restored the document.");
          } else {
            setLanguage(res.language);
            codeRef.current = res.code;
            editorRef.current?.applyRemote(res.code);
            setPhase(SESSION_PHASE.READY);
            toast.success("Reconnected.");
          }
        });
    };

    const onUserJoined = ({ user, users: nextUsers }) => {
      setUsers(nextUsers);
      toast(`${user.username} joined`, { icon: "👋" });
    };

    const onUserLeft = ({ socketId, username: name, users: nextUsers }) => {
      setUsers(nextUsers);
      clearTypingFor(socketId);
      editorRef.current?.removeRemoteCursor(socketId);
      if (name) toast(`${name} left`, { icon: "👋" });
    };

    const onCodeChange = ({ code, socketId, username, color, cursor }) => {
      if (typeof code !== "string") return;
      // Snapshots broadcast before the server processed our in-flight edits
      // are stale relative to them — drop; the room converges on our acked
      // state, and anything newer arrives after the ack (in order).
      if (inFlightEditsRef.current > 0) return;
      codeRef.current = code;
      editorRef.current?.applyRemote(code);
      // The sender's cursor rides with the edit — move the caret in the same
      // frame as the text so it never visibly trails while they type.
      if (cursor && socketId) {
        editorRef.current?.updateRemoteCursor({
          socketId,
          username,
          color,
          cursor,
        });
      }
    };

    const onLanguageChange = ({ language: nextLanguage, username: by }) => {
      setLanguage(nextLanguage);
      toast(`${by} switched the language to ${getLanguage(nextLanguage).label}`, {
        icon: "🔤",
      });
    };

    const onTyping = ({ socketId, username: name }) => {
      setTyping((prev) =>
        prev[socketId] === name ? prev : { ...prev, [socketId]: name }
      );
      const timers = typingTimersRef.current;
      if (timers.has(socketId)) clearTimeout(timers.get(socketId));
      timers.set(
        socketId,
        setTimeout(() => clearTypingFor(socketId), TYPING_INDICATOR_TTL_MS)
      );
    };

    const onCursorMove = (payload) => {
      // While our own edits are in flight the incoming position was computed
      // against a document we've already moved past — skip rather than
      // clamp the caret somewhere wrong for a frame.
      if (inFlightEditsRef.current > 0) return;
      editorRef.current?.updateRemoteCursor(payload);
    };

    if (socket.connected) joinRoom();
    socket.on("connect", joinRoom); // initial connect + every reconnect
    socket.on(ACTIONS.USER_JOINED, onUserJoined);
    socket.on(ACTIONS.USER_LEFT, onUserLeft);
    socket.on(ACTIONS.CODE_CHANGE, onCodeChange);
    socket.on(ACTIONS.LANGUAGE_CHANGE, onLanguageChange);
    socket.on(ACTIONS.TYPING, onTyping);
    socket.on(ACTIONS.CURSOR_MOVE, onCursorMove);

    const timers = typingTimersRef.current;
    return () => {
      socket.off("connect", joinRoom);
      socket.off(ACTIONS.USER_JOINED, onUserJoined);
      socket.off(ACTIONS.USER_LEFT, onUserLeft);
      socket.off(ACTIONS.CODE_CHANGE, onCodeChange);
      socket.off(ACTIONS.LANGUAGE_CHANGE, onLanguageChange);
      socket.off(ACTIONS.TYPING, onTyping);
      socket.off(ACTIONS.CURSOR_MOVE, onCursorMove);
      clearTimeout(rejoinTimerRef.current);
      for (const timer of timers.values()) clearTimeout(timer);
      timers.clear();
    };
  }, [roomId, username, socketRef, editorRef, clearTypingFor, clearAllTyping]);

  // ——— Public API ————————————————————————————————————————————————
  const handleEditorReady = useCallback(() => {
    if (pendingCodeRef.current !== null) {
      editorRef.current?.setInitialCode(pendingCodeRef.current);
      pendingCodeRef.current = null;
    }
  }, [editorRef]);

  const sendCodeChange = useCallback(
    (code, cursor) => {
      codeRef.current = code;
      const socket = socketRef.current;
      if (!socket?.connected) return;

      inFlightEditsRef.current += 1;
      socket.emit(ACTIONS.CODE_CHANGE, { code, cursor }, (res) => {
        inFlightEditsRef.current = Math.max(0, inFlightEditsRef.current - 1);
        if (res?.ok) {
          sizeWarnedRef.current = false;
        } else if (res?.error === "DOC_TOO_LARGE" && !sizeWarnedRef.current) {
          sizeWarnedRef.current = true;
          toast.error(
            "Document exceeds the size limit — recent changes didn't sync."
          );
        }
      });
      emitTyping();
    },
    [socketRef, emitTyping]
  );

  const sendCursor = useCallback((pos) => emitCursor(pos), [emitCursor]);

  const changeLanguage = useCallback(
    (nextLanguage) => {
      setLanguage(nextLanguage);
      const socket = socketRef.current;
      if (socket?.connected) {
        socket.emit(ACTIONS.LANGUAGE_CHANGE, { language: nextLanguage });
      }
    },
    [socketRef]
  );

  const leaveRoom = useCallback(() => {
    leavingRef.current = true;
    const socket = socketRef.current;
    if (socket?.connected) socket.emit(ACTIONS.LEAVE);
  }, [socketRef]);

  const getCode = useCallback(() => codeRef.current, []);

  const typingIds = useMemo(() => new Set(Object.keys(typing)), [typing]);
  const typingNames = useMemo(() => Object.values(typing), [typing]);

  return {
    // connection
    status,
    retry,
    // session state
    phase,
    joinError,
    users,
    selfId,
    language,
    typingIds,
    typingNames,
    // actions
    getCode,
    sendCodeChange,
    sendCursor,
    changeLanguage,
    leaveRoom,
    handleEditorReady,
  };
};
