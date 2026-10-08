import { useEffect, useState } from "react";
import { ChevronLeft, ClipboardList } from "lucide-react";
import type { WeekBook } from "@/lib/bank";
import {
  profitOf,
  signedMoney,
  summarise,
  type Suggestion,
} from "@/lib/ledger";
import type { ModelNote } from "@/lib/elite-model";

const moneyFmt = new Intl.NumberFormat("en-AU", { style: "currency", currency: "AUD" });

const timeFmt = new Intl.DateTimeFormat("en-AU", {
  timeZone: "Australia/Perth",
  hour: "numeric",
  minute: "2-digit",
  hour12: true,
});

function WeekBank({ bank, onBank }: { bank: WeekBook; onBank: (amount: number | null) => void }) {
  const [draft, setDraft] = useState(bank.amount == null ? "" : String(bank.amount));
  useEffect(() => {
    setDraft(bank.amount == null ? "" : String(bank.amount));
  }, [bank.amount]);

  function commit() {
    const parsed = draft.trim() === "" ? null : Number(draft);
    if (parsed != null && (!Number.isFinite(parsed) || parsed < 0 || parsed > 1_000_000)) return;
    onBank(parsed == null || parsed === 0 ? null : Math.round(parsed * 100) / 100);
  }

  return (
    <div className="mt-4 rounded-xl border border-line bg-surface p-4">
      <p className="text-sm tracking-wide text-gold uppercase">This week · {bank.label}</p>
      <p className="mt-2 text-sm text-pretty text-muted">
        This is the money you can lose, not a target. One race is 2% of it. Wins go back in. When nothing is left, staking stops until Monday.
      </p>
      <label className="mt-3 block text-sm text-muted">
        Allocated
        <input
          inputMode="decimal"
          value={draft}
          placeholder="200"
          onChange={(event) => setDraft(event.target.value)}
          onBlur={commit}
          className="mt-1 h-11 w-full max-w-xs rounded-xl border border-line bg-bg px-3 text-fg tabular-nums"
        />
      </label>
      {bank.amount == null ? (
        <p className="mt-3 text-sm text-muted">Set it for this week. Monday starts again from zero, and last week's amount does not carry over.</p>
      ) : bank.stopped ? (
        <p className="mt-3 text-sm">This week's bank is done. No new stake until Monday.</p>
      ) : (
        <p className="mt-3 text-sm">
          <span className="text-gold tabular-nums">${bank.left?.toFixed(2)}</span> left of ${bank.amount.toFixed(2)}
          {bank.pending ? ` · $${bank.pending.toFixed(2)} still at risk` : ""}
          {bank.unit ? ` · unit $${bank.unit.toFixed(2)}` : ""}
          {bank.settled ? ` · settled ${signedMoney(bank.settled)}` : ""}
        </p>
      )}
    </div>
  );
}

function codeLabel(category: string) {
  if (category === "horse") return "Thoroughbred";
  if (category === "harness") return "Harness";
  if (category === "greyhound") return "Greyhound";
  return category;
}

function pct(rate: number | null) {
  if (rate == null) return "—";
  return `${Math.round(rate * 100)}%`;
}

