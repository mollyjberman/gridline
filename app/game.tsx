"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import type { Choice, Driver, StatKey } from "./game-data";

type GameState = {
  dateKey: string;
  challengeNumber: number;
  completed: boolean;
  score: number;
  answers: boolean[];
  stats: { played: number; average: number | null; streak: number };
  puzzle: null | {
    roundIndex: number;
    known: Driver;
    mystery: Pick<Driver, "first" | "last" | "code">;
    stat: { key: StatKey; label: string };
  };
  reveal?: { value: number; correct: boolean; expectedChoice: Choice | null };
};

const TOTAL_ROUNDS = 5;

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
      const seconds = secondsUntilUtcMidnight();
      setSecondsLeft(seconds);
      const utcDate = new Date().toISOString().slice(0, 10);
      if (state && utcDate !== state.dateKey) window.location.reload();
    }, 1_000);
    return () => window.clearInterval(timer);
  }, [state]);

  async function submit(choice: Choice) {
    if (submitting || reveal || !state?.puzzle) return;
    setSubmitting(true);
    setError(null);
    try {
      const response = await fetch("/api/game", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ choice }),
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
          <span className="roundLabel">
            {state.completed ? "RUN COMPLETE" : `PICK ${(state.puzzle?.roundIndex ?? 0) + 1} OF ${TOTAL_ROUNDS}`}
          </span>
        </div>
        {state.completed ? (
          <Complete state={state} countdown={countdown} />
        ) : (
          <div className="gameScreen">
            <div className="comicBurst" aria-hidden="true"><span>HIGHER</span><b>OR</b><span>LOWER?</span></div>
            <Progress answers={state.answers} current={state.puzzle?.roundIndex ?? 0} />
            <p className="prompt">
              <span>YOUR CALL!</span> Does <strong>{state.puzzle?.mystery.first} {state.puzzle?.mystery.last}</strong> have a higher or lower total?
            </p>
            {state.puzzle && <Duel puzzle={state.puzzle} reveal={reveal} />}
            {reveal ? (
              <div className="resultPanel" role="status">
                <p>{reveal.correct ? "Nailed it. That's the right call." : `Not this time—it was ${reveal.expectedChoice ?? "a tie"}.`}</p>
                <button className="primaryButton" onClick={continueGame}>
                  {pendingState?.completed ? "SEE RESULT" : "NEXT COMPARISON"}
                </button>
              </div>
            ) : (
              <div className="choiceButtons">
                <ChoiceButton choice="higher" reference={state.puzzle?.known[state.puzzle.stat.key] ?? 0} disabled={submitting} onChoose={submit} />
                <ChoiceButton choice="lower" reference={state.puzzle?.known[state.puzzle.stat.key] ?? 0} disabled={submitting} onChoose={submit} />
              </div>
            )}
            {error && <p className="inlineError" role="alert">{error}</p>}
          </div>
        )}
      </section>
      <Stats state={state} />
    </>
  );
}

function Duel({ puzzle, reveal }: { puzzle: NonNullable<GameState["puzzle"]>; reveal: NonNullable<GameState["reveal"]> | null }) {
  return (
    <div className="duel">
      <DriverCard label="THE BENCHMARK" driver={puzzle.known} stat={puzzle.stat} value={puzzle.known[puzzle.stat.key]} />
      <div className="versus" aria-hidden="true">VS</div>
      <DriverCard label="THE CHALLENGER" driver={puzzle.mystery} stat={puzzle.stat} value={reveal?.value} mystery={!reveal} result={reveal?.correct} />
    </div>
  );
}

function DriverCard({ label, driver, stat, value, mystery = false, result }: {
  label: string;
  driver: Pick<Driver, "first" | "last" | "code">;
  stat: { key: StatKey; label: string };
  value?: number;
  mystery?: boolean;
  result?: boolean;
}) {
  const resultClass = result === undefined ? "" : result ? " correct" : " wrong";
  return (
    <article className={`driverCard${mystery ? " mysteryCard" : ""}${resultClass}`}>
      <div className="cardTopline"><span>{label}</span><span>{driver.code}</span></div>
      <div className={`helmetShape${mystery ? " mystery" : ""}`} aria-hidden="true">{mystery ? "?" : driver.code}</div>
      <div className="driverCopy">
        <p>{driver.first}</p><h2>{driver.last}</h2>
        <div className="stat"><span>{value ?? "?"}</span><small>{stat.label}</small></div>
      </div>
    </article>
  );
}

