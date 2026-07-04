import { useEffect, useRef } from "react";

import { useCopy } from "../../hooks/useCopy";
import { buildInviteLink } from "../../utils/inviteLink";
import {
  CheckIcon,
  CopyIcon,
  DownloadIcon,
  LinkIcon,
  LogOutIcon,
  XIcon,
} from "../common/icons";
import UserList from "./UserList";

/**
 * Room panel. Desktop: static left sidebar. Small tablets: slide-in drawer.
 * Phones: bottom sheet (see editor.css breakpoints). The footer actions
 * exist for phones, where download/leave leave the top bar.
 */
const Sidebar = ({
  roomId,
  users,
  selfId,
  typingIds,
  open,
  onClose,
  onDownload,
  onLeave,
}) => {
  const [idCopied, copyId] = useCopy();
  const [linkCopied, copyLink] = useCopy();
  const closeRef = useRef(null);
  const openerRef = useRef(null);

  // When the panel opens as an overlay (drawer/sheet — the close button is
  // only rendered there), move focus into it and restore focus on close.
  useEffect(() => {
    if (open) {
      openerRef.current = document.activeElement;
      if (closeRef.current && closeRef.current.offsetParent !== null) {
        closeRef.current.focus();
      }
    } else if (openerRef.current instanceof HTMLElement) {
      openerRef.current.focus();
      openerRef.current = null;
    }
  }, [open]);

  return (
    <>
      <div
        className={`sidebar__backdrop${open ? " is-open" : ""}`}
        onClick={onClose}
        aria-hidden="true"
      />
      <aside
        className={`sidebar${open ? " is-open" : ""}`}
        aria-label="Room panel"
      >
        <span className="sidebar__grabber" aria-hidden="true" />

        <div className="sidebar__header">
          <h2 className="sidebar__title">Room</h2>
          <button
            type="button"
            ref={closeRef}
            className="iconBtn sidebar__close"
            onClick={onClose}
            aria-label="Close room panel"
          >
            <XIcon size={16} />
          </button>
        </div>

        <div className="roomCard">
          <span className="roomCard__label">Room ID</span>
          <code className="roomCard__id" title={roomId}>
            {roomId}
          </code>
          <div className="roomCard__actions">
            <button
              type="button"
              className="btn btn--ghost btn--sm"
              onClick={() => copyId(roomId, "Room ID copied")}
            >
              {idCopied ? <CheckIcon size={14} /> : <CopyIcon size={14} />}
              Copy ID
            </button>
            <button
              type="button"
              className="btn btn--ghost btn--sm"
              onClick={() =>
                copyLink(buildInviteLink(roomId), "Invite link copied")
              }
            >
              {linkCopied ? <CheckIcon size={14} /> : <LinkIcon size={14} />}
              Copy link
            </button>
          </div>
        </div>

        <div className="sidebar__section">
          <h3 className="sidebar__sectionTitle">
            People <span className="sidebar__count">{users.length}</span>
          </h3>
          <UserList users={users} selfId={selfId} typingIds={typingIds} />
          {users.length === 1 && (
            <p className="sidebar__hint">
              You&apos;re alone in here — share the invite link to start
              collaborating.
            </p>
          )}
        </div>

        <div className="sidebar__footer">
          <button
            type="button"
            className="btn btn--ghost btn--sm sidebar__footerBtn"
            onClick={onDownload}
          >
            <DownloadIcon size={14} />
            Download file
          </button>
          <button
            type="button"
            className="btn btn--ghost btn--sm sidebar__footerBtn sidebar__footerBtn--danger"
            onClick={onLeave}
          >
            <LogOutIcon size={14} />
            Leave room
          </button>
        </div>
      </aside>
    </>
  );
};

export default Sidebar;
