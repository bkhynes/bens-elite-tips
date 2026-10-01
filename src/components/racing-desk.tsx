import { useEffect, useMemo, useRef, useState } from "react";
import { Bookmark, ChevronDown, ChevronLeft, ClipboardList, Clock, Filter, Hourglass, RefreshCw, Search, TriangleAlert } from "lucide-react";
import { readRace, readsInWindow, type EliteRead } from "@/lib/elite-model";
import {
  applyFeed,
  awaitingResult,
  capturePicks,
  clearManual,
  feedFromSettled,
  loadLedger,
  loadPhase,
  markWinner,
  mergeHistory,
  saveLedger,
  savePhase,
  setStake,
  suggestionStamp,
  toStored,
  type Suggestion,
} from "@/lib/ledger";
import { loadBoard, loadResults, raceToResearchInput, researchRace } from "@/lib/racing.functions";
import { listSuggestions, saveSuggestions } from "@/lib/suggestions.functions";
import type { Board, Race, RaceResearch, Runner } from "@/lib/racing-types";
import { RecordPane, StakeFields } from "@/components/record-pane";

type Horizon = "15" | "60" | "all";
type Code = "all" | "horse" | "harness" | "greyhound";
type Watch = {
  id: string;
  raceId: string;
  venue: string;
  raceNumber: number;
  number: number;
  name: string;
  price: number | null;
  startTime: string;
};

const WATCH_KEY = "elite-tips-watch";
const STALE_MS = 90_000;

function pushSuggestions(entries: Suggestion[]) {
  const stored = entries.map(toStored);
  for (let i = 0; i < stored.length; i += 30) {
    void saveSuggestions({ data: { suggestions: stored.slice(i, i + 30) } }).catch(() => undefined);
  }
}

const timeFmt = new Intl.DateTimeFormat("en-AU", {
  timeZone: "Australia/Perth",
  hour: "numeric",
  minute: "2-digit",
  hour12: true,
});

function codeLabel(category: string) {
  if (category === "horse") return "Thoroughbred";
  if (category === "harness") return "Harness";
  if (category === "greyhound") return "Greyhound";
  return category;
}

function codeNoun(code: Code) {
  if (code === "horse") return "thoroughbreds";
  if (code === "harness") return "harness";
  if (code === "greyhound") return "greyhounds";
  return "meetings";
}

function pilot(category: string) {
  if (category === "harness") return "Driver";
  if (category === "greyhound") return "Trainer";
  return "Jockey";
}

function money(n: number | null | undefined) {
  if (n == null) return "—";
  return `$${n.toFixed(2)}`;
}

function countdown(ms: number) {
  if (ms <= -90_000) return "Jumped";
  if (ms < 0) return "Off";
  const total = Math.floor(ms / 1000);
  const m = Math.floor(total / 60);
  const s = total % 60;
  if (m >= 60) return `${Math.floor(m / 60)}h ${m % 60}m`;
  if (m > 0) return `${m}m ${String(s).padStart(2, "0")}s`;
  return `${s}s`;
}

function freshness(fetchedAt: string, now: number | null) {
  if (now == null) return "just now";
  const ms = now - new Date(fetchedAt).getTime();
  if (!Number.isFinite(ms) || ms < 5000) return "just now";
  const s = Math.floor(ms / 1000);
  if (s < 60) return `${s}s ago`;
  const m = Math.floor(s / 60);
  if (m < 60) return `${m}m ago`;
  return `${Math.floor(m / 60)}h ago`;
}

function loadWatch(): Watch[] {
  try {
    const raw = localStorage.getItem(WATCH_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw) as Watch[];
    return Array.isArray(parsed) ? parsed.slice(0, 30) : [];
  } catch {
    return [];
  }
}

function within(race: Race, horizon: Horizon, now: number) {
  if (horizon === "all") return true;
  const mins = (new Date(race.startTime).getTime() - now) / 60000;
  if (mins < -2) return false;
  return horizon === "15" ? mins <= 15 : mins <= 60;
}

function byStart(a: { startTime: string }, b: { startTime: string }) {
  return new Date(a.startTime).getTime() - new Date(b.startTime).getTime();
}

