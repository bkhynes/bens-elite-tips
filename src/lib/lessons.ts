export type LessonCode =
  | "won"
  | "placed"
  | "short_agreement"
  | "value_vs_favourite"
  | "agreement_lost"
  | "missed_winner"
  | "close_card"
  | "unclassified";

export type LessonRuleId = "short_agreement" | "cheap_value" | "close_card" | "missed_winner";

export type LessonRule = {
  id: LessonRuleId;
  title: string;
  detail: string;
};

export type LessonPolicy = {
  decided: number;
  won: number;
  lost: number;
  strike: number | null;
  recentStrike: number | null;
  priorStrike: number | null;
  passShortAgreement: boolean;
  passCheapValue: boolean;
  splitGap: number;
  formCoverage: number;
  rules: LessonRule[];
};

export const EMPTY_POLICY: LessonPolicy = {
  decided: 0,
  won: 0,
  lost: 0,
  strike: null,
  recentStrike: null,
  priorStrike: null,
  passShortAgreement: false,
  passCheapValue: false,
  splitGap: 0.04,
  formCoverage: 0.45,
  rules: [],
};

export type ReviewInput = {
  outcome: "won" | "lost" | "void" | "pending";
  tag: "agreement" | "value";
  pickName: string;
  price: number | null;
  favouriteName: string | null;
  favouriteNumber: number | null;
  favouritePrice: number | null;
  ranking: number[];
  concerns: string[];
  winnerName: string | null;
  winnerNumber: number | null;
  pickPosition: number | null;
  lessonCode?: string | null;
};

export type Review = {
  lessonCode: LessonCode;
  resultNote: string;
  nextTime: string | null;
};

const CODES = new Set<LessonCode>([
  "won",
  "placed",
  "short_agreement",
  "value_vs_favourite",
  "agreement_lost",
  "missed_winner",
  "close_card",
  "unclassified",
]);

export function isLessonCode(value: string | null | undefined): value is LessonCode {
  return value != null && CODES.has(value as LessonCode);
}

function money(price: number | null): string {
  return price != null ? `$${price.toFixed(2)}` : "the price on the card";
}

function concernLine(concerns: string[]): string {
  const hit = concerns.find((c) => /short price|wide|two minutes/i.test(c));
  if (!hit) return "";
  if (/short price/i.test(hit)) return " The card had already said the price was short.";
  if (/wide/i.test(hit)) return " The card had already flagged the draw as wide.";
  return " The Sportsbet quote was already old when the call was logged.";
}

export function reviewTip(entry: ReviewInput): Review | null {
  if (entry.outcome === "pending" || entry.outcome === "void") return null;
  if (entry.outcome === "won") {
    const price = money(entry.price);
    const short = entry.price != null && entry.price < 2.2;
    return {
      lessonCode: "won",
      resultNote:
        entry.tag === "value"
          ? `${entry.pickName} won at ${price}. Form was ahead of the market, and it stood up.`
          : `${entry.pickName} won at ${price}. Form and the market named the same horse.`,
      nextTime: short
        ? "A short price that wins is still a thin edge. Keep passing them when a concern is already on the card."
        : entry.tag === "value"
          ? "Repeat a value call only when the form gap is obvious and the price is $3.00 or bigger."
          : "Repeat an agreement when there is a gap over the next horse, not when the card is split.",
    };
  }

  const pos = entry.pickPosition;
  const winner = entry.winnerName ?? (entry.winnerNumber != null ? `#${entry.winnerNumber}` : "Something else");
  const price = money(entry.price);
  const fav =
    entry.favouriteName != null
      ? `${entry.favouriteName}${entry.favouritePrice != null ? ` at $${entry.favouritePrice.toFixed(2)}` : ""}`
      : "the favourite";
  const winnerIsFav = entry.winnerNumber != null && entry.winnerNumber === entry.favouriteNumber;
  const winnerInOrder = entry.winnerNumber != null && entry.ranking.includes(entry.winnerNumber);
  const note = concernLine(entry.concerns);
  const place = pos === 2 ? "second" : pos === 3 ? "third" : pos === 4 ? "fourth" : null;

  if (place) {
    return {
      lessonCode: "placed",
      resultNote: `${entry.pickName} finished ${place}. ${winner} won. It was in the finish, but this is a win call and a placing doesn't pay.${note}`,
      nextTime:
        entry.price != null && entry.price < 2.2
          ? "A short price that only places still loses the stake. Pass when a concern is already on the card."
          : winnerInOrder
            ? "The winner was already in the order, so the top of the card wasn't separated enough. Call no bet when the first two are close."
            : "A placing isn't a win. The one that won wasn't in the order, so this should have been a no bet.",
    };
  }

  if (entry.tag === "value" && winnerIsFav) {
    return {
      lessonCode: "value_vs_favourite",
      resultNote: `Took ${entry.pickName} at ${price} against ${fav}, and the favourite won. Form-over-price didn't beat the market.${note}`,
      nextTime:
        "Don't take a value runner against a short favourite unless the form gap is obvious and the price is $3.00 or bigger. Otherwise it's a no bet.",
    };
  }

  if (entry.tag === "agreement") {
    const short = entry.price != null && entry.price < 2.2;
    return {
      lessonCode: short ? "short_agreement" : "agreement_lost",
      resultNote: `Agreed with the market on ${entry.pickName} at ${price}, and it lost. ${winner} won. Matching the favourite is not the same as the favourite being a bet.${note}`,
      nextTime: "Agreement on its own isn't enough, especially under $2.20 or when a concern is already listed. Leave those.",
    };
  }

  if (!winnerInOrder && entry.winnerNumber != null) {
    return {
      lessonCode: "missed_winner",
      resultNote: `${winner} wasn't in the card order${entry.ranking.length ? ` (${entry.ranking.join(" → ")})` : ""}. The form and price read missed the one that ran.${note}`,
      nextTime: "If the figures are thin or the field is split, this should have been a no bet instead of a name.",
    };
  }

  if (winnerInOrder) {
    return {
      lessonCode: "close_card",
      resultNote: `${winner} was in the order, behind ${entry.pickName}. The right area, the wrong name on top.${note}`,
      nextTime: "When the top two on the card are close, call no bet instead of forcing the first name.",
    };
  }

  return {
    lessonCode: "unclassified",
    resultNote: `${entry.pickName} at ${price} didn't win. ${winner} did.${note}`,
    nextTime: "Pass next time unless the price and the form point at the same runner, with a gap over the next one.",
  };
}

