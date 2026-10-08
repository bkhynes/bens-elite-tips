export type MultiRunner = {
  number: number;
  name: string;
  p: number;
  price: number;
};

export type SrmPlace = 1 | 2 | 3 | 4;

export type SrmLeg = {
  number: number;
  name: string;
  place: SrmPlace;
};

export type SameRaceMulti = {
  id: string;
  line: string;
  detail: string;
  legs: SrmLeg[];
  chance: number;
  payout: number;
};

export type SameRaceStrategy = {
  id: string;
  name: string;
  play: SameRaceMulti;
  cover: SameRaceMulti;
  coverPerTen: number;
  note: string;
};

export type SameRaceCard = {
  winNumber: number | null;
  winName: string | null;
  winChance: number | null;
  winPayout: number | null;
  multis: SameRaceMulti[];
  strategies: SameRaceStrategy[];
  verdict: "multi" | "winner" | "split";
  verdictText: string;
};

const TAKEOUT = 0.82;
const PLACE_WORD: Record<SrmPlace, string> = {
  1: "WIN",
  2: "TOP 2",
  3: "TOP 3",
  4: "TOP 4",
};

function round2(n: number) {
  return Math.round(n * 100) / 100;
}

function payoutFor(chance: number) {
  if (chance <= 0.0005) return 1001;
  return Math.min(1001, Math.max(1.05, round2((1 / chance) * TAKEOUT)));
}

function maxPlace(fieldSize: number): SrmPlace {
  if (fieldSize >= 8) return 4;
  if (fieldSize >= 5) return 3;
  return 2;
}

function joinNumbers(numbers: number[]) {
  const labels = numbers.map((number) => `#${number}`);
  if (labels.length <= 1) return labels[0] ?? "";
  if (labels.length === 2) return `${labels[0]} and ${labels[1]}`;
  return `${labels.slice(0, -1).join(", ")} and ${labels[labels.length - 1]}`;
}

export function sportsbetLine(legs: { number: number; place: SrmPlace }[]) {
  const grouped = new Map<SrmPlace, number[]>();
  for (const leg of legs) {
    const list = grouped.get(leg.place) ?? [];
    list.push(leg.number);
    grouped.set(leg.place, list);
  }
  return ([4, 3, 2, 1] as SrmPlace[])
    .filter((place) => grouped.has(place))
    .map((place) => `${joinNumbers((grouped.get(place) ?? []).sort((a, b) => a - b))} ${PLACE_WORD[place]}`)
    .join(", ");
}

function detailFor(legs: SrmLeg[]) {
  const sentence = (place: SrmPlace) => {
    if (place === 1) return "has to win";
    if (place === 2) return "has to finish 1st or 2nd";
    return `has to finish in the top ${place}`;
  };
  return ([1, 2, 3, 4] as SrmPlace[])
    .map((place) => {
      const group = legs.filter((leg) => leg.place === place);
      if (!group.length) return "";
      const who = joinNumbers(group.map((leg) => leg.number).sort((a, b) => a - b));
      return `${who} ${sentence(place)}.`;
    })
    .filter(Boolean)
    .join(" ");
}

function chanceOf(runners: MultiRunner[], legs: { number: number; place: SrmPlace }[]) {
  if (!legs.length) return 0;
  const wanted = new Set(legs.map((leg) => leg.number));
  let pool = runners.filter((runner) => runner.p > 0);
  if (pool.length > 10) {
    const must = pool.filter((runner) => wanted.has(runner.number));
    const rest = pool.filter((runner) => !wanted.has(runner.number)).sort((a, b) => b.p - a.p);
    const keep = rest.slice(0, Math.max(0, 9 - must.length));
    const tailP = rest.slice(keep.length).reduce((sum, runner) => sum + runner.p, 0);
    pool = tailP > 0 ? [...must, ...keep, { number: -1, name: "Others", p: tailP, price: 0 }] : [...must, ...keep];
  }
  const n = pool.length;
  if (n === 0 || n > 12) return 0;
  const at = new Map(pool.map((runner, index) => [runner.number, index]));
  const needBy = pool.map(() => 0);
  for (const leg of legs) {
    const index = at.get(leg.number);
    if (index == null) return 0;
    needBy[index] = leg.place;
  }
  const ps = pool.map((runner) => runner.p);
  const places = Math.max(...legs.map((leg) => leg.place));
  let dp = new Float64Array(1 << n);
  dp[0] = 1;
  for (let pos = 1; pos <= places; pos += 1) {
    const next = new Float64Array(1 << n);
    for (let mask = 0; mask < dp.length; mask += 1) {
      const cur = dp[mask];
      if (cur === 0) continue;
      let remain = 0;
      for (let i = 0; i < n; i += 1) {
        if ((mask & (1 << i)) === 0) remain += ps[i];
      }
      if (remain <= 1e-12) continue;
      for (let i = 0; i < n; i += 1) {
        if (mask & (1 << i)) continue;
        if (needBy[i] !== 0 && needBy[i] < pos) continue;
        next[mask | (1 << i)] += cur * (ps[i] / remain);
      }
    }
    dp = next;
  }
  let total = 0;
  for (let mask = 0; mask < dp.length; mask += 1) {
    if (dp[mask] === 0) continue;
    let ok = true;
    for (let i = 0; i < n; i += 1) {
      if (needBy[i] !== 0 && (mask & (1 << i)) === 0) {
        ok = false;
        break;
      }
    }
    if (ok) total += dp[mask];
  }
  return total;
}

