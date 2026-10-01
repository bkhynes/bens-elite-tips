import { createServerFn } from "@tanstack/react-start";
import type { Race, RaceResearch } from "@/lib/racing-types";

const HOUR_MS = 60 * 60 * 1000;
const researchHits: number[] = [];
const researchCache = new Map<string, { at: number; research: RaceResearch }>();

function pruneHits(now: number) {
  while (researchHits.length && now - researchHits[0] > HOUR_MS) researchHits.shift();
}

export const loadBoard = createServerFn({ method: "POST" })
  .validator((input: unknown) => {
    const limitRaw =
      input && typeof input === "object" && "limit" in input ? (input as { limit: unknown }).limit : 16;
    const limit = typeof limitRaw === "number" && Number.isFinite(limitRaw) ? limitRaw : 16;
    return { limit: Math.max(8, Math.min(24, Math.round(limit))) };
  })
  .handler(async ({ data }) => {
    const { fetchBoard } = await import("@/lib/puntersedge.server");
    return fetchBoard(data.limit);
  });

type ResearchInput = {
  id: string;
  venue: string;
  country: string;
  category: string;
  raceNumber: number;
  raceName: string | null;
  startTime: string;
  distance: number | null;
  condition: string | null;
  weather: string | null;
  runners: {
    number: number;
    name: string;
    barrier: number | null;
    jockey: string | null;
    trainer: string | null;
    form: string | null;
    scratched: boolean;
    sportsbet: number | null;
    bestWin: number | null;
    bestBook: string | null;
  }[];
};

function compactRace(input: unknown): ResearchInput | null {
  if (!input || typeof input !== "object") return null;
  const o = input as Record<string, unknown>;
  if (typeof o.id !== "string" || typeof o.venue !== "string") return null;
  if (!Array.isArray(o.runners) || o.runners.length > 24) return null;
  const runners: ResearchInput["runners"] = [];
  for (const raw of o.runners) {
    if (!raw || typeof raw !== "object") continue;
    const r = raw as Record<string, unknown>;
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
      bestBook: typeof r.bestBook === "string" ? r.bestBook.slice(0, 40) : null,
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
    runners,
  };
}

function extractText(body: unknown): string {
  if (!body || typeof body !== "object") return "";
  const output = (body as { output?: unknown }).output;
  if (!Array.isArray(output)) return "";
  const chunks: string[] = [];
  for (const item of output) {
    if (!item || typeof item !== "object") continue;
    const content = (item as { content?: unknown }).content;
    if (!Array.isArray(content)) continue;
    for (const part of content) {
      if (!part || typeof part !== "object") continue;
      const text = (part as { text?: unknown }).text;
      if (typeof text === "string") chunks.push(text);
    }
  }
  return chunks.join("\n").trim();
}

function asResearch(text: string): RaceResearch | null {
  const start = text.indexOf("{");
  const end = text.lastIndexOf("}");
  if (start < 0 || end <= start) return null;
  let parsed: unknown;
  try {
    parsed = JSON.parse(text.slice(start, end + 1));
  } catch {
    return null;
  }
  if (!parsed || typeof parsed !== "object") return null;
  const o = parsed as Record<string, unknown>;
  const confidence = o.confidence === "high" || o.confidence === "medium" ? o.confidence : "low";
  const sources: RaceResearch["sources"] = [];
  if (Array.isArray(o.sources)) {
    for (const s of o.sources.slice(0, 6)) {
      if (!s || typeof s !== "object") continue;
      const src = s as Record<string, unknown>;
      if (typeof src.name !== "string") continue;
      sources.push({
        name: src.name.slice(0, 80),
        selection: typeof src.selection === "string" ? src.selection.slice(0, 120) : "",
      });
    }
  }
  const strings = (v: unknown, max: number) =>
    Array.isArray(v)
      ? v.filter((x): x is string => typeof x === "string").slice(0, max).map((x) => x.slice(0, 240))
      : [];
  const ranking = Array.isArray(o.ranking)
    ? o.ranking.filter((n): n is number => typeof n === "number").slice(0, 4)
    : [];
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
    cardOnly: sources.length < 2,
  };
}