export type SettledTip = ReviewInput & {
  outcome: "won" | "lost" | "void" | "pending";
  resultKind: "interim" | "final" | null;
  category: string;
  startTime: string;
};

export function lessonOf(entry: SettledTip): LessonCode | null {
  if (isLessonCode(entry.lessonCode)) return entry.lessonCode;
  return reviewTip(entry)?.lessonCode ?? null;
}

type Count = { n: number; won: number; lost: number; rate: number | null };

function count(rows: SettledTip[]): Count {
  let won = 0;
  let lost = 0;
  for (const row of rows) {
    if (row.outcome === "won") won += 1;
    else if (row.outcome === "lost") lost += 1;
  }
  const n = won + lost;
  return { n, won, lost, rate: n ? won / n : null };
}

function decidedRows(entries: SettledTip[]): SettledTip[] {
  return entries.filter((entry) => entry.outcome === "won" || entry.outcome === "lost");
}

export function policyFrom(entries: SettledTip[]): LessonPolicy {
  const decided = decidedRows(entries).sort(
    (a, b) => new Date(a.startTime).getTime() - new Date(b.startTime).getTime(),
  );
  const all = count(decided);
  const recent = count(decided.slice(-20));
  const prior = count(decided.slice(-40, -20));
  const losses = decided.filter((entry) => entry.outcome === "lost");
  const lossN = losses.length;
  const share = (code: LessonCode) => (lossN ? losses.filter((entry) => lessonOf(entry) === code).length / lossN : 0);
  const codeCount = (code: LessonCode) => losses.filter((entry) => lessonOf(entry) === code).length;

  const short = count(
    decided.filter((entry) => entry.tag === "agreement" && entry.price != null && entry.price < 2.2),
  );
  const cheapValue = count(decided.filter((entry) => entry.tag === "value" && entry.price != null && entry.price < 3));
  const rules: LessonRule[] = [];
  const passShortAgreement = short.n >= 5 && (short.rate ?? 1) < 0.4;
  const passCheapValue = cheapValue.n >= 5 && (cheapValue.rate ?? 1) < 0.35;
  const widerSplit = codeCount("close_card") >= 4 && share("close_card") >= 0.28;
  const stricterForm = codeCount("missed_winner") >= 4 && share("missed_winner") >= 0.28;

  if (passShortAgreement) {
    rules.push({
      id: "short_agreement",
      title: "Leave short-price agreements",
      detail: `Agreement calls under $2.20 are ${short.won} from ${short.n}. That price is a no bet until the record improves.`,
    });
  }
  if (passCheapValue) {
    rules.push({
      id: "cheap_value",
      title: "No cheap value against the market",
      detail: `Value calls under $3.00 are ${cheapValue.won} from ${cheapValue.n}. Under $3.00 against the favourite is a no bet.`,
    });
  }
  if (widerSplit) {
    rules.push({
      id: "close_card",
      title: "Pass a close card",
      detail: `${codeCount("close_card")} misses were the right race and the wrong horse. A close top two is a no bet.`,
    });
  }
  if (stricterForm) {
    rules.push({
      id: "missed_winner",
      title: "Need more of the field on the card",
      detail: `${codeCount("missed_winner")} winners were not in the order. Thin form is a no bet.`,
    });
  }

  return {
    decided: all.n,
    won: all.won,
    lost: all.lost,
    strike: all.rate,
    recentStrike: recent.n ? recent.rate : null,
    priorStrike: prior.n ? prior.rate : null,
    passShortAgreement,
    passCheapValue,
    splitGap: widerSplit ? 0.07 : 0.04,
    formCoverage: stricterForm ? 0.6 : 0.45,
    rules,
  };
}

