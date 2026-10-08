import assert from "node:assert/strict";
import test from "node:test";
import { perthMonday, sizedStakes, weekBook } from "./bank.ts";

test("the Perth week starts Monday", () => {
  const friday = Date.parse("2026-10-08T19:56:00.000Z");
  assert.equal(perthMonday(friday), "2026-10-05");
});

test("losses and open stakes come out of the week, wins go back", () => {
  const now = Date.parse("2026-10-08T19:56:00.000Z");
  const book = weekBook(now, 200, [
    { at: "2026-10-06T02:00:00.000Z", stake: 4, state: "lost", profit: -4 },
    { at: "2026-10-07T02:00:00.000Z", stake: 4, state: "won", profit: 6 },
    { at: "2026-10-08T02:00:00.000Z", stake: 4, state: "pending", profit: 0 },
    { at: "2026-09-20T02:00:00.000Z", stake: 50, state: "lost", profit: -50 },
  ]);
  assert.equal(book.settled, 2);
  assert.equal(book.pending, 4);
  assert.equal(book.left, 198);
  assert.equal(book.unit, 4);
  assert.equal(book.stopped, false);
});

test("a spent week stops the next stake", () => {
  const now = Date.parse("2026-10-08T19:56:00.000Z");
  const book = weekBook(now, 20, [{ at: "2026-10-06T02:00:00.000Z", stake: 20, state: "lost", profit: -20 }]);
  assert.equal(book.stopped, true);
  assert.equal(book.unit, 0);
});

test("the cover stake scales inside one unit", () => {
  const stakes = sizedStakes(4, 2.9);
  assert.ok(Math.abs(stakes.outlay - 4) < 0.02);
  assert.ok(stakes.cover > 0);
  assert.ok(stakes.play > stakes.cover);
});
