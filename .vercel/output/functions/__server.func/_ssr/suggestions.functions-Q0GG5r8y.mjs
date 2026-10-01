import { t as createServerFn } from "./ssr.mjs";
import { t as createServerRpc } from "./createServerRpc-A6pJPYTF.mjs";
import { n as asSuggestion } from "./ledger-FF_kf9l1.mjs";
//#region node_modules/.nitro/vite/services/ssr/assets/suggestions.functions-Q0GG5r8y.js
function asJson(v) {
	if (typeof v === "string") try {
		return JSON.parse(v);
	} catch {
		return null;
	}
	return v;
}
function dbl(v) {
	if (typeof v === "number" && Number.isFinite(v)) return v;
	if (typeof v === "string" && v.trim() && Number.isFinite(Number(v))) return Number(v);
	return null;
}
function int(v) {
	const n = dbl(v);
	return n == null ? null : Math.round(n);
}
function rowToSuggestion(row) {
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
		feed: asJson(row.feed)
	});
}
function iso(v) {
	if (v instanceof Date && !Number.isNaN(v.getTime())) return v.toISOString();
	if (typeof v === "string" && v.trim()) {
		const parsed = new Date(v);
		if (!Number.isNaN(parsed.getTime())) return parsed.toISOString();
	}
	return null;
}
function storedFrom(v) {
	const entry = asSuggestion(v);
	if (!entry) return null;
	const start = iso(entry.startTime);
	const logged = iso(entry.loggedAt);
	if (!start || !logged || entry.raceId.length > 80 || entry.pickName.length > 80) return null;
	const { stake: _stake, priceTaken: _price, ...stored } = entry;
	return {
		...stored,
		raceId: entry.raceId.slice(0, 80),
		startTime: start,
		loggedAt: logged,
		venue: entry.venue.slice(0, 80)
	};
}
var listSuggestions_createServerFn_handler = createServerRpc({
	id: "60631ec4d36d089ed9cc17ffbcfb0f147a7c4ccdd41b0c369fff231f1999f611",
	name: "listSuggestions",
	filename: "src/lib/suggestions.functions.ts"
}, (opts) => listSuggestions.__executeServer(opts));
var listSuggestions = createServerFn({ method: "GET" }).handler(listSuggestions_createServerFn_handler, async () => {
	const { getSql } = await import("./db-DtvZhxF0.mjs");
	return (await (await getSql())`
    select race_id, venue, race_number, category, country, start_time, logged_at, tag,
           pick_number, pick_name, price, favourite_number, favourite_name, favourite_price,
           ranking, market_order, reasons, concerns, model, field,
           outcome, result_kind, result_source, winner_number, winner_name, pick_position,
           placings, miss_reason, next_time, feed
    from suggestions
    order by logged_at desc
    limit 400
  `).map(rowToSuggestion).filter((entry) => entry != null);
});
var saveSuggestions_createServerFn_handler = createServerRpc({
	id: "94f38972def90dba4787fd3504ea8405f207867582a83b54f0a04f97bb21d4a8",
	name: "saveSuggestions",
	filename: "src/lib/suggestions.functions.ts"
}, (opts) => saveSuggestions.__executeServer(opts));
var saveSuggestions = createServerFn({ method: "POST" }).validator((input) => {
	const raw = input && typeof input === "object" && "suggestions" in input ? input.suggestions : [];
	return { suggestions: (Array.isArray(raw) ? raw : []).map(storedFrom).filter((entry) => entry != null).slice(0, 40) };
}).handler(saveSuggestions_createServerFn_handler, async ({ data }) => {
	if (!data.suggestions.length) return { saved: 0 };
	const { getSql } = await import("./db-DtvZhxF0.mjs");
	const sql = await getSql();
	let saved = 0;
	for (const entry of data.suggestions) {
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
	return { saved };
});
//#endregion
export { listSuggestions_createServerFn_handler, saveSuggestions_createServerFn_handler };