function offer(id: string, runners: MultiRunner[], spec: { runner: MultiRunner; place: SrmPlace }[]): SameRaceMulti | null {
  const allowed = spec.filter((leg, index) => spec.findIndex((other) => other.runner.number === leg.runner.number) === index);
  if (allowed.length < 2) return null;
  const legs: SrmLeg[] = allowed.map((leg) => ({
    number: leg.runner.number,
    name: leg.runner.name,
    place: leg.place,
  }));
  const chance = chanceOf(runners, legs);
  if (chance <= 0.0005) return null;
  return { id, line: sportsbetLine(legs), detail: detailFor(legs), legs, chance, payout: payoutFor(chance) };
}

function spread(offers: SameRaceMulti[]) {
  const sorted = [...offers].sort((a, b) => a.chance - b.chance);
  const unique: SameRaceMulti[] = [];
  for (const offer of sorted) {
    if (unique.some((have) => have.line === offer.line)) continue;
    unique.push(offer);
  }
  if (unique.length <= 4) return unique;
  const last = unique.length - 1;
  const indexes = [0, Math.round(last / 3), Math.round((2 * last) / 3), last];
  return [...new Set(indexes)].map((index) => unique[index]).filter((row): row is SameRaceMulti => row != null);
}

function coverPerTen(coverPayout: number) {
  if (coverPayout <= 1.25) return null;
  let stake = Math.ceil((10 / (coverPayout - 1)) * 100) / 100;
  while (stake * coverPayout + 1e-6 < 10 + stake && stake < 80) stake = round2(stake + 0.05);
  if (stake > 30) return null;
  return stake;
}

function strategy(
  id: string,
  name: string,
  runners: MultiRunner[],
  playSpec: { runner: MultiRunner; place: SrmPlace }[],
  coverSpec: { runner: MultiRunner; place: SrmPlace }[],
): SameRaceStrategy | null {
  const play = offer(`${id}-play`, runners, playSpec);
  const cover = offer(`${id}-cover`, runners, coverSpec);
  if (!play || !cover) return null;
  if (cover.chance < play.chance * 1.15) return null;
  if (cover.payout >= play.payout) return null;
  const stake = coverPerTen(cover.payout);
  if (stake == null) return null;
  return {
    id,
    name,
    play,
    cover,
    coverPerTen: stake,
    note: `For each $10 on the play, put $${stake.toFixed(2)} on the cover. If only the cover lands, it returns the stake. If the play lands, the cover lands too.`,
  };
}

function pct(chance: number) {
  const shown = chance >= 0.1 ? Math.round(chance * 100) : Math.round(chance * 1000) / 10;
  return `${shown}%`;
}

