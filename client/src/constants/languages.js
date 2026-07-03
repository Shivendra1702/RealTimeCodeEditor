/**
 * Languages the editor supports. `id` values are mirrored in
 * server/src/constants/index.js (LANGUAGE_IDS) — keep in sync.
 */
export const LANGUAGES = [
  { id: "javascript", label: "JavaScript", ext: "js", mode: "javascript" },
  {
    id: "typescript",
    label: "TypeScript",
    ext: "ts",
    mode: { name: "javascript", typescript: true },
  },
  { id: "python", label: "Python", ext: "py", mode: "python" },
  { id: "html", label: "HTML", ext: "html", mode: "htmlmixed" },
  { id: "css", label: "CSS", ext: "css", mode: "css" },
  {
    id: "json",
    label: "JSON",
    ext: "json",
    mode: { name: "javascript", json: true },
  },
  { id: "markdown", label: "Markdown", ext: "md", mode: "markdown" },
  { id: "java", label: "Java", ext: "java", mode: "text/x-java" },
  { id: "c", label: "C", ext: "c", mode: "text/x-csrc" },
  { id: "cpp", label: "C++", ext: "cpp", mode: "text/x-c++src" },
  { id: "go", label: "Go", ext: "go", mode: "go" },
  { id: "rust", label: "Rust", ext: "rs", mode: "rust" },
  { id: "sql", label: "SQL", ext: "sql", mode: "sql" },
  { id: "shell", label: "Shell", ext: "sh", mode: "shell" },
];

export const DEFAULT_LANGUAGE = "javascript";

const byId = new Map(LANGUAGES.map((lang) => [lang.id, lang]));

export const getLanguage = (id) => byId.get(id) ?? byId.get(DEFAULT_LANGUAGE);
