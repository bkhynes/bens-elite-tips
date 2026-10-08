import assert from "node:assert/strict";
import test from "node:test";
import { sameRaceCard, sportsbetLine } from "./same-race.ts";

const field = [
  { number: 2, name: "Alpha", p: 0.34, price: 2.8 },
  { number: 1, name: "Bravo", p: 0.22, price: 4.2 },
  { number: 3, name: "Charlie", p: 0.16, price: 6 },
  { number: 4, name: "Delta", p: 0.12, price: 8 },
  { number: 5, name: "Echo", p: 0.09, price: 11 },
  { number: 6, name: "Foxtrot", p: 0.07, price: 14 },
];

test("groups a same race multi the way Sportsbet writes it", () => {
  assert.equal(
    sportsbetLine([
      { number: 1, place: 3 },
      { number: 3, place: 3 },
      { number: 2, place: 1 },
    ]),
    "#1 and #3 TOP 3, #2 WIN",
  );
});

test("suggestions get safer as they go, and a cover can pay the stake back", () => {
  const card = sameRaceCard({
    runners: field,
    fieldSize: 8,
    pick: { number: 2, name: "Alpha", price: 2.8 },
  });
  assert.ok(card);
  assert.equal(card.multis.length, 4);
  assert.match(card.multis[0].line, /WIN|TOP/);
  for (let i = 1; i < card.multis.length; i += 1) {
    assert.ok(card.multis[i].chance >= card.multis[i - 1].chance);
  }
  assert.ok(card.strategies.length >= 1);
  const plan = card.strategies[0];
  assert.match(plan.play.line, /WIN/);
  assert.ok(plan.play.payout > plan.cover.payout);
  assert.ok(plan.cover.chance > plan.play.chance);
  const outlay = 10 + plan.coverPerTen;
  assert.ok(plan.coverPerTen * plan.cover.payout + 0.02 >= outlay);
});
