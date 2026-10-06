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

const DRIVER_TEAM_ART: Record<string, { team: string; art: string; variant: number }> = {
  HAM: teamArt("Ferrari", "ferrari", 1), RUS: teamArt("Mercedes", "mercedes", 0), ANT: teamArt("Mercedes", "mercedes", 2),
  LEC: teamArt("Ferrari", "ferrari", 0), NOR: teamArt("McLaren", "mclaren", 1), PIA: teamArt("McLaren", "mclaren", 3),
  VER: teamArt("Red Bull Racing", "red-bull", 0), HAD: teamArt("Red Bull Racing", "red-bull", 2),
  LAW: teamArt("Racing Bulls", "racing-bulls", 1), LIN: teamArt("Racing Bulls", "racing-bulls", 3),
  GAS: teamArt("Alpine", "alpine", 0), COL: teamArt("Alpine", "alpine", 2), OCO: teamArt("Haas", "haas", 1),
  BEA: teamArt("Haas", "haas", 3), HUL: teamArt("Audi", "audi", 0), BOR: teamArt("Audi", "audi", 2),
  SAI: teamArt("Williams", "williams", 1), ALB: teamArt("Williams", "williams", 3),
  ALO: teamArt("Aston Martin", "aston-martin", 0), STR: teamArt("Aston Martin", "aston-martin", 2),
  PER: teamArt("Cadillac", "cadillac", 1), BOT: teamArt("Cadillac", "cadillac", 3),
  MSC: teamArt("Ferrari", "ferrari", 2), VET: teamArt("Red Bull Racing", "red-bull", 3),
  PRO: teamArt("McLaren", "mclaren", 0), SEN: teamArt("McLaren", "mclaren", 2), MAN: teamArt("Williams", "williams", 0),
  STE: teamArt("Classic British Racing", "aston-martin", 1), LAU: teamArt("Ferrari", "ferrari", 3),
  RAI: teamArt("Ferrari", "ferrari", 0), BUT: teamArt("McLaren", "mclaren", 3), HAK: teamArt("McLaren", "mclaren", 1),
  CLA: teamArt("Classic British Racing", "aston-martin", 3), FAN: teamArt("Mercedes", "mercedes", 1),
  PIQ: teamArt("Williams", "williams", 2), HIL: teamArt("Williams", "williams", 1), MOS: teamArt("Mercedes", "mercedes", 3),
  GHI: teamArt("Classic British Racing", "aston-martin", 0), BRA: teamArt("Classic Works", "cadillac", 2),
  FIT: teamArt("McLaren", "mclaren", 2), ASC: teamArt("Ferrari", "ferrari", 1), AND: teamArt("Ferrari", "ferrari", 2),
};

const CURRENT_DRIVERS: Driver[] = [
  { first: "Lewis", last: "Hamilton", code: "HAM", wins: 105, podiums: 202, poles: 104, titles: 7 },
  { first: "George", last: "Russell", code: "RUS", wins: 3, podiums: 15, poles: 5, titles: 0 },
  { first: "Kimi", last: "Antonelli", code: "ANT", wins: 0, podiums: 0, poles: 0, titles: 0 },
  { first: "Charles", last: "Leclerc", code: "LEC", wins: 8, podiums: 43, poles: 26, titles: 0 },
  { first: "Lando", last: "Norris", code: "NOR", wins: 4, podiums: 26, poles: 9, titles: 0 },
  { first: "Oscar", last: "Piastri", code: "PIA", wins: 2, podiums: 10, poles: 0, titles: 0 },
  { first: "Max", last: "Verstappen", code: "VER", wins: 63, podiums: 112, poles: 40, titles: 4 },
  { first: "Isack", last: "Hadjar", code: "HAD", wins: 0, podiums: 0, poles: 0, titles: 0 },
  { first: "Liam", last: "Lawson", code: "LAW", wins: 0, podiums: 0, poles: 0, titles: 0 },
  { first: "Arvid", last: "Lindblad", code: "LIN", wins: 0, podiums: 0, poles: 0, titles: 0 },
  { first: "Pierre", last: "Gasly", code: "GAS", wins: 1, podiums: 5, poles: 0, titles: 0 },
  { first: "Franco", last: "Colapinto", code: "COL", wins: 0, podiums: 0, poles: 0, titles: 0 },
  { first: "Esteban", last: "Ocon", code: "OCO", wins: 1, podiums: 4, poles: 0, titles: 0 },
  { first: "Oliver", last: "Bearman", code: "BEA", wins: 0, podiums: 0, poles: 0, titles: 0 },
  { first: "Nico", last: "Hülkenberg", code: "HUL", wins: 0, podiums: 0, poles: 1, titles: 0 },
  { first: "Gabriel", last: "Bortoleto", code: "BOR", wins: 0, podiums: 0, poles: 0, titles: 0 },
  { first: "Carlos", last: "Sainz", code: "SAI", wins: 4, podiums: 27, poles: 6, titles: 0 },
  { first: "Alex", last: "Albon", code: "ALB", wins: 0, podiums: 2, poles: 0, titles: 0 },
  { first: "Fernando", last: "Alonso", code: "ALO", wins: 32, podiums: 106, poles: 22, titles: 2 },
  { first: "Lance", last: "Stroll", code: "STR", wins: 0, podiums: 3, poles: 1, titles: 0 },
  { first: "Sergio", last: "Perez", code: "PER", wins: 6, podiums: 39, poles: 3, titles: 0 },
  { first: "Valtteri", last: "Bottas", code: "BOT", wins: 10, podiums: 67, poles: 20, titles: 0 },
];

