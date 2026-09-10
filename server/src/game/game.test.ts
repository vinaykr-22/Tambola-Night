import test from "node:test";
import assert from "node:assert/strict";
import { generateTicket } from "./ticket.js";
import { isWinningTicket } from "./validation.js";

test("generated tickets have three rows and fifteen valid unique numbers", () => {
  const ticket = generateTicket();
  const values = ticket.flat().filter((value): value is number => value !== null);
  assert.equal(ticket.length, 3);
  assert.deepEqual(ticket.map((row) => row.filter(Boolean).length), [5, 5, 5]);
  assert.equal(values.length, 15);
  assert.equal(new Set(values).size, 15);
  ticket.forEach((row) => row.forEach((value, column) => { if (value !== null) assert.ok(value >= (column === 0 ? 1 : column * 10) && value <= (column === 8 ? 90 : column * 10 + 9)); }));
});

test("validates lines, early five, corners, and full house on server state", () => {
  const ticket = [[1, null, 21, null, 41, null, 61, null, 81], [2, null, 22, null, 42, null, 62, null, 82], [3, null, 23, null, 43, null, 63, null, 83]];
  assert.equal(isWinningTicket(ticket, [1, 21, 41, 61, 81], "topLine"), true);
  assert.equal(isWinningTicket(ticket, [1, 21, 41, 61], "topLine"), false);
  assert.equal(isWinningTicket(ticket, [1, 2, 3, 21, 22], "earlyFive"), true);
  assert.equal(isWinningTicket(ticket, [1, 2, 3, 21, 22, 41, 42], "earlySeven"), true);
  assert.equal(isWinningTicket(ticket, [1, 2, 3, 21, 22, 41], "earlySeven"), false);
  assert.equal(isWinningTicket(ticket, [1, 81, 3, 83], "fourCorners"), true);
  // Center of row 1 (middle row) has numbers: [2, 22, 42, 62, 82], middle is 42
  assert.equal(isWinningTicket(ticket, [1, 81, 3, 83, 42], "star"), true);
  assert.equal(isWinningTicket(ticket, [1, 81, 3, 83, 22], "star"), false);
  assert.equal(isWinningTicket(ticket, ticket.flat().filter((value): value is number => value !== null), "fullHouse"), true);
  assert.equal(isWinningTicket(ticket, ticket.flat().filter((value): value is number => value !== null), "secondFullHouse"), true);
});

test("room manager resets numbers and issues new tickets on rematch", async () => {
  const { RoomManager } = await import("../rooms/RoomManager.js");
  const mgr = new RoomManager();
  const room = mgr.create("host1", "tok1", "Host", "Game 1", ["fullHouse"], false);
  mgr.join(room.id, "p2", "tok2", "Player2");
  mgr.start(room, "host1");
  mgr.callNext(room, "host1");
  assert.equal(room.calledNumbers.length, 1);
  const oldTicketP2 = JSON.stringify(room.players[1].ticket);

  mgr.rematch(room, "host1");
  assert.equal(room.calledNumbers.length, 0);
  assert.equal(room.currentNumber, null);
  assert.equal(room.winners.length, 0);
  assert.equal(room.status, "lobby");
  assert.notEqual(JSON.stringify(room.players[1].ticket), oldTicketP2);
});

test("room manager generates multiple tickets per player when requested", async () => {
  const { RoomManager } = await import("../rooms/RoomManager.js");
  const mgr = new RoomManager();
  const room = mgr.create("host1", "tok1", "Host", "Game Multi", ["earlyFive"], false, 3);
  assert.equal(room.players[0].tickets.length, 3);
  mgr.join(room.id, "p2", "tok2", "Player2", 2);
  assert.equal(room.players[1].tickets.length, 2);
});

test("room manager allows reconnecting when player is still marked connected (browser refresh)", async () => {
  const { RoomManager } = await import("../rooms/RoomManager.js");
  const mgr = new RoomManager();
  const room = mgr.create("host1", "tok1", "Host", "Game 1", ["fullHouse"], false);
  assert.equal(room.players[0].connected, true);
  const reconnected = mgr.reconnect("host1_new", "tok1");
  assert.equal(reconnected.players[0].id, "host1_new");
  assert.equal(reconnected.hostId, "host1_new");
  assert.equal(reconnected.players[0].connected, true);
});



