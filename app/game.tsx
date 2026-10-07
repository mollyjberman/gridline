"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import Image from "next/image";
import { getTeam } from "./teams";

type DriverChoice = { first: string; last: string; code: string; team: string; art: string; variant: number };
type LeaderboardEntry = { rank: number; name: string; score: number; isCurrentUser: boolean };
type GameState = {
  dateKey: string;
  challengeNumber: number;
  completed: boolean;
  score: number;
  mistakes: number;
  answers: boolean[];
  stats: { played: number; highest: number | null; streak: number; overallRank: number | null };
  leaderboards: { worldwide: LeaderboardEntry[]; national: LeaderboardEntry[]; team: LeaderboardEntry[] };
  countryCode: string | null;
  favoriteTeam: string;
  category: { label: string; question: string };
  puzzle: null | { roundIndex: number; drivers: DriverChoice[] };
  reveal?: { correct: boolean; correctCode: string; selectedCode: string; values: Record<string, number> };
};

const MAX_MISTAKES = 3;

export function Game() {
  const [state, setState] = useState<GameState | null>(null);
  const [pendingState, setPendingState] = useState<GameState | null>(null);
  const [reveal, setReveal] = useState<NonNullable<GameState["reveal"]> | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [secondsLeft, setSecondsLeft] = useState(secondsUntilEasternMidnight);

  const loadGame = useCallback(async () => {
    try {
      const body = await fetchGameState();
      setError(null);
      setState(body);
    } catch (loadError) {
      setError(loadError instanceof Error ? loadError.message : "Unable to load your game.");
    }
  }, []);

  useEffect(() => {
    let active = true;
    void fetchGameState()
      .then((body) => {
        if (!active) return;
        setError(null);
        setState(body);
      })
      .catch((loadError: unknown) => {
        if (!active) return;
        setError(loadError instanceof Error ? loadError.message : "Unable to load your game.");
      });
    return () => { active = false; };
  }, []);

  useEffect(() => {
    const timer = window.setInterval(() => {
      setSecondsLeft(secondsUntilEasternMidnight());
      if (state && easternDateKey(new Date()) !== state.dateKey) window.location.reload();
    }, 1_000);
    return () => window.clearInterval(timer);
  }, [state]);

  async function chooseDriver(code: string) {
    if (submitting || reveal || !state?.puzzle) return;
    setSubmitting(true);
    setError(null);
    try {
      const response = await fetch("/api/game", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ choice: code }),
      });
      const body = (await response.json()) as GameState & { error?: string };
      if (!response.ok && response.status !== 409) {
        throw new Error(body.error ?? "Your answer could not be saved.");
      }
      setReveal(body.reveal ?? null);
      setPendingState(body);
      if (!body.reveal) setState(body);
    } catch (submitError) {
      setError(submitError instanceof Error ? submitError.message : "Your answer could not be saved.");
    } finally {
      setSubmitting(false);
    }
  }

  function continueGame() {
    if (!pendingState) return;
    setState(pendingState);
    setPendingState(null);
    setReveal(null);
  }

  const countdown = useMemo(() => formatCountdown(secondsLeft), [secondsLeft]);
  if (error && !state) return <ErrorState message={error} retry={loadGame} />;
  if (!state) return <LoadingState />;

  return (
    <>
      <section className="gameShell" aria-labelledby="game-title">
        <div className="eyebrowRow">
          <span className="liveDot" aria-hidden="true" />
          <span id="game-title">ISSUE #{state.challengeNumber} · THE DAILY GRID</span>
          <span className="roundLabel">{state.completed ? "RUN COMPLETE" : `ROUND ${state.answers.length + 1}`}</span>
        </div>
        {state.completed ? (
          <Complete state={state} countdown={countdown} />
        ) : (
          <div className="gameScreen">
            <div className="comicBurst" aria-hidden="true"><span>HIGHER</span><b>OR</b><span>LOWER?</span></div>
            <Scoreboard score={state.score} mistakes={state.mistakes} />
            <div className="categoryBox"><small>TODAY&apos;S CATEGORY</small><strong>{state.category.label}</strong></div>
            <p className="prompt">{state.category.question}</p>
            {state.puzzle && (
              <div className="duel">
                {state.puzzle.drivers.map((driver, index) => (
                  <div className="driverSlot" key={driver.code}>
                    {index === 1 && <div className="versus" aria-hidden="true">VS</div>}
                    <DriverButton
                      driver={driver}
                      side={index === 0 ? "red" : "cyan"}
                      disabled={submitting || Boolean(reveal)}
                      reveal={reveal}
                      category={state.category.label}
                      onChoose={chooseDriver}
                    />
                  </div>
                ))}
              </div>
            )}
            {reveal && (
              <div className="resultPanel" role="status">
                <p>{reveal.correct ? "CORRECT! Keep the streak alive." : `MISS! ${driverName(state.puzzle?.drivers, reveal.correctCode)} was higher.`}</p>
                <button className="primaryButton" onClick={continueGame}>
                  {pendingState?.completed ? "SEE FINAL SCORE" : "NEXT MATCHUP"}
                </button>
              </div>
            )}
            {error && <p className="inlineError" role="alert">{error}</p>}
          </div>
        )}
      </section>
      <Stats state={state} />
      <Rankings state={state} />
    </>
  );
}

