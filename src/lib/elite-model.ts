import type { Race, Runner } from "@/lib/racing-types";

export type ElitePick = {
  number: number;
  name: string;
  price: number | null;
  best: number | null;
  bestBook: string | null;
  tag: "agreement" | "value";
};

export type ModelNote = {
  form: number;
  fair: number;
  composite: number;
  barrier: number;
  margin: number;
  secondNumber: number;
  secondName: string;
};

export type EliteRead = {
  raceId: string;
  inWindow: boolean;
  minutes: number;
  decision: "pick" | "no_bet";
  noBetReason: string | null;
  favourite: { number: number; name: string; price: number | null } | null;
  pick: ElitePick | null;
  ranking: number[];
  marketOrder: number[];
  reasons: string[];
  concerns: string[];
  model: ModelNote | null;
};

const WINDOW_MIN = 15;

function priceOf(runner: Runner): number | null {
  return runner.sportsbet ?? runner.bestWin;
}

export function formScore(form: string | null | undefined): number | null {
  if (!form) return null;
  const figs = [...form.toUpperCase()].filter((c) => /[0-9X]/.test(c)).slice(0, 6);
  if (!figs.length) return null;
  const weights = [1, 0.75, 0.55, 0.4, 0.3, 0.22];
  const place = (c: string) => {
    if (c === "1") return 1;
    if (c === "2") return 0.66;
    if (c === "3") return 0.45;
    if (c === "4") return 0.3;
    if (c === "5") return 0.18;
    if (c === "6") return 0.12;
    if (c === "7") return 0.08;
    return 0.02;
  };
  let num = 0;
  let den = 0;
  figs.forEach((c, i) => {
    const w = weights[i] ?? 0.15;
    num += place(c) * w;
    den += w;
  });
  return den ? num / den : null;
}

function barrierScore(
  barrier: number | null,
  category: string,
  distance: number | null,
  field: number,
): number | null {
  if (barrier == null || barrier <= 0) return null;
  const width = Math.max(field, barrier, 8);
  const inside = 1 - (barrier - 1) / width;
  if (category === "greyhound") return inside;
  if (category === "harness") return 0.55 + inside * 0.45;
  const sprint = (distance ?? 1600) <= 1400;
  return sprint ? 0.4 + inside * 0.6 : 0.68 + inside * 0.32;
}

function figures(form: string | null, n: number): string {
  if (!form) return "";
  return [...form.toUpperCase()].filter((c) => /[0-9X]/.test(c)).slice(0, n).join("");
}

type Scored = {
  runner: Runner;
  price: number;
  fair: number;
  form: number;
  formKnown: boolean;
  barrier: number;
  composite: number;
};

