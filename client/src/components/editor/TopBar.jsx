import { Link } from "react-router-dom";

import { useCopy } from "../../hooks/useCopy";
import { buildInviteLink } from "../../utils/inviteLink";
import Logo from "../common/Logo";
import {
  CheckIcon,
  DownloadIcon,
  LinkIcon,
  LogOutIcon,
  UsersIcon,
} from "../common/icons";
import LanguageSelect from "./LanguageSelect";

/**
 * On phones (≤560px) the room chip, download and leave controls collapse
 * into the People sheet (see Sidebar) — the bar keeps only what's needed
 * mid-edit: language, invite, people.
 */
const TopBar = ({
  roomId,
  language,
  onLanguageChange,
  onDownload,
  onLeave,
  onToggleSidebar,
  userCount,
}) => {
  const [linkCopied, copyLink] = useCopy();
  const [idCopied, copyId] = useCopy();

  return (
    <header className="topBar">
      <div className="topBar__left">
        <Link to="/" className="topBar__home" aria-label="CodeTogether home">
          <Logo size={28} compact />
        </Link>
        <span className="topBar__divider topBar__hideSm" />
        <button
          type="button"
          className="roomChip topBar__hideSm"
          onClick={() => copyId(roomId, "Room ID copied")}
          title="Click to copy the room ID"
        >
          <span className="roomChip__id">{roomId}</span>
          {idCopied ? (
            <CheckIcon size={13} className="roomChip__icon roomChip__icon--ok" />
          ) : (
            <span className="roomChip__hint">copy</span>
          )}
        </button>
      </div>

      <div className="topBar__actions">
        <LanguageSelect value={language} onChange={onLanguageChange} />
        <button
          type="button"
          className="btn btn--primary btn--sm topBar__invite"
          onClick={() => copyLink(buildInviteLink(roomId), "Invite link copied")}
          aria-label="Copy invite link"
        >
          {linkCopied ? <CheckIcon size={15} /> : <LinkIcon size={15} />}
          <span className="btn__labelWide">
            {linkCopied ? "Copied!" : "Invite"}
          </span>
        </button>
        <button
          type="button"
          className="iconBtn topBar__hideSm"
          onClick={onDownload}
          title="Download file"
          aria-label="Download file"
        >
          <DownloadIcon size={16} />
        </button>
        <button
          type="button"
          className="iconBtn topBar__people"
          onClick={onToggleSidebar}
          title="People"
          aria-label="Toggle people panel"
        >
          <UsersIcon size={16} />
          <span className="topBar__peopleCount">{userCount}</span>
        </button>
        <span className="topBar__divider topBar__hideSm" />
        <button
          type="button"
          className="iconBtn iconBtn--danger topBar__hideSm"
          onClick={onLeave}
          title="Leave room"
          aria-label="Leave room"
        >
          <LogOutIcon size={16} />
        </button>
      </div>
    </header>
  );
};

export default TopBar;
