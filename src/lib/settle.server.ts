import { awaitingResult, applyFeed, feedFromSettled, toStored, type Suggestion } from "@/lib/ledger";
import { loadStoredSuggestions, saveStoredSuggestions } from "@/lib/suggestions.functions";

export type RecordSnapshot = {
  won: number;
  lost: number;
  pending: number;
  voids: number;
  strike: number | null;
  suggestions: Suggestion[];
};

const globalRef = globalThis as typeof globalThis & { __eliteSettleTimer__?: boolean };
let lastDone = 0;
let inflight: Promise<{ checked: number; updated: number; error?: string }> | null = null;

export function summariseRecord(suggestions: Suggestion[]): RecordSnapshot {
  let won = 0;
  let lost = 0;
  let pending = 0;
  let voids = 0;
  for (const entry of suggestions) {
    if (entry.outcome === "won") won += 1;
    else if (entry.outcome === "lost") lost += 1;
    else if (entry.outcome === "void") voids += 1;
    else pending += 1;
  }
  const decided = won + lost;
  return { won, lost, pending, voids, strike: decided ? won / decided : null, suggestions };
}

export function settlePending(force = false): Promise<{ checked: number; updated: number; error?: string }> {
  if (inflight) return inflight;
  if (!force && Date.now() - lastDone < 90_000) return Promise.resolve({ checked: 0, updated: 0 });
  inflight = runSettle()
    .catch((error: unknown) => ({
      checked: 0,
      updated: 0,
      error: error instanceof Error ? error.message : "Couldn't record results.",
    }))
    .finally(() => {
      inflight = null;
      lastDone = Date.now();
    });
  return inflight;
}

async function runSettle() {
  const stored = await loadStoredSuggestions();
  const now = Date.now();
  const due = stored.filter((entry) => awaitingResult(entry, now));
  if (!due.length) return { checked: 0, updated: 0 };
  const oldest = Math.min(...due.map((entry) => new Date(entry.startTime).getTime()));
  const hoursBack = Math.min(72, Math.max(6, Math.ceil((now - Math.min(oldest, now)) / 3_600_000) + 2));
  const { fetchResults } = await import("@/lib/puntersedge.server");
  const loaded = await fetchResults(hoursBack);
  const byId = new Map(loaded.races.map((race) => [race.raceId, race]));
  const changed = [];
  for (const entry of due) {
    const race = byId.get(entry.raceId);
    if (!race) continue;
    const next = applyFeed(entry, feedFromSettled(entry.pickNumber, race));
    if (next !== entry) changed.push(toStored(next));
  }
  if (changed.length) await saveStoredSuggestions(changed);
  return { checked: due.length, updated: changed.length, error: loaded.error };
}

export function ensureSettler() {
  if (globalRef.__eliteSettleTimer__) return;
  globalRef.__eliteSettleTimer__ = true;
  const tick = () => {
    void settlePending(true);
  };
  setTimeout(tick, 8_000);
  setInterval(tick, 3 * 60_000);
}

export async function syncRecord(force = false): Promise<RecordSnapshot> {
  ensureSettler();
  await settlePending(force);
  return summariseRecord(await loadStoredSuggestions());
}
