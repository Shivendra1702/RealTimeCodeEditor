import { forwardRef, useEffect, useImperativeHandle, useRef } from "react";
import CodeMirror from "codemirror";
import "codemirror/lib/codemirror.css";
import "codemirror/mode/javascript/javascript";
import "codemirror/mode/xml/xml";
import "codemirror/mode/css/css";
import "codemirror/mode/htmlmixed/htmlmixed";
import "codemirror/mode/python/python";
import "codemirror/mode/markdown/markdown";
import "codemirror/mode/clike/clike";
import "codemirror/mode/go/go";
import "codemirror/mode/rust/rust";
import "codemirror/mode/sql/sql";
import "codemirror/mode/shell/shell";
import "codemirror/addon/edit/closebrackets";
import "codemirror/addon/edit/closetag";
import "codemirror/addon/edit/matchbrackets";
import "codemirror/addon/selection/active-line";
import "codemirror/addon/display/placeholder";

import { getLanguage } from "../../constants/languages";
import { CURSOR_LABEL_FADE_MS } from "../../constants/timings";
import { applyRemoteCode, isLocalOrigin } from "../../utils/remoteEdit";

const EDITOR_THEME = "codetogether";
const PLACEHOLDER = "Write code together — every change syncs live.";

/** On touch devices: no autofocus (keyboard popping on join is hostile) and
 *  contenteditable input (better mobile IME support than a hidden textarea). */
const IS_TOUCH =
  typeof window !== "undefined" &&
  window.matchMedia("(pointer: coarse)").matches;

/**
 * CodeMirror wrapper. Exposes an imperative API (via ref) for everything the
 * network layer needs — applying remote documents as minimal diffs and
 * rendering labeled remote cursors — while local edits flow up through
 * `onChange(code, { isLocal })`.
 */
const CodeEditor = forwardRef(function CodeEditor(
  { language, onChange, onCursor, onReady },
  ref
) {
  const hostRef = useRef(null);
  const cmRef = useRef(null);
  const remoteCursorsRef = useRef(new Map());

  // Keep latest callbacks without re-creating the editor.
  const callbacksRef = useRef({ onChange, onCursor, onReady });
  useEffect(() => {
    callbacksRef.current = { onChange, onCursor, onReady };
  });

  useEffect(() => {
    const cm = CodeMirror.fromTextArea(hostRef.current, {
      mode: getLanguage(language).mode,
      theme: EDITOR_THEME,
      lineNumbers: true,
      lineWrapping: true,
      autoCloseBrackets: true,
      autoCloseTags: true,
      matchBrackets: true,
      styleActiveLine: true,
      tabSize: 2,
      indentUnit: 2,
      autofocus: !IS_TOUCH,
      inputStyle: IS_TOUCH ? "contenteditable" : "textarea",
      placeholder: PLACEHOLDER,
    });
    cmRef.current = cm;

    cm.on("change", (instance, change) => {
      callbacksRef.current.onChange?.(instance.getValue(), {
        isLocal: isLocalOrigin(change.origin),
      });
    });

    cm.on("cursorActivity", (instance) => {
      const { line, ch } = instance.getCursor();
      callbacksRef.current.onCursor?.({ line, ch });
    });

    callbacksRef.current.onReady?.();

    const cursors = remoteCursorsRef.current;
    return () => {
      for (const entry of cursors.values()) {
        clearTimeout(entry.labelTimer);
        entry.marker.clear();
      }
      cursors.clear();
      cmRef.current = null;
      cm.toTextArea();
    };
    // The editor instance is created once; language switches use setOption.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    cmRef.current?.setOption("mode", getLanguage(language).mode);
  }, [language]);

  useImperativeHandle(ref, () => ({
    /** Initial document load — allowed to move the cursor. */
    setInitialCode(code) {
      const cm = cmRef.current;
      if (!cm) return;
      cm.setValue(code ?? "");
      cm.clearHistory();
    },

    /** Remote update — applied as a minimal diff to keep the cursor put. */
    applyRemote(code) {
      const cm = cmRef.current;
      if (!cm) return;
      applyRemoteCode(cm, code ?? "");
    },

    getValue() {
      return cmRef.current?.getValue() ?? "";
    },

    focus() {
      cmRef.current?.focus();
    },

    /** Renders (or moves) a labeled cursor for a remote participant. */
    updateRemoteCursor({ socketId, username, color, cursor }) {
      const cm = cmRef.current;
      if (!cm || !cursor) return;

      this.removeRemoteCursor(socketId);

      const line = Math.max(0, Math.min(cursor.line, cm.lastLine()));
      const ch = Math.max(0, Math.min(cursor.ch, cm.getLine(line).length));

      const el = document.createElement("span");
      el.className = "remoteCursor";
      el.style.setProperty("--cursor-color", color || "#7C8CF8");
      const label = document.createElement("span");
      label.className = "remoteCursor__label";
      label.textContent = username || "Guest";
      el.appendChild(label);

      const marker = cm.setBookmark(
        { line, ch },
        { widget: el, insertLeft: true }
      );
      // Show the name briefly, then fade to just the caret.
      const labelTimer = setTimeout(
        () => el.classList.add("remoteCursor--idle"),
        CURSOR_LABEL_FADE_MS
      );
      remoteCursorsRef.current.set(socketId, { marker, labelTimer });
    },

    removeRemoteCursor(socketId) {
      const entry = remoteCursorsRef.current.get(socketId);
      if (!entry) return;
      clearTimeout(entry.labelTimer);
      entry.marker.clear();
      remoteCursorsRef.current.delete(socketId);
    },

    /** Drops every remote cursor — used when presence state resets (rejoin). */
    clearRemoteCursors() {
      for (const entry of remoteCursorsRef.current.values()) {
        clearTimeout(entry.labelTimer);
        entry.marker.clear();
      }
      remoteCursorsRef.current.clear();
    },
  }));

  return (
    <div className="editorHost">
      <textarea ref={hostRef} aria-label="Collaborative code editor" />
    </div>
  );
});

export default CodeEditor;