export const researchRace = createServerFn({ method: "POST" })
  .validator((input: unknown) => compactRace(input))
  .handler(async ({ data }) => {
    if (!data) return { ok: false as const, error: "That race card couldn't be read." };
    const now = Date.now();
    const cached = researchCache.get(data.id);
    if (cached && now - cached.at < 8 * 60 * 1000) {
      return { ok: true as const, cached: true, research: cached.research };
    }
    pruneHits(now);
    if (researchHits.length >= 12) {
      return {
        ok: false as const,
        error: "Research limit for this hour is used up. The card read below is still live.",
      };
    }
    const apiKey = process.env.XAI_API_KEY;
    if (!apiKey) return { ok: false as const, error: "Research is unavailable right now." };

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
        bestBook: r.bestBook,
      })),
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
      Authorization: `Bearer ${apiKey}`,
    };
    let res = await fetch("https://api.x.ai/v1/responses", {
      method: "POST",
      headers,
      signal: AbortSignal.timeout(50_000),
      body: JSON.stringify({
        model: "grok-4.5",
        input: [{ role: "user", content: prompt }],
        max_output_tokens: 900,
        reasoning: { effort: "low" },
        tools: [{ type: "web_search" }],
      }),
    });

    if (!res.ok && res.status !== 429 && res.status !== 402 && res.status !== 403) {
      res = await fetch("https://api.x.ai/v1/responses", {
        method: "POST",
        headers,
        signal: AbortSignal.timeout(40_000),
        body: JSON.stringify({
          model: "grok-4.5",
          input: [
            {
              role: "user",
              content:
                prompt +
                "\n\nWeb search is unavailable. Do not invent sources. Set sources to [] and base the read only on the card.",
            },
          ],
          max_output_tokens: 700,
          reasoning: { effort: "low" },
        }),
      });
    }

    if (!res.ok) {
      let detail = "";
      try {
        const errBody = (await res.json()) as { error?: unknown; code?: string };
        const raw = errBody.error;
        detail = typeof raw === "string" ? raw : raw && typeof raw === "object" && "error" in raw ? String((raw as { error: unknown }).error) : "";
      } catch {
        detail = "";
      }
      if (/credit|spending|subscription/i.test(detail)) {
        return {
          ok: false as const,
          error: "Outside research is paused — AI credits are used up. The card read still stands.",
        };
      }
      return { ok: false as const, error: `Research failed (${res.status}). The card read is still there.` };
    }

    const body: unknown = await res.json();
    const research = asResearch(extractText(body));
    if (!research) {
      return { ok: false as const, error: "Research came back in a shape I couldn't use. Try once more." };
    }
    researchCache.set(data.id, { at: now, research });
    return { ok: true as const, cached: false, research };
  });

export const loadResults = createServerFn({ method: "POST" })
  .validator((input: unknown) => {
    const o = input && typeof input === "object" ? (input as Record<string, unknown>) : {};
    const hoursRaw = typeof o.hoursBack === "number" && Number.isFinite(o.hoursBack) ? o.hoursBack : 12;
    const ids = Array.isArray(o.raceIds)
      ? o.raceIds.filter((id): id is string => typeof id === "string" && id.length > 0 && id.length <= 80).slice(0, 60)
      : [];
    return { hoursBack: Math.max(1, Math.min(72, Math.round(hoursRaw))), raceIds: ids };
  })
  .handler(async ({ data }) => {
    const { fetchResults } = await import("@/lib/puntersedge.server");
    const loaded = await fetchResults(data.hoursBack);
    const wanted = new Set(data.raceIds);
    return {
      races: wanted.size ? loaded.races.filter((race) => wanted.has(race.raceId)) : loaded.races.slice(0, 60),
      error: loaded.error,
    };
  });

export function raceToResearchInput(race: Race): ResearchInput {
  return {
    id: race.id,
    venue: race.venue,
    country: race.country,
    category: race.category,
    raceNumber: race.raceNumber,
    raceName: race.raceName,
    startTime: race.startTime,
    distance: race.distance,
    condition: race.condition,
    weather: race.weather,
    runners: race.runners.map((r) => ({
      number: r.number,
      name: r.name,
      barrier: r.barrier,
      jockey: r.jockey,
      trainer: r.trainer,
      form: r.form,
      scratched: r.scratched,
      sportsbet: r.sportsbet,
      bestWin: r.bestWin,
      bestBook: r.bestBook,
    })),
  };
}
