import { useCallback, useEffect, useRef, useState } from "react";
import { Navigate, useLocation, useNavigate, useParams } from "react-router-dom";
import toast from "react-hot-toast";

import { LogoMark } from "../components/common/Logo";
import CodeEditor from "../components/editor/CodeEditor";
import ConnectionBanner from "../components/editor/ConnectionBanner";
import Sidebar from "../components/editor/Sidebar";
import StatusBar from "../components/editor/StatusBar";
import TopBar from "../components/editor/TopBar";
import { SESSION_PHASE, useCollabSession } from "../hooks/useCollabSession";
import { SOCKET_STATUS } from "../hooks/useSocket";
import { downloadCode } from "../utils/download";

/**
 * Route guard: direct visits (invite links) don't carry a username, so we
 * bounce to the home page with the room prefilled instead of crashing.
 */
const EditorPage = () => {
  const { roomId } = useParams();
  const location = useLocation();
  const username = location.state?.username;

  if (!username) {
    return <Navigate to={`/?room=${encodeURIComponent(roomId ?? "")}`} replace />;
  }
  return <EditorRoom roomId={roomId} username={username} />;
};

/** The room itself — a view over useCollabSession plus local editor state. */
const EditorRoom = ({ roomId, username }) => {
  const navigate = useNavigate();
  const editorRef = useRef(null);
  const session = useCollabSession({ roomId, username, editorRef });

  const [cursor, setCursor] = useState({ line: 0, ch: 0 });
  const [chars, setChars] = useState(0);
  const [sidebarOpen, setSidebarOpen] = useState(false);

  useEffect(() => {
    document.title = `${roomId} · CodeTogether`;
    return () => {
      document.title = "CodeTogether — Real-time collaborative code editor";
    };
  }, [roomId]);

  // Close the mobile room panel with Escape.
  useEffect(() => {
    if (!sidebarOpen) return undefined;
    const onKey = (event) => {
      if (event.key === "Escape") setSidebarOpen(false);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [sidebarOpen]);

  const handleChange = useCallback(
    (code, { isLocal }) => {
      setChars(code.length);
      if (isLocal) session.sendCodeChange(code);
    },
    [session.sendCodeChange] // eslint-disable-line react-hooks/exhaustive-deps
  );

  const handleCursor = useCallback(
    (pos) => {
      setCursor(pos);
      session.sendCursor(pos);
    },
    [session.sendCursor] // eslint-disable-line react-hooks/exhaustive-deps
  );

  const handleDownload = useCallback(() => {
    downloadCode(session.getCode(), roomId, session.language);
    toast.success("File downloaded.");
  }, [session.getCode, roomId, session.language]); // eslint-disable-line react-hooks/exhaustive-deps

  const handleLeave = useCallback(() => {
    session.leaveRoom();
    navigate("/");
  }, [session.leaveRoom, navigate]); // eslint-disable-line react-hooks/exhaustive-deps

  if (session.phase === SESSION_PHASE.ERROR) {
    return (
      <div className="joinScreen" role="alert">
        <div className="joinScreen__card">
          <LogoMark size={44} />
          <h1>Couldn&apos;t join the room</h1>
          <p>{session.joinError}</p>
          <div className="joinScreen__actions">
            <button
              className="btn btn--primary"
              onClick={() => window.location.reload()}
            >
              Try again
            </button>
            <button className="btn btn--ghost" onClick={() => navigate("/")}>
              Back to home
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="editorLayout">
      <TopBar
        roomId={roomId}
        language={session.language}
        onLanguageChange={session.changeLanguage}
        onDownload={handleDownload}
        onLeave={handleLeave}
        onToggleSidebar={() => setSidebarOpen((open) => !open)}
        userCount={session.users.length}
      />

      <div className="editorLayout__body">
        <Sidebar
          roomId={roomId}
          users={session.users}
          selfId={session.selfId}
          typingIds={session.typingIds}
          open={sidebarOpen}
          onClose={() => setSidebarOpen(false)}
          onDownload={handleDownload}
          onLeave={handleLeave}
        />

        <main className="editorPane">
          <ConnectionBanner
            status={
              session.phase === SESSION_PHASE.READY
                ? session.status
                : SOCKET_STATUS.CONNECTED
            }
            onRetry={session.retry}
          />
          <CodeEditor
            ref={editorRef}
            language={session.language}
            onChange={handleChange}
            onCursor={handleCursor}
            onReady={session.handleEditorReady}
          />
          {session.phase === SESSION_PHASE.JOINING && (
            <div className="joinOverlay" aria-live="polite">
              <div className="joinOverlay__inner">
                <LogoMark size={40} />
                <p className="joinOverlay__text">Connecting to room</p>
                <code className="joinOverlay__room">{roomId}</code>
                <span className="joinOverlay__spinner" />
              </div>
            </div>
          )}
        </main>
      </div>

      <StatusBar
        status={session.status}
        userCount={session.users.length}
        typingNames={session.typingNames}
        cursor={cursor}
        language={session.language}
        chars={chars}
      />
    </div>
  );
};

export default EditorPage;
