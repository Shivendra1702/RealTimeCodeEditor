import { SOCKET_STATUS } from "../../hooks/useSocket";
import { getLanguage } from "../../constants/languages";

const STATUS_META = {
  [SOCKET_STATUS.CONNECTED]: { label: "Live", tone: "ok" },
  [SOCKET_STATUS.CONNECTING]: { label: "Connecting…", tone: "warn" },
  [SOCKET_STATUS.RECONNECTING]: { label: "Reconnecting…", tone: "warn" },
  [SOCKET_STATUS.FAILED]: { label: "Offline", tone: "err" },
};

const typingLabel = (names) => {
  if (!names.length) return null;
  if (names.length === 1) return `${names[0]} is typing…`;
  if (names.length === 2) return `${names[0]} and ${names[1]} are typing…`;
  return `${names.length} people are typing…`;
};

/**
 * Items carry priority classes so breakpoints can shed detail gracefully:
 * p3 (chars, language) drops first, then p2 (typing), leaving connection,
 * online count and Ln/Col even at 320px.
 */
const StatusBar = ({ status, userCount, typingNames, cursor, language, chars }) => {
  const meta = STATUS_META[status] ?? STATUS_META[SOCKET_STATUS.CONNECTING];
  const typing = typingLabel(typingNames);

  return (
    <footer className="statusBar">
      <div className="statusBar__group">
        <span className={`statusBar__conn statusBar__conn--${meta.tone}`}>
          <span className="statusBar__dot" />
          {meta.label}
        </span>
        <span className="statusBar__sep" />
        <span className="statusBar__item">{userCount} online</span>
        {typing && <span className="statusBar__sep statusBar__p2" />}
        {/* Always mounted so the aria-live region exists before it changes. */}
        <span className="statusBar__typing statusBar__p2" aria-live="polite">
          {typing ?? ""}
        </span>
      </div>
      <div className="statusBar__group">
        <span className="statusBar__item">
          Ln {cursor.line + 1}, Col {cursor.ch + 1}
        </span>
        <span className="statusBar__sep statusBar__p3" />
        <span className="statusBar__item statusBar__p3">
          {getLanguage(language).label}
        </span>
        <span className="statusBar__sep statusBar__p3" />
        <span className="statusBar__item statusBar__p3">
          {chars.toLocaleString()} chars
        </span>
      </div>
    </footer>
  );
};

export default StatusBar;