export function sameRaceCard(input: {
  runners: MultiRunner[];
  fieldSize: number;
  pick: { number: number; name: string; price: number | null } | null;
}): SameRaceCard | null {
  const total = input.runners.reduce((sum, runner) => sum + runner.p, 0);
  if (input.runners.length < 3 || total <= 0) return null;
  const runners = input.runners.map((runner) => ({ ...runner, p: runner.p / total }));
  const room = maxPlace(input.fieldSize);
  const pick = input.pick ? runners.find((runner) => runner.number === input.pick?.number) : null;
  const ordered = pick ? [pick, ...runners.filter((runner) => runner.number !== pick.number)] : runners;
  const [a, b, c, d] = ordered;
  if (!a || !b) return null;
  const top = (place: SrmPlace): SrmPlace => (place <= room ? place : room);
  const built: SameRaceMulti[] = [];
  const add = (id: string, spec: { runner: MultiRunner; place: SrmPlace }[]) => {
    const next = offer(id, runners, spec);
    if (next) built.push(next);
  };
  if (c) add("win-top2-top3", [{ runner: a, place: 1 }, { runner: b, place: top(2) }, { runner: c, place: top(3) }]);
  if (c) add("win-two-top3", [{ runner: a, place: 1 }, { runner: b, place: top(3) }, { runner: c, place: top(3) }]);
  add("win-top3", [{ runner: a, place: 1 }, { runner: b, place: top(3) }]);
  add("two-top2", [{ runner: a, place: top(2) }, { runner: b, place: top(2) }]);
  if (c && room >= 4) add("win-two-top4", [{ runner: a, place: 1 }, { runner: b, place: 4 }, { runner: c, place: 4 }]);
  add("two-top3", [{ runner: a, place: top(3) }, { runner: b, place: top(3) }]);
  if (c) add("three-top3", [{ runner: a, place: top(3) }, { runner: b, place: top(3) }, { runner: c, place: top(3) }]);
  if (room >= 4) add("two-top4", [{ runner: a, place: 4 }, { runner: b, place: 4 }]);
  if (d && room >= 4) add("three-top4", [{ runner: a, place: 4 }, { runner: b, place: 4 }, { runner: c, place: 4 }]);

  const multis = spread(built);
  if (!multis.length) return null;

  const strategies: SameRaceStrategy[] = [];
  if (c) {
    const company = strategy(
      "company",
      "Win, with two in the top 3",
      runners,
      [{ runner: a, place: 1 }, { runner: b, place: top(3) }, { runner: c, place: top(3) }],
      [{ runner: a, place: top(3) }, { runner: b, place: top(3) }, { runner: c, place: top(3) }],
    );
    if (company) strategies.push(company);
    const tighter = strategy(
      "tighter",
      "Win, with the next horse closer",
      runners,
      [{ runner: a, place: 1 }, { runner: b, place: top(2) }, { runner: c, place: top(room >= 4 ? 4 : 3) }],
      [
        { runner: a, place: top(2) },
        { runner: b, place: top(room >= 4 ? 4 : 3) },
        { runner: c, place: top(room >= 4 ? 4 : 3) },
      ],
    );
    if (tighter && tighter.play.line !== company?.play.line) strategies.push(tighter);
  }

  const picked = pick ?? null;
  const winChance = picked?.p ?? null;
  const winPayout = input.pick?.price != null && input.pick.price > 1 ? input.pick.price : null;
  const safest = multis[multis.length - 1];
  let verdict: SameRaceCard["verdict"] = "split";
  let verdictText = `${safest.line} is the one most likely to land, at about ${pct(safest.chance)} and about $${safest.payout.toFixed(2)}.`;

  if (input.pick && winChance != null && winPayout != null) {
    const winReturn = winChance * winPayout;
    const multiReturn = safest.chance * safest.payout;
    if (safest.chance >= winChance * 1.35 && multiReturn >= winReturn * 0.9) {
      verdict = "multi";
      verdictText = `Take the multi. ${safest.line} lands about ${pct(safest.chance)} of the time and the estimated return holds up against #${input.pick.number} ${input.pick.name} to win at $${winPayout.toFixed(2)} (${pct(winChance)}).`;
    } else if (safest.chance >= winChance * 1.35) {
      verdict = "split";
      verdictText = `Safer as a multi, richer as a win. ${safest.line} lands about ${pct(safest.chance)} of the time at about $${safest.payout.toFixed(2)}. #${input.pick.number} ${input.pick.name} to win is ${pct(winChance)} at $${winPayout.toFixed(2)}.`;
    } else {
      verdict = "winner";
      verdictText = `Take the winner alone. #${input.pick.number} ${input.pick.name} at $${winPayout.toFixed(2)} is the better bet. ${safest.line} is the safer multi, at about ${pct(safest.chance)}.`;
    }
  } else {
    verdict = "multi";
    verdictText = `No winner call. The safer same-race multi is ${safest.line}, about ${pct(safest.chance)} to land at about $${safest.payout.toFixed(2)}.`;
  }

  return {
    winNumber: input.pick?.number ?? null,
    winName: input.pick?.name ?? null,
    winChance,
    winPayout,
    multis,
    strategies,
    verdict,
    verdictText,
  };
}