export type ReportSlice = {
  label: string;
  decided: number;
  won: number;
  lost: number;
  placed: number;
  strike: number | null;
};

export type TipReport = {
  pending: number;
  voids: number;
  decided: number;
  won: number;
  lost: number;
  placed: number;
  strike: number | null;
  recentStrike: number | null;
  priorStrike: number | null;
  recentN: number;
  priorN: number;
  byCode: ReportSlice[];
  byTag: ReportSlice[];
  byPrice: ReportSlice[];
  lessons: { code: LessonCode; label: string; count: number }[];
  rules: LessonRule[];
};

const LESSON_LABEL: Record<LessonCode, string> = {
  won: "Won",
  placed: "Placed, didn't win",
  short_agreement: "Short-price agreement lost",
  value_vs_favourite: "Value runner, favourite won",
  agreement_lost: "Market pick lost",
  missed_winner: "Winner was not on the card",
  close_card: "Right race, wrong horse",
  unclassified: "Other miss",
};

function slice(label: string, rows: SettledTip[]): ReportSlice {
  const tallied = count(rows);
  const placed = rows.filter(
    (row) => row.outcome === "lost" && row.pickPosition != null && row.pickPosition >= 2 && row.pickPosition <= 3,
  ).length;
  return { label, decided: tallied.n, won: tallied.won, lost: tallied.lost, placed, strike: tallied.rate };
}

function priceBand(price: number | null): string | null {
  if (price == null) return null;
  if (price < 2.2) return "Under $2.20";
  if (price < 3.5) return "$2.20 – $3.50";
  if (price < 6) return "$3.50 – $6";
  return "$6 and longer";
}

export function tipReport(entries: SettledTip[]): TipReport {
  const decided = decidedRows(entries).sort(
    (a, b) => new Date(a.startTime).getTime() - new Date(b.startTime).getTime(),
  );
  const all = count(decided);
  const recent = decided.slice(-20);
  const prior = decided.slice(-40, -20);
  const placed = decided.filter(
    (row) => row.outcome === "lost" && row.pickPosition != null && row.pickPosition >= 2 && row.pickPosition <= 3,
  ).length;
  const codes = ["horse", "harness", "greyhound"] as const;
  const codeLabel = (code: string) => (code === "horse" ? "Thoroughbred" : code === "harness" ? "Harness" : "Greyhound");
  const lessons = (Object.keys(LESSON_LABEL) as LessonCode[])
    .filter((code) => code !== "won")
    .map((code) => ({
      code,
      label: LESSON_LABEL[code],
      count: decided.filter((entry) => entry.outcome === "lost" && lessonOf(entry) === code).length,
    }))
    .filter((row) => row.count > 0);

  return {
    pending: entries.filter((entry) => entry.outcome === "pending").length,
    voids: entries.filter((entry) => entry.outcome === "void").length,
    decided: all.n,
    won: all.won,
    lost: all.lost,
    placed,
    strike: all.rate,
    recentStrike: count(recent).rate,
    priorStrike: count(prior).rate,
    recentN: count(recent).n,
    priorN: count(prior).n,
    byCode: codes.map((code) => slice(codeLabel(code), decided.filter((entry) => entry.category === code))),
    byTag: [
      slice("Agrees with the market", decided.filter((entry) => entry.tag === "agreement")),
      slice("Value", decided.filter((entry) => entry.tag === "value")),
    ],
    byPrice: ["Under $2.20", "$2.20 – $3.50", "$3.50 – $6", "$6 and longer"].map((label) =>
      slice(label, decided.filter((entry) => priceBand(entry.price) === label)),
    ),
    lessons,
    rules: policyFrom(entries).rules,
  };
}

export function lessonLabel(code: LessonCode): string {
  return LESSON_LABEL[code];
}
