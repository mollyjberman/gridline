"use client";

import { useCallback, useEffect, useMemo, useState } from "react";

type DriverChoice = { first: string; last: string; code: string };
type LeaderboardEntry = { rank: number; name: string; score: number; isCurrentUser: boolean };
type GameState = {
  dateKey: string;
  challengeNumber: number;
  completed: boolean;
  score: number;
  mistakes: number;
  answers: boolean[];
  stats: { played: number; average: number | null; streak: number };
  leaderboards: { worldwide: LeaderboardEntry[]; national: LeaderboardEntry[] };
  countryCode: string | null;
  category: { label: string; question: string };
  puzzle: null | { roundIndex: number; drivers: DriverChoice[] };
  reveal?: { correct: boolean; correctCode: string; selectedCode: string };
};

const MAX_MISTAKES = 3;

export function Game() {
  const [state, setState] = useState<GameState | null>(null);
  const [pendingState, setPendingState] = useState<GameState | null>(null);
  const [reveal, setReveal] = useState<NonNullable<GameState["reveal"]> | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [secondsLeft, setSecondsLeft] = useState(secondsUntilUtcMidnight);

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
      setSecondsLeft(secondsUntilUtcMidnight());
      if (state && new Date().toISOString().slice(0, 10) !== state.dateKey) window.location.reload();
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
            <div className="comicBurst" aria-hidden="true"><span>WHO</span><b>HAS</b><span>MORE?</span></div>
            <Scoreboard score={state.score} mistakes={state.mistakes} />
            <div className="categoryBox"><small>TODAY&apos;S CATEGORY</small><strong>{state.category.label}</strong></div>
            <p className="prompt"><span>YOUR CALL!</span> {state.category.question}</p>
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

function DriverButton({ driver, side, disabled, reveal, onChoose }: {
  driver: DriverChoice;
  side: "red" | "cyan";
  disabled: boolean;
  reveal: NonNullable<GameState["reveal"]> | null;
  onChoose: (code: string) => void;
}) {
  const isCorrect = reveal?.correctCode === driver.code;
  const isWrongPick = reveal?.selectedCode === driver.code && !reveal.correct;
  const resultClass = isCorrect ? " correct" : isWrongPick ? " wrong" : "";
  return (
    <button className={`driverCard driverChoice ${side}${resultClass}`} disabled={disabled} onClick={() => onChoose(driver.code)}>
      <span className="cardTopline"><span>{side === "red" ? "CONTENDER A" : "CONTENDER B"}</span></span>
      <span className="helmetShape" aria-hidden="true">{driver.code}</span>
      <span className="driverCopy"><span>{driver.first}</span><strong>{driver.last}</strong><small>CLICK TO CHOOSE</small></span>
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
  const shareText = `Gridline Daily #${state.challengeNumber}\n🏁 ${state.score} correct · three lives\nCan you beat my run?`;
  async function share() {
    if (navigator.share) await navigator.share({ text: shareText }).catch(() => undefined);
    else await navigator.clipboard.writeText(shareText);
  }
  return (
    <div className="completeScreen">
      <div><p className="kicker">THREE STRIKES · CHEQUERED FLAG</p><h1><span>{state.score}</span> CORRECT!</h1><p>Your score is inked into the record. Come back after the UTC reset for a fresh category and a new run.</p></div>
      <div className="completeActions"><button className="primaryButton" onClick={share}>SHARE RESULT</button><div className="countdown"><small>NEXT GRID IN</small><strong>{countdown}</strong></div></div>
    </div>
  );
}

function Stats({ state }: { state: GameState }) {
  return <aside className="statsStrip" aria-label="Your saved stats"><div><strong>{state.stats.played}</strong><span>RUNS</span></div><div><strong>{state.stats.average?.toFixed(1) ?? "—"}</strong><span>AVG SCORE</span></div><div><strong>{state.stats.streak}</strong><span>DAY STREAK</span></div></aside>;
}

function Rankings({ state }: { state: GameState }) {
  const countryName = getCountryName(state.countryCode);
  return (
    <section className="rankings" aria-labelledby="rankings-title">
      <div className="rankingsHeader">
        <div><small>TODAY&apos;S PADDOCK</small><h2 id="rankings-title">RANKINGS</h2></div>
        <span>Highest score wins · ties go to the earliest finish</span>
      </div>
      <div className="rankingGrid">
        <RankingBoard title={countryName ? `${countryName} · NATIONAL` : "NATIONAL"} entries={state.leaderboards.national} unavailable={!state.countryCode} />
        <RankingBoard title="WORLDWIDE" entries={state.leaderboards.worldwide} />
      </div>
    </section>
  );
}

function RankingBoard({ title, entries, unavailable = false }: { title: string; entries: LeaderboardEntry[]; unavailable?: boolean }) {
  return (
    <article className="rankingBoard">
      <h3>{title}</h3>
      {unavailable ? <p className="rankingEmpty">Country is detected on the live Site.</p> : entries.length === 0 ? <p className="rankingEmpty">No finishers yet. Set the pace.</p> : (
        <ol>
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
function secondsUntilUtcMidnight() { const now = new Date(); const next = Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate() + 1); return Math.max(0, Math.floor((next - now.getTime()) / 1_000)); }
function formatCountdown(seconds: number) { const hours = String(Math.floor(seconds / 3_600)).padStart(2, "0"); const minutes = String(Math.floor((seconds % 3_600) / 60)).padStart(2, "0"); const remaining = String(seconds % 60).padStart(2, "0"); return `${hours}:${minutes}:${remaining}`; }