export function RacingDesk({ initial }: { initial: Board }) {
  const [board, setBoard] = useState<Board>(initial);
  const [refreshing, setRefreshing] = useState(false);
  const [now, setNow] = useState<number | null>(null);
  const [horizon, setHorizon] = useState<Horizon>("15");
  const [code, setCode] = useState<Code>("all");
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [mobilePane, setMobilePane] = useState<"list" | "race" | "scan" | "watch" | "record">("list");
  const [openRunner, setOpenRunner] = useState<number | null>(null);
  const [openFor, setOpenFor] = useState<string | null>(null);
  const [watch, setWatch] = useState<Watch[]>([]);
  const [ledger, setLedger] = useState<Suggestion[]>([]);
  const [phaseStartedAt, setPhaseStartedAt] = useState(() => new Date().toISOString());
  const [checking, setChecking] = useState(false);
  const [checkError, setCheckError] = useState<string | null>(null);
  const [research, setResearch] = useState<Record<string, RaceResearch | { error: string }>>({});
  const [researching, setResearching] = useState<string | null>(null);

  const ledgerRef = useRef<Suggestion[]>([]);
  const booted = useRef(false);

  useEffect(() => {
    setWatch(loadWatch());
    const loaded = loadLedger();
    ledgerRef.current = loaded;
    setLedger(loaded);
    setPhaseStartedAt(loadPhase(loaded));
    booted.current = true;
    setNow(Date.now());
    const tick = setInterval(() => setNow(Date.now()), 1000);
    let stop = false;
    void listSuggestions()
      .then((remote) => {
        if (stop) return;
        const { entries, push } = mergeHistory(ledgerRef.current, remote);
        const same =
          entries.length === ledgerRef.current.length &&
          entries.every(
            (entry, index) =>
              entry.raceId === ledgerRef.current[index]?.raceId &&
              entry.stake === ledgerRef.current[index]?.stake &&
              suggestionStamp(entry) === suggestionStamp(ledgerRef.current[index]),
          );
        if (!same) {
          ledgerRef.current = entries;
          saveLedger(entries);
          setLedger(entries);
        }
        if (push.length) pushSuggestions(push);
      })
      .catch(() => undefined);
    return () => {
      stop = true;
      clearInterval(tick);
    };
  }, []);

  useEffect(() => {
    let stop = false;
    const pull = async () => {
      setRefreshing(true);
      try {
        const next = await loadBoard({ data: { limit: 18 } });
        if (!stop) setBoard(next);
      } catch {
        if (!stop) {
          setBoard((prev) => ({
            ...prev,
            error: "Couldn't refresh the card. The last one is still on screen.",
          }));
        }
      } finally {
        if (!stop) setRefreshing(false);
      }
    };
    const timer = setInterval(() => {
      if (document.visibilityState === "visible") void pull();
    }, 45_000);
    return () => {
      stop = true;
      clearInterval(timer);
    };
  }, []);

  const clock = now ?? new Date(board.fetchedAt).getTime();
  const races = board.races.filter((r) => (code === "all" ? true : r.category === code) && within(r, horizon, clock));
  const upcoming = races.find((race) => new Date(race.startTime).getTime() - clock > -30_000) ?? races[0] ?? null;
  const selected = board.races.find((r) => r.id === selectedId) ?? upcoming;
  const windowReads = useMemo(() => readsInWindow(board.races, clock), [board.races, clock]);
  const windowCount = windowReads.length;
  const emptyBoard = board.races.length === 0;
  const showBoot = emptyBoard && refreshing;
  const showError = emptyBoard && Boolean(board.error) && !refreshing;
  const age = now == null ? 0 : now - new Date(board.fetchedAt).getTime();
  const stale = Number.isFinite(age) && age > STALE_MS;

  const shownOpen = openFor === selected?.id ? openRunner : null;
  const phaseCalls = ledger.filter((entry) => entry.loggedAt >= phaseStartedAt && entry.outcome === "pending").length;

  useEffect(() => {
    if (!booted.current) return;
    const next = capturePicks(ledgerRef.current, board.races, windowReads, new Date().toISOString());
    if (next === ledgerRef.current) return;
    commitLedger(next, true);
  }, [board.races, windowReads]);

  const settleKey = ledger
    .filter((entry) => awaitingResult(entry, clock))
    .map((entry) => entry.raceId)
    .sort()
    .join("|");

  useEffect(() => {
    if (!settleKey) return;
    let stop = false;
    const run = async () => {
      const due = ledgerRef.current.filter((entry) => awaitingResult(entry, Date.now()));
      if (!due.length) return;
      const oldest = Math.min(...due.map((entry) => new Date(entry.startTime).getTime()));
      const hoursBack = Math.min(72, Math.max(6, Math.ceil((Date.now() - oldest) / 3_600_000) + 2));
      setChecking(true);
      try {
        const loaded = await loadResults({ data: { hoursBack, raceIds: due.map((entry) => entry.raceId) } });
        if (stop) return;
        setCheckError(loaded.error ?? null);
        const byId = new Map(loaded.races.map((race) => [race.raceId, race]));
        let changed = false;
        const next = ledgerRef.current.map((entry) => {
          const race = byId.get(entry.raceId);
          if (!race || (entry.outcome !== "pending" && entry.resultKind !== "interim" && entry.resultSource !== "manual")) {
            return entry;
          }
          const updated = applyFeed(entry, feedFromSettled(entry.pickNumber, race));
          if (updated !== entry) changed = true;
          return updated;
        });
        if (changed) commitLedger(next, true);
      } catch {
        if (!stop) setCheckError("Couldn't check results. You can still mark a winner.");
      } finally {
        if (!stop) setChecking(false);
      }
    };
    void run();
    const timer = setInterval(() => void run(), 90_000);
    return () => {
      stop = true;
      clearInterval(timer);
    };
  }, [settleKey]);

  useEffect(() => {
    if (!selectedId) return;
    const node = document.querySelector(`[data-race-id="${CSS.escape(selectedId)}"]`);
    if (!(node instanceof HTMLElement) || node.offsetParent === null) return;
    node.scrollIntoView({ block: "nearest" });
  }, [selectedId]);

  function choose(id: string) {
    setSelectedId(id);
    setOpenRunner(null);
    setMobilePane("race");
  }

  function toggleRunner(number: number) {
    if (!selected) return;
    if (openFor === selected.id && openRunner === number) {
      setOpenRunner(null);
      return;
    }
    setOpenFor(selected.id);
    setOpenRunner(number);
  }

  function toggleWatch(race: Race, runner: Runner) {
    const id = `${race.id}-${runner.number}`;
    setWatch((prev) => {
      const next = prev.some((w) => w.id === id)
        ? prev.filter((w) => w.id !== id)
        : [
            {
              id,
              raceId: race.id,
              venue: race.venue,
              raceNumber: race.raceNumber,
              number: runner.number,
              name: runner.name,
              price: runner.sportsbet,
              startTime: race.startTime,
            },
            ...prev,
          ].slice(0, 30);
      localStorage.setItem(WATCH_KEY, JSON.stringify(next));
      return next;
    });
  }

  async function refresh() {
    setRefreshing(true);
    try {
      setBoard(await loadBoard({ data: { limit: 18 } }));
    } catch {
      setBoard((prev) => ({ ...prev, error: "Refresh failed. Try again in a moment." }));
    } finally {
      setRefreshing(false);
    }
  }

  async function researchSelected(race: Race) {
    setResearching(race.id);
    try {
      const result = await researchRace({ data: raceToResearchInput(race) });
      setResearch((prev) => ({
        ...prev,
        [race.id]: result.ok ? result.research : { error: result.error },
      }));
    } catch {
      setResearch((prev) => ({ ...prev, [race.id]: { error: "Research didn't finish. Try again." } }));
    } finally {
      setResearching(null);
    }
  }

  function commitLedger(next: Suggestion[], sync: boolean) {
    const prev = ledgerRef.current;
    ledgerRef.current = next;
    saveLedger(next);
    setLedger(next);
    if (!sync) return;
    const prevStamp = new Map(prev.map((entry) => [entry.raceId, suggestionStamp(entry)]));
    const changed = next.filter((entry) => prevStamp.get(entry.raceId) !== suggestionStamp(entry));
    if (changed.length) pushSuggestions(changed);
  }

  function updateEntry(raceId: string, map: (entry: Suggestion) => Suggestion, sync = false) {
    commitLedger(
      ledgerRef.current.map((entry) => (entry.raceId === raceId ? map(entry) : entry)),
      sync,
    );
  }

  const showList = mobilePane === "list";
  const showRace = mobilePane === "race";
  const showScan = mobilePane === "scan";
  const showWatch = mobilePane === "watch";
  const showRecord = mobilePane === "record";
  const bookEntry = selected ? ledger.find((entry) => entry.raceId === selected.id) : undefined;

  return (
    <div className="min-h-screen bg-bg text-fg" data-ready={board.races.length > 0 ? "yes" : "no"}>
      <header className="sticky top-0 z-20 border-b border-line bg-bg/95 backdrop-blur">
        <div className="mx-auto flex max-w-6xl items-center gap-3 px-4 py-3">
          <div className="min-w-0 flex-1">
            <p className="font-display text-lg leading-none tracking-tight">
              Elite <span className="text-gold">Tips</span>
            </p>
            <p className="mt-1 truncate text-sm text-muted tabular-nums">
              Perth {timeFmt.format(new Date(now ?? board.fetchedAt))}
              <span className={stale ? "text-gold" : undefined}>
                {" "}
                · {refreshing ? "Updating prices" : freshness(board.fetchedAt, now)}
              </span>
            </p>
          </div>
          <button
            type="button"
            onClick={() => setMobilePane(showRecord ? "list" : "record")}
            aria-pressed={showRecord}
            aria-label={showRecord ? "Close the book" : `Book, ${phaseCalls} waiting`}
            className={`press inline-flex h-11 shrink-0 items-center gap-2 rounded-full border bg-surface px-3 text-sm ${
              showRecord ? "border-gold" : "border-line"
            }`}
          >
            <ClipboardList className="size-4 text-gold" />
            <span>{showRecord ? "Close" : "Book"}</span>
            {phaseCalls > 0 ? <span className="tabular-nums">{phaseCalls}</span> : null}
          </button>
          <button
            type="button"
            onClick={() => setMobilePane(showWatch ? "list" : "watch")}
            aria-pressed={showWatch}
            aria-label={showWatch ? "Close watch list" : `Watch list, ${watch.length} saved`}
            className={`press inline-flex h-11 shrink-0 items-center gap-2 rounded-full border bg-surface px-3 text-sm ${
              showWatch ? "border-gold" : "border-line"
            }`}
          >
            <Bookmark className={`size-4 ${watch.length ? "fill-gold text-gold" : "text-gold"}`} />
            <span>{showWatch ? "Close" : "Watch"}</span>
            {watch.length > 0 ? <span className="tabular-nums">{watch.length}</span> : null}
          </button>
          <button
            type="button"
            onClick={() => void refresh()}
            disabled={refreshing}
            aria-label={refreshing ? "Refreshing prices" : "Refresh prices"}
            className="press inline-flex size-11 shrink-0 items-center justify-center rounded-full border border-line bg-surface disabled:opacity-60"
          >
            <RefreshCw className={`size-4 ${refreshing ? "spin" : ""}`} />
          </button>
          <button
            type="button"
            onClick={() => setMobilePane(showScan ? "list" : "scan")}
            aria-pressed={showScan}
            className="press hidden h-11 shrink-0 items-center rounded-full bg-gold px-4 text-sm font-semibold text-ink md:inline-flex"
          >
            {showScan ? "Close scan" : `Scan 15 min${windowCount ? ` · ${windowCount}` : ""}`}
          </button>
        </div>
        {refreshing ? (
          <div className="loadbar" aria-hidden="true">
            <span />
          </div>
        ) : null}
      </header>

      {board.error && board.races.length > 0 && !showList ? (
        <p className="border-b border-line bg-surface px-4 py-2 text-sm text-pretty md:hidden" role="status">
          {board.error}
        </p>
      ) : null}

      <div className="mx-auto grid max-w-6xl md:grid-cols-[20rem_minmax(0,1fr)]">
        <aside className={`${showList ? "block" : "hidden"} min-w-0 border-line md:block md:border-r`}>
          <div className="chip-row flex min-w-0 gap-2 overflow-x-auto px-4 pt-4" role="group" aria-label="Time window">
            {(
              [
                ["15", "15 min"],
                ["60", "Hour"],
                ["all", "Card"],
              ] as const
            ).map(([id, label]) => (
              <FilterChip key={id} active={horizon === id} onClick={() => setHorizon(id)} label={label} />
            ))}
          </div>
          <div className="chip-row flex min-w-0 gap-2 overflow-x-auto px-4 py-3" role="group" aria-label="Code">
            {(
              [
                ["all", "All"],
                ["horse", "Horses"],
                ["harness", "Harness"],
                ["greyhound", "Greys"],
              ] as const
            ).map(([id, label]) => (
              <FilterChip key={id} active={code === id} onClick={() => setCode(id)} label={label} />
            ))}
          </div>
          {showBoot ? (
            <QueueSkeleton />
          ) : showError ? (
            <BoardError message={board.error ?? "The live card couldn't be loaded."} busy={refreshing} onRetry={() => void refresh()} />
          ) : races.length === 0 ? (
            <EmptyQueue
              horizon={horizon}
              code={code}
              races={board.races}
              now={clock}
              onHorizon={setHorizon}
              onResetCode={() => setCode("all")}
            />
          ) : (
            <>
              {board.error ? (
                <StaleBanner message={board.error} busy={refreshing} onRetry={() => void refresh()} />
              ) : null}
              <ul className="rise-list flex flex-col gap-2 px-4 pb-28 md:pb-6">
                {races.map((race) => {
                  const ms = new Date(race.startTime).getTime() - clock;
                  const active = selected?.id === race.id && !showScan && !showWatch && !showRecord;
                  const verdict = windowReads.find((read) => read.raceId === race.id);
                  return (
                    <li key={race.id}>
                      <button
                        type="button"
                        data-race-id={race.id}
                        aria-current={active ? "true" : undefined}
                        onClick={() => choose(race.id)}
                        className={`press w-full rounded-xl border px-3 py-3 text-left ${
                          active ? "border-gold bg-surface" : "border-line bg-surface/60 md:hover:border-gold/60"
                        }`}
                      >
                        <div className="flex items-baseline justify-between gap-3">
                          <span className="text-sm text-muted tabular-nums">{timeFmt.format(new Date(race.startTime))}</span>
                          <span
                            className={`text-sm tabular-nums transition-colors duration-200 ${
                              ms <= 15 * 60000 && ms > -90000 ? "text-gold" : "text-muted"
                            }`}
                          >
                            {countdown(ms)}
                          </span>
                        </div>
                        <p className="mt-1 font-display text-xl leading-tight">
                          {race.venue} <span className="text-gold">R{race.raceNumber}</span>
                        </p>
                        <p className="mt-1 text-sm text-muted">
                          {codeLabel(race.category)}
                          {race.country !== "AU" ? ` · ${race.country}` : ""}
                          {race.distance ? ` · ${race.distance}m` : ""}
                          {race.condition ? ` · ${race.condition}` : ""}
                        </p>
                        {verdict?.decision === "pick" && verdict.pick ? (
                          <p className="mt-2 truncate text-sm">
                            <span className="text-gold">
                              #{verdict.pick.number} {verdict.pick.name}
                            </span>
                            <span className="text-muted"> · {money(verdict.pick.price)}</span>
                          </p>
                        ) : verdict ? (
                          <p className="mt-2 truncate text-sm text-muted">No bet in this window</p>
                        ) : null}
                      </button>
                    </li>
                  );
                })}
              </ul>
            </>
          )}
        </aside>

        <main className={`${showRace || showScan || showWatch || showRecord ? "block" : "hidden"} min-w-0 md:block`}>
          {showRecord ? (
            <RecordPane
              entries={ledger}
              phaseStartedAt={phaseStartedAt}
              now={clock}
              checking={checking}
              checkError={checkError}
              onBack={() => setMobilePane("list")}
              onOpen={choose}
              onStake={(raceId, stake, priceTaken) => updateEntry(raceId, (entry) => setStake(entry, stake, priceTaken))}
              onWinner={(raceId, number) => updateEntry(raceId, (entry) => markWinner(entry, number), true)}
              onClearManual={(raceId) => updateEntry(raceId, (entry) => clearManual(entry), true)}
              onNewPhase={() => {
                const startedAt = new Date().toISOString();
                savePhase(startedAt);
                setPhaseStartedAt(startedAt);
              }}
              onCheck={() => {
                const due = ledgerRef.current.filter((entry) => entry.outcome === "pending" || entry.resultKind === "interim");
                if (!due.length) {
                  setCheckError("Nothing is waiting on a result.");
                  return;
                }
                const oldest = Math.min(...due.map((entry) => new Date(entry.startTime).getTime()));
                const hoursBack = Math.min(72, Math.max(6, Math.ceil((Date.now() - Math.min(oldest, Date.now())) / 3_600_000) + 2));
                setChecking(true);
                void loadResults({ data: { hoursBack, raceIds: due.map((entry) => entry.raceId) } })
                  .then((loaded) => {
                    const byId = new Map(loaded.races.map((race) => [race.raceId, race]));
                    let changed = false;
                    const next = ledgerRef.current.map((entry) => {
                      const race = byId.get(entry.raceId);
                      if (!race) return entry;
                      const updated = applyFeed(entry, feedFromSettled(entry.pickNumber, race));
                      if (updated !== entry) changed = true;
                      return updated;
                    });
                    if (changed) commitLedger(next, true);
                    setCheckError(loaded.error ?? (changed ? null : "None of these have a result yet. Check again after they jump."));
                  })
                  .catch(() => setCheckError("Couldn't check results. You can still mark a winner."))
                  .finally(() => setChecking(false));
              }}
            />
          ) : showWatch ? (
            <WatchList
              watch={watch}
              now={clock}
              onBack={() => setMobilePane("list")}
              onOpen={choose}
              onClear={(id) => {
                setWatch((prev) => {
                  const next = prev.filter((w) => w.id !== id);
                  localStorage.setItem(WATCH_KEY, JSON.stringify(next));
                  return next;
                });
              }}
            />
          ) : showScan ? (
            <ScanPane reads={windowReads} races={board.races} now={clock} onBack={() => setMobilePane("list")} onOpen={choose} />
          ) : showBoot ? (
            <div className="hidden md:block">
              <RaceSkeleton />
            </div>
          ) : selected ? (
            <RacePane
              key={selected.id}
              race={selected}
              now={clock}
              read={readRace(selected, clock)}
              openRunner={shownOpen}
              setOpenRunner={toggleRunner}
              watch={watch}
              onBack={() => setMobilePane("list")}
              onWatch={toggleWatch}
              research={research[selected.id]}
              researching={researching === selected.id}
              onResearch={() => void researchSelected(selected)}
              bookEntry={bookEntry}
              onStake={(stake, priceTaken) => {
                if (!bookEntry) return;
                updateEntry(bookEntry.raceId, (entry) => setStake(entry, stake, priceTaken));
              }}
              onOpenBook={() => setMobilePane("record")}
            />
          ) : (
            <QuietDesk />
          )}
        </main>
      </div>

      <div className="fixed inset-x-0 bottom-0 z-20 border-t border-line bg-bg/95 p-3 backdrop-blur md:hidden">
        {showScan || showWatch || showRecord ? (
          <button
            type="button"
            onClick={() => setMobilePane("list")}
            className="press flex h-12 w-full items-center justify-center rounded-full border border-line bg-surface text-base font-semibold"
          >
            Back to the card
          </button>
        ) : (
          <button
            type="button"
            onClick={() => setMobilePane("scan")}
            className="press flex h-12 w-full items-center justify-center rounded-full bg-gold text-base font-semibold text-ink"
          >
            {`Scan 15 min${windowCount ? ` · ${windowCount}` : ""}`}
          </button>
        )}
      </div>
    </div>
  );
}