export function readRace(race: Race, now: number): EliteRead {
  const minutes = (new Date(race.startTime).getTime() - now) / 60000;
  const inWindow = minutes >= -0.25 && minutes <= WINDOW_MIN;
  const active = race.runners.filter((r) => !r.scratched);
  const priced = active.filter((r) => priceOf(r) != null && (priceOf(r) as number) > 1);

  const base = {
    raceId: race.id,
    inWindow,
    minutes,
    favourite: null as EliteRead["favourite"],
    pick: null as ElitePick | null,
    ranking: [] as number[],
    marketOrder: [] as number[],
    reasons: [] as string[],
    concerns: [] as string[],
    model: null as ModelNote | null,
  };

  if (minutes < -0.5) {
    return {
      ...base,
      inWindow: false,
      decision: "no_bet",
      noBetReason: "This race has jumped.",
    };
  }

  if (!inWindow && minutes > WINDOW_MIN) {
    return {
      ...base,
      decision: "no_bet",
      noBetReason: "Outside the 15-minute window. No pick until it is actually approaching.",
    };
  }

  if (priced.length < 3) {
    return {
      ...base,
      decision: "no_bet",
      noBetReason:
        minutes < -0.25
          ? "This race has jumped."
          : "Not enough live prices to verify the field. No bet.",
    };
  }

  const implied = priced.map((r) => 1 / (priceOf(r) as number));
  const impliedSum = implied.reduce((a, b) => a + b, 0);
  const forms = priced.map((r) => formScore(r.form));
  const known = forms.filter((f): f is number => f != null);
  const field = active.length;

  if (known.length / priced.length < 0.45) {
    const fav = [...priced].sort((a, b) => (priceOf(a) as number) - (priceOf(b) as number))[0];
    return {
      ...base,
      decision: "no_bet",
      favourite: fav
        ? { number: fav.number, name: fav.name, price: priceOf(fav) }
        : null,
      marketOrder: [...priced]
        .sort((a, b) => (priceOf(a) as number) - (priceOf(b) as number))
        .slice(0, 4)
        .map((r) => r.number),
      noBetReason:
        "Form figures are missing on most of the field, so this can't be checked against the market. No bet.",
    };
  }

  const formNeutral = known.reduce((a, b) => a + b, 0) / known.length;
  const scored: Scored[] = priced.map((runner, i) => {
    const formKnown = forms[i] != null;
    const form = forms[i] ?? formNeutral;
    const barrier = barrierScore(runner.barrier, race.category, race.distance, field) ?? 0.5;
    const fair = implied[i] / impliedSum;
    const composite = fair * 0.62 + form * 0.26 + barrier * 0.12;
    return { runner, price: priceOf(runner) as number, fair, form, formKnown, barrier, composite };
  });

  scored.sort((a, b) => b.composite - a.composite);
  const market = [...scored].sort((a, b) => a.price - b.price);
  const top = scored[0];
  const second = scored[1];
  const fav = market[0];
  const margin = top.composite - second.composite;
  const ranking = scored.slice(0, 4).map((s) => s.runner.number);
  const marketOrder = market.slice(0, 4).map((s) => s.runner.number);

  const valuePool = scored.filter(
    (s) => s.price >= 2.4 && s.price <= 14 && s.formKnown && s.form >= 0.42 && s.form - s.fair >= 0.12,
  );
  valuePool.sort((a, b) => b.form - b.fair - (a.form - a.fair));
  const value = valuePool[0];

  const concerns: string[] = [];
  const reasons: string[] = [];

  let chosen = top;
  let tag: ElitePick["tag"] = top.runner.number === fav.runner.number ? "agreement" : "value";
  let noBet: string | null = null;

  if (
    value &&
    value.runner.number !== fav.runner.number &&
    value.form - value.fair >= 0.16 &&
    value.composite >= top.composite - 0.08
  ) {
    chosen = value;
    tag = "value";
  } else if (margin < 0.04) {
    noBet = "The card is split. Form and the market don't separate the top two. No bet.";
  }

  const pickRunner = chosen.runner;
  const sbAge = pickRunner.sportsbetAge;
  if (sbAge != null && sbAge > 120) {
    concerns.push("The Sportsbet quote on this runner is over two minutes old.");
  }
  if (chosen.price < 1.8) {
    concerns.push("Short price. Only a small edge even if the read is right.");
  }
  if (
    pickRunner.sportsbet != null &&
    pickRunner.bestWin != null &&
    pickRunner.bestWin >= pickRunner.sportsbet * 1.22 &&
    pickRunner.bestBook &&
    pickRunner.bestBook !== "Sportsbet"
  ) {
    concerns.push(
      `Sportsbet $${pickRunner.sportsbet.toFixed(2)} is the short one. Best is $${pickRunner.bestWin.toFixed(2)} ${pickRunner.bestBook}.`,
    );
  }
  const wide =
    (race.category === "greyhound" && (pickRunner.barrier ?? 0) >= 7) ||
    (race.category === "horse" && (pickRunner.barrier ?? 0) >= 9);
  if (wide && pickRunner.barrier) {
    concerns.push(`Barrier ${pickRunner.barrier} is wide for this code.`);
  }

  if (!noBet) {
    const figs = figures(pickRunner.form, 3);
    if (figs) {
      reasons.push(`Recent figures ${figs.split("").join("-")}.`);
    }
    const formRank =
      [...scored].filter((s) => s.formKnown).sort((a, b) => b.form - a.form).findIndex((s) => s.runner.number === pickRunner.number) +
      1;
    if (formRank > 0) {
      reasons.push(
        formRank === 1
          ? "Best recent form in the priced field."
          : `Form ranks ${formRank}${formRank === 2 ? "nd" : formRank === 3 ? "rd" : "th"} in the field.`,
      );
    }
    if (tag === "value" && fav.runner.number !== pickRunner.number) {
      reasons.push(
        `Sportsbet $${chosen.price.toFixed(2)} against favourite ${fav.runner.name} at $${fav.price.toFixed(2)}. The form is ahead of that price.`,
      );
    } else if (tag === "agreement") {
      reasons.push(
        `Market favourite and the form read land on the same runner at $${chosen.price.toFixed(2)}.`,
      );
    }
    if (pickRunner.barrier && pickRunner.barrier > 0 && race.category !== "harness") {
      const sprint = race.category === "horse" && (race.distance ?? 1600) <= 1400;
      if (pickRunner.barrier <= 3 && (sprint || race.category === "greyhound")) {
        reasons.push(
          race.category === "greyhound"
            ? `Box ${pickRunner.barrier} is a handy draw.`
            : `Barrier ${pickRunner.barrier} on ${race.distance ?? "this"}m.`,
        );
      }
    }
    if (pickRunner.jockey) {
      reasons.push(
        `${race.category === "harness" ? "Driver" : "Jockey"} ${pickRunner.jockey}${pickRunner.trainer ? `, trainer ${pickRunner.trainer}` : ""}.`,
      );
    } else if (pickRunner.trainer) {
      reasons.push(`Trainer ${pickRunner.trainer}.`);
    }
  }

  return {
    raceId: race.id,
    inWindow,
    minutes,
    decision: noBet ? "no_bet" : "pick",
    noBetReason: noBet,
    favourite: { number: fav.runner.number, name: fav.runner.name, price: fav.price },
    pick: noBet
      ? null
      : {
          number: pickRunner.number,
          name: pickRunner.name,
          price: pickRunner.sportsbet ?? chosen.price,
          best: pickRunner.bestWin,
          bestBook: pickRunner.bestBook,
          tag,
        },
    ranking,
    marketOrder,
    reasons: reasons.slice(0, 4),
    concerns: concerns.slice(0, 3),
    model: noBet || !second
      ? null
      : {
          form: round3(chosen.form),
          fair: round3(chosen.fair),
          composite: round3(chosen.composite),
          barrier: round3(chosen.barrier),
          margin: round3(margin),
          secondNumber: second.runner.number,
          secondName: second.runner.name,
        },
  };
}

function round3(n: number) {
  return Math.round(n * 1000) / 1000;
}

export function readsInWindow(races: Race[], now: number): EliteRead[] {
  return races
    .map((race) => readRace(race, now))
    .filter((read) => read.inWindow)
    .sort((a, b) => a.minutes - b.minutes);
}