export function RecordPane({
  entries,
  phaseStartedAt,
  now,
  checking,
  checkError,
  onBack,
  onOpen,
  onStake,
  onWinner,
  onClearManual,
  onNewPhase,
  onCheck,
  bank,
  onBank,
}: {
  entries: Suggestion[];
  phaseStartedAt: string;
  now: number;
  checking: boolean;
  checkError: string | null;
  onBack: () => void;
  onOpen: (raceId: string) => void;
  onStake: (raceId: string, stake: number | null, priceTaken: number | null) => void;
  onWinner: (raceId: string, number: number) => void;
  onClearManual: (raceId: string) => void;
  onNewPhase: () => void;
  onCheck: () => void;
  bank: WeekBook;
  onBank: (amount: number | null) => void;
}) {
  const [earlier, setEarlier] = useState(false);
  const [armPhase, setArmPhase] = useState(false);
  const [onlyBets, setOnlyBets] = useState(false);
  const phase = entries.filter((entry) => entry.loggedAt >= phaseStartedAt);
  const before = entries.filter((entry) => entry.loggedAt < phaseStartedAt);
  const summary = summarise(phase);
  const allTime = summarise(entries);
  const isBet = (entry: Suggestion) => entry.stake != null && entry.stake > 0;
  const ordered = [...phase].sort((a, b) => {
    const ap = a.outcome === "pending" ? 0 : 1;
    const bp = b.outcome === "pending" ? 0 : 1;
    if (ap !== bp) return ap - bp;
    return new Date(b.startTime).getTime() - new Date(a.startTime).getTime();
  });
  const orderedShown = onlyBets ? ordered.filter(isBet) : ordered;
  const beforeShown = onlyBets ? before.filter(isBet) : before;

  return (
    <section className="pane-in px-4 pt-4 pb-32 md:pb-24">
      <button type="button" onClick={onBack} className="press mb-3 inline-flex h-11 items-center gap-1 text-sm text-muted md:hidden">
        <ChevronLeft className="size-4" />
        Card
      </button>
      <h1 className="font-display text-3xl">Book</h1>
      <p className="mt-2 max-w-prose text-sm text-pretty text-muted">
        Every suggestion inside 15 minutes is stored. The point is to stay in the game: small stakes, a cover when you want the bigger price, and a hard stop when the week's bank is gone.
      </p>

      <WeekBank bank={bank} onBank={onBank} />

      <div className="mt-4 rounded-xl border border-line bg-surface p-4">
        <p className="text-sm tracking-wide text-gold uppercase">Suggestions this phase</p>
        {summary.calls === 0 ? (
          <p className="mt-2 text-sm text-pretty text-muted">No suggestions stored since this phase started.</p>
        ) : (
          <>
            <p className="mt-2 font-display text-2xl leading-tight">
              {summary.won} won, {summary.lost} lost
              <span className="text-gold"> · {pct(summary.hitRate)}</span>
            </p>
            <p className="mt-1 text-sm text-muted">
              {summary.calls} suggested
              {summary.marked
                ? ` · ${summary.marked} ${summary.marked === 1 ? "bet" : "bets"}`
                : " · none bet yet"}
              {summary.pending ? ` · ${summary.pending} waiting` : ""}
              {summary.voids ? ` · ${summary.voids} void` : ""}
            </p>
            <p className="mt-3 text-sm">
              {summary.bets === 0 ? (
                <span className="text-muted">
                  Strike rate is every suggestion, bet or not.
                  {summary.marked ? " Settled bets show here once they jump." : " Leave the stake blank on the ones you skip."}
                </span>
              ) : (
                <>
                  Your bets {summary.betsWon} won, {summary.betsLost} lost · staked {moneyFmt.format(summary.staked)} ·{" "}
                  <span className={summary.profit < 0 ? "text-gold" : "text-fg"}>{signedMoney(summary.profit)}</span>
                </>
              )}
            </p>
            <p className="mt-2 text-sm text-muted">Profit uses your stake and the price you took, not the tote dividend.</p>
          </>
        )}
        {before.length ? (
          <p className="mt-2 text-sm text-muted">
            All time {allTime.won} won, {allTime.lost} lost · {pct(allTime.hitRate)} · {allTime.calls} suggestions
          </p>
        ) : null}
        <div className="mt-4 flex flex-wrap gap-2">
          <button
            type="button"
            onClick={onCheck}
            disabled={checking}
            className="press h-11 rounded-full border border-line px-4 text-sm disabled:opacity-60"
          >
            {checking ? "Checking results…" : "Check results"}
          </button>
          {armPhase ? (
            <>
              <button
                type="button"
                onClick={() => {
                  setArmPhase(false);
                  onNewPhase();
                }}
                className="press h-11 rounded-full bg-gold px-4 text-sm font-semibold text-ink"
              >
                Start now
              </button>
              <button type="button" onClick={() => setArmPhase(false)} className="press h-11 rounded-full px-3 text-sm text-muted">
                Cancel
              </button>
            </>
          ) : (
            <button type="button" onClick={() => setArmPhase(true)} className="press h-11 rounded-full px-3 text-sm text-muted">
              New phase
            </button>
          )}
        </div>
        {armPhase ? (
          <p className="mt-2 text-sm text-muted">Old suggestions stay saved. The scoreboard above starts again from now.</p>
        ) : null}
        {checkError ? (
          <p className="mt-3 text-sm text-pretty" role="status">
            {checkError}
          </p>
        ) : null}
      </div>

      {ordered.length === 0 ? (
        <div className="mt-4 rounded-xl border border-line bg-surface p-4">
          <div className="grid size-11 place-items-center rounded-full bg-surface-2 text-gold">
            <ClipboardList className="size-5" />
          </div>
          <p className="mt-3 font-display text-2xl">Nothing on the book yet.</p>
          <p className="mt-2 text-sm text-pretty text-muted">
            A suggestion is stored the moment it is made inside 15 minutes, and it stays after you leave. No-bets stay off the book. After the race, a miss gets a reason and a note for next time.
          </p>
        </div>
      ) : (
        <>
          <div className="mt-4 flex gap-2" role="group" aria-label="Book filter">
            <button
              type="button"
              aria-pressed={!onlyBets}
              onClick={() => setOnlyBets(false)}
              className={`press h-11 rounded-full px-3 text-sm ${onlyBets ? "bg-surface text-fg" : "bg-gold text-ink"}`}
            >
              Suggestions · {phase.length}
            </button>
            <button
              type="button"
              aria-pressed={onlyBets}
              onClick={() => setOnlyBets(true)}
              className={`press h-11 rounded-full px-3 text-sm ${onlyBets ? "bg-gold text-ink" : "bg-surface text-fg"}`}
            >
              My bets · {phase.filter(isBet).length}
            </button>
          </div>
          {orderedShown.length === 0 ? (
            <p className="mt-4 text-sm text-pretty text-muted">
              No stakes in this phase. The suggestions are still stored. Switch back to see them.
            </p>
          ) : (
            <ul className="rise-list mt-4 flex flex-col gap-3">
              {orderedShown.map((entry) => (
                <RecordCard
                  key={entry.raceId}
                  entry={entry}
                  now={now}
                  onOpen={onOpen}
                  onStake={onStake}
                  onWinner={onWinner}
                  onClearManual={onClearManual}
                />
              ))}
            </ul>
          )}
        </>
      )}

      {beforeShown.length ? (
        <div className="mt-6">
          <button type="button" onClick={() => setEarlier((v) => !v)} className="press h-11 text-sm text-muted">
            {earlier ? "Hide earlier suggestions" : `Earlier suggestions · ${beforeShown.length}`}
          </button>
          {earlier ? (
            <ul className="mt-2 flex flex-col gap-3">
              {beforeShown.map((entry) => (
                <RecordCard
                  key={entry.raceId}
                  entry={entry}
                  now={now}
                  onOpen={onOpen}
                  onStake={onStake}
                  onWinner={onWinner}
                  onClearManual={onClearManual}
                />
              ))}
            </ul>
          ) : null}
        </div>
      ) : null}
    </section>
  );
}

