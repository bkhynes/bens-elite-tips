import type { Race } from "@/lib/racing-types";
import type { EliteRead, ModelNote } from "@/lib/elite-model";
import { reviewTip, type LessonCode } from "@/lib/lessons";

export type Outcome = "pending" | "won" | "lost" | "void";

export type Placing = { position: number; number: number; name: string };

export type FeedResult = {
  status: "interim" | "final" | "abandoned";
  winnerNumber: number | null;
  winnerName: string | null;
  pickPosition: number | null;
  placings: Placing[];
  scratched: number[];
};

export type Suggestion = {
  raceId: string;
  venue: string;
  raceNumber: number;
  category: string;
  country: string;
  startTime: string;
  loggedAt: string;
  tag: "agreement" | "value";
  pickNumber: number;
  pickName: string;
  price: number | null;
  favouriteNumber: number | null;
  favouriteName: string | null;
  favouritePrice: number | null;
  ranking: number[];
  marketOrder: number[];
  reasons: string[];
  concerns: string[];
  model: ModelNote | null;
  field: { number: number; name: string }[];
  stake: number | null;
  priceTaken: number | null;
  outcome: Outcome;
  resultKind: "interim" | "final" | null;
  resultSource: "feed" | "manual" | null;
  winnerNumber: number | null;
  winnerName: string | null;
  pickPosition: number | null;
  placings: Placing[];
  missReason: string | null;
  nextTime: string | null;
  lessonCode: LessonCode | null;
  resultNote: string | null;
  feed: FeedResult | null;
};

export type PhaseSummary = {
  calls: number;
  pending: number;
  won: number;
  lost: number;
  voids: number;
  hitRate: number | null;
  marked: number;
  bets: number;
  betsWon: number;
  betsLost: number;
  staked: number;
  profit: number;
};

const LEDGER_MAX = 400;
const LEDGER_KEY = "elite-tips-ledger";
const PHASE_KEY = "elite-tips-phase";

function num(v: unknown): number | null {
  return typeof v === "number" && Number.isFinite(v) ? v : null;
}

function str(v: unknown): string | null {
  return typeof v === "string" && v.trim() ? v.trim() : null;
}

function placing(v: unknown): Placing | null {
  if (!v || typeof v !== "object") return null;
  const o = v as Record<string, unknown>;
  if (typeof o.number !== "number" || typeof o.position !== "number") return null;
  return { position: o.position, number: o.number, name: typeof o.name === "string" ? o.name : `#${o.number}` };
}

function asModel(v: unknown): ModelNote | null {
  if (!v || typeof v !== "object") return null;
  const o = v as Record<string, unknown>;
  const form = num(o.form);
  const fair = num(o.fair);
  const composite = num(o.composite);
  const barrier = num(o.barrier);
  const margin = num(o.margin);
  if (form == null || fair == null || composite == null || barrier == null || margin == null) return null;
  if (typeof o.secondNumber !== "number" || typeof o.secondName !== "string" || !o.secondName.trim()) return null;
  return { form, fair, composite, barrier, margin, secondNumber: o.secondNumber, secondName: o.secondName };
}

