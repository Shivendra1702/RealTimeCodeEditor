import { FALLBACK_USER_COLORS } from "../../constants/userColors";

const initialsOf = (name = "") => {
  const words = name.trim().split(/\s+/).filter(Boolean);
  if (!words.length) return "?";
  const first = words[0][0] ?? "";
  const second = words.length > 1 ? words[words.length - 1][0] ?? "" : "";
  return (first + second).toUpperCase();
};

const hashColor = (name = "") => {
  let hash = 0;
  for (const ch of name) hash = (hash * 31 + ch.codePointAt(0)) >>> 0;
  return FALLBACK_USER_COLORS[hash % FALLBACK_USER_COLORS.length];
};

/** Deterministic initials avatar tinted with the user's room color. */
const Avatar = ({ name, color, size = 34, typing = false }) => {
  const tint = color || hashColor(name);
  return (
    <span
      className={`avatar${typing ? " avatar--typing" : ""}`}
      style={{
        "--avatar-color": tint,
        width: size,
        height: size,
        fontSize: Math.round(size * 0.38),
      }}
      aria-hidden="true"
    >
      {initialsOf(name)}
      {typing && <span className="avatar__typingDot" />}
    </span>
  );
};

export default Avatar;