function RecordCard({
  entry,
  now,
  onOpen,
  onStake,
  onWinner,
  onClearManual,
}: {
  entry: Suggestion;
  now: number;
  onOpen: (raceId: string) => void;
  onStake: (raceId: string, stake: number | null, priceTaken: number | null) => void;
  onWinner: (raceId: string, number: number) => void;
  onClearManual: (raceId: string) => void;
}) {
  const [winner, setWinner] = useState("");
  const [editing, setEditing] = useState(false);
  const profit = profitOf(entry);
  const jumped = new Date(entry.startTime).getTime() < now - 90_000;
  const showMarker = editing || (entry.outcome === "pending" && jumped);

  return (
    <li className="rounded-xl border border-line bg-surface p-4">
      <div className="flex items-baseline justify-between gap-3">
        <button type="button" onClick={() => onOpen(entry.raceId)} className="press min-w-0 text-left">
          <p className="font-display text-xl">
            {entry.venue} R{entry.raceNumber}
          </p>
        </button>
        <p className="text-sm text-muted tabular-nums">{timeFmt.format(new Date(entry.startTime))}</p>
      </div>
      <p className="text-sm text-muted">
        {codeLabel(entry.category)}
        {entry.country !== "AU" ? ` · ${entry.country}` : ""}
        <span className="text-gold"> · {entry.tag === "value" ? "Value" : "Agrees"}</span>
      </p>
      <p className="mt-2 text-lg">
        #{entry.pickNumber} {entry.pickName}{" "}
        <span className="text-gold tabular-nums">{entry.price != null ? `$${entry.price.toFixed(2)}` : "—"}</span>
      </p>
      {entry.reasons.length ? (
        <ul className="mt-2 flex flex-col gap-1 text-sm text-muted">
          {entry.reasons.map((reason) => (
            <li key={reason}>{reason}</li>
          ))}
        </ul>
      ) : null}
      <p className={`mt-3 text-sm ${entry.stake != null && entry.stake > 0 ? "text-fg" : "text-muted"}`}>{betLine(entry)}</p>
      {entry.model ? <p className="mt-2 text-sm text-pretty text-muted">{logicLine(entry.model)}</p> : null}
      <OutcomeLine entry={entry} profit={profit} />
      <StakeFields entry={entry} onCommit={(stake, price) => onStake(entry.raceId, stake, price)} />
      {entry.outcome === "lost" && entry.missReason ? (
        <div className="mt-3 border-t border-line pt-3">
          <p className="text-sm tracking-wide text-gold uppercase">Why this missed</p>
          <p className="mt-1 text-sm text-pretty">{entry.missReason}</p>
          {entry.nextTime ? (
            <>
              <p className="mt-3 text-sm tracking-wide text-muted uppercase">Next time</p>
              <p className="mt-1 text-sm text-pretty text-muted">{entry.nextTime}</p>
            </>
          ) : null}
        </div>
      ) : null}
      {entry.outcome === "void" ? (
        <p className="mt-3 text-sm text-muted">
          {entry.feed?.status === "abandoned" ? "Abandoned." : "Scratched after the call."} It doesn't count, and a stake is treated as returned.
        </p>
      ) : null}
      {showMarker ? (
        <form
          className="mt-3 flex flex-wrap items-center gap-2"
          onSubmit={(event) => {
            event.preventDefault();
            const number = Number(winner);
            if (!Number.isInteger(number) || number <= 0 || number > 24) return;
            onWinner(entry.raceId, number);
            setWinner("");
            setEditing(false);
          }}
        >
          <label className="text-sm text-muted" htmlFor={`winner-${entry.raceId}`}>
            Winner
          </label>
          <input
            id={`winner-${entry.raceId}`}
            inputMode="numeric"
            value={winner}
            onChange={(event) => setWinner(event.target.value)}
            placeholder="#"
            className="h-11 w-16 rounded-xl border border-line bg-bg px-3 text-sm tabular-nums"
          />
          <button type="submit" className="press h-11 rounded-full border border-line px-4 text-sm">
            Mark winner
          </button>
        </form>
      ) : null}
      {entry.resultSource === "manual" ? (
        <button type="button" onClick={() => onClearManual(entry.raceId)} className="press mt-2 h-11 text-sm text-muted">
          {entry.feed?.winnerNumber != null ? "Use the feed result" : "Clear my winner"}
        </button>
      ) : entry.outcome !== "pending" && !showMarker ? (
        <button type="button" onClick={() => setEditing(true)} className="press mt-2 h-11 text-sm text-muted">
          Wrong winner?
        </button>
      ) : null}
    </li>
  );
}

