import { createServerFn } from "@tanstack/react-start";
import { asSuggestion, type StoredSuggestion, type Suggestion } from "@/lib/ledger";

function asJson(v: unknown): unknown {
  if (typeof v === "string") {
    try {
      return JSON.parse(v) as unknown;
    } catch {
      return null;
    }
  }
  return v;
}

function dbl(v: unknown): number | null {
  if (typeof v === "number" && Number.isFinite(v)) return v;
  if (typeof v === "string" && v.trim() && Number.isFinite(Number(v))) return Number(v);
  return null;
}

function int(v: unknown): number | null {
  const n = dbl(v);
  return n == null ? null : Math.round(n);
}

function rowToSuggestion(row: Record<string, unknown>): Suggestion | null {
  const pickNumber = int(row.pick_number);
  const startTime = iso(row.start_time);
  const loggedAt = iso(row.logged_at);
  if (pickNumber == null || !startTime || !loggedAt) return null;
  return asSuggestion({
    raceId: row.race_id,
    venue: row.venue,
    raceNumber: int(row.race_number) ?? 0,
    category: row.category,
    country: row.country,
    startTime,
    loggedAt,
    tag: row.tag,
    pickNumber,
    pickName: row.pick_name,
    price: dbl(row.price),
    favouriteNumber: int(row.favourite_number),
    favouriteName: row.favourite_name,
    favouritePrice: dbl(row.favourite_price),
    ranking: asJson(row.ranking),
    marketOrder: asJson(row.market_order),
    reasons: asJson(row.reasons),
    concerns: asJson(row.concerns),
    model: asJson(row.model),
    field: asJson(row.field),
    stake: null,
    priceTaken: null,
    outcome: row.outcome,
    resultKind: row.result_kind,
    resultSource: row.result_source,
    winnerNumber: int(row.winner_number),
    winnerName: row.winner_name,
    pickPosition: int(row.pick_position),
    placings: asJson(row.placings),
    missReason: row.miss_reason,
    nextTime: row.next_time,
    feed: asJson(row.feed),
  });
}

function iso(v: unknown): string | null {
  if (v instanceof Date && !Number.isNaN(v.getTime())) return v.toISOString();
  if (typeof v === "string" && v.trim()) {
    const parsed = new Date(v);
    if (!Number.isNaN(parsed.getTime())) return parsed.toISOString();
  }
  return null;
}

function storedFrom(v: unknown): StoredSuggestion | null {
  const entry = asSuggestion(v);
  if (!entry) return null;
  const start = iso(entry.startTime);
  const logged = iso(entry.loggedAt);
  if (!start || !logged || entry.raceId.length > 80 || entry.pickName.length > 80) return null;
  const { stake: _stake, priceTaken: _price, ...stored } = entry;
  return { ...stored, raceId: entry.raceId.slice(0, 80), startTime: start, loggedAt: logged, venue: entry.venue.slice(0, 80) };
}

export async function loadStoredSuggestions(): Promise<Suggestion[]> {
  const { getSql } = await import("@/lib/db");
  const sql = await getSql();
  const rows = await sql<Record<string, unknown>>`
    select race_id, venue, race_number, category, country, start_time, logged_at, tag,
           pick_number, pick_name, price, favourite_number, favourite_name, favourite_price,
           ranking, market_order, reasons, concerns, model, field,
           outcome, result_kind, result_source, winner_number, winner_name, pick_position,
           placings, miss_reason, next_time, feed
    from suggestions
    order by start_time desc
    limit 400
  `;
  return rows.map(rowToSuggestion).filter((entry): entry is Suggestion => entry != null);
}

export async function saveStoredSuggestions(entries: StoredSuggestion[]): Promise<number> {
  if (!entries.length) return 0;
  const { getSql } = await import("@/lib/db");
  const sql = await getSql();
  let saved = 0;
  for (const entry of entries) {
    await sql`
      insert into suggestions (
        race_id, venue, race_number, category, country, start_time, logged_at, tag,
        pick_number, pick_name, price, favourite_number, favourite_name, favourite_price,
        ranking, market_order, reasons, concerns, model, field,
        outcome, result_kind, result_source, winner_number, winner_name, pick_position,
        placings, miss_reason, next_time, feed
      ) values (
        ${entry.raceId}, ${entry.venue}, ${entry.raceNumber}, ${entry.category}, ${entry.country},
        ${entry.startTime}, ${entry.loggedAt}, ${entry.tag},
        ${entry.pickNumber}, ${entry.pickName}, ${entry.price}, ${entry.favouriteNumber}, ${entry.favouriteName}, ${entry.favouritePrice},
        ${JSON.stringify(entry.ranking)}::jsonb, ${JSON.stringify(entry.marketOrder)}::jsonb,
        ${JSON.stringify(entry.reasons)}::jsonb, ${JSON.stringify(entry.concerns)}::jsonb,
        ${entry.model ? JSON.stringify(entry.model) : null}::jsonb, ${JSON.stringify(entry.field)}::jsonb,
        ${entry.outcome}, ${entry.resultKind}, ${entry.resultSource}, ${entry.winnerNumber}, ${entry.winnerName}, ${entry.pickPosition},
        ${JSON.stringify(entry.placings)}::jsonb, ${entry.missReason}, ${entry.nextTime},
        ${entry.feed ? JSON.stringify(entry.feed) : null}::jsonb
      )
      on conflict (race_id) do update set
        outcome = excluded.outcome,
        result_kind = excluded.result_kind,
        result_source = excluded.result_source,
        winner_number = excluded.winner_number,
        winner_name = excluded.winner_name,
        pick_position = excluded.pick_position,
        placings = excluded.placings,
        miss_reason = excluded.miss_reason,
        next_time = excluded.next_time,
        feed = excluded.feed,
        model = coalesce(suggestions.model, excluded.model),
        updated_at = now()
      where (
        suggestions.result_source is distinct from 'manual'
        or excluded.result_source = 'manual'
      )
      and not (
        suggestions.outcome in ('won', 'lost', 'void')
        and coalesce(suggestions.result_kind, '') = 'final'
        and excluded.outcome = 'pending'
      )
    `;
    saved += 1;
  }
  return saved;
}

export const listSuggestions = createServerFn({ method: "GET" }).handler(async () => {
  const { ensureSettler } = await import("@/lib/settle.server");
  ensureSettler();
  return loadStoredSuggestions();
});

export const saveSuggestions = createServerFn({ method: "POST" })
  .validator((input: unknown) => {
    const raw =
      input && typeof input === "object" && "suggestions" in input
        ? (input as { suggestions: unknown }).suggestions
        : [];
    const suggestions = (Array.isArray(raw) ? raw : []).map(storedFrom).filter((entry): entry is StoredSuggestion => entry != null);
    return { suggestions: suggestions.slice(0, 40) };
  })
  .handler(async ({ data }) => {
    const saved = await saveStoredSuggestions(data.suggestions);
    return { saved };
  });
