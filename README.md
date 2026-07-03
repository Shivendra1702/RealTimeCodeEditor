# CodeTogether

A real-time collaborative code editor — create a room, share the link, and write code with your team live. No sign-up required.

**Live demo:** https://realtimecodeeditor-sguj.onrender.com

## Features

- **Live collaboration** — every keystroke syncs to everyone in the room instantly over WebSockets
- **Remote cursors** — see exactly where each participant is, with name labels in their own color
- **Typing indicators** — know who's actively editing, in the roster and the status bar
- **14 languages** — synced syntax highlighting: JavaScript, TypeScript, Python, HTML, CSS, JSON, Markdown, Java, C, C++, Go, Rust, SQL, Shell
- **Server-held documents** — late joiners get the current code from the server; a room's document survives everyone leaving for 10 minutes (so a refresh never loses work)
- **Invite links** — share `/editor/<room-id>`; recipients land on the join form with the room prefilled
- **Recent rooms** — jump back into rooms you've used, straight from the home page
- **Resilient connections** — automatic reconnect + rejoin, honest status UI ("reconnecting", "offline"), and document restore if the server restarted while you were connected
- **Download** — save the document as a correctly-extensioned file for the current language
- **Fully responsive** — purpose-built layouts per form factor: static sidebar on desktop, slide-in drawer on tablets, bottom-sheet room panel on phones, with touch-sized targets and notch-safe insets

## Architecture

```
client/src/                                    server/src/
  main.jsx          entry                        index.js         entry + shutdown
  app/              App shell, ErrorBoundary     server.js        HTTP+IO composition
  pages/            Home, Editor, 404            app.js           express composition
  components/
    common/         Logo, Avatar, icons          config/          env parsing
    editor/         TopBar, Sidebar, Status-     constants/       protocol, limits
                    Bar, CodeEditor, ...         routes/          health
  hooks/            useSocket, useCopy,          controllers/     health
                    useCollabSession             middleware/      security headers,
  services/         socketClient (transport)                      static client (SPA)
  config/           env resolution               realtime/        socket handlers,
  constants/        events, languages,                            rate limiting
                    timings, storage keys        store/           RoomStore (rooms,
  utils/            throttle, diffing, room                       docs, membership)
                    ids, storage, download       utils/           logger, validation
  styles/           design tokens + CSS
```

Key decisions:

- **The server owns room state.** Membership, the document, and the language live in an in-memory `RoomStore`; clients never decide who is in a room. Late joiners sync from the server, not from peers.
- **One hook owns the session.** `useCollabSession` encapsulates joining (with rejoin retry and reconnect semantics), membership, typing presence and all outbound emitters — pages stay pure views.
- **Remote edits apply as minimal diffs.** Incoming documents are diffed (common prefix/suffix) and applied with `replaceRange`, so your cursor doesn't jump when someone else types. Sync is last-write-wins with a convergence guard: every `code:change` is acked, and clients drop snapshots that predate their own in-flight edits, so all editors settle on the server's final state even under concurrent typing. A concurrent keystroke can still lose to a later full snapshot — the honest trade-off vs. a CRDT (see roadmap).
- **Every socket event is validated and rate-limited.** Room ids, usernames, languages, cursor positions and document size are checked server-side; a token bucket per socket drops floods and disconnects abusive clients.
- **Join is an acknowledged request.** The client gets `{ok, users, code, language}` or a typed error (`ROOM_FULL`, `INVALID_USERNAME`, …) it can render meaningfully — with an 8s timeout.

## Getting started

Requires Node 18+.

```bash
# 1. Server
cd server
npm install
npm run dev            # http://localhost:5000

# 2. Client (new terminal)
cd client
npm install
npm run dev            # http://localhost:5173
```

The client defaults to `http://localhost:5000` in dev; override with `VITE_SERVER_URL` (see `client/.env.example`). Server knobs (port, CORS allowlist, room limits, document size, TTLs) are in `server/.env.example`.

```bash
# Server test suite (12 integration tests over real sockets)
cd server && npm test

# Client lint / production build
cd client && npm run lint && npm run build
```

## Deployment

Two options:

1. **Single service** — build the client (`cd client && npm run build`), then start the server; it detects `client/dist` and serves the SPA with a fallback route. Set `NODE_ENV=production` and a `CORS_ORIGIN` allowlist.
2. **Split** — deploy `client/dist` to any static host and the server separately; set `VITE_SERVER_URL` at build time and `CORS_ORIGIN` on the server.

## Protocol

| Event             | Direction        | Payload                                  |
| ----------------- | ---------------- | ---------------------------------------- |
| `join` (ack)      | client → server  | `{roomId, username}` → state + `created`, or error |
| `user:joined`     | server → others  | `{user, users}`                          |
| `user:left`       | server → others  | `{socketId, username, users}`            |
| `code:change`     | bidirectional    | `{code}` (acked with outcome; server attaches `socketId`) |
| `language:change` | bidirectional    | `{language}` (+ `username` on broadcast) |
| `typing`          | bidirectional    | `{}` → `{socketId, username}`            |
| `cursor:move`     | bidirectional    | `{cursor: {line, ch}}` (+ identity)      |
| `leave`           | client → server  | `{}`                                     |

## Roadmap

- **CRDT sync (Yjs)** — replace last-write-wins full-document sync with true conflict-free concurrent editing and per-user undo
- **Persistence** — back the `RoomStore` with Redis/Postgres so documents survive restarts and the server can scale horizontally
- **Room permissions** — host role, read-only guests, kick/ban
- **Session identity** — reconnects currently rely on join-time ghost-socket eviction; a session token would eliminate the brief window where a returning user can be auto-renamed while their old socket times out
- **Code execution** — sandboxed run button (e.g. via the Piston API)