function betLine(entry: Suggestion) {
  if (entry.stake != null && entry.stake > 0) {
    const price = entry.priceTaken ?? entry.price;
    return price != null ? `Bet · ${moneyFmt.format(entry.stake)} at $${price.toFixed(2)}` : `Bet · ${moneyFmt.format(entry.stake)}`;
  }
  return "Suggested · no stake";
}

function logicLine(model: ModelNote) {
  const share = Math.round(model.fair * 100);
  return `Stored with the call: ${share}% of the market, next on the card #${model.secondNumber} ${model.secondName}.`;
}

function OutcomeLine({ entry, profit }: { entry: Suggestion; profit: number | null }) {
  if (entry.outcome === "pending") {
    return <p className="mt-2 text-sm text-muted">{entry.resultKind === "interim" ? "Interim result." : "Waiting on the result."}</p>;
  }
  const label = entry.outcome === "won" ? "Won" : entry.outcome === "lost" ? "Lost" : "Void";
  return (
    <p className="mt-2 text-sm">
      <span className="text-gold">{label}</span>
      {entry.resultKind === "interim" ? " · interim" : ""}
      {entry.winnerName ? ` · ${entry.winnerName} won` : ""}
      {entry.pickPosition && entry.pickPosition > 1 ? ` · ours finished ${entry.pickPosition}` : ""}
      {entry.resultSource === "manual" ? " · marked by you" : ""}
      {profit != null ? ` · ${signedMoney(profit)}` : ""}
    </p>
  );
}

