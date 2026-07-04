import assert from "node:assert/strict";
import { after, before, test } from "node:test";
import { io as ioc } from "socket.io-client";
import { ACTIONS } from "../src/constants/index.js";
import { createServer } from "../src/server.js";

const TEST_CONFIG = {
  port: 0,
  nodeEnv: "test",
  corsOrigins: ["*"],
  maxUsersPerRoom: 3,
  maxRooms: 50,
  maxCodeBytes: 1024,
  emptyRoomTtlMs: 200,
  staleRoomTtlMs: 60_000,
  maxHttpBufferSize: 1e6,
};

let server;
let url;

const connect = () =>
  new Promise((resolve, reject) => {
    const socket = ioc(url, { transports: ["websocket"], forceNew: true });
    socket.once("connect", () => resolve(socket));
    socket.once("connect_error", reject);
  });

const join = (socket, payload) =>
  new Promise((resolve) => socket.emit(ACTIONS.JOIN, payload, resolve));

/** join() that fails the test if the server rejects it. */
const joinOk = async (socket, payload) => {
  const ack = await join(socket, payload);
  assert.equal(ack.ok, true, `join rejected: ${ack.error}`);
  return ack;
};

const once = (socket, event, timeoutMs = 2000) =>
  new Promise((resolve, reject) => {
    const timer = setTimeout(
      () => reject(new Error(`timeout waiting for ${event}`)),
      timeoutMs
    );
    socket.once(event, (data) => {
      clearTimeout(timer);
      resolve(data);
    });
  });

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

before(async () => {
  server = createServer(TEST_CONFIG);
  await new Promise((resolve) => server.httpServer.listen(0, resolve));
  url = `http://localhost:${server.httpServer.address().port}`;
});

after(async () => {
  await server.close();
  await new Promise((resolve) => server.httpServer.close(resolve));
});

test("join returns room state and notifies peers", async () => {
  const a = await connect();
  const b = await connect();
  try {
    const ackA = await join(a, { roomId: "test-room-1", username: "Alice" });
    assert.equal(ackA.ok, true);
    assert.equal(ackA.self.username, "Alice");
    assert.equal(ackA.users.length, 1);
    assert.equal(ackA.language, "javascript");
    assert.equal(ackA.code, "");

    const joinedPromise = once(a, ACTIONS.USER_JOINED);
    const ackB = await join(b, { roomId: "test-room-1", username: "Bob" });
    assert.equal(ackB.ok, true);
    assert.equal(ackB.users.length, 2);

    const joined = await joinedPromise;
    assert.equal(joined.user.username, "Bob");
    assert.equal(joined.users.length, 2);
    assert.notEqual(joined.user.color, ackA.self.color);
  } finally {
    a.disconnect();
    b.disconnect();
  }
});

test("code changes relay to peers and persist for late joiners", async () => {
  const a = await connect();
  const b = await connect();
  const late = await connect();
  try {
    await join(a, { roomId: "test-room-2", username: "Alice" });
    const ackB = await join(b, { roomId: "test-room-2", username: "Bob" });
    assert.equal(ackB.ok, true);

    const received = once(b, ACTIONS.CODE_CHANGE);
    a.emit(ACTIONS.CODE_CHANGE, { code: "const x = 1;" });
    const change = await received;
    assert.equal(change.code, "const x = 1;");
    assert.equal(change.socketId, a.id);

    // Late joiner gets the current document from the server, not from peers.
    const ackLate = await join(late, {
      roomId: "test-room-2",
      username: "Carol",
    });
    assert.equal(ackLate.code, "const x = 1;");
  } finally {
    a.disconnect();
    b.disconnect();
    late.disconnect();
  }
});

test("language change relays and persists", async () => {
  const a = await connect();
  const b = await connect();
  try {
    await join(a, { roomId: "test-room-3", username: "Alice" });
    await join(b, { roomId: "test-room-3", username: "Bob" });

    const received = once(b, ACTIONS.LANGUAGE_CHANGE);
    a.emit(ACTIONS.LANGUAGE_CHANGE, { language: "python" });
    const change = await received;
    assert.equal(change.language, "python");
    assert.equal(change.username, "Alice");

    const c = await connect();
    const ackC = await join(c, { roomId: "test-room-3", username: "Carol" });
    assert.equal(ackC.language, "python");
    c.disconnect();
  } finally {
    a.disconnect();
    b.disconnect();
  }
});