export function asSuggestion(v: unknown): Suggestion | null {
  if (!v || typeof v !== "object") return null;
  const o = v as Record<string, unknown>;
  if (typeof o.raceId !== "string" || typeof o.pickNumber !== "number" || typeof o.pickName !== "string") return null;
  const tag = o.tag === "value" ? "value" : "agreement";
  const outcome: Outcome =
    o.outcome === "won" || o.outcome === "lost" || o.outcome === "void" ? o.outcome : "pending";
  const placings = Array.isArray(o.placings) ? o.placings.map(placing).filter((p): p is Placing => p != null) : [];
  const field = Array.isArray(o.field)
    ? o.field
        .map((row) => {
          if (!row || typeof row !== "object") return null;
          const r = row as Record<string, unknown>;
          if (typeof r.number !== "number" || typeof r.name !== "string") return null;
          return { number: r.number, name: r.name };
        })
        .filter((r): r is { number: number; name: string } => r != null)
    : [];
  let feed: FeedResult | null = null;
  if (o.feed && typeof o.feed === "object") {
    const f = o.feed as Record<string, unknown>;
    const status = f.status === "interim" || f.status === "abandoned" ? f.status : f.status === "final" ? "final" : null;
    if (status) {
      feed = {
        status,
        winnerNumber: num(f.winnerNumber),
        winnerName: str(f.winnerName),
        pickPosition: num(f.pickPosition),
        placings: Array.isArray(f.placings) ? f.placings.map(placing).filter((p): p is Placing => p != null) : [],
        scratched: Array.isArray(f.scratched) ? f.scratched.filter((n): n is number => typeof n === "number") : [],
      };
    }
  }
  return {
    raceId: o.raceId,
    venue: typeof o.venue === "string" ? o.venue : "Race",
    raceNumber: typeof o.raceNumber === "number" ? o.raceNumber : 0,
    category: typeof o.category === "string" ? o.category : "horse",
    country: typeof o.country === "string" ? o.country : "AU",
    startTime: typeof o.startTime === "string" ? o.startTime : new Date().toISOString(),
    loggedAt: typeof o.loggedAt === "string" ? o.loggedAt : new Date().toISOString(),
    tag,
    pickNumber: o.pickNumber,
    pickName: o.pickName,
    price: num(o.price),
    favouriteNumber: num(o.favouriteNumber),
    favouriteName: str(o.favouriteName),
    favouritePrice: num(o.favouritePrice),
    ranking: Array.isArray(o.ranking) ? o.ranking.filter((n): n is number => typeof n === "number").slice(0, 6) : [],
    marketOrder: Array.isArray(o.marketOrder) ? o.marketOrder.filter((n): n is number => typeof n === "number").slice(0, 6) : [],
    reasons: Array.isArray(o.reasons) ? o.reasons.filter((s): s is string => typeof s === "string").slice(0, 4) : [],
    concerns: Array.isArray(o.concerns) ? o.concerns.filter((s): s is string => typeof s === "string").slice(0, 3) : [],
    model: asModel(o.model),
    field,
    stake: num(o.stake),
    priceTaken: num(o.priceTaken),
    outcome,
    resultKind: o.resultKind === "interim" || o.resultKind === "final" ? o.resultKind : null,
    resultSource: o.resultSource === "feed" || o.resultSource === "manual" ? o.resultSource : null,
    winnerNumber: num(o.winnerNumber),
    winnerName: str(o.winnerName),
    pickPosition: num(o.pickPosition),
    placings,
    missReason: str(o.missReason),
    nextTime: str(o.nextTime),
    lessonCode:
      o.lessonCode === "won" ||
      o.lessonCode === "placed" ||
      o.lessonCode === "short_agreement" ||
      o.lessonCode === "value_vs_favourite" ||
      o.lessonCode === "agreement_lost" ||
      o.lessonCode === "missed_winner" ||
      o.lessonCode === "close_card" ||
      o.lessonCode === "unclassified"
        ? o.lessonCode
        : null,
    resultNote: str(o.resultNote),
    feed,
  };
}

export function loadLedger(): Suggestion[] {
  try {
    const raw = localStorage.getItem(LEDGER_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw) as unknown;
    if (!Array.isArray(parsed)) return [];
    return parsed.map(asSuggestion).filter((s): s is Suggestion => s != null).slice(0, LEDGER_MAX);
  } catch {
    return [];
  }
}

export function saveLedger(entries: Suggestion[]) {
  localStorage.setItem(LEDGER_KEY, JSON.stringify(entries.slice(0, LEDGER_MAX)));
}

export function loadPhase(entries: Suggestion[]): string {
  try {
    const raw = localStorage.getItem(PHASE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw) as { startedAt?: unknown };
      if (typeof parsed.startedAt === "string") return parsed.startedAt;
    }
  } catch {
    /* fresh phase */
  }
  const startedAt = entries.reduce<string | null>((earliest, entry) => {
    if (!earliest || entry.loggedAt < earliest) return entry.loggedAt;
    return earliest;
  }, null) ?? new Date().toISOString();
  localStorage.setItem(PHASE_KEY, JSON.stringify({ startedAt }));
  return startedAt;
}