export function BoardPending() {
  return (
    <div className="min-h-screen bg-bg text-fg" data-ready="no" aria-busy="true">
      <header className="sticky top-0 z-20 border-b border-line bg-bg/95">
        <div className="mx-auto flex max-w-6xl items-center gap-3 px-4 py-3">
          <div className="min-w-0 flex-1">
            <p className="font-display text-lg leading-none tracking-tight">
              Elite <span className="text-gold">Tips</span>
            </p>
            <p className="mt-1 text-sm text-muted">Pulling the card…</p>
          </div>
          <div className="skeleton size-11 rounded-full" />
          <div className="skeleton size-11 rounded-full" />
        </div>
        <div className="loadbar" aria-hidden="true">
          <span />
        </div>
      </header>
      <div className="mx-auto grid max-w-6xl md:grid-cols-[20rem_minmax(0,1fr)]">
        <div className="min-w-0">
          <div className="flex gap-2 px-4 pt-4">
            <div className="skeleton h-11 w-20 rounded-full" />
            <div className="skeleton h-11 w-16 rounded-full" />
            <div className="skeleton h-11 w-16 rounded-full" />
          </div>
          <QueueSkeleton />
        </div>
        <div className="hidden md:block">
          <RaceSkeleton />
        </div>
      </div>
    </div>
  );
}

