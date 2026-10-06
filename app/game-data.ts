export type StatKey = "wins" | "podiums" | "poles" | "titles";

export type Driver = {
  first: string;
  last: string;
  code: string;
  wins: number;
  podiums: number;
  poles: number;
  titles: number;
};

export type DailyStat = { key: StatKey; label: string; question: string };
export type Puzzle = { drivers: [Driver, Driver]; stat: DailyStat };

const DRIVERS: Driver[] = [
  { first: "Lewis", last: "Hamilton", code: "HAM", wins: 105, podiums: 202, poles: 104, titles: 7 },
  { first: "Michael", last: "Schumacher", code: "MSC", wins: 91, podiums: 155, poles: 68, titles: 7 },
  { first: "Max", last: "Verstappen", code: "VER", wins: 63, podiums: 112, poles: 40, titles: 4 },
  { first: "Sebastian", last: "Vettel", code: "VET", wins: 53, podiums: 122, poles: 57, titles: 4 },
  { first: "Alain", last: "Prost", code: "PRO", wins: 51, podiums: 106, poles: 33, titles: 4 },
  { first: "Ayrton", last: "Senna", code: "SEN", wins: 41, podiums: 80, poles: 65, titles: 3 },
  { first: "Fernando", last: "Alonso", code: "ALO", wins: 32, podiums: 106, poles: 22, titles: 2 },
  { first: "Nigel", last: "Mansell", code: "MAN", wins: 31, podiums: 59, poles: 32, titles: 1 },
  { first: "Jackie", last: "Stewart", code: "STE", wins: 27, podiums: 43, poles: 17, titles: 3 },
  { first: "Niki", last: "Lauda", code: "LAU", wins: 25, podiums: 54, poles: 24, titles: 3 },
  { first: "Lando", last: "Norris", code: "NOR", wins: 4, podiums: 26, poles: 9, titles: 0 },
  { first: "Charles", last: "Leclerc", code: "LEC", wins: 8, podiums: 43, poles: 26, titles: 0 },
  { first: "Kimi", last: "Räikkönen", code: "RAI", wins: 21, podiums: 103, poles: 18, titles: 1 },
  { first: "Jenson", last: "Button", code: "BUT", wins: 15, podiums: 50, poles: 8, titles: 1 },
  { first: "Mika", last: "Häkkinen", code: "HAK", wins: 20, podiums: 51, poles: 26, titles: 2 },
];

const STATS: DailyStat[] = [
  { key: "wins", label: "CAREER WINS", question: "Who has more career wins?" },
  { key: "podiums", label: "CAREER PODIUMS", question: "Who has more career podiums?" },
  { key: "poles", label: "POLE POSITIONS", question: "Who has more pole positions?" },
  { key: "titles", label: "WORLD TITLES", question: "Who has more world titles?" },
];

export const MAX_MISTAKES = 3;
export const RULESET = "three-lives-v1";

export function getUtcDateKey(date = new Date()): string {
  return date.toISOString().slice(0, 10);
}

export function getAttemptKey(dateKey: string): string {
  return `${dateKey}:${RULESET}`;
}

export function getChallengeNumber(dateKey: string): number {
  const epochDay = Date.parse("2025-01-01T00:00:00Z") / 86_400_000;
  const challengeDay = Date.parse(`${dateKey}T00:00:00Z`) / 86_400_000;
  return Math.max(1, challengeDay - epochDay + 1);
}

export function getDailyStat(dateKey: string): DailyStat {
  const random = createRandom(hash(dateKey));
  return STATS[Math.floor(random() * STATS.length)];
}

export function buildPuzzle(dateKey: string, roundIndex: number): Puzzle {
  const stat = getDailyStat(dateKey);
  const pool = seededShuffle(DRIVERS, createRandom(hash(`${dateKey}:${roundIndex}`)));
  const first = pool[0];
  const second = pool.find((driver) => driver[stat.key] !== first[stat.key]);
  if (!second) throw new Error("No valid comparison is available.");
  return { drivers: [first, second], stat };
}

export function correctDriverCode(puzzle: Puzzle): string {
  const [first, second] = puzzle.drivers;
  return first[puzzle.stat.key] > second[puzzle.stat.key] ? first.code : second.code;
}

function seededShuffle<T>(items: readonly T[], random: () => number): T[] {
  const result = [...items];
  for (let index = result.length - 1; index > 0; index -= 1) {
    const swapIndex = Math.floor(random() * (index + 1));
    [result[index], result[swapIndex]] = [result[swapIndex], result[index]];
  }
  return result;
}

function hash(text: string): number {
  let value = 2_166_136_261;
  for (const character of text) {
    value ^= character.charCodeAt(0);
    value = Math.imul(value, 16_777_619);
  }
  return value >>> 0;
}

function createRandom(initialSeed: number): () => number {
  let seed = initialSeed;
  return () => {
    seed = (seed + 0x6d2b79f5) | 0;
    let value = Math.imul(seed ^ (seed >>> 15), 1 | seed);
    value = (value + Math.imul(value ^ (value >>> 7), 61 | value)) ^ value;
    return ((value ^ (value >>> 14)) >>> 0) / 4_294_967_296;
  };
}
