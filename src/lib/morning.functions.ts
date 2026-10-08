import { createServerFn } from "@tanstack/react-start";
import { renderDayReport, type DayLine } from "@/lib/day-report";

export const loadMorningReport = createServerFn({ method: "GET" }).handler(async () => {
  const { syncRecord } = await import("@/lib/settle.server");
  const record = await syncRecord(true);
  const lines: DayLine[] = record.suggestions.map((entry) => ({
    venue: entry.venue,
    raceNumber: entry.raceNumber,
    pickNumber: entry.pickNumber,
    pickName: entry.pickName,
    price: entry.price,
    outcome: entry.outcome,
    resultKind: entry.resultKind,
    winnerName: entry.winnerName,
    pickPosition: entry.pickPosition,
    note: entry.resultNote ?? entry.missReason,
    startTime: entry.startTime,
  }));
  return renderDayReport(lines, Date.now());
});