export function savePhase(startedAt: string) {
  localStorage.setItem(PHASE_KEY, JSON.stringify({ startedAt }));
}

export function capturePicks(entries: Suggestion[], races: Race[], reads: EliteRead[], loggedAt: string): Suggestion[] {
  let next = entries;
  for (const read of reads) {
    if (read.decision !== "pick" || !read.pick || !read.inWindow) continue;
    const existing = next.find((entry) => entry.raceId === read.raceId);
    if (existing) {
      if (!existing.model && read.model && existing.pickNumber === read.pick.number) {
        next = next.map((entry) => (entry.raceId === read.raceId ? { ...entry, model: read.model } : entry));
      }
      continue;
    }
    const race = races.find((item) => item.id === read.raceId);
    if (!race) continue;
    const suggestion: Suggestion = {
      raceId: race.id,
      venue: race.venue,
      raceNumber: race.raceNumber,
      category: race.category,
      country: race.country,
      startTime: race.startTime,
      loggedAt,
      tag: read.pick.tag,
      pickNumber: read.pick.number,
      pickName: read.pick.name,
      price: read.pick.price,
      favouriteNumber: read.favourite?.number ?? null,
      favouriteName: read.favourite?.name ?? null,
      favouritePrice: read.favourite?.price ?? null,
      ranking: read.ranking.slice(0, 4),
      marketOrder: read.marketOrder.slice(0, 4),
      reasons: read.reasons.slice(0, 4),
      concerns: read.concerns.slice(0, 3),
      model: read.model,
      field: race.runners.map((runner) => ({ number: runner.number, name: runner.name })),
      stake: null,
      priceTaken: null,
      outcome: "pending",
      resultKind: null,
      resultSource: null,
      winnerNumber: null,
      winnerName: null,
      pickPosition: null,
      placings: [],
      missReason: null,
      nextTime: null,
      lessonCode: null,
      resultNote: null,
      feed: null,
    };
    next = [suggestion, ...next].slice(0, LEDGER_MAX);
  }
  return next;
}

function settle(entry: Suggestion, feed: FeedResult, source: "feed" | "manual", manualNumber?: number): Suggestion {
  if (feed.status === "abandoned" && source === "feed") {
    return {
      ...entry,
      feed,
      outcome: "void",
      resultKind: "final",
      resultSource: "feed",
      winnerNumber: null,
      winnerName: null,
      pickPosition: null,
      placings: feed.placings,
      missReason: null,
      nextTime: null,
    };
  }

  const winnerNumber = source === "manual" ? (manualNumber ?? null) : feed.winnerNumber;
  const fromField = entry.field.find((runner) => runner.number === winnerNumber);
  const fromPlacing = feed.placings.find((p) => p.number === winnerNumber);
  const winnerName = source === "manual" ? (fromField?.name ?? fromPlacing?.name ?? null) : feed.winnerName;
  const scratched = feed.scratched.includes(entry.pickNumber);
  const pickPosition =
    source === "manual"
      ? winnerNumber === entry.pickNumber
        ? 1
        : null
      : feed.pickPosition;
  const winners = feed.placings.filter((p) => p.position === 1).map((p) => p.number);
  const won = source === "manual" ? winnerNumber === entry.pickNumber : winners.includes(entry.pickNumber) || pickPosition === 1;

  if (scratched && source === "feed") {
    return {
      ...entry,
      feed,
      outcome: "void",
      resultKind: feed.status === "interim" ? "interim" : "final",
      resultSource: "feed",
      winnerNumber,
      winnerName,
      pickPosition: null,
      placings: feed.placings,
      missReason: null,
      nextTime: null,
      lessonCode: null,
      resultNote: null,
    };
  }

  if (winnerNumber == null) {
    return { ...entry, feed: source === "feed" ? feed : entry.feed };
  }

  const outcome: Outcome = won ? "won" : "lost";
  const review = reviewTip({
    ...entry,
    outcome,
    winnerNumber,
    winnerName,
    pickPosition,
  });

  return {
    ...entry,
    feed: source === "feed" ? feed : entry.feed ?? feed,
    outcome,
    resultKind: source === "manual" ? "final" : feed.status === "interim" ? "interim" : "final",
    resultSource: source,
    winnerNumber,
    winnerName,
    pickPosition,
    placings: feed.placings.length ? feed.placings : entry.placings,
    missReason: outcome === "lost" ? (review?.resultNote ?? null) : null,
    nextTime: review?.nextTime ?? null,
    lessonCode: review?.lessonCode ?? null,
    resultNote: review?.resultNote ?? null,
  };
}