function FilterChip({ active, onClick, label }: { active: boolean; onClick: () => void; label: string }) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={active}
      className={`press h-11 shrink-0 rounded-full px-3 text-sm ${active ? "bg-gold text-ink" : "bg-surface text-fg"}`}
    >
      {label}
    </button>
  );
}

function Bone({ className }: { className: string }) {
  return <div className={`skeleton ${className}`} />;
}

function QueueSkeleton() {
  return (
    <div className="flex flex-col gap-2 px-4 pt-1 pb-28 md:pb-6" aria-busy="true" aria-live="polite">
      <p className="sr-only">Pulling the card</p>
      {Array.from({ length: 5 }, (_, i) => (
        <div key={i} className="rounded-xl border border-line bg-surface p-3">
          <Bone className="h-3 w-16 rounded-md" />
          <Bone className="mt-3 h-6 w-40 max-w-full rounded-md" />
          <Bone className="mt-2 h-3 w-32 rounded-md" />
        </div>
      ))}
    </div>
  );
}

function RaceSkeleton() {
  return (
    <div className="px-4 pt-4" aria-hidden="true">
      <Bone className="h-3 w-24 rounded-md" />
      <Bone className="mt-3 h-8 w-64 max-w-full rounded-md" />
      <Bone className="mt-4 h-28 w-full rounded-xl" />
      <Bone className="mt-3 h-16 w-full rounded-xl" />
      <Bone className="mt-3 h-16 w-full rounded-xl" />
    </div>
  );
}