function DriverButton({ driver, side, disabled, reveal, category, onChoose }: {
  driver: DriverChoice;
  side: "red" | "cyan";
  disabled: boolean;
  reveal: NonNullable<GameState["reveal"]> | null;
  category: string;
  onChoose: (code: string) => void;
}) {
  const isCorrect = reveal?.correctCode === driver.code;
  const isWrongPick = reveal?.selectedCode === driver.code && !reveal.correct;
  const resultClass = isCorrect ? " correct" : isWrongPick ? " wrong" : "";
  return (
    <button className={`driverCard driverChoice ${side}${resultClass}`} disabled={disabled} onClick={() => onChoose(driver.code)}>
      <span className={`driverTeamArt artVariant${driver.variant}`} aria-hidden="true"><Image src={driver.art} alt="" width={340} height={340} /></span>
      <span className="driverCopy"><span>{driver.first}</span><strong>{driver.last}</strong></span>
      {reveal && <span className="revealedStat"><strong>{reveal.values[driver.code]}</strong><small>{category}</small></span>}
    </button>
  );
}

function Scoreboard({ score, mistakes }: { score: number; mistakes: number }) {
  return (
    <div className="scoreboard" role="status" aria-label={`${score} correct. ${MAX_MISTAKES - mistakes} lives remaining.`}>
      <div><small>SCORE</small><strong>{score}</strong></div>
      <div className="lives"><small>LIVES</small><span>{Array.from({ length: MAX_MISTAKES }, (_, index) => <b key={index} className={index < MAX_MISTAKES - mistakes ? "alive" : "lost"}>♥</b>)}</span></div>
    </div>
  );
}

function Complete({ state, countdown }: { state: GameState; countdown: string }) {
  const [shareStatus, setShareStatus] = useState("");
  const [creatingShare, setCreatingShare] = useState(false);
  async function share() {
    setCreatingShare(true);
    setShareStatus("");
    try {
      const file = createResultStory(state);
      const shareData = { files: [file], title: `Gridline Daily #${state.challengeNumber}`, text: `I scored ${state.score} on Gridline Daily. Can you beat my run?` };
      if (navigator.share && navigator.canShare?.({ files: [file] })) {
        await navigator.share(shareData);
        setShareStatus("RESULT IMAGE SHARED!");
      } else {
        const url = URL.createObjectURL(file);
        const link = document.createElement("a");
        link.href = url;
        link.download = `gridline-${state.challengeNumber}-result.png`;
        link.click();
        window.setTimeout(() => URL.revokeObjectURL(url), 1_000);
        setShareStatus("STORY IMAGE DOWNLOADED — READY TO POST!");
      }
    } catch (error) {
      if (error instanceof DOMException && error.name === "AbortError") return;
      setShareStatus("COULDN'T MAKE THE IMAGE. PLEASE TRY AGAIN.");
    } finally {
      setCreatingShare(false);
    }
  }
  return (
    <div className="completeScreen">
      <div><p className="kicker">THREE STRIKES · CHEQUERED FLAG</p><h1><span>{state.score}</span> CORRECT!</h1><p>Your score is inked into the record. A fresh category and new run arrive at 12:00 AM Eastern.</p></div>
      <div className="completeActions"><div><button className="primaryButton" onClick={share} disabled={creatingShare}>{creatingShare ? "MAKING IMAGE…" : "SHARE MY RESULT"}</button>{shareStatus && <p className="shareResultStatus" role="status">{shareStatus}</p>}</div><div className="countdown"><small>NEXT GRID IN</small><strong>{countdown}</strong></div></div>
    </div>
  );
}

