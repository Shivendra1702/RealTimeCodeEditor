import { getLanguage } from "../constants/languages";

/** Saves the current document as a file named after the room + language. */
export const downloadCode = (code, roomId, languageId) => {
  const { ext } = getLanguage(languageId);
  const blob = new Blob([code ?? ""], { type: "text/plain;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = `codetogether-${roomId}.${ext}`;
  document.body.appendChild(anchor);
  anchor.click();
  anchor.remove();
  URL.revokeObjectURL(url);
};
