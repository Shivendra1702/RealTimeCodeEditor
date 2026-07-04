import { useCallback, useEffect, useRef, useState } from "react";
import toast from "react-hot-toast";

import { COPY_FEEDBACK_MS } from "../constants/timings";

/**
 * Clipboard with UI feedback: returns [copied, copy]. `copied` flips true
 * briefly after a successful copy so buttons can show a check state.
 */
export const useCopy = () => {
  const [copied, setCopied] = useState(false);
  const timerRef = useRef(null);

  useEffect(() => () => clearTimeout(timerRef.current), []);

  const copy = useCallback(async (text, successMessage) => {
    try {
      if (navigator.clipboard?.writeText) {
        await navigator.clipboard.writeText(text);
      } else {
        // Fallback for non-secure contexts (plain-http LAN demos).
        const textarea = document.createElement("textarea");
        textarea.value = text;
        textarea.style.position = "fixed";
        textarea.style.opacity = "0";
        document.body.appendChild(textarea);
        textarea.select();
        document.execCommand("copy");
        textarea.remove();
      }
      setCopied(true);
      clearTimeout(timerRef.current);
      timerRef.current = setTimeout(() => setCopied(false), COPY_FEEDBACK_MS);
      if (successMessage) toast.success(successMessage);
      return true;
    } catch {
      toast.error("Couldn't copy — please copy it manually.");
      return false;
    }
  }, []);

  return [copied, copy];
};