function sameFeed(a: FeedResult | null, b: FeedResult): boolean {
  if (!a) return false;
  return (
    a.status === b.status &&
    a.winnerNumber === b.winnerNumber &&
    a.pickPosition === b.pickPosition &&
    a.scratched.join(",") === b.scratched.join(",")
  );
}

export function applyFeed(entry: Suggestion, feed: FeedResult): Suggestion {
  if (entry.resultSource === "manual") {
    if (sameFeed(entry.feed, feed)) return entry;
    return { ...entry, feed };
  }
  const next = settle(entry, feed, "feed");
  if (
    entry.outcome === next.outcome &&
    entry.resultKind === next.resultKind &&
    entry.winnerNumber === next.winnerNumber &&
    entry.pickPosition === next.pickPosition &&
    entry.missReason === next.missReason &&
    entry.lessonCode === next.lessonCode &&
    sameFeed(entry.feed, feed)
  ) {
    return entry;
  }
  return next;
}

export function feedFromSettled(
  pickNumber: number,
  race: { status: FeedResult["status"]; placings: Placing[]; scratched: number[] },
): FeedResult {
  const winners = race.placings.filter((placing) => placing.position === 1);
  const ours = race.placings.find((placing) => placing.number === pickNumber);
  return {
    status: race.status,
    winnerNumber: winners[0]?.number ?? null,
    winnerName: winners.map((placing) => placing.name).join(" / ") || null,
    pickPosition: ours?.position ?? null,
    placings: race.placings,
    scratched: race.scratched,
  };
}

export function markWinner(entry: Suggestion, number: number): Suggestion {
  const feed = entry.feed ?? {
    status: "final" as const,
    winnerNumber: number,
    winnerName: null,
    pickPosition: number === entry.pickNumber ? 1 : null,
    placings: [],
    scratched: [],
  };
  return settle(entry, feed, "manual", number);
}

export function clearManual(entry: Suggestion): Suggestion {
  if (!entry.feed || entry.feed.winnerNumber == null && entry.feed.status !== "abandoned") {
    return {
      ...entry,
      outcome: "pending",
      resultKind: null,
      resultSource: null,
      winnerNumber: null,
      winnerName: null,
      pickPosition: null,
      placings: [],
      missReason: null,
      nextTime: null,
      lessonCode: null,
      resultNote: null,
    };
  }
  return settle({ ...entry, resultSource: null }, entry.feed, "feed");
}

export function setStake(entry: Suggestion, stake: number | null, priceTaken: number | null): Suggestion {
  if (stake == null || stake <= 0) return { ...entry, stake: null, priceTaken: null };
  const price = priceTaken != null && priceTaken > 1 ? priceTaken : entry.price;
  return { ...entry, stake, priceTaken: price };
}

export function profitOf(entry: Suggestion): number | null {
  if (entry.stake == null || entry.stake <= 0) return null;
  if (entry.outcome === "pending") return null;
  if (entry.outcome === "void") return 0;
  if (entry.outcome === "lost") return -entry.stake;
  const price = entry.priceTaken ?? entry.price;
  if (price == null || price <= 1) return null;
  return entry.stake * (price - 1);
}

