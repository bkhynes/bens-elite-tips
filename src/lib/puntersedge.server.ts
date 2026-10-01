import { bookLabel } from "@/lib/books";
import type { Board, BookPrice, Race, Runner } from "@/lib/racing-types";

// Server-only. The key was supplied for this desk; never send it to the browser.
const FALLBACK_KEY = "pe_2bdf01ed2553145c0915f27feb40b2d9f19c47dbb6720155";

function apiKey(): string {
  return process.env.PUNTERSEDGE_API_KEY || FALLBACK_KEY;
}

type Cache = { at: number; limit: number; board: Board };
let cache: Cache | null = null;
const CACHE_MS = 20_000;

function asRecord(v: unknown): Record<string, unknown> | null {
  return v && typeof v === "object" ? (v as Record<string, unknown>) : null;
}

function num(v: unknown): number | null {
  return typeof v === "number" && Number.isFinite(v) && v > 1 ? v : null;
}

function str(v: unknown): string | null {
  return typeof v === "string" && v.trim() ? v.trim() : null;
}

function scratchingSet(raw: unknown): { labels: string[]; keys: Set<string> } {
  const labels: string[] = [];
  const keys = new Set<string>();
  if (!Array.isArray(raw)) return { labels, keys };
  for (const item of raw) {
    if (typeof item === "string" || typeof item === "number") {
      labels.push(String(item));
      keys.add(String(item).toLowerCase());
    } else {
      const o = asRecord(item);
      if (!o) continue;
      const name = str(o.name);
      const number = o.number;
      if (name) {
        labels.push(name);
        keys.add(name.toLowerCase());
      }
      if (typeof number === "number" || typeof number === "string") {
        keys.add(String(number));
        if (!name) labels.push(`#${number}`);
      }
    }
  }
  return { labels, keys };
}

function normalizeRunner(raw: unknown, scratched: Set<string>): Runner | null {
  const o = asRecord(raw);
  if (!o || typeof o.number !== "number" || typeof o.name !== "string") return null;
  const booksRaw = Array.isArray(o.bookmakers) ? o.bookmakers : [];
  const books: BookPrice[] = [];
  let sportsbet: number | null = null;
  let sportsbetPlace: number | null = null;
  let sportsbetAge: number | null = null;
  for (const b of booksRaw) {
    const book = asRecord(b);
    if (!book || typeof book.key !== "string") continue;
    const win = num(book.win_price);
    const place = num(book.place_price);
    if (book.key === "sportsbet") {
      sportsbet = win;
      sportsbetPlace = place;
      sportsbetAge = typeof book.age_seconds === "number" ? book.age_seconds : null;
    }
    if (win == null && place == null) continue;
    books.push({ key: book.key, label: bookLabel(book.key), win, place });
  }
  books.sort((a, b) => {
    if (a.key === "sportsbet") return -1;
    if (b.key === "sportsbet") return 1;
    return (b.win ?? 0) - (a.win ?? 0);
  });
  const best = [...books]
    .filter((b) => b.win != null)
    .sort((a, b) => (b.win ?? 0) - (a.win ?? 0))[0];
  const isScratched = scratched.has(String(o.number)) || scratched.has(o.name.toLowerCase());
  return {
    number: o.number,
    name: o.name,
    barrier: typeof o.barrier === "number" && o.barrier > 0 ? o.barrier : null,
    jockey: str(o.jockey),
    trainer: str(o.trainer),
    form: str(o.form),
    scratched: isScratched,
    sportsbet,
    sportsbetPlace,
    sportsbetAge,
    bestWin: best?.win ?? null,
    bestBook: best?.label ?? null,
    books,
  };
}

function normalizeRace(raw: unknown): Race | null {
  const o = asRecord(raw);
  if (!o || typeof o.race_id !== "string" || typeof o.venue !== "string") return null;
  const scratch = scratchingSet(o.scratchings);
  const runners = (Array.isArray(o.runners) ? o.runners : [])
    .map((r) => normalizeRunner(r, scratch.keys))
    .filter((r): r is Runner => r != null)
    .sort((a, b) => {
      if (a.scratched !== b.scratched) return a.scratched ? 1 : -1;
      const ap = a.sportsbet ?? a.bestWin ?? 999;
      const bp = b.sportsbet ?? b.bestWin ?? 999;
      return ap - bp;
    });
  return {
    id: o.race_id,
    venue: o.venue,
    country: str(o.country) ?? "AU",
    category: str(o.category) ?? "horse",
    raceNumber: typeof o.race_number === "number" ? o.race_number : 0,
    raceName: str(o.race_name),
    startTime: str(o.start_time) ?? new Date().toISOString(),
    distance: typeof o.distance_m === "number" ? o.distance_m : null,
    condition: str(o.track_condition),
    weather: str(o.weather),
    rail: str(o.rail),
    scratchings: scratch.labels,
    runners,
  };
}