function createResultStory(state: GameState) {
  const canvas = document.createElement("canvas");
  canvas.width = 1080;
  canvas.height = 1920;
  const context = canvas.getContext("2d");
  if (!context) throw new Error("Canvas is unavailable.");

  const ink = "#080a0c";
  const paper = "#f4eddb";
  const red = "#f12a2a";
  const cyan = "#00c8e8";
  const yellow = "#ffd62e";
  const green = "#19a55a";
  context.fillStyle = paper;
  context.fillRect(0, 0, canvas.width, canvas.height);
  context.fillStyle = "rgba(8,10,12,.12)";
  for (let y = 14; y < canvas.height; y += 22) for (let x = 14; x < canvas.width; x += 22) context.fillRect(x, y, 3, 3);

  context.save();
  context.translate(0, 360);
  context.rotate(-0.055);
  context.fillStyle = cyan;
  context.fillRect(-80, 0, 1240, 430);
  context.lineWidth = 12;
  context.strokeStyle = ink;
  context.strokeRect(-80, 0, 1240, 430);
  context.restore();

  context.fillStyle = ink;
  context.fillRect(56, 54, 968, 138);
  context.fillStyle = red;
  context.fillRect(76, 78, 300, 90);
  context.fillStyle = "white";
  context.font = "900 62px Impact, Arial Black, sans-serif";
  context.fillText("GRIDLINE", 104, 145);
  context.fillStyle = yellow;
  context.fillText("DAILY", 410, 145);
  context.fillStyle = "white";
  context.font = "800 34px Arial, sans-serif";
  context.textAlign = "right";
  context.fillText(`#${state.challengeNumber}`, 988, 140);

  context.textAlign = "left";
  context.fillStyle = ink;
  context.font = "900 72px Impact, Arial Black, sans-serif";
  context.fillText("CHEQUERED FLAG", 64, 308);
  context.fillStyle = red;
  context.font = "900 310px Impact, Arial Black, sans-serif";
  context.lineWidth = 14;
  context.strokeStyle = ink;
  context.strokeText(String(state.score), 76, 650);
  context.fillText(String(state.score), 76, 650);
  context.fillStyle = paper;
  context.strokeStyle = ink;
  context.lineWidth = 8;
  context.fillRect(420, 490, 420, 118);
  context.strokeRect(420, 490, 420, 118);
  context.fillStyle = ink;
  context.font = "900 72px Impact, Arial Black, sans-serif";
  context.fillText("CORRECT", 458, 575);

  const cellsPerRow = Math.min(9, Math.max(1, state.answers.length));
  const cellSize = state.answers.length > 9 ? 64 : 86;
  const cellGap = state.answers.length > 9 ? 12 : 20;
  state.answers.forEach((answer, index) => {
    const row = Math.floor(index / cellsPerRow);
    const column = index % cellsPerRow;
    const cellsInRow = Math.min(cellsPerRow, state.answers.length - row * cellsPerRow);
    const rowWidth = cellsInRow * cellSize + Math.max(0, cellsInRow - 1) * cellGap;
    const cellX = (1080 - rowWidth) / 2 + column * (cellSize + cellGap);
    const cellY = 748 + row * (cellSize + cellGap);
    context.fillStyle = answer ? green : red;
    context.fillRect(cellX, cellY, cellSize, cellSize);
    context.lineWidth = 8;
    context.strokeStyle = ink;
    context.strokeRect(cellX, cellY, cellSize, cellSize);
    context.fillStyle = "white";
    context.font = `900 ${Math.round(cellSize * .67)}px Arial, sans-serif`;
    context.textAlign = "center";
    context.fillText(answer ? "✓" : "×", cellX + cellSize / 2, cellY + cellSize * .77);
  });

  context.textAlign = "left";
  context.fillStyle = yellow;
  context.fillRect(64, 910, 952, 126);
  context.lineWidth = 10;
  context.strokeStyle = ink;
  context.strokeRect(64, 910, 952, 126);
  context.fillStyle = ink;
  context.font = "900 42px Arial, sans-serif";
  context.fillText(`🔥 ${state.stats.streak} DAY STREAK`, 100, 990);
  context.textAlign = "right";
  context.fillText(state.stats.overallRank ? `WORLD #${state.stats.overallRank}` : "WORLD RANK —", 978, 990);

  context.textAlign = "left";
  context.fillStyle = ink;
  context.font = "900 60px Impact, Arial Black, sans-serif";
  context.fillText("WORLDWIDE LEADERBOARD", 64, 1145);
  const leaders = state.leaderboards.worldwide.slice(0, 5);
  leaders.forEach((entry, index) => {
    const y = 1195 + index * 112;
    context.fillStyle = entry.isCurrentUser ? yellow : index % 2 === 0 ? "white" : "#ddd4bf";
    context.fillRect(64, y, 952, 90);
    context.lineWidth = 6;
    context.strokeStyle = ink;
    context.strokeRect(64, y, 952, 90);
    context.fillStyle = ink;
    context.font = "900 38px Arial, sans-serif";
    context.textAlign = "left";
    context.fillText(`#${entry.rank}`, 92, y + 59);
    const displayName = entry.isCurrentUser ? "YOU" : entry.name.slice(0, 18).toUpperCase();
    context.fillText(displayName, 230, y + 59);
    context.textAlign = "right";
    context.font = "900 48px Impact, Arial Black, sans-serif";
    context.fillText(String(entry.score), 980, y + 62);
  });
  if (leaders.length === 0) {
    context.fillStyle = "white";
    context.fillRect(64, 1195, 952, 90);
    context.strokeStyle = ink;
    context.strokeRect(64, 1195, 952, 90);
    context.fillStyle = ink;
    context.font = "800 34px Arial, sans-serif";
    context.fillText("SET THE PACE — YOU'RE FIRST ON THE GRID", 100, 1252);
  }

  context.fillStyle = red;
  context.fillRect(0, 1792, 1080, 128);
  context.fillStyle = "white";
  context.textAlign = "center";
  context.font = "900 46px Impact, Arial Black, sans-serif";
  context.fillText("CAN YOU BEAT MY RUN?", 540, 1850);
  context.font = "800 27px Arial, sans-serif";
  context.fillText("f1higherorlower.infinite-flow.chatgpt.site", 540, 1892);

  const data = canvas.toDataURL("image/png").split(",")[1];
  const bytes = Uint8Array.from(atob(data), (character) => character.charCodeAt(0));
  return new File([bytes], `gridline-${state.challengeNumber}-result.png`, { type: "image/png" });
}