function ChoiceButton({ choice, reference, disabled, onChoose }: {
  choice: Choice;
  reference: number;
  disabled: boolean;
  onChoose: (choice: Choice) => void;
}) {
  return (
    <button className="choice" disabled={disabled} onClick={() => onChoose(choice)}>
      <span className="choiceIcon">{choice === "higher" ? "+" : "−"}</span>
      <span><b>{choice.toUpperCase()}!</b><small>{choice === "higher" ? "MORE" : "LESS"} THAN {reference}</small></span>
    </button>
  );
}

function Progress({ answers, current }: { answers: boolean[]; current: number }) {
  return (
    <div className="progressRow" role="status" aria-label={`Round ${current + 1} of ${TOTAL_ROUNDS}. ${answers.filter(Boolean).length} correct so far.`}>
      {Array.from({ length: TOTAL_ROUNDS }, (_, index) => {
        const className = index < answers.length ? (answers[index] ? "correct" : "wrong") : index === current ? "current" : "";
        return <span key={index} className={`progressSegment ${className}`} aria-hidden="true" />;
      })}
    </div>
  );
}

function Complete({ state, countdown }: { state: GameState; countdown: string }) {
  const blocks = state.answers.map((answer) => answer ? "🟩" : "🟥").join("");
  const shareText = `Gridline Daily #${state.challengeNumber} — ${state.score}/${TOTAL_ROUNDS}\n${blocks}\nCan you beat my lap?`;
  async function share() {
    if (navigator.share) await navigator.share({ text: shareText }).catch(() => undefined);
    else await navigator.clipboard.writeText(shareText);
  }
  return (
    <div className="completeScreen">
      <div><p className="kicker">THE FINAL PANEL</p><h1><span>{state.score}/{TOTAL_ROUNDS}</span> CORRECT!</h1><p>Your score is inked into the record. Come back after the UTC reset for a fresh issue.</p></div>
      <div className="shareGrid" aria-label={`${state.score} correct out of ${TOTAL_ROUNDS}`}>
        {state.answers.map((answer, index) => <span key={index} className={`shareCell ${answer ? "correct" : ""}`} aria-hidden="true" />)}
      </div>
      <div className="completeActions"><button className="primaryButton" onClick={share}>SHARE RESULT</button><div className="countdown"><small>NEXT GRID IN</small><strong>{countdown}</strong></div></div>
    </div>
  );
}

function Stats({ state }: { state: GameState }) {
  return (
    <aside className="statsStrip" aria-label="Your saved stats">
      <div><strong>{state.stats.played}</strong><span>PLAYED</span></div>
      <div><strong>{state.stats.average?.toFixed(1) ?? "—"}</strong><span>AVG SCORE</span></div>
      <div><strong>{state.stats.streak}</strong><span>DAY STREAK</span></div>
    </aside>
  );
}

function LoadingState() {
  return <section className="stateCard" aria-live="polite"><div className="spinner" /><p>Loading today&apos;s grid…</p></section>;
}

function ErrorState({ message, retry }: { message: string; retry: () => Promise<void> }) {
  return <section className="stateCard"><p role="alert">{message}</p><button className="primaryButton" onClick={() => void retry()}>TRY AGAIN</button></section>;
}

async function fetchGameState(): Promise<GameState> {
  const response = await fetch("/api/game", { cache: "no-store" });
  const body = (await response.json()) as GameState & { error?: string };
  if (!response.ok) throw new Error(body.error ?? "Unable to load your game.");
  return body;
}

function secondsUntilUtcMidnight() {
  const now = new Date();
  const next = Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate() + 1);
  return Math.max(0, Math.floor((next - now.getTime()) / 1_000));
}

function formatCountdown(seconds: number) {
  const hours = String(Math.floor(seconds / 3_600)).padStart(2, "0");
  const minutes = String(Math.floor((seconds % 3_600) / 60)).padStart(2, "0");
  const remaining = String(seconds % 60).padStart(2, "0");
  return `${hours}:${minutes}:${remaining}`;
}