test("duplicate usernames are auto-suffixed", async () => {
  const a = await connect();
  const b = await connect();
  try {
    await joinOk(a, { roomId: "test-room-4", username: "Sam" });
    const ackB = await join(b, { roomId: "test-room-4", username: "sam" });
    assert.equal(ackB.ok, true);
    assert.equal(ackB.renamed, true);
    // Suffix keeps the joiner's own casing; collision check is case-insensitive.
    assert.equal(ackB.self.username, "sam 2");
  } finally {
    a.disconnect();
    b.disconnect();
  }
});

test("join ack reports whether the room was created", async () => {
  const a = await connect();
  const b = await connect();
  try {
    const ackA = await joinOk(a, { roomId: "test-room-created", username: "Alice" });
    assert.equal(ackA.created, true);
    const ackB = await joinOk(b, { roomId: "test-room-created", username: "Bob" });
    assert.equal(ackB.created, false);

    // After everyone leaves and the room expires, the next join recreates it —
    // that's the signal a reconnecting client may restore its document.
    a.disconnect();
    b.disconnect();
    await sleep(400); // past the 200ms empty-room TTL
    const c = await connect();
    const ackC = await joinOk(c, { roomId: "test-room-created", username: "Carol" });
    assert.equal(ackC.created, true);
    assert.equal(ackC.code, "");
    c.disconnect();
  } finally {
    a.disconnect();
    b.disconnect();
  }
});

test("code changes are acked with their outcome", async () => {
  const outsider = await connect();
  const a = await connect();
  try {
    const emitWithAck = (socket, payload) =>
      new Promise((resolve) =>
        socket.emit(ACTIONS.CODE_CHANGE, payload, resolve)
      );

    assert.equal(
      (await emitWithAck(outsider, { code: "x" })).error,
      "NOT_IN_ROOM"
    );

    await joinOk(a, { roomId: "test-room-ack", username: "Alice" });
    assert.equal((await emitWithAck(a, { code: "ok" })).ok, true);
    assert.equal(
      (await emitWithAck(a, { code: 42 })).error,
      "INVALID_PAYLOAD"
    );
    assert.equal(
      (await emitWithAck(a, { code: "x".repeat(2048) })).error, // over 1KB cap
      "DOC_TOO_LARGE"
    );
  } finally {
    outsider.disconnect();
    a.disconnect();
  }
});

test("code changes carry the sender's identity and cursor", async () => {
  const a = await connect();
  const b = await connect();
  try {
    const ackA = await joinOk(a, { roomId: "test-room-piggy", username: "Alice" });
    await joinOk(b, { roomId: "test-room-piggy", username: "Bob" });

    let received = once(b, ACTIONS.CODE_CHANGE);
    a.emit(ACTIONS.CODE_CHANGE, { code: "hi", cursor: { line: 0, ch: 2 } });
    let change = await received;
    assert.equal(change.username, "Alice");
    assert.equal(change.color, ackA.self.color);
    assert.deepEqual(change.cursor, { line: 0, ch: 2 });

    // Malformed cursors are stripped; the code still relays.
    received = once(b, ACTIONS.CODE_CHANGE);
    a.emit(ACTIONS.CODE_CHANGE, { code: "hey", cursor: { line: -1, ch: "x" } });
    change = await received;
    assert.equal(change.code, "hey");
    assert.equal(change.cursor, undefined);
  } finally {
    a.disconnect();
    b.disconnect();
  }
});

test("join is idempotent on the same socket", async () => {
  const a = await connect();
  try {
    const first = await joinOk(a, { roomId: "test-room-idem", username: "Alice" });
    const again = await join(a, { roomId: "test-room-idem", username: "Alice" });
    assert.equal(again.ok, true);
    assert.equal(again.self.username, "Alice");
    assert.equal(again.self.socketId, first.self.socketId);
    assert.equal(again.users.length, 1); // no duplicate membership

    // Joining a DIFFERENT room on the same socket is rejected.
    const other = await join(a, { roomId: "test-room-other", username: "Alice" });
    assert.equal(other.ok, false);
  } finally {
    a.disconnect();
  }
});

test("room capacity is enforced", async () => {
  const sockets = await Promise.all([connect(), connect(), connect(), connect()]);
  try {
    for (let i = 0; i < 3; i += 1) {
      const ack = await join(sockets[i], {
        roomId: "test-room-5",
        username: `User${i}`,
      });
      assert.equal(ack.ok, true);
    }
    const full = await join(sockets[3], {
      roomId: "test-room-5",
      username: "Overflow",
    });
    assert.equal(full.ok, false);
    assert.equal(full.error, "ROOM_FULL");
  } finally {
    sockets.forEach((s) => s.disconnect());
  }
});

