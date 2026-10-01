//#region node_modules/.nitro/vite/services/ssr/assets/puntersedge.server-B9biXUnu.js
var BOOK_LABELS = {
	sportsbet: "Sportsbet",
	tab: "TAB",
	tabtouch: "TABtouch",
	neds: "Neds",
	ladbrokes_au: "Ladbrokes",
	unibet: "Unibet",
	betr_au: "Betr",
	pointsbetau: "PointsBet",
	betdeluxe: "BetDeluxe",
	betright: "BetRight",
	palmerbet: "Palmerbet",
	playup: "NextBet",
	betgold: "BetGold",
	boostbet: "BoostBet"
};
function bookLabel(key) {
	return BOOK_LABELS[key] ?? key.replace(/_au$/, "").replace(/^./, (c) => c.toUpperCase());
}
var FALLBACK_KEY = "pe_2bdf01ed2553145c0915f27feb40b2d9f19c47dbb6720155";
function apiKey() {
	return process.env.PUNTERSEDGE_API_KEY || FALLBACK_KEY;
}
var cache = null;
var CACHE_MS = 2e4;
function asRecord(v) {
	return v && typeof v === "object" ? v : null;
}
function num(v) {
	return typeof v === "number" && Number.isFinite(v) && v > 1 ? v : null;
}
function str(v) {
	return typeof v === "string" && v.trim() ? v.trim() : null;
}
function scratchingSet(raw) {
	const labels = [];
	const keys = /* @__PURE__ */ new Set();
	if (!Array.isArray(raw)) return {
		labels,
		keys
	};
	for (const item of raw) if (typeof item === "string" || typeof item === "number") {
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
	return {
		labels,
		keys
	};
}
function normalizeRunner(raw, scratched) {
	const o = asRecord(raw);
	if (!o || typeof o.number !== "number" || typeof o.name !== "string") return null;
	const booksRaw = Array.isArray(o.bookmakers) ? o.bookmakers : [];
	const books = [];
	let sportsbet = null;
	let sportsbetPlace = null;
	let sportsbetAge = null;
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
		books.push({
			key: book.key,
			label: bookLabel(book.key),
			win,
			place
		});
	}
	books.sort((a, b) => {
		if (a.key === "sportsbet") return -1;
		if (b.key === "sportsbet") return 1;
		return (b.win ?? 0) - (a.win ?? 0);
	});
	const best = [...books].filter((b) => b.win != null).sort((a, b) => (b.win ?? 0) - (a.win ?? 0))[0];
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
		books
	};
}
function normalizeRace(raw) {
	const o = asRecord(raw);
	if (!o || typeof o.race_id !== "string" || typeof o.venue !== "string") return null;
	const scratch = scratchingSet(o.scratchings);
	const runners = (Array.isArray(o.runners) ? o.runners : []).map((r) => normalizeRunner(r, scratch.keys)).filter((r) => r != null).sort((a, b) => {
		if (a.scratched !== b.scratched) return a.scratched ? 1 : -1;
		return (a.sportsbet ?? a.bestWin ?? 999) - (b.sportsbet ?? b.bestWin ?? 999);
	});
	return {
		id: o.race_id,
		venue: o.venue,
		country: str(o.country) ?? "AU",
		category: str(o.category) ?? "horse",
		raceNumber: typeof o.race_number === "number" ? o.race_number : 0,
		raceName: str(o.race_name),
		startTime: str(o.start_time) ?? (/* @__PURE__ */ new Date()).toISOString(),
		distance: typeof o.distance_m === "number" ? o.distance_m : null,
		condition: str(o.track_condition),
		weather: str(o.weather),
		rail: str(o.rail),
		scratchings: scratch.labels,
		runners
	};
}
async function fetchBoard(limit) {
	const now = Date.now();
	if (cache && cache.limit === limit && now - cache.at < CACHE_MS) return cache.board;
	const url = `https://api.puntersedge.online/v1/racing/next-to-go?num_races=${limit}`;
	let res;
	try {
		res = await fetch(url, { headers: {
			Accept: "application/json",
			"X-API-Key": apiKey()
		} });
	} catch {
		return {
			races: cache?.board.races ?? [],
			fetchedAt: (/* @__PURE__ */ new Date()).toISOString(),
			error: "The live feed didn't answer. Showing the last card if we have one."
		};
	}
	if (!res.ok) return {
		races: cache?.board.races ?? [],
		fetchedAt: (/* @__PURE__ */ new Date()).toISOString(),
		error: `The live feed returned ${res.status}. Try refresh in a moment.`
	};
	const body = await res.json();
	const list = Array.isArray(body) ? body : asRecord(body)?.races;
	const board = {
		races: (Array.isArray(list) ? list : []).map(normalizeRace).filter((r) => r != null).sort((a, b) => new Date(a.startTime).getTime() - new Date(b.startTime).getTime()),
		fetchedAt: (/* @__PURE__ */ new Date()).toISOString()
	};
	cache = {
		at: now,
		limit,
		board
	};
	return board;
}
var resultCache = null;
var RESULT_CACHE_MS = 6e4;
function asPlacing(v) {
	const o = asRecord(v);
	if (!o || typeof o.number !== "number" || typeof o.position !== "number") return null;
	return {
		position: o.position,
		number: o.number,
		name: typeof o.name === "string" && o.name.trim() ? o.name.trim() : `#${o.number}`
	};
}
function normalizeSettled(raw) {
	const o = asRecord(raw);
	if (!o || typeof o.race_id !== "string") return null;
	const status = o.status === "interim" || o.status === "abandoned" ? o.status : "final";
	const placings = (Array.isArray(o.placings) ? o.placings : []).map(asPlacing).filter((p) => p != null).sort((a, b) => a.position - b.position).slice(0, 4);
	const scratched = (Array.isArray(o.deductions) ? o.deductions : []).map((item) => {
		const row = asRecord(item);
		return row && typeof row.number === "number" ? row.number : null;
	}).filter((n) => n != null);
	return {
		raceId: o.race_id,
		status,
		placings,
		scratched
	};
}
async function fetchResults(hoursBack) {
	const hours = Math.max(1, Math.min(72, Math.round(hoursBack)));
	const now = Date.now();
	if (resultCache && resultCache.hours === hours && now - resultCache.at < RESULT_CACHE_MS) return { races: resultCache.races };
	const url = `https://api.puntersedge.online/v1/racing/results?hours_back=${hours}&limit=200`;
	let res;
	try {
		res = await fetch(url, { headers: {
			Accept: "application/json",
			"X-API-Key": apiKey()
		} });
	} catch {
		return {
			races: resultCache?.races ?? [],
			error: "The results feed didn't answer."
		};
	}
	if (!res.ok) return {
		races: resultCache?.races ?? [],
		error: `Results came back ${res.status}. You can still mark a winner.`
	};
	const body = await res.json();
	const record = asRecord(body);
	const list = Array.isArray(body) ? body : record?.races ?? record?.results;
	const races = (Array.isArray(list) ? list : []).map(normalizeSettled).filter((r) => r != null);
	resultCache = {
		at: now,
		hours,
		races
	};
	return { races };
}
//#endregion
export { fetchBoard, fetchResults };
