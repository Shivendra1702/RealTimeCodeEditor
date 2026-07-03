import { useEffect, useMemo, useRef, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import toast from "react-hot-toast";

import Logo from "../components/common/Logo";
import {
  ArrowRightIcon,
  ClockIcon,
  PlusIcon,
  SparkleIcon,
  XIcon,
} from "../components/common/icons";
import { formatRelative } from "../utils/relativeTime";
import { generateRoomId, isValidRoomId, normalizeRoomId } from "../utils/roomId";
import {
  forgetRoom,
  loadRecentRooms,
  loadUsername,
  saveUsername,
} from "../utils/storage";
import { sanitizeUsername } from "../utils/validation";

const HomePage = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const invitedRoom = searchParams.get("room") ?? "";

  const [roomId, setRoomId] = useState(invitedRoom);
  const [username, setUsername] = useState(loadUsername);
  const [recentRooms, setRecentRooms] = useState(loadRecentRooms);
  const [errors, setErrors] = useState({});
  const usernameRef = useRef(null);
  const roomRef = useRef(null);

  const invited = useMemo(
    () => Boolean(invitedRoom && isValidRoomId(invitedRoom)),
    [invitedRoom]
  );

  useEffect(() => {
    document.title = "CodeTogether — Real-time collaborative code editor";
  }, []);

  useEffect(() => {
    if (invited) {
      usernameRef.current?.focus();
      toast("You've been invited — pick a display name to join.", {
        icon: "👋",
        id: "invite-hint",
      });
    }
  }, [invited]);

  const createNewRoom = () => {
    const id = generateRoomId();
    setRoomId(id);
    setErrors((prev) => ({ ...prev, roomId: null }));
    usernameRef.current?.focus();
    toast.success("New room created — pick a name and jump in.");
  };

  const join = (targetRoomId) => {
    const cleanRoom = normalizeRoomId(targetRoomId ?? roomId);
    const cleanName = sanitizeUsername(username);

    const nextErrors = {};
    if (!cleanRoom) nextErrors.roomId = "Paste a room ID or create a new room.";
    else if (!isValidRoomId(cleanRoom))
      nextErrors.roomId = "That doesn't look like a valid room ID.";
    if (!username.trim()) nextErrors.username = "Pick a display name.";
    else if (!cleanName)
      nextErrors.username =
        "Names can use letters, numbers, spaces and . _ ' - (max 24).";

    setErrors(nextErrors);
    if (nextErrors.roomId) {
      roomRef.current?.focus();
      return;
    }
    if (nextErrors.username) {
      usernameRef.current?.focus();
      return;
    }

    saveUsername(cleanName);
    navigate(`/editor/${encodeURIComponent(cleanRoom)}`, {
      state: { username: cleanName },
    });
  };

  const removeRecent = (id) => {
    forgetRoom(id);
    setRecentRooms(loadRecentRooms());
  };

  return (
    <div className="home">
      <div className="home__glow home__glow--one" aria-hidden="true" />
      <div className="home__glow home__glow--two" aria-hidden="true" />

      <main className="home__inner">
        <header className="home__hero">
          <Logo size={44} />
          <h1 className="home__title">
            Code together, <span className="home__titleAccent">live</span>.
          </h1>
          <p className="home__subtitle">
            Spin up a room, share the link, and write code with your team in
            real time — live cursors, 14 languages, no sign-up.
          </p>
        </header>

        <section className="joinCard" aria-label="Join a room">
          <form
            className="joinCard__form"
            onSubmit={(event) => {
              event.preventDefault();
              join();
            }}
            noValidate
          >
            <div className="field">
              <label className="field__label" htmlFor="room-id">
                Room ID
              </label>
              <input
                id="room-id"
                ref={roomRef}
                className={`input input--code${errors.roomId ? " input--error" : ""}`}
                placeholder="e.g. kfm4-x2rq-7dpn"
                value={roomId}
                onChange={(event) => {
                  setRoomId(event.target.value);
                  if (errors.roomId)
                    setErrors((prev) => ({ ...prev, roomId: null }));
                }}
                autoComplete="off"
                spellCheck="false"
              />
              {errors.roomId && (
                <span className="field__error" role="alert">
                  {errors.roomId}
                </span>
              )}
            </div>

            <div className="field">
              <label className="field__label" htmlFor="username">
                Display name
              </label>
              <input
                id="username"
                ref={usernameRef}
                className={`input${errors.username ? " input--error" : ""}`}
                placeholder="How should others see you?"
                value={username}
                onChange={(event) => {
                  setUsername(event.target.value);
                  if (errors.username)
                    setErrors((prev) => ({ ...prev, username: null }));
                }}
                maxLength={24}
                autoComplete="nickname"
              />
              {errors.username && (
                <span className="field__error" role="alert">
                  {errors.username}
                </span>
              )}
            </div>

            <button type="submit" className="btn btn--primary btn--lg">
              Join room
              <ArrowRightIcon size={16} />
            </button>
          </form>

          <div className="joinCard__divider">
            <span>or</span>
          </div>

          <button
            type="button"
            className="btn btn--ghost btn--lg joinCard__create"
            onClick={createNewRoom}
          >
            <PlusIcon size={16} />
            Create a new room
          </button>
        </section>

        {recentRooms.length > 0 && (
          <section className="recentRooms" aria-label="Recent rooms">
            <h2 className="recentRooms__title">
              <ClockIcon size={13} />
              Recent rooms
            </h2>
            <ul className="recentRooms__list">
              {recentRooms.map((room) => (
                <li key={room.roomId} className="recentRooms__item">
                  <button
                    type="button"
                    className="recentRooms__join"
                    onClick={() => {
                      setRoomId(room.roomId);
                      join(room.roomId);
                    }}
                    title={`Rejoin ${room.roomId}`}
                  >
                    <code>{room.roomId}</code>
                    <span className="recentRooms__time">
                      {formatRelative(room.lastJoined)}
                    </span>
                  </button>
                  <button
                    type="button"
                    className="iconBtn iconBtn--subtle"
                    onClick={() => removeRecent(room.roomId)}
                    aria-label={`Forget room ${room.roomId}`}
                  >
                    <XIcon size={13} />
                  </button>
                </li>
              ))}
            </ul>
          </section>
        )}

        <footer className="home__footer">
          <span className="home__footerItem">
            <SparkleIcon size={13} /> Live cursors
          </span>
          <span className="home__footerDot" />
          <span className="home__footerItem">14 languages</span>
          <span className="home__footerDot" />
          <span className="home__footerItem">No sign-up</span>
        </footer>
      </main>
    </div>
  );
};

export default HomePage;
