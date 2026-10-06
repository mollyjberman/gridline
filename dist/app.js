const DRIVERS = [
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
  { first: "Mika", last: "Häkkinen", code: "HAK", wins: 20, podiums: 51, poles: 26, titles: 2 }
];
const STATS = [
  { key: "wins", label: "CAREER WINS" },
  { key: "podiums", label: "CAREER PODIUMS" },
  { key: "poles", label: "POLE POSITIONS" },
  { key: "titles", label: "WORLD TITLES" }
];
const TOTAL_ROUNDS = 5;
const epoch = new Date("2025-01-01T00:00:00Z");
const todayKey = new Intl.DateTimeFormat("en-CA", { year: "numeric", month: "2-digit", day: "2-digit" }).format(new Date());
const challengeNumber = Math.max(1, Math.floor((new Date(`${todayKey}T12:00:00`) - epoch) / 86400000) + 1);
const storageKey = `gridline-result-${todayKey}`;
let round = 0;
let answers = [];
let puzzles = [];

const $ = (id) => document.getElementById(id);
const startScreen = $("start-screen");
const gameScreen = $("game-screen");
const completeScreen = $("complete-screen");

function hash(text) {
  let h = 2166136261;
  for (const char of text) { h ^= char.charCodeAt(0); h = Math.imul(h, 16777619); }
  return h >>> 0;
}
function randomFactory(seed) {
  return () => { seed |= 0; seed = seed + 0x6D2B79F5 | 0; let t = Math.imul(seed ^ seed >>> 15, 1 | seed); t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t; return ((t ^ t >>> 14) >>> 0) / 4294967296; };
}
function buildPuzzles() {
  const random = randomFactory(hash(todayKey));
  const pool = [...DRIVERS].sort(() => random() - .5);
  return Array.from({ length: TOTAL_ROUNDS }, (_, index) => {
    const stat = STATS[Math.floor(random() * STATS.length)];
    let a = pool[(index * 2) % pool.length];
    let b = pool[(index * 2 + 1) % pool.length];
    if (a[stat.key] === b[stat.key]) b = pool.find(d => d.code !== a.code && d[stat.key] !== a[stat.key]) || b;
    return { a, b, stat };
  });
}
function updateStats() {
  const history = JSON.parse(localStorage.getItem("gridline-history") || "[]");
  $("played-stat").textContent = history.length;
  $("average-stat").textContent = history.length ? (history.reduce((n, x) => n + x.score, 0) / history.length).toFixed(1) : "—";
  let streak = 0;
  let cursor = new Date(`${todayKey}T12:00:00`);
  const dates = new Set(history.map(x => x.date));
  if (!dates.has(todayKey)) cursor.setDate(cursor.getDate() - 1);
  while (dates.has(new Intl.DateTimeFormat("en-CA", { year: "numeric", month: "2-digit", day: "2-digit" }).format(cursor))) { streak++; cursor.setDate(cursor.getDate() - 1); }
  $("streak-stat").textContent = streak;
}
function driverToCard(prefix, driver, stat, hidden = false) {
  $(`${prefix}-code`).textContent = driver.code;
  $(`${prefix}-initials`).textContent = hidden ? "?" : driver.code;
  $(`${prefix}-first`).textContent = driver.first;
  $(`${prefix}-last`).textContent = driver.last;
  $(`${prefix}-stat`).textContent = stat.label;
  $(`${prefix}-value`).textContent = hidden ? "?" : driver[stat.key];
}
function renderRound() {
  const puzzle = puzzles[round];
  $("round-label").textContent = `PICK ${round + 1} OF ${TOTAL_ROUNDS}`;
  $("challenger-name-prompt").textContent = `${puzzle.b.first} ${puzzle.b.last}`;
  driverToCard("known", puzzle.a, puzzle.stat);
  driverToCard("mystery", puzzle.b, puzzle.stat, true);
  $("higher-reference").textContent = puzzle.a[puzzle.stat.key];
  $("lower-reference").textContent = puzzle.a[puzzle.stat.key];
  $("mystery-card").className = "driver-card mystery-card";
  $("choice-buttons").classList.remove("hidden");
  $("result-panel").classList.add("hidden");
  $("progress-row").innerHTML = Array.from({ length: TOTAL_ROUNDS }, (_, i) => `<span class="progress-segment ${i < answers.length ? (answers[i] ? "correct" : "wrong") : i === round ? "current" : ""}"></span>`).join("");
}
function answer(choice) {
  const puzzle = puzzles[round];
  const actual = puzzle.b[puzzle.stat.key] > puzzle.a[puzzle.stat.key] ? "higher" : "lower";
  const correct = choice === actual;
  answers.push(correct);
  $("mystery-value").textContent = puzzle.b[puzzle.stat.key];
  $("mystery-initials").textContent = puzzle.b.code;
  $("mystery-card").classList.add("revealed", correct ? "correct" : "wrong");
  $("choice-buttons").classList.add("hidden");
  $("result-panel").classList.remove("hidden");
  $("result-message").textContent = correct ? "Nailed it. That's the right call." : `Not this time—it was ${actual}.`;
  $("next-button").textContent = round === TOTAL_ROUNDS - 1 ? "SEE RESULT" : "NEXT COMPARISON";
  $("progress-row").children[round].className = `progress-segment ${correct ? "correct" : "wrong"}`;
}
function finish() {
  const score = answers.filter(Boolean).length;
  const result = { date: todayKey, score, answers };
  localStorage.setItem(storageKey, JSON.stringify(result));
  const history = JSON.parse(localStorage.getItem("gridline-history") || "[]").filter(x => x.date !== todayKey);
  history.push(result);
  localStorage.setItem("gridline-history", JSON.stringify(history.slice(-365)));
  showComplete(result);
}
function showComplete(result) {
  startScreen.classList.add("hidden");
  gameScreen.classList.add("hidden");
  completeScreen.classList.remove("hidden");
  $("round-label").textContent = "RUN COMPLETE";
  $("final-score").textContent = `${result.score}/${TOTAL_ROUNDS}`;
  $("finish-copy").textContent = result.score === 5 ? "Perfect lap. No notes." : result.score >= 3 ? "Points on the board. Come back tomorrow and chase perfection." : "A tough day at the circuit. Tomorrow brings a fresh grid.";
  $("share-grid").innerHTML = result.answers.map(ok => `<span class="share-cell ${ok ? "correct" : ""}"></span>`).join("");
  updateStats();
}
async function share() {
  const result = JSON.parse(localStorage.getItem(storageKey));
  const blocks = result.answers.map(x => x ? "🟩" : "🟥").join("");
  const text = `Gridline Daily #${challengeNumber} — ${result.score}/${TOTAL_ROUNDS}\n${blocks}\nCan you beat my lap?`;
  try {
    if (navigator.share) await navigator.share({ text });
    else { await navigator.clipboard.writeText(text); toast("Result copied"); }
  } catch (error) { if (error.name !== "AbortError") toast("Couldn't share result"); }
}
function toast(message) { $("toast").textContent = message; $("toast").classList.add("show"); setTimeout(() => $("toast").classList.remove("show"), 1800); }
function updateCountdown() {
  const now = new Date();
  const next = new Date(now); next.setHours(24, 0, 0, 0);
  const seconds = Math.max(0, Math.floor((next - now) / 1000));
  const h = String(Math.floor(seconds / 3600)).padStart(2, "0");
  const m = String(Math.floor(seconds % 3600 / 60)).padStart(2, "0");
  const s = String(seconds % 60).padStart(2, "0");
  $("countdown").textContent = `${h}:${m}:${s}`;
}

$("challenge-number").textContent = `CHALLENGE #${challengeNumber}`;
puzzles = buildPuzzles();
updateStats();
const saved = JSON.parse(localStorage.getItem(storageKey) || "null");
if (saved) showComplete(saved);
$("start-button").addEventListener("click", () => { startScreen.classList.add("hidden"); gameScreen.classList.remove("hidden"); renderRound(); });
$("higher-button").addEventListener("click", () => answer("higher"));
$("lower-button").addEventListener("click", () => answer("lower"));
$("next-button").addEventListener("click", () => { round++; round >= TOTAL_ROUNDS ? finish() : renderRound(); });
$("share-button").addEventListener("click", share);
$("how-button").addEventListener("click", () => $("how-dialog").showModal());
$("close-dialog").addEventListener("click", () => $("how-dialog").close());
$("how-dialog").addEventListener("click", e => { if (e.target === $("how-dialog")) $("how-dialog").close(); });
updateCountdown(); setInterval(updateCountdown, 1000);