function BoardError({ message, onRetry, busy }: { message: string; onRetry: () => void; busy: boolean }) {
  return (
    <div className="px-4 pb-28 md:pb-6">
      <div className="pane-in rounded-xl border border-line bg-surface p-4" role="alert">
        <div className="grid size-11 place-items-center rounded-full bg-surface-2 text-gold">
          <TriangleAlert className="size-5" />
        </div>
        <p className="mt-3 font-display text-2xl">The card didn't load.</p>
        <p className="mt-2 text-sm text-pretty text-muted">{message}</p>
        <button
          type="button"
          onClick={onRetry}
          disabled={busy}
          className="press mt-4 inline-flex h-11 items-center gap-2 rounded-full bg-gold px-4 text-sm font-semibold text-ink disabled:opacity-60"
        >
          <RefreshCw className={`size-4 ${busy ? "spin" : ""}`} />
          Try again
        </button>
      </div>
    </div>
  );
}

function StaleBanner({ message, onRetry, busy }: { message: string; onRetry: () => void; busy: boolean }) {
  return (
    <div className="mx-4 mb-3 flex items-center gap-3 rounded-xl border border-line bg-surface px-3 py-2" role="status">
      <TriangleAlert className="size-4 shrink-0 text-gold" />
      <p className="min-w-0 flex-1 text-sm text-pretty">{message}</p>
      <button
        type="button"
        onClick={onRetry}
        disabled={busy}
        className="press h-11 shrink-0 rounded-full border border-line px-3 text-sm"
      >
        Retry
      </button>
    </div>
  );
}

function EmptyQueue({
  horizon,
  code,
  races,
  now,
  onHorizon,
  onResetCode,
}: {
  horizon: Horizon;
  code: Code;
  races: Race[];
  now: number;
  onHorizon: (horizon: Horizon) => void;
  onResetCode: () => void;
}) {
  const pool = code === "all" ? races : races.filter((race) => race.category === code);
  const noneOfCode = code !== "all" && pool.length === 0;
  const next = [...pool].sort(byStart)[0];
  const nextAny = [...races].sort(byStart)[0];
  const hiddenLater =
    horizon !== "all" &&
    pool.some((race) => {
      const mins = (new Date(race.startTime).getTime() - now) / 60000;
      return mins >= -2 && !within(race, horizon, now);
    });

  return (
    <div className="px-4 pb-28 md:pb-6">
      <div className="pane-in rounded-xl border border-line bg-surface p-4">
        <div className="grid size-11 place-items-center rounded-full bg-surface-2 text-gold">
          {noneOfCode ? <Filter className="size-5" /> : <Clock className="size-5" />}
        </div>
        <p className="mt-3 font-display text-2xl">
          {noneOfCode ? `No ${codeNoun(code)} on the card.` : "Nothing in this window."}
        </p>
        <p className="mt-2 text-sm text-pretty text-muted">
          {noneOfCode
            ? "This code is quiet. The other meetings are still on the card."
            : horizon === "15"
              ? "The 15-minute rule stays strict. No manufactured pick just to fill the screen."
              : horizon === "60"
                ? "Nothing jumps in the next hour. The rest of the card may still be up."
                : "The feed has no meetings in this filter."}
        </p>
        {noneOfCode && nextAny ? (
          <p className="mt-3 text-sm">
            Next on the card is {nextAny.venue} R{nextAny.raceNumber} at {timeFmt.format(new Date(nextAny.startTime))} ·{" "}
            {countdown(new Date(nextAny.startTime).getTime() - now)}
          </p>
        ) : null}
        {!noneOfCode && next ? (
          <p className="mt-3 text-sm">
            Next is {next.venue} R{next.raceNumber} at {timeFmt.format(new Date(next.startTime))} ·{" "}
            {countdown(new Date(next.startTime).getTime() - now)}
          </p>
        ) : null}
        <div className="mt-4 flex flex-wrap gap-2">
          {hiddenLater && horizon === "15" ? (
            <button
              type="button"
              onClick={() => onHorizon("60")}
              className="press h-11 rounded-full bg-gold px-4 text-sm font-semibold text-ink"
            >
              Show the next hour
            </button>
          ) : null}
          {hiddenLater && horizon === "60" ? (
            <button
              type="button"
              onClick={() => onHorizon("all")}
              className="press h-11 rounded-full bg-gold px-4 text-sm font-semibold text-ink"
            >
              Show the full card
            </button>
          ) : null}
          {code !== "all" ? (
            <button
              type="button"
              onClick={onResetCode}
              className={`press h-11 rounded-full px-4 text-sm ${
                noneOfCode ? "bg-gold font-semibold text-ink" : "border border-line"
              }`}
            >
              Show all codes
            </button>
          ) : null}
        </div>
      </div>
    </div>
  );
}