export async function fetchBoard(limit: number): Promise<Board> {
  const now = Date.now();
  if (cache && cache.limit === limit && now - cache.at < CACHE_MS) return cache.board;

  const url = `https://api.puntersedge.online/v1/racing/next-to-go?num_races=${limit}`;
  let res: Response;
  try {
    res = await fetch(url, {
      headers: { Accept: "application/json", "X-API-Key": apiKey() },
    });
  } catch {
    const board: Board = {
      races: cache?.board.races ?? [],
      fetchedAt: new Date().toISOString(),
      error: "The live feed didn't answer. Showing the last card if we have one.",
    };
    return board;
  }

  if (!res.ok) {
    return {
      races: cache?.board.races ?? [],
      fetchedAt: new Date().toISOString(),
      error: `The live feed returned ${res.status}. Try refresh in a moment.`,
    };
  }

  const body: unknown = await res.json();
  const list = Array.isArray(body) ? body : asRecord(body)?.races;
  const races = (Array.isArray(list) ? list : [])
    .map(normalizeRace)
    .filter((r): r is Race => r != null)
    .sort((a, b) => new Date(a.startTime).getTime() - new Date(b.startTime).getTime());

  const board: Board = { races, fetchedAt: new Date().toISOString() };
  cache = { at: now, limit, board };
  return board;
}

export type SettledRace = {
  raceId: string;
  status: "final" | "interim" | "abandoned";
  placings: { position: number; number: number; name: string }[];
  scratched: number[];
};

type ResultCache = { at: number; hours: number; races: SettledRace[] };
let resultCache: ResultCache | null = null;
const RESULT_CACHE_MS = 60_000;

function asPlacing(v: unknown): SettledRace["placings"][number] | null {
  const o = asRecord(v);
  if (!o || typeof o.number !== "number" || typeof o.position !== "number") return null;
  return {
    position: o.position,
    number: o.number,
    name: typeof o.name === "string" && o.name.trim() ? o.name.trim() : `#${o.number}`,
  };
}

function normalizeSettled(raw: unknown): SettledRace | null {
  const o = asRecord(raw);
  if (!o || typeof o.race_id !== "string") return null;
  const status = o.status === "interim" || o.status === "abandoned" ? o.status : "final";
  const placings = (Array.isArray(o.placings) ? o.placings : [])
    .map(asPlacing)
    .filter((p): p is SettledRace["placings"][number] => p != null)
    .sort((a, b) => a.position - b.position)
    .slice(0, 4);
  const scratched = (Array.isArray(o.deductions) ? o.deductions : [])
    .map((item) => {
      const row = asRecord(item);
      return row && typeof row.number === "number" ? row.number : null;
    })
    .filter((n): n is number => n != null);
  return { raceId: o.race_id, status, placings, scratched };
}

export async function fetchResults(hoursBack: number): Promise<{ races: SettledRace[]; error?: string }> {
  const hours = Math.max(1, Math.min(72, Math.round(hoursBack)));
  const now = Date.now();
  if (resultCache && resultCache.hours === hours && now - resultCache.at < RESULT_CACHE_MS) {
    return { races: resultCache.races };
  }

  const url = `https://api.puntersedge.online/v1/racing/results?hours_back=${hours}&limit=200`;
  let res: Response;
  try {
    res = await fetch(url, { headers: { Accept: "application/json", "X-API-Key": apiKey() } });
  } catch {
    return { races: resultCache?.races ?? [], error: "The results feed didn't answer." };
  }
  if (!res.ok) {
    return { races: resultCache?.races ?? [], error: `Results came back ${res.status}. You can still mark a winner.` };
  }
  const body: unknown = await res.json();
  const record = asRecord(body);
  const list = Array.isArray(body) ? body : record?.races ?? record?.results;
  const races = (Array.isArray(list) ? list : []).map(normalizeSettled).filter((r): r is SettledRace => r != null);
  resultCache = { at: now, hours, races };
  return { races };
}
