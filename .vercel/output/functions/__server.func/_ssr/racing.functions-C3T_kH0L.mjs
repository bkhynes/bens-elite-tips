import { t as createServerFn } from "./ssr.mjs";
import { t as createServerRpc } from "./createServerRpc-A6pJPYTF.mjs";
//#region node_modules/.nitro/vite/services/ssr/assets/racing.functions-C3T_kH0L.js
var HOUR_MS = 36e5;
var researchHits = [];
var researchCache = /* @__PURE__ */ new Map();
function pruneHits(now) {
	while (researchHits.length && now - researchHits[0] > HOUR_MS) researchHits.shift();
}
var loadBoard_createServerFn_handler = createServerRpc({
	id: "e9113345a10d831bd14bb553b459dda5355c8e80e17dc79473aa17e064cc83d3",
	name: "loadBoard",
	filename: "src/lib/racing.functions.ts"
}, (opts) => loadBoard.__executeServer(opts));
var loadBoard = createServerFn({ method: "POST" }).validator((input) => {
	const limitRaw = input && typeof input === "object" && "limit" in input ? input.limit : 16;
	return { limit: Math.max(8, Math.min(24, Math.round(typeof limitRaw === "number" && Number.isFinite(limitRaw) ? limitRaw : 16))) };
}).handler(loadBoard_createServerFn_handler, async ({ data }) => {
	const { fetchBoard } = await import("./puntersedge.server-B9biXUnu.mjs");
	return fetchBoard(data.limit);
});
function compactRace(input) {
	if (!input || typeof input !== "object") return null;
	const o = input;
	if (typeof o.id !== "string" || typeof o.venue !== "string") return null;
	if (!Array.isArray(o.runners) || o.runners.length > 24) return null;
	const runners = [];
	for (const raw of o.runners) {
		if (!raw || typeof raw !== "object") continue;
		const r = raw;
		if (typeof r.number !== "number" || typeof r.name !== "string") continue;
		runners.push({
			number: r.number,
			name: r.name.slice(0, 80),
			barrier: typeof r.barrier === "number" ? r.barrier : null,
			jockey: typeof r.jockey === "string" ? r.jockey.slice(0, 80) : null,
			trainer: typeof r.trainer === "string" ? r.trainer.slice(0, 80) : null,
			form: typeof r.form === "string" ? r.form.slice(0, 24) : null,
			scratched: r.scratched === true,
			sportsbet: typeof r.sportsbet === "number" ? r.sportsbet : null,
			bestWin: typeof r.bestWin === "number" ? r.bestWin : null,
			bestBook: typeof r.bestBook === "string" ? r.bestBook.slice(0, 40) : null
		});
	}
	return {
		id: o.id.slice(0, 80),
		venue: o.venue.slice(0, 80),
		country: typeof o.country === "string" ? o.country.slice(0, 8) : "AU",
		category: typeof o.category === "string" ? o.category.slice(0, 20) : "horse",
		raceNumber: typeof o.raceNumber === "number" ? o.raceNumber : 0,
		raceName: typeof o.raceName === "string" ? o.raceName.slice(0, 120) : null,
		startTime: typeof o.startTime === "string" ? o.startTime.slice(0, 40) : "",
		distance: typeof o.distance === "number" ? o.distance : null,
		condition: typeof o.condition === "string" ? o.condition.slice(0, 40) : null,
		weather: typeof o.weather === "string" ? o.weather.slice(0, 40) : null,
		runners
	};
}
function extractText(body) {
	if (!body || typeof body !== "object") return "";
	const output = body.output;
	if (!Array.isArray(output)) return "";
	const chunks = [];
	for (const item of output) {
		if (!item || typeof item !== "object") continue;
		const content = item.content;
		if (!Array.isArray(content)) continue;
		for (const part of content) {
			if (!part || typeof part !== "object") continue;
			const text = part.text;
			if (typeof text === "string") chunks.push(text);
		}
	}
	return chunks.join("\n").trim();
}
function asResearch(text) {
	const start = text.indexOf("{");
	const end = text.lastIndexOf("}");
	if (start < 0 || end <= start) return null;
	let parsed;
	try {
		parsed = JSON.parse(text.slice(start, end + 1));
	} catch {
		return null;
	}
	if (!parsed || typeof parsed !== "object") return null;
	const o = parsed;
	const confidence = o.confidence === "high" || o.confidence === "medium" ? o.confidence : "low";
	const sources = [];
	if (Array.isArray(o.sources)) for (const s of o.sources.slice(0, 6)) {
		if (!s || typeof s !== "object") continue;
		const src = s;
		if (typeof src.name !== "string") continue;
		sources.push({
			name: src.name.slice(0, 80),
			selection: typeof src.selection === "string" ? src.selection.slice(0, 120) : ""
		});
	}
	const strings = (v, max) => Array.isArray(v) ? v.filter((x) => typeof x === "string").slice(0, max).map((x) => x.slice(0, 240)) : [];
	const ranking = Array.isArray(o.ranking) ? o.ranking.filter((n) => typeof n === "number").slice(0, 4) : [];
	return {
		noBet: o.no_bet === true,
		pickNumber: typeof o.pick_number === "number" ? o.pick_number : null,
		pickName: typeof o.pick_name === "string" ? o.pick_name.slice(0, 80) : null,
		confidence,
		sources,
		consensus: typeof o.consensus === "string" ? o.consensus.slice(0, 600) : "",
		synthesis: typeof o.synthesis === "string" ? o.synthesis.slice(0, 800) : "",
		reasons: strings(o.reasons, 4),
		concerns: strings(o.concerns, 3),
		ranking,
		cardOnly: sources.length < 2
	};
}
var researchRace_createServerFn_handler = createServerRpc({
	id: "acaef5bc720e1ae164f6f46a45c08581a338d82075a3bbfbfe92defde57e4c4e",
	name: "researchRace",
	filename: "src/lib/racing.functions.ts"
}, (opts) => researchRace.__executeServer(opts));
var researchRace = createServerFn({ method: "POST" }).validator((input) => compactRace(input)).handler(researchRace_createServerFn_handler, async ({ data }) => {
	if (!data) return {
		ok: false,
		error: "That race card couldn't be read."
	};
	const now = Date.now();
	const cached = researchCache.get(data.id);
	if (cached && now - cached.at < 48e4) return {
		ok: true,
		cached: true,
		research: cached.research
	};
	pruneHits(now);
	if (researchHits.length >= 12) return {
		ok: false,
		error: "Research limit for this hour is used up. The card read below is still live."
	};
	const apiKey = process.env.XAI_API_KEY;
	if (!apiKey) return {
		ok: false,
		error: "Research is unavailable right now."
	};
	const card = {
		venue: data.venue,
		country: data.country,
		code: data.category,
		race: data.raceNumber,
		name: data.raceName,
		start: data.startTime,
		distance_m: data.distance,
		track: data.condition,
		weather: data.weather,
		runners: data.runners.map((r) => ({
			no: r.number,
			name: r.name,
			barrier: r.barrier,
			jockey: r.jockey,
			trainer: r.trainer,
			form: r.form,
			scratched: r.scratched,
			sportsbet: r.sportsbet,
			best: r.bestWin,
			bestBook: r.bestBook
		}))
	};
	const prompt = `Research this one race for a Perth punter who bets on Sportsbet. Current time matters: only today's race.
Use web search. Look for independent tip or form pages on this exact meeting and race (Racenet, Racing and Sports, Punters, Just Horse Racing, track sites, or the local greyhound/harness equivalent).
Name a source only if a result actually discusses this race. Never invent tipsters, scratchings, sectionals or prices.
If you cannot verify at least two outside sources, say so, set no_bet true unless the card itself is unusually one-sided, and make clear the read is from the card.
Separate consensus (what outside sources agree, or that they could not be checked) from synthesis (your own call).
Decimal odds. Sportsbet is the price that matters. If the race is open, conflicting, or the price is too short for the evidence, no_bet true.
Return only JSON:
{"no_bet":boolean,"pick_number":number|null,"pick_name":string|null,"confidence":"low"|"medium"|"high","sources":[{"name":string,"selection":string}],"consensus":string,"synthesis":string,"reasons":string[],"concerns":string[],"ranking":number[]}

CARD:
${JSON.stringify(card)}`;
	researchHits.push(now);
	const headers = {
		"Content-Type": "application/json",
		Authorization: `Bearer ${apiKey}`
	};
	let res = await fetch("https://api.x.ai/v1/responses", {
		method: "POST",
		headers,
		signal: AbortSignal.timeout(5e4),
		body: JSON.stringify({
			model: "grok-4.5",
			input: [{
				role: "user",
				content: prompt
			}],
			max_output_tokens: 900,
			reasoning: { effort: "low" },
			tools: [{ type: "web_search" }]
		})
	});
	if (!res.ok && res.status !== 429 && res.status !== 402 && res.status !== 403) res = await fetch("https://api.x.ai/v1/responses", {
		method: "POST",
		headers,
		signal: AbortSignal.timeout(4e4),
		body: JSON.stringify({
			model: "grok-4.5",
			input: [{
				role: "user",
				content: prompt + "\n\nWeb search is unavailable. Do not invent sources. Set sources to [] and base the read only on the card."
			}],
			max_output_tokens: 700,
			reasoning: { effort: "low" }
		})
	});
	if (!res.ok) {
		let detail = "";
		try {
			const raw = (await res.json()).error;
			detail = typeof raw === "string" ? raw : raw && typeof raw === "object" && "error" in raw ? String(raw.error) : "";
		} catch {
			detail = "";
		}
		if (/credit|spending|subscription/i.test(detail)) return {
			ok: false,
			error: "Outside research is paused — AI credits are used up. The card read still stands."
		};
		return {
			ok: false,
			error: `Research failed (${res.status}). The card read is still there.`
		};
	}
	const research = asResearch(extractText(await res.json()));
	if (!research) return {
		ok: false,
		error: "Research came back in a shape I couldn't use. Try once more."
	};
	researchCache.set(data.id, {
		at: now,
		research
	});
	return {
		ok: true,
		cached: false,
		research
	};
});
var loadResults_createServerFn_handler = createServerRpc({
	id: "94c89a4b7dcb61c2f7f524b29d28f6a97773e55afd16546f1b7533b82b8b4ad7",
	name: "loadResults",
	filename: "src/lib/racing.functions.ts"
}, (opts) => loadResults.__executeServer(opts));
var loadResults = createServerFn({ method: "POST" }).validator((input) => {
	const o = input && typeof input === "object" ? input : {};
	const hoursRaw = typeof o.hoursBack === "number" && Number.isFinite(o.hoursBack) ? o.hoursBack : 12;
	const ids = Array.isArray(o.raceIds) ? o.raceIds.filter((id) => typeof id === "string" && id.length > 0 && id.length <= 80).slice(0, 60) : [];
	return {
		hoursBack: Math.max(1, Math.min(72, Math.round(hoursRaw))),
		raceIds: ids
	};
}).handler(loadResults_createServerFn_handler, async ({ data }) => {
	const { fetchResults } = await import("./puntersedge.server-B9biXUnu.mjs");
	const loaded = await fetchResults(data.hoursBack);
	const wanted = new Set(data.raceIds);
	return {
		races: wanted.size ? loaded.races.filter((race) => wanted.has(race.raceId)) : loaded.races.slice(0, 60),
		error: loaded.error
	};
});
//#endregion
export { loadBoard_createServerFn_handler, loadResults_createServerFn_handler, researchRace_createServerFn_handler };