function QuietDesk() {
  return (
    <div className="pane-in hidden px-4 pt-16 md:block">
      <p className="font-display text-3xl">Waiting on the next jump.</p>
      <p className="mt-2 max-w-prose text-sm text-pretty text-muted">
        When a race lands in this window it opens here. Widen the filters on the left, or run the 15-minute scan.
      </p>
    </div>
  );
}

function RacePane({
  race,
  now,
  read,
  openRunner,
  setOpenRunner,
  watch,
  onBack,
  onWatch,
  research,
  researching,
  onResearch,
  bookEntry,
  onStake,
  onOpenBook,
}: {
  race: Race;
  now: number;
  read: EliteRead;
  openRunner: number | null;
  setOpenRunner: (n: number) => void;
  watch: Watch[];
  onBack: () => void;
  onWatch: (race: Race, runner: Runner) => void;
  research: RaceResearch | { error: string } | undefined;
  researching: boolean;
  onResearch: () => void;
  bookEntry: Suggestion | undefined;
  onStake: (stake: number | null, priceTaken: number | null) => void;
  onOpenBook: () => void;
}) {
  const ms = new Date(race.startTime).getTime() - now;
  const active = race.runners.filter((runner) => !runner.scratched).length;
  return (
    <article className="pane-in px-4 pt-4 pb-32 md:pb-24">
      <button type="button" onClick={onBack} className="press mb-3 inline-flex h-11 items-center gap-1 text-sm text-muted md:hidden">
        <ChevronLeft className="size-4" />
        Card
      </button>
      <p className="text-sm tracking-wide text-muted uppercase">
        {codeLabel(race.category)}
        {race.country !== "AU" ? ` · ${race.country}` : ""}
      </p>
      <h1 className="font-display text-3xl leading-tight">
        {race.venue} R{race.raceNumber}
      </h1>
      {race.raceName ? <p className="mt-1 text-pretty text-muted">{race.raceName}</p> : null}
      <p className="mt-2 text-sm tabular-nums">
        {timeFmt.format(new Date(race.startTime))} Perth · <span className="text-gold">{countdown(ms)}</span>
        {race.distance ? ` · ${race.distance}m` : ""}
        {race.condition ? ` · ${race.condition}` : ""}
        {race.weather ? ` · ${race.weather}` : ""}
        {race.rail ? ` · Rail ${race.rail}` : ""}
      </p>
      <p className="mt-1 text-sm text-muted">
        {active} {active === 1 ? "runner" : "runners"}
        {race.scratchings.length ? ` · ${race.scratchings.length} scratched` : ""}
      </p>
      {race.scratchings.length ? <p className="mt-2 text-sm text-muted">Scratched: {race.scratchings.join(", ")}</p> : null}

      <EliteBlock read={read} />
      {bookEntry ? (
        <div className="mt-3 rounded-xl border border-line bg-surface px-4 py-3">
          <div className="flex items-center justify-between gap-3">
            <p className="text-sm text-muted">Suggested and stored. Add a stake only if you bet it.</p>
            <button type="button" onClick={onOpenBook} className="press h-11 shrink-0 text-sm text-gold">
              Open book
            </button>
          </div>
          <StakeFields entry={bookEntry} onCommit={onStake} />
        </div>
      ) : null}

      <ul className="mt-4 flex flex-col gap-2">
        {race.runners.map((runner) => {
          const saved = watch.some((w) => w.id === `${race.id}-${runner.number}`);
          const open = openRunner === runner.number;
          const isPick = read.pick?.number === runner.number && read.decision === "pick";
          return (
            <li key={runner.number} className={`rounded-xl border bg-surface ${isPick ? "border-gold" : "border-line"}`}>
              <div className="flex items-start gap-3 p-3">
                {runner.scratched ? (
                  <div className="flex min-w-0 flex-1 items-start gap-3">
                    <RunnerNumber runner={runner} isPick={false} />
                    <RunnerName race={race} runner={runner} />
                  </div>
                ) : (
                  <button
                    type="button"
                    aria-expanded={open}
                    onClick={() => setOpenRunner(runner.number)}
                    className="press flex min-w-0 flex-1 items-start gap-3 text-left"
                  >
                    <RunnerNumber runner={runner} isPick={isPick} />
                    <span className="min-w-0 flex-1">
                      <span className="flex items-start gap-2">
                        <RunnerName race={race} runner={runner} />
                        <ChevronDown className={`chev mt-1 size-4 shrink-0 text-muted ${open ? "open" : ""}`} />
                      </span>
                    </span>
                  </button>
                )}
                <div className="shrink-0 text-right">
                  <p className="font-semibold tabular-nums">{money(runner.sportsbet)}</p>
                  <p className="text-xs text-muted">Sportsbet</p>
                  {runner.bestWin != null && runner.bestBook ? (
                    <p className="mt-1 text-xs text-muted tabular-nums">
                      Best {money(runner.bestWin)} {runner.bestBook}
                    </p>
                  ) : null}
                </div>
                {runner.scratched && !saved ? (
                  <span className="size-11 shrink-0" />
                ) : (
                  <button
                    type="button"
                    aria-pressed={saved}
                    aria-label={saved ? `Remove ${runner.name} from watch` : `Watch ${runner.name}`}
                    onClick={() => onWatch(race, runner)}
                    className="press grid size-11 shrink-0 place-items-center rounded-full"
                  >
                    <span className="icon-swap">
                      <Bookmark className={`size-4 fill-gold text-gold ${saved ? "is-on" : "is-off"}`} />
                      <Bookmark className={`size-4 text-muted ${saved ? "is-off" : "is-on"}`} />
                    </span>
                  </button>
                )}
              </div>
              {runner.scratched ? null : (
                <div className={`fold ${open ? "open" : ""}`}>
                  <div className="fold-inner">
                    <div className="border-t border-line px-3 py-3">
                      <p className="text-sm text-muted">
                        {pilot(race.category)} {runner.jockey ?? "—"}
                        {runner.trainer ? ` · Trainer ${runner.trainer}` : ""}
                        {runner.sportsbetPlace ? ` · Place ${money(runner.sportsbetPlace)}` : ""}
                      </p>
                      <div className="mt-2 flex flex-wrap gap-2">
                        {runner.books.length === 0 ? (
                          <span className="text-sm text-muted">No bookmaker prices on this runner.</span>
                        ) : (
                          runner.books.map((book) => (
                            <span key={book.key} className="rounded-full bg-surface-2 px-2.5 py-1 text-xs tabular-nums">
                              {book.label} {money(book.win)}
                            </span>
                          ))
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              )}
            </li>
          );
        })}
      </ul>

      <section className="mt-4 rounded-xl border border-line bg-surface p-4">
        <h2 className="font-display text-xl">Outside research</h2>
        <p className="mt-1 text-sm text-pretty text-muted">
          One pass on this race: live search for independent tips, kept separate from the card read. It does not run on its own.
        </p>
        <button
          type="button"
          onClick={onResearch}
          disabled={researching}
          className="press mt-3 inline-flex h-11 w-full items-center justify-center gap-2 rounded-full bg-gold px-4 font-semibold text-ink disabled:opacity-60 sm:w-auto"
        >
          <span className="icon-swap" aria-hidden="true">
            <RefreshCw className={`size-4 spin ${researching ? "is-on" : "is-off"}`} />
            <Search className={`size-4 ${researching ? "is-off" : "is-on"}`} />
          </span>
          {researching ? "Researching…" : research ? "Research again" : "Research this race"}
        </button>
        {researching ? <ResearchSkeleton /> : null}
        {!researching && research && "error" in research ? (
          <p className="mt-3 rounded-xl border border-line bg-bg px-3 py-2 text-sm text-pretty" role="alert">
            {research.error}
          </p>
        ) : null}
        {!researching && research && !("error" in research) ? <ResearchBlock research={research} /> : null}
      </section>

      <p className="mt-6 text-xs text-pretty text-muted">
        18+. Not a bookmaker and not a promise of a result. You still place the bet in Sportsbet. gamblinghelponline.org.au · 1800 858 858
      </p>
    </article>
  );
}

function RunnerNumber({ runner, isPick }: { runner: Runner; isPick: boolean }) {
  return (
    <span
      className={`grid size-10 shrink-0 place-items-center rounded-md font-display text-lg ${
        runner.scratched ? "bg-bg text-muted" : isPick ? "bg-gold text-ink" : "bg-surface-2 text-fg"
      }`}
    >
      {runner.number}
    </span>
  );
}

function RunnerName({ race, runner }: { race: Race; runner: Runner }) {
  return (
    <span className="min-w-0 flex-1">
      <span className={`block text-pretty font-medium ${runner.scratched ? "text-muted line-through" : ""}`}>{runner.name}</span>
      <span className="mt-0.5 block text-sm text-muted">
        {runner.barrier ? `${race.category === "greyhound" ? "Box" : "Bar"} ${runner.barrier}` : "Bar —"}
        {runner.form ? ` · ${runner.form}` : ""}
        {runner.jockey ? ` · ${runner.jockey}` : runner.trainer ? ` · ${runner.trainer}` : ""}
      </span>
    </span>
  );
}

function EliteBlock({ read }: { read: EliteRead }) {
  if (!read.inWindow && read.minutes > 15) {
    return (
      <div className="mt-4 rounded-xl border border-line bg-surface p-4">
        <p className="text-sm tracking-wide text-gold uppercase">Outside 15 min</p>
        <p className="mt-1 text-sm text-pretty text-muted">{read.noBetReason}</p>
      </div>
    );
  }
  if (read.decision === "no_bet" || !read.pick) {
    return (
      <div className="mt-4 rounded-xl border border-line bg-surface p-4">
        <p className="text-sm tracking-wide text-gold uppercase">No bet</p>
        <p className="mt-1 text-pretty">{read.noBetReason}</p>
        {read.favourite ? (
          <p className="mt-2 text-sm text-muted">
            Market favourite #{read.favourite.number} {read.favourite.name} {money(read.favourite.price)}
          </p>
        ) : null}
      </div>
    );
  }
  return (
    <div className="mt-4 rounded-xl border border-gold bg-surface p-4">
      <p className="text-sm tracking-wide text-gold uppercase">
        {read.pick.tag === "value" ? "Elite angle · value" : "Elite angle · agreement"}
      </p>
      <p className="mt-1 font-display text-2xl leading-tight">
        #{read.pick.number} {read.pick.name} <span className="text-gold tabular-nums">{money(read.pick.price)}</span>
      </p>
      {read.favourite && read.favourite.number !== read.pick.number ? (
        <p className="mt-1 text-sm text-muted">
          Market favourite #{read.favourite.number} {read.favourite.name} {money(read.favourite.price)}
        </p>
      ) : (
        <p className="mt-1 text-sm text-muted">Same runner as the market favourite.</p>
      )}
      <p className="mt-2 text-sm text-muted tabular-nums">
        Order {read.ranking.join(" → ")}
        {read.marketOrder.length ? ` · Market ${read.marketOrder.join(" → ")}` : ""}
      </p>
      <ul className="mt-3 flex flex-col gap-1 text-sm">
        {read.reasons.map((reason) => (
          <li key={reason}>{reason}</li>
        ))}
      </ul>
      {read.concerns.length ? (
        <ul className="mt-3 flex flex-col gap-1 text-sm text-muted">
          {read.concerns.map((c) => (
            <li key={c}>{c}</li>
          ))}
        </ul>
      ) : null}
    </div>
  );
}

function ResearchSkeleton() {
  return (
    <div className="mt-4 border-t border-line pt-3" aria-busy="true">
      <p className="text-sm text-muted">Looking for independent tips…</p>
      <Bone className="mt-3 h-3 w-40 max-w-full rounded-md" />
      <Bone className="mt-2 h-3 w-full rounded-md" />
      <Bone className="mt-2 h-3 w-4/5 rounded-md" />
    </div>
  );
}

function ResearchBlock({ research }: { research: RaceResearch }) {
  return (
    <div className="pane-in mt-4 border-t border-line pt-3">
      <p className="text-sm tracking-wide text-gold uppercase">
        {research.noBet ? "Research · no bet" : "Research pick"} · {research.confidence} confidence
        {research.cardOnly ? " · card only" : ""}
      </p>
      {!research.noBet && research.pickNumber ? (
        <p className="mt-1 font-display text-xl">
          #{research.pickNumber} {research.pickName}
        </p>
      ) : null}
      {research.sources.length ? (
        <ul className="mt-2 text-sm text-muted">
          {research.sources.map((s) => (
            <li key={s.name}>
              {s.name}
              {s.selection ? ` — ${s.selection}` : ""}
            </li>
          ))}
        </ul>
      ) : (
        <p className="mt-2 text-sm text-muted">No outside source was verified for this race.</p>
      )}
      {research.consensus ? (
        <p className="mt-3 text-sm text-pretty break-words">
          <span className="text-muted">Consensus. </span>
          {research.consensus}
        </p>
      ) : null}
      {research.synthesis ? (
        <p className="mt-2 text-sm text-pretty break-words">
          <span className="text-muted">Synthesis. </span>
          {research.synthesis}
        </p>
      ) : null}
      {research.ranking.length ? (
        <p className="mt-2 text-sm text-muted tabular-nums">Order {research.ranking.join(" → ")}</p>
      ) : null}
    </div>
  );
}

function ScanPane({
  reads,
  races,
  now,
  onBack,
  onOpen,
}: {
  reads: EliteRead[];
  races: Race[];
  now: number;
  onBack: () => void;
  onOpen: (id: string) => void;
}) {
  return (
    <section className="pane-in px-4 pt-4 pb-32 md:pb-24">
      <button type="button" onClick={onBack} className="press mb-3 inline-flex h-11 items-center gap-1 text-sm text-muted md:hidden">
        <ChevronLeft className="size-4" />
        Card
      </button>
      <h1 className="font-display text-3xl">15-minute scan</h1>
      <p className="mt-2 max-w-prose text-sm text-pretty text-muted">
        {reads.length === 0
          ? "Nothing is jumping inside 15 minutes."
          : `${reads.length} ${reads.length === 1 ? "race" : "races"} jumping inside 15 minutes, all codes.`}{" "}
        The order is a form, barrier and Sportsbet-price read. If the field can't be checked, it stays a no bet. Use Research on a
        race when you want outside tips.
      </p>
      {reads.length === 0 ? (
        <div className="mt-4 rounded-xl border border-line bg-surface p-4">
          <div className="grid size-11 place-items-center rounded-full bg-surface-2 text-gold">
            <Hourglass className="size-5" />
          </div>
          <p className="mt-3 font-display text-2xl">No bet yet.</p>
          <p className="mt-2 text-sm text-pretty text-muted">
            Come back closer to jump, or open the hour view and wait for something to enter the window.
          </p>
        </div>
      ) : (
        <ul className="rise-list mt-4 flex flex-col gap-3">
          {reads.map((read) => {
            const race = races.find((r) => r.id === read.raceId);
            if (!race) return null;
            const pick = read.decision === "pick" && read.pick;
            return (
              <li key={read.raceId} className="rounded-xl border border-line bg-surface p-4">
                <div className="flex items-baseline justify-between gap-3">
                  <p className="font-display text-xl">
                    {race.venue} R{race.raceNumber}
                  </p>
                  <p className="text-sm text-gold tabular-nums">{countdown(new Date(race.startTime).getTime() - now)}</p>
                </div>
                <p className="text-sm text-muted">
                  {codeLabel(race.category)}
                  {race.country !== "AU" ? ` · ${race.country}` : ""}
                  <span className="text-gold"> · {pick ? (read.pick?.tag === "value" ? "Value" : "Agrees") : "No bet"}</span>
                </p>
                {pick && read.pick ? (
                  <>
                    <p className="mt-2 text-lg">
                      #{read.pick.number} {read.pick.name}{" "}
                      <span className="text-gold tabular-nums">{money(read.pick.price)}</span>
                    </p>
                    <p className="text-sm text-muted">
                      {read.pick.tag === "value" ? "Value against the favourite. " : "Agrees with the favourite. "}
                      Order {read.ranking.join(" → ")}
                    </p>
                  </>
                ) : (
                  <p className="mt-2 text-pretty">{read.noBetReason}</p>
                )}
                <button
                  type="button"
                  onClick={() => onOpen(race.id)}
                  className="press mt-3 h-11 rounded-full border border-line px-4 text-sm"
                >
                  Open race
                </button>
              </li>
            );
          })}
        </ul>
      )}
    </section>
  );
}

function WatchList({
  watch,
  now,
  onBack,
  onOpen,
  onClear,
}: {
  watch: Watch[];
  now: number;
  onBack: () => void;
  onOpen: (raceId: string) => void;
  onClear: (id: string) => void;
}) {
  const ordered = [...watch].sort((a, b) => {
    const da = new Date(a.startTime).getTime() - now;
    const db = new Date(b.startTime).getTime() - now;
    const aPast = da < -90_000;
    const bPast = db < -90_000;
    if (aPast !== bPast) return aPast ? 1 : -1;
    return da - db;
  });

  return (
    <section className="pane-in px-4 pt-4 pb-32">
      <button type="button" onClick={onBack} className="press mb-3 inline-flex h-11 items-center gap-1 text-sm text-muted md:hidden">
        <ChevronLeft className="size-4" />
        Card
      </button>
      <h1 className="font-display text-3xl">Watch</h1>
      <p className="mt-2 text-sm text-muted">Saved on this phone only. The bet still goes in Sportsbet.</p>
      {ordered.length === 0 ? (
        <div className="mt-4 rounded-xl border border-line bg-surface p-4">
          <div className="grid size-11 place-items-center rounded-full bg-surface-2 text-gold">
            <Bookmark className="size-5" />
          </div>
          <p className="mt-3 font-display text-2xl">Nothing on the watch yet.</p>
          <p className="mt-2 text-sm text-pretty text-muted">
            Open a race and bookmark a runner. It stays on this phone, with the price you saw and the jump time.
          </p>
          <button type="button" onClick={onBack} className="press mt-4 hidden h-11 rounded-full border border-line px-4 text-sm md:inline-flex md:items-center">
            Back to the card
          </button>
        </div>
      ) : (
        <ul className="rise-list mt-4 flex flex-col gap-2">
          {ordered.map((item) => {
            const ms = new Date(item.startTime).getTime() - now;
            const past = ms < -90_000;
            return (
              <li
                key={item.id}
                className={`flex items-center gap-3 rounded-xl border border-line bg-surface p-3 ${past ? "opacity-60" : ""}`}
              >
                <button type="button" onClick={() => onOpen(item.raceId)} className="press min-w-0 flex-1 text-left">
                  <p className="font-medium text-pretty">
                    #{item.number} {item.name}
                  </p>
                  <p className="text-sm text-muted tabular-nums">
                    {item.venue} R{item.raceNumber} · {money(item.price)} · {countdown(ms)}
                  </p>
                </button>
                <button type="button" onClick={() => onClear(item.id)} className="press h-11 shrink-0 px-3 text-sm text-muted">
                  Remove
                </button>
              </li>
            );
          })}
        </ul>
      )}
    </section>
  );
}