function Stats({ state }: { state: GameState }) {
  return <aside className="statsStrip" aria-label="Your saved stats"><div><strong>{state.stats.played}</strong><span>RUNS</span></div><div><strong>{state.stats.highest ?? "—"}</strong><span>HIGH SCORE</span></div><div><strong>{state.stats.streak}</strong><span>DAY STREAK</span></div><div><strong>{state.stats.overallRank ? `#${state.stats.overallRank}` : "—"}</strong><span>OVERALL RANK</span></div></aside>;
}

function Rankings({ state }: { state: GameState }) {
  const countryName = getCountryName(state.countryCode);
  const teamName = getTeam(state.favoriteTeam)?.name ?? "TEAM";
  return (
    <section className="rankings" aria-labelledby="rankings-title">
      <div className="rankingsHeader">
        <div><small>TODAY&apos;S PADDOCK</small><h2 id="rankings-title">RANKINGS</h2></div>
        <span>Highest score wins · ties go to the earliest finish</span>
      </div>
      <div className="rankingGrid">
        <RankingBoard title={countryName ? `${countryName} · NATIONAL` : "NATIONAL"} entries={state.leaderboards.national} unavailable={!state.countryCode} />
        <RankingBoard title="WORLDWIDE" entries={state.leaderboards.worldwide} />
        <RankingBoard title={`${teamName.toUpperCase()} · TEAM`} entries={state.leaderboards.team} />
      </div>
    </section>
  );
}

