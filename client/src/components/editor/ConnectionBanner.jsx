import { SOCKET_STATUS } from "../../hooks/useSocket";
import { WifiOffIcon } from "../common/icons";

/**
 * Slim banner shown over the editor whenever the transport is unhealthy.
 * Edits keep working locally; we tell the user the truth about sync.
 */
const ConnectionBanner = ({ status, onRetry }) => {
  if (status === SOCKET_STATUS.CONNECTED) return null;

  const failed = status === SOCKET_STATUS.FAILED;
  return (
    <div
      className={`connBanner ${failed ? "connBanner--failed" : ""}`}
      role="status"
      aria-live="polite"
    >
      <WifiOffIcon size={14} />
      {failed ? (
        <>
          <span>Connection lost — couldn&apos;t reconnect.</span>
          <button className="connBanner__retry" onClick={onRetry}>
            Try again
          </button>
        </>
      ) : (
        <span>Connection lost — reconnecting, your edits aren&apos;t syncing yet…</span>
      )}
    </div>
  );
};

export default ConnectionBanner;
