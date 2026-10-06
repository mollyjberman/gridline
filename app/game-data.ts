export type StatKey = "wins" | "podiums" | "poles" | "titles";
export type Choice = "higher" | "lower";

export type Driver = {
  first: string;
  last: string;
  code: string;
  wins: number;
  podiums: number;
  poles: number;
  titles: number;
};

export type Puzzle = {
  known: Driver;
  mystery: Driver;
  stat: { key: StatKey; label: string };
};

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

const STATS: Puzzle["stat"][] = [
  { key: "wins", label: "CAREER WINS" },
  { key: "podiums", label: "CAREER PODIUMS" },
  { key: "poles", label: "POLE POSITIONS" },
  { key: "titles", label: "WORLD TITLES" },
];

export const TOTAL_ROUNDS = 5;

export function getUtcDateKey(date = new Date()): string {
  return date.toISOString().slice(0, 10);
}

export function getChallengeNumber(dateKey: string): number {
  const epochDay = Date.parse("2025-01-01T00:00:00Z") / 86_400_000;
  const challengeDay = Date.parse(`${dateKey}T00:00:00Z`) / 86_400_000;
  return Math.max(1, challengeDay - epochDay + 1);
}

export function buildPuzzles(dateKey: string): Puzzle[] {
  const random = createRandom(hash(dateKey));
  const pool = seededShuffle(DRIVERS, random);

  return Array.from({ length: TOTAL_ROUNDS }, (_, index) => {
    const stat = STATS[Math.floor(random() * STATS.length)];
    const known = pool[index * 2];
    let mystery = pool[index * 2 + 1];
    if (known[stat.key] === mystery[stat.key]) {
      const replacementIndex = pool.findIndex(
        (driver, candidateIndex) => candidateIndex >= TOTAL_ROUNDS * 2 && driver[stat.key] !== known[stat.key],
      );
      if (replacementIndex >= 0) [mystery, pool[replacementIndex]] = [pool[replacementIndex], mystery];
    }
    return { known, mystery, stat };
  });
}

export function correctChoice(puzzle: Puzzle): Choice | null {
  const knownValue = puzzle.known[puzzle.stat.key];
  const mysteryValue = puzzle.mystery[puzzle.stat.key];
  if (mysteryValue === knownValue) return null;
  return mysteryValue > knownValue ? "higher" : "lower";
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
