import type { Suggestion } from "@/lib/ledger";

type RecordSnapshot = {
  won: number;
  lost: number;
  pending: number;
  voids: number;
  strike: number | null;
  suggestions: Suggestion[];
};

const timeFmt = new Intl.DateTimeFormat("en-AU", {
  timeZone: "Australia/Perth",
  day: "numeric",
  month: "short",
  hour: "numeric",
  minute: "2-digit",
  hour12: true,
});

function pct(strike: number | null) {
  if (strike == null) return "—";
  return `${Math.round(strike * 100)}%`;
}

function truth(entry: Suggestion) {
  if (entry.outcome === "won") return "Became true";
  if (entry.outcome === "lost") return "Missed";
  if (entry.outcome === "void") return "Void";
  return "Waiting";
}

export function RecordPage({ record }: { record: RecordSnapshot }) {
  const decided = record.won + record.lost;
  const ordered = [...record.suggestions].sort((a, b) => new Date(b.startTime).getTime() - new Date(a.startTime).getTime());

  return (
    <main className="mx-auto max-w-3xl px-4 pt-6 pb-24">
      <p className="text-sm tracking-wide text-gold uppercase">All suggestions</p>
      <h1 className="mt-1 font-display text-4xl leading-tight">{pct(record.strike)} won</h1>
      <p className="mt-2 max-w-prose text-sm text-pretty text-muted">
        {decided
          ? `${record.won} became true, ${record.lost} missed${record.pending ? `, ${record.pending} still waiting` : ""}.`
          : "Nothing has settled yet."}{" "}
        A suggestion is stored when it is made. The result is written after the jump, including while this page is closed.{" "}
        <a href="/report" className="text-gold">
          Yesterday’s note
        </a>{" "}
        is the one emailed at 7:00am.
      </p>
      {ordered.length === 0 ? (
        <p className="mt-6 text-sm text-muted">No suggestions stored yet. The first call inside 15 minutes lands here.</p>
      ) : (
        <ul className="mt-6 flex flex-col gap-3">
          {ordered.map((entry) => (
            <li key={entry.raceId} className="rounded-xl border border-line bg-surface p-4">
              <div className="flex items-baseline justify-between gap-3">
                <p className="font-display text-xl">
                  {entry.venue} R{entry.raceNumber}
                </p>
                <p className="text-sm text-muted tabular-nums">{timeFmt.format(new Date(entry.startTime))}</p>
              </div>
              <p className="mt-2 text-lg">
                #{entry.pickNumber} {entry.pickName}{" "}
                <span className="text-gold tabular-nums">{entry.price != null ? `$${entry.price.toFixed(2)}` : ""}</span>
              </p>
              <p className="mt-2 text-sm">
                <span className={entry.outcome === "won" ? "text-gold" : "text-fg"}>{truth(entry)}</span>
                {entry.resultKind === "interim" ? " · interim" : ""}
                {entry.winnerName ? ` · ${entry.winnerName} won` : ""}
                {entry.pickPosition != null && entry.pickPosition > 1 ? ` · ours finished ${entry.pickPosition}` : ""}
              </p>
              {entry.resultNote || entry.missReason ? (
                <p className="mt-2 text-sm text-pretty text-muted">{entry.resultNote ?? entry.missReason}</p>
              ) : null}
            </li>
          ))}
        </ul>
      )}
    </main>
  );
}
