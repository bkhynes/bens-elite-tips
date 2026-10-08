const PERTH = "Australia/Perth";

export type DayLine = {
  venue: string;
  raceNumber: number;
  pickNumber: number;
  pickName: string;
  price: number | null;
  outcome: "pending" | "won" | "lost" | "void";
  resultKind: "interim" | "final" | null;
  winnerName: string | null;
  pickPosition: number | null;
  note: string | null;
  startTime: string;
};

export function perthDayKey(now: number) {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: PERTH,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(new Date(now));
}

export function yesterdayWindow(now: number) {
  const [year, month, day] = perthDayKey(now).split("-").map(Number);
  const start = Date.parse(`${year}-${String(month).padStart(2, "0")}-${String(day).padStart(2, "0")}T00:00:00+08:00`) - 86_400_000;
  const label = new Intl.DateTimeFormat("en-AU", {
    timeZone: PERTH,
    weekday: "long",
    day: "numeric",
    month: "short",
  }).format(new Date(start + 3_600_000));
  return { start, end: start + 86_400_000, label };
}

function money(price: number | null) {
  if (price == null || price <= 1) return "";
  return ` · $${price.toFixed(2)}`;
}

function place(position: number) {
  if (position === 1) return "1st";
  if (position === 2) return "2nd";
  if (position === 3) return "3rd";
  return `${position}th`;
}

function truth(outcome: DayLine["outcome"]) {
  if (outcome === "won") return "Became true";
  if (outcome === "lost") return "Missed";
  if (outcome === "void") return "Void";
  return "Waiting";
}

function lineBlock(line: DayLine) {
  const bits = [`${line.venue} R${line.raceNumber} · #${line.pickNumber} ${line.pickName}${money(line.price)}`];
  if (line.winnerName) bits.push(`${line.winnerName} won.`);
  if (line.pickPosition != null && line.pickPosition > 1) bits.push(`Ours finished ${place(line.pickPosition)}.`);
  if (line.resultKind === "interim") bits.push("Result is still interim.");
  if (line.note) bits.push(line.note);
  return bits.join("\n");
}

export function renderDayReport(lines: DayLine[], now: number) {
  const { start, end, label } = yesterdayWindow(now);
  const day = lines
    .filter((line) => {
      const at = Date.parse(line.startTime);
      return Number.isFinite(at) && at >= start && at < end;
    })
    .sort((a, b) => Date.parse(a.startTime) - Date.parse(b.startTime));
  const won = day.filter((line) => line.outcome === "won").length;
  const lost = day.filter((line) => line.outcome === "lost").length;
  const pending = day.filter((line) => line.outcome === "pending").length;
  const decided = won + lost;
  const summary = !day.length
    ? "No suggestions were stored."
    : decided
      ? `${won} of ${decided} became true. ${Math.round((won / decided) * 100)}%.${pending ? ` ${pending} still waiting.` : ""}`
      : pending
        ? `Nothing settled. ${pending} still waiting.`
        : "Nothing settled.";
  const groups = (["won", "lost", "pending", "void"] as const)
    .map((outcome) => {
      const rows = day.filter((line) => line.outcome === outcome);
      if (!rows.length) return "";
      return [`${truth(outcome)}`, ...rows.map(lineBlock)].join("\n\n");
    })
    .filter(Boolean);
  const body = [`Elite Tips — ${label}`, "", summary, "", ...groups].join("\n").trim() + "\n";
  return { label, subject: `Elite Tips — ${label}`, body, won, lost, pending, calls: day.length };
}
