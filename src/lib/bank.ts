const PERTH = "Australia/Perth";
const BANK_KEY = "elite-tips-bank";
const UNIT_SHARE = 0.02;

const WEEKDAY: Record<string, number> = { Mon: 0, Tue: 1, Wed: 2, Thu: 3, Fri: 4, Sat: 5, Sun: 6 };

export type WeekBet = {
  at: string;
  stake: number;
  state: "pending" | "won" | "lost" | "void";
  profit: number;
};

export type WeekBook = {
  week: string;
  label: string;
  amount: number | null;
  settled: number;
  pending: number;
  left: number | null;
  unit: number | null;
  stopped: boolean;
};

function perthParts(now: number) {
  const parts = new Intl.DateTimeFormat("en-AU", {
    timeZone: PERTH,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    weekday: "short",
  }).formatToParts(new Date(now));
  const get = (type: string) => parts.find((part) => part.type === type)?.value ?? "";
  return { year: Number(get("year")), month: Number(get("month")), day: Number(get("day")), weekday: get("weekday") };
}

export function perthMonday(now: number) {
  const { year, month, day, weekday } = perthParts(now);
  const noon = Date.UTC(year, month - 1, day);
  const monday = new Date(noon - (WEEKDAY[weekday] ?? 0) * 86_400_000);
  const y = monday.getUTCFullYear();
  const m = String(monday.getUTCMonth() + 1).padStart(2, "0");
  const d = String(monday.getUTCDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

function weekLabel(monday: string) {
  const [year, month, day] = monday.split("-").map(Number);
  const start = new Date(Date.UTC(year, (month ?? 1) - 1, day ?? 1));
  const end = new Date(start.getTime() + 6 * 86_400_000);
  const fmt = new Intl.DateTimeFormat("en-AU", { timeZone: "UTC", day: "numeric", month: "short" });
  return `${fmt.format(start)} – ${fmt.format(end)}`;
}

function round2(n: number) {
  return Math.round(n * 100) / 100;
}

function readSaved(): Record<string, number> {
  if (typeof localStorage === "undefined") return {};
  try {
    const raw = localStorage.getItem(BANK_KEY);
    if (!raw) return {};
    const parsed = JSON.parse(raw) as { weeks?: unknown };
    if (!parsed.weeks || typeof parsed.weeks !== "object") return {};
    const weeks: Record<string, number> = {};
    for (const [key, value] of Object.entries(parsed.weeks)) {
      if (typeof value === "number" && value > 0 && value <= 1_000_000) weeks[key] = value;
    }
    return weeks;
  } catch {
    return {};
  }
}

export function loadBank(now: number): number | null {
  const amount = readSaved()[perthMonday(now)];
  return amount ?? null;
}

export function saveBank(now: number, amount: number | null) {
  if (typeof localStorage === "undefined") return;
  const weeks = readSaved();
  const key = perthMonday(now);
  if (amount == null || amount <= 0) delete weeks[key];
  else weeks[key] = round2(amount);
  localStorage.setItem(BANK_KEY, JSON.stringify({ weeks }));
}

export function weekBook(now: number, amount: number | null, bets: WeekBet[]): WeekBook {
  const week = perthMonday(now);
  const start = Date.parse(`${week}T00:00:00+08:00`);
  const inWeek = bets.filter((bet) => {
    const at = Date.parse(bet.at);
    return Number.isFinite(at) && at >= start;
  });
  let settled = 0;
  let pending = 0;
  for (const bet of inWeek) {
    if (bet.state === "pending") pending += bet.stake;
    else settled += bet.profit;
  }
  settled = round2(settled);
  pending = round2(pending);
  const left = amount == null ? null : round2(amount + settled - pending);
  const stopped = left != null && left < 1;
  const rawUnit = amount == null ? null : round2(amount * UNIT_SHARE);
  const unit = rawUnit == null || left == null ? null : stopped ? 0 : round2(Math.min(rawUnit, left));
  return { week, label: weekLabel(week), amount, settled, pending, left, unit, stopped };
}

export function sizedStakes(unit: number, coverPerTen: number) {
  const play = round2(unit / (1 + coverPerTen / 10));
  const cover = round2(Math.max(0, unit - play));
  return { play, cover, outlay: round2(play + cover) };
}
