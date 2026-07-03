export const LogoMark = ({ size = 32 }) => (
  <svg
    width={size}
    height={size}
    viewBox="0 0 48 48"
    fill="none"
    aria-hidden="true"
    className="logoMark"
  >
    <defs>
      <linearGradient id="logo-grad" x1="0" y1="0" x2="48" y2="48">
        <stop offset="0%" stopColor="#6366F1" />
        <stop offset="100%" stopColor="#A855F7" />
      </linearGradient>
    </defs>
    <rect x="2" y="2" width="44" height="44" rx="12" fill="url(#logo-grad)" />
    <path
      d="M19 17l-7 7 7 7M29 17l7 7-7 7"
      stroke="#fff"
      strokeWidth="3.4"
      strokeLinecap="round"
      strokeLinejoin="round"
    />
  </svg>
);

/** Logo mark + wordmark. `compact` hides the wordmark on narrow screens. */
const Logo = ({ size = 32, compact = false }) => (
  <span className="logo">
    <LogoMark size={size} />
    <span className={`logoWord${compact ? " logoWord--compact" : ""}`}>
      Code<em>Together</em>
    </span>
  </span>
);

export default Logo;
