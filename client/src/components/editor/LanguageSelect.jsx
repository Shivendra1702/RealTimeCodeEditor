import { LANGUAGES } from "../../constants/languages";

const LanguageSelect = ({ value, onChange, disabled = false }) => (
  <label className="langSelect">
    <span className="srOnly">Language</span>
    <select
      className="langSelect__control"
      value={value}
      disabled={disabled}
      onChange={(event) => onChange(event.target.value)}
    >
      {LANGUAGES.map((lang) => (
        <option key={lang.id} value={lang.id}>
          {lang.label}
        </option>
      ))}
    </select>
    <svg
      className="langSelect__chevron"
      width="14"
      height="14"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2.2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <path d="m6 9 6 6 6-6" />
    </svg>
  </label>
);

export default LanguageSelect;
