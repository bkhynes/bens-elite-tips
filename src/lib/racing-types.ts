export type BookPrice = {
  key: string;
  label: string;
  win: number | null;
  place: number | null;
};

export type Runner = {
  number: number;
  name: string;
  barrier: number | null;
  jockey: string | null;
  trainer: string | null;
  form: string | null;
  scratched: boolean;
  sportsbet: number | null;
  sportsbetPlace: number | null;
  sportsbetAge: number | null;
  bestWin: number | null;
  bestBook: string | null;
  books: BookPrice[];
};

export type Race = {
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
  rail: string | null;
  scratchings: string[];
  runners: Runner[];
};

export type Board = {
  races: Race[];
  fetchedAt: string;
  error?: string;
};

export type ResearchSource = { name: string; selection: string };

export type RaceResearch = {
  noBet: boolean;
  pickNumber: number | null;
  pickName: string | null;
  confidence: "low" | "medium" | "high";
  sources: ResearchSource[];
  consensus: string;
  synthesis: string;
  reasons: string[];
  concerns: string[];
  ranking: number[];
  cardOnly: boolean;
};