function priceField(entry: Suggestion) {
  const price = entry.priceTaken ?? entry.price;
  return price == null ? "" : price.toFixed(2);
}

export function StakeFields({
  entry,
  onCommit,
}: {
  entry: Suggestion;
  onCommit: (stake: number | null, priceTaken: number | null) => void;
}) {
  const [stake, setStake] = useState(entry.stake == null ? "" : String(entry.stake));
  const [price, setPrice] = useState(priceField(entry));

  useEffect(() => {
    setStake(entry.stake == null ? "" : String(entry.stake));
    setPrice(priceField(entry));
  }, [entry.raceId, entry.stake, entry.priceTaken, entry.price]);

  function commit(nextStake: string, nextPrice: string) {
    const parsedStake = nextStake.trim() === "" ? null : Number(nextStake);
    const parsedPrice = nextPrice.trim() === "" ? null : Number(nextPrice);
    if (parsedStake != null && (!Number.isFinite(parsedStake) || parsedStake < 0 || parsedStake > 100_000)) return;
    if (parsedPrice != null && (!Number.isFinite(parsedPrice) || parsedPrice <= 1 || parsedPrice > 1001)) return;
    const stakeValue = parsedStake == null || parsedStake === 0 ? null : Math.round(parsedStake * 100) / 100;
    const priceValue = stakeValue == null ? null : parsedPrice;
    onCommit(stakeValue, priceValue);
  }

  return (
    <div className="mt-3 grid grid-cols-2 gap-2 sm:max-w-xs">
      <label className="text-sm text-muted">
        My stake
        <input
          inputMode="decimal"
          value={stake}
          placeholder="0"
          onChange={(event) => setStake(event.target.value)}
          onBlur={() => commit(stake, price)}
          className="mt-1 h-11 w-full rounded-xl border border-line bg-bg px-3 text-fg tabular-nums"
        />
      </label>
      <label className="text-sm text-muted">
        Price taken
        <input
          inputMode="decimal"
          value={price}
          placeholder="2.80"
          onChange={(event) => setPrice(event.target.value)}
          onBlur={() => commit(stake, price)}
          className="mt-1 h-11 w-full rounded-xl border border-line bg-bg px-3 text-fg tabular-nums"
        />
      </label>
    </div>
  );
}
