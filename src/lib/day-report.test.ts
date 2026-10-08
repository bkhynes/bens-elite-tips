import assert from "node:assert/strict";
import test from "node:test";
import { renderDayReport, yesterdayWindow } from "./day-report.ts";

test("7am Perth reports the previous Perth day only", () => {
  const now = Date.parse("2026-10-08T23:00:00.000Z");
  const window = yesterdayWindow(now);
  assert.equal(new Date(window.start).toISOString(), "2026-10-07T16:00:00.000Z");
  const report = renderDayReport(
    [
      {
        venue: "Flemington",
        raceNumber: 4,
        pickNumber: 3,
        pickName: "Alpha",
        price: 4.2,
        outcome: "won",
        resultKind: "final",
        winnerName: "Alpha",
        pickPosition: 1,
        note: null,
        startTime: "2026-10-08T05:00:00.000Z",
      },
      {
        venue: "Randwick",
        raceNumber: 6,
        pickNumber: 1,
        pickName: "Bravo",
        price: 6.5,
        outcome: "lost",
        resultKind: "final",
        winnerName: "Charlie",
        pickPosition: 4,
        note: "The market had the winner.",
        startTime: "2026-10-08T06:00:00.000Z",
      },
      {
        venue: "Today",
        raceNumber: 1,
        pickNumber: 2,
        pickName: "Later",
        price: 3,
        outcome: "won",
        resultKind: "final",
        winnerName: "Later",
        pickPosition: 1,
        note: null,
        startTime: "2026-10-08T23:30:00.000Z",
      },
    ],
    now,
  );
  assert.equal(report.subject, "Elite Tips — Thursday 8 Oct");
  assert.match(report.body, /1 of 2 became true\. 50%/);
  assert.match(report.body, /Flemington R4 · #3 Alpha · \$4\.20/);
  assert.match(report.body, /Ours finished 4th/);
  assert.doesNotMatch(report.body, /Today/);
});