function RankingBoard({ title, entries, unavailable = false }: { title: string; entries: LeaderboardEntry[]; unavailable?: boolean }) {
  return (
    <article className="rankingBoard">
      <h3>{title}</h3>
      {unavailable ? <p className="rankingEmpty">Country is detected on the live Site.</p> : entries.length === 0 ? <p className="rankingEmpty">No finishers yet. Set the pace.</p> : (
        <ol tabIndex={0} aria-label={`${title} top 10 rankings`}>
          {entries.map((entry) => <li key={`${title}-${entry.rank}-${entry.name}`} className={entry.isCurrentUser ? "currentRacer" : ""}><b>#{entry.rank}</b><span>{entry.isCurrentUser ? "YOU" : entry.name}</span><strong>{entry.score}</strong></li>)}
        </ol>
      )}
    </article>
  );
}

function getCountryName(countryCode: string | null) {
  if (!countryCode) return null;
  try { return new Intl.DisplayNames(["en"], { type: "region" }).of(countryCode) ?? countryCode; }
  catch { return countryCode; }
}

function driverName(drivers: DriverChoice[] | undefined, code: string) {
  const driver = drivers?.find((candidate) => candidate.code === code);
  return driver ? `${driver.first} ${driver.last}` : "The other driver";
}

function LoadingState() { return <section className="stateCard" aria-live="polite"><div className="spinner" /><p>Loading today&apos;s grid…</p></section>; }
function ErrorState({ message, retry }: { message: string; retry: () => Promise<void> }) { return <section className="stateCard"><p role="alert">{message}</p><button className="primaryButton" onClick={() => void retry()}>TRY AGAIN</button></section>; }
async function fetchGameState(): Promise<GameState> { const response = await fetch("/api/game", { cache: "no-store" }); const body = (await response.json()) as GameState & { error?: string }; if (!response.ok) throw new Error(body.error ?? "Unable to load your game."); return body; }
function secondsUntilEasternMidnight() {
  const now = Date.now();
  const currentDate = easternDateKey(new Date(now));
  let beforeMidnight = now;
  let afterMidnight = now + 27 * 60 * 60 * 1_000;
  while (afterMidnight - beforeMidnight > 1_000) {
    const midpoint = Math.floor((beforeMidnight + afterMidnight) / 2);
    if (easternDateKey(new Date(midpoint)) === currentDate) beforeMidnight = midpoint;
    else afterMidnight = midpoint;
  }
  return Math.max(0, Math.ceil((afterMidnight - now) / 1_000));
}
function easternDateKey(date: Date) {
  const parts = new Intl.DateTimeFormat("en-US", { timeZone: "America/New_York", year: "numeric", month: "2-digit", day: "2-digit" }).formatToParts(date);
  const value = Object.fromEntries(parts.map((part) => [part.type, part.value]));
  return `${value.year}-${value.month}-${value.day}`;
}
function formatCountdown(seconds: number) { const hours = String(Math.floor(seconds / 3_600)).padStart(2, "0"); const minutes = String(Math.floor((seconds % 3_600) / 60)).padStart(2, "0"); const remaining = String(seconds % 60).padStart(2, "0"); return `${hours}:${minutes}:${remaining}`; }
