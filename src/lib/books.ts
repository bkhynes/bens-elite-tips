export const BOOK_LABELS: Record<string, string> = {
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
  boostbet: "BoostBet",
};

export function bookLabel(key: string): string {
  return BOOK_LABELS[key] ?? key.replace(/_au$/, "").replace(/^./, (c) => c.toUpperCase());
}