export function summarise(entries: Suggestion[]): PhaseSummary {
  let won = 0;
  let lost = 0;
  let voids = 0;
  let pending = 0;
  let marked = 0;
  let bets = 0;
  let betsWon = 0;
  let betsLost = 0;
  let staked = 0;
  let profit = 0;
  for (const entry of entries) {
    if (entry.outcome === "pending") pending += 1;
    else if (entry.outcome === "won") won += 1;
    else if (entry.outcome === "lost") lost += 1;
    else voids += 1;
    if (entry.stake != null && entry.stake > 0) marked += 1;
    const p = profitOf(entry);
    if (entry.stake != null && entry.stake > 0 && entry.outcome !== "pending") {
      bets += 1;
      staked += entry.stake;
      if (entry.outcome === "won") betsWon += 1;
      if (entry.outcome === "lost") betsLost += 1;
      if (p != null) profit += p;
    }
  }
  const decided = won + lost;
  return {
    calls: entries.length,
    pending,
    won,
    lost,
    voids,
    hitRate: decided ? won / decided : null,
    marked,
    bets,
    betsWon,
    betsLost,
    staked,
    profit,
  };
}

export function signedMoney(n: number): string {
  const abs = Math.abs(n).toFixed(2);
  if (n > 0.004) return `+$${abs}`;
  if (n < -0.004) return `−$${abs}`;
  return "$0.00";
}

const RESULT_WINDOW_MS = 72 * 60 * 60 * 1000;

export function awaitingResult(entry: Suggestion, now: number): boolean {
  const start = new Date(entry.startTime).getTime();
  if (!Number.isFinite(start)) return false;
  return (
    (entry.outcome === "pending" || entry.resultKind === "interim") &&
    start < now - 90_000 &&
    start > now - RESULT_WINDOW_MS
  );
}

export type StoredSuggestion = Omit<Suggestion, "stake" | "priceTaken">;

export function toStored(entry: Suggestion): StoredSuggestion {
  const { stake: _stake, priceTaken: _price, ...stored } = entry;
  return stored;
}

export function suggestionStamp(entry: Pick<
  Suggestion,
  "pickNumber" | "price" | "outcome" | "resultKind" | "resultSource" | "winnerNumber" | "pickPosition" | "missReason" | "model"
>): string {
  return [
    entry.pickNumber,
    entry.price ?? "",
    entry.outcome,
    entry.resultKind ?? "",
    entry.resultSource ?? "",
    entry.winnerNumber ?? "",
    entry.pickPosition ?? "",
    entry.missReason ?? "",
    entry.model?.form ?? "",
    entry.model?.fair ?? "",
    entry.model?.secondNumber ?? "",
  ].join("|");
}

function resultRank(entry: Suggestion): number {
  if (entry.resultSource === "manual" && entry.outcome !== "pending") return 3;
  if (entry.resultKind === "final" && entry.outcome !== "pending") return 2;
  if (entry.outcome !== "pending") return 1;
  return 0;
}

export function mergeHistory(local: Suggestion[], remote: Suggestion[]): { entries: Suggestion[]; push: Suggestion[] } {
  const remoteById = new Map(remote.map((entry) => [entry.raceId, entry]));
  const byId = new Map<string, Suggestion>();
  for (const entry of remote) byId.set(entry.raceId, { ...entry, stake: null, priceTaken: null });
  for (const entry of local) {
    const server = byId.get(entry.raceId);
    if (!server) {
      byId.set(entry.raceId, entry);
      continue;
    }
    const stake = { stake: entry.stake, priceTaken: entry.priceTaken };
    const localRank = resultRank(entry);
    const serverRank = resultRank(server);
    const chosen = localRank > serverRank ? entry : server;
    byId.set(entry.raceId, { ...chosen, ...stake, model: chosen.model ?? entry.model ?? server.model });
  }
  const entries = [...byId.values()]
    .sort((a, b) => new Date(b.startTime).getTime() - new Date(a.startTime).getTime())
    .slice(0, LEDGER_MAX);
  const push = entries.filter((entry) => {
    const server = remoteById.get(entry.raceId);
    return !server || suggestionStamp(server) !== suggestionStamp(entry);
  });
  return { entries, push };
}