test("invalid payloads are rejected", async () => {
  const s = await connect();
  try {
    assert.equal(
      (await join(s, { roomId: "ab", username: "Alice" })).error,
      "INVALID_ROOM_ID"
    );
    assert.equal(
      (await join(s, { roomId: "room/../etc", username: "Alice" })).error,
      "INVALID_ROOM_ID"
    );
    assert.equal(
      (await join(s, { roomId: "valid-room", username: "" })).error,
      "INVALID_USERNAME"
    );
    assert.equal(
      (await join(s, { roomId: "valid-room", username: "<script>" })).error,
      "INVALID_USERNAME"
    );
    assert.equal((await join(s, null)).error, "INVALID_PAYLOAD");
  } finally {
    s.disconnect();
  }
});

test("oversized code and invalid languages are dropped", async () => {
  const a = await connect();
  const b = await connect();
  try {
    await joinOk(a, { roomId: "test-room-6", username: "Alice" });
    await joinOk(b, { roomId: "test-room-6", username: "Bob" });

    let received = null;
    b.on(ACTIONS.CODE_CHANGE, (data) => (received = data));
    b.on(ACTIONS.LANGUAGE_CHANGE, (data) => (received = data));

    a.emit(ACTIONS.CODE_CHANGE, { code: "x".repeat(2048) }); // over 1KB limit
    a.emit(ACTIONS.CODE_CHANGE, { code: 42 });
    a.emit(ACTIONS.LANGUAGE_CHANGE, { language: "brainfuck" });
    await sleep(150);
    assert.equal(received, null);

    a.emit(ACTIONS.CODE_CHANGE, { code: "ok" });
    await sleep(150);
    assert.equal(received?.code, "ok");
  } finally {
    a.disconnect();
    b.disconnect();
  }
});

test("cursor moves relay with identity attached", async () => {
  const a = await connect();
  const b = await connect();
  try {
    const ackA = await join(a, { roomId: "test-room-7", username: "Alice" });
    await join(b, { roomId: "test-room-7", username: "Bob" });

    const received = once(b, ACTIONS.CURSOR_MOVE);
    a.emit(ACTIONS.CURSOR_MOVE, { cursor: { line: 3, ch: 7 } });
    const move = await received;
    assert.deepEqual(move.cursor, { line: 3, ch: 7 });
    assert.equal(move.username, "Alice");
    assert.equal(move.color, ackA.self.color);

    // Malformed cursors are dropped silently.
    a.emit(ACTIONS.CURSOR_MOVE, { cursor: { line: -1, ch: "x" } });
    a.emit(ACTIONS.CURSOR_MOVE, { cursor: null });
    await sleep(100);
  } finally {
    a.disconnect();
    b.disconnect();
  }
});

test("disconnect notifies peers and empty rooms expire", async () => {
  const a = await connect();
  const b = await connect();
  try {
    await join(a, { roomId: "test-room-8", username: "Alice" });
    await join(b, { roomId: "test-room-8", username: "Bob" });

    const leftPromise = once(a, ACTIONS.USER_LEFT);
    b.disconnect();
    const left = await leftPromise;
    assert.equal(left.username, "Bob");
    assert.equal(left.users.length, 1);

    a.disconnect();
    await sleep(400); // past the 200ms empty-room TTL
    assert.equal(server.store.getRoom("test-room-8"), null);
  } finally {
    a.disconnect();
    b.disconnect();
  }
});

test("events before join are ignored", async () => {
  const s = await connect();
  const a = await connect();
  try {
    await join(a, { roomId: "test-room-9", username: "Alice" });
    let received = null;
    a.on(ACTIONS.CODE_CHANGE, (data) => (received = data));

    s.emit(ACTIONS.CODE_CHANGE, { code: "sneaky" });
    s.emit(ACTIONS.TYPING);
    s.emit(ACTIONS.CURSOR_MOVE, { cursor: { line: 0, ch: 0 } });
    await sleep(150);
    assert.equal(received, null);
    assert.equal(server.store.getRoom("test-room-9").code, "");
  } finally {
    s.disconnect();
    a.disconnect();
  }
});

test("health endpoint reports stats", async () => {
  const res = await fetch(`${url}/health`);
  assert.equal(res.status, 200);
  const body = await res.json();
  assert.equal(body.status, "ok");
  assert.equal(typeof body.rooms, "number");
  assert.equal(typeof body.users, "number");
});