const HISTORICAL_DRIVERS: Driver[] = [
  { first: "Michael", last: "Schumacher", code: "MSC", wins: 91, podiums: 155, poles: 68, titles: 7 },
  { first: "Sebastian", last: "Vettel", code: "VET", wins: 53, podiums: 122, poles: 57, titles: 4 },
  { first: "Alain", last: "Prost", code: "PRO", wins: 51, podiums: 106, poles: 33, titles: 4 },
  { first: "Ayrton", last: "Senna", code: "SEN", wins: 41, podiums: 80, poles: 65, titles: 3 },
  { first: "Nigel", last: "Mansell", code: "MAN", wins: 31, podiums: 59, poles: 32, titles: 1 },
  { first: "Jackie", last: "Stewart", code: "STE", wins: 27, podiums: 43, poles: 17, titles: 3 },
  { first: "Niki", last: "Lauda", code: "LAU", wins: 25, podiums: 54, poles: 24, titles: 3 },
  { first: "Kimi", last: "Räikkönen", code: "RAI", wins: 21, podiums: 103, poles: 18, titles: 1 },
  { first: "Jenson", last: "Button", code: "BUT", wins: 15, podiums: 50, poles: 8, titles: 1 },
  { first: "Mika", last: "Häkkinen", code: "HAK", wins: 20, podiums: 51, poles: 26, titles: 2 },
  { first: "Jim", last: "Clark", code: "CLA", wins: 25, podiums: 32, poles: 33, titles: 2 },
  { first: "Juan Manuel", last: "Fangio", code: "FAN", wins: 24, podiums: 35, poles: 29, titles: 5 },
  { first: "Nelson", last: "Piquet", code: "PIQ", wins: 23, podiums: 60, poles: 24, titles: 3 },
  { first: "Damon", last: "Hill", code: "HIL", wins: 22, podiums: 42, poles: 20, titles: 1 },
  { first: "Stirling", last: "Moss", code: "MOS", wins: 16, podiums: 24, poles: 16, titles: 0 },
  { first: "Graham", last: "Hill", code: "GHI", wins: 14, podiums: 36, poles: 13, titles: 2 },
  { first: "Jack", last: "Brabham", code: "BRA", wins: 14, podiums: 31, poles: 13, titles: 3 },
  { first: "Emerson", last: "Fittipaldi", code: "FIT", wins: 14, podiums: 35, poles: 6, titles: 2 },
  { first: "Alberto", last: "Ascari", code: "ASC", wins: 13, podiums: 17, poles: 14, titles: 2 },
  { first: "Mario", last: "Andretti", code: "AND", wins: 12, podiums: 19, poles: 18, titles: 1 },
];

const STATS: DailyStat[] = [
  { key: "wins", label: "CAREER WINS", question: "Who has more career wins?" },
  { key: "podiums", label: "CAREER PODIUMS", question: "Who has more career podiums?" },
  { key: "poles", label: "POLE POSITIONS", question: "Who has more pole positions?" },
  { key: "titles", label: "WORLD TITLES", question: "Who has more world titles?" },
];

export const MAX_MISTAKES = 3;
export const RULESET = "three-lives-v2";

export function getChallengeDateKey(date = new Date()): string {
  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone: "America/New_York",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(date);
  const value = Object.fromEntries(parts.map((part) => [part.type, part.value]));
  return `${value.year}-${value.month}-${value.day}`;
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
  const currentPairs = buildPairs(CURRENT_DRIVERS, stat.key, `${dateKey}:${stat.key}:current`);
  const historicalPairs = buildPairs(HISTORICAL_DRIVERS, stat.key, `${dateKey}:${stat.key}:historical`);
  const pair = roundIndex < currentPairs.length
    ? currentPairs[roundIndex]
    : historicalPairs[(roundIndex - currentPairs.length) % historicalPairs.length];
  if (!pair) throw new Error("No valid comparison is available.");
  const reverse = hash(`${dateKey}:${roundIndex}:orientation`) % 2 === 1;
  return { drivers: reverse ? [pair[1], pair[0]] : pair, stat };
}

export function correctDriverCode(puzzle: Puzzle): string {
  const [first, second] = puzzle.drivers;
  return first[puzzle.stat.key] > second[puzzle.stat.key] ? first.code : second.code;
}

export function getDriverTeamArt(code: string) {
  return DRIVER_TEAM_ART[code] ?? teamArt("Grand Prix Racing", "mercedes", 0);
}

function seededShuffle<T>(items: readonly T[], random: () => number): T[] {
  const result = [...items];
  for (let index = result.length - 1; index > 0; index -= 1) {
    const swapIndex = Math.floor(random() * (index + 1));
    [result[index], result[swapIndex]] = [result[swapIndex], result[index]];
  }
  return result;
}

function buildPairs(drivers: readonly Driver[], stat: StatKey, seed: string): Array<[Driver, Driver]> {
  const pairs: Array<[Driver, Driver]> = [];
  for (let first = 0; first < drivers.length; first += 1) {
    for (let second = first + 1; second < drivers.length; second += 1) {
      if (drivers[first][stat] !== drivers[second][stat]) pairs.push([drivers[first], drivers[second]]);
    }
  }
  return seededShuffle(pairs, createRandom(hash(seed)));
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

function teamArt(team: string, asset: string, variant: number) {
  return { team, art: `/team-cars/${asset}.png`, variant };
}
