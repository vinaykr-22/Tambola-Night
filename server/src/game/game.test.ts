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
  assert.equal(isWinningTicket(ticket, [1, 81, 3, 83], "fourCorners"), true);
  assert.equal(isWinningTicket(ticket, ticket.flat().filter((value): value is number => value !== null), "fullHouse"), true);
});
