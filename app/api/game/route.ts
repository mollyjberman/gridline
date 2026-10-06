import { NextResponse } from "next/server";
import { getChatGPTUser } from "@/app/chatgpt-auth";
import {
  buildPuzzles,
  correctChoice,
  getChallengeNumber,
  getUtcDateKey,
  TOTAL_ROUNDS,
  type Choice,
} from "@/app/game-data";
import {
  completeAttempt,
  ensureUser,
  getOrCreateAttempt,
  getPlayerStats,
  recordAnswer,
  type StoredAnswer,
} from "@/db/game";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const user = await getChatGPTUser();
    if (!user) return NextResponse.json({ error: "Sign in required." }, { status: 401 });
    await ensureUser(user);
    const dateKey = getUtcDateKey();
    const attempt = await getOrCreateAttempt(user.userId, dateKey);
    return NextResponse.json(
      toGameState(dateKey, attempt.answers, attempt.completed, await getPlayerStats(user.userId)),
    );
  } catch (error) {
    console.error("Unable to load game state", error);
    return NextResponse.json({ error: "Your game is temporarily unavailable. Please try again." }, { status: 503 });
  }
}

export async function POST(request: Request) {
  try {
    const user = await getChatGPTUser();
    if (!user) return NextResponse.json({ error: "Sign in required." }, { status: 401 });
    const body = (await request.json()) as { choice?: unknown };
    if (body.choice !== "higher" && body.choice !== "lower") {
      return NextResponse.json({ error: "Choose higher or lower." }, { status: 400 });
    }

    await ensureUser(user);
    const dateKey = getUtcDateKey();
    const attempt = await getOrCreateAttempt(user.userId, dateKey);
    if (attempt.completed) {
      return NextResponse.json(
        toGameState(dateKey, attempt.answers, true, await getPlayerStats(user.userId)),
        { status: 409 },
      );
    }

    const roundIndex = attempt.answers.length;
    const puzzle = buildPuzzles(dateKey)[roundIndex];
    if (!puzzle) {
      await completeAttempt(attempt.id, score(attempt.answers));
      return NextResponse.json(
        toGameState(dateKey, attempt.answers, true, await getPlayerStats(user.userId)),
      );
    }

    const expectedChoice = correctChoice(puzzle);
    const answers = await recordAnswer(
      attempt.id,
      roundIndex,
      body.choice as Choice,
      expectedChoice !== null && body.choice === expectedChoice,
    );
    const completed = answers.length === TOTAL_ROUNDS;
    if (completed) await completeAttempt(attempt.id, score(answers));

    return NextResponse.json({
      ...toGameState(dateKey, answers, completed, await getPlayerStats(user.userId)),
      reveal: {
        value: puzzle.mystery[puzzle.stat.key],
        correct: answers[roundIndex]?.correct ?? false,
        expectedChoice,
      },
    });
  } catch (error) {
    console.error("Unable to record answer", error);
    return NextResponse.json({ error: "Your answer could not be saved. Please try again." }, { status: 503 });
  }
}

function score(answers: StoredAnswer[]): number {
  return answers.filter((answer) => answer.correct).length;
}

function toGameState(
  dateKey: string,
  answers: StoredAnswer[],
  completed: boolean,
  stats: { played: number; average: number | null; streak: number },
) {
  const puzzles = buildPuzzles(dateKey);
  const puzzle = puzzles[Math.min(answers.length, TOTAL_ROUNDS - 1)];
  return {
    dateKey,
    challengeNumber: getChallengeNumber(dateKey),
    completed,
    score: score(answers),
    answers: answers.map((answer) => answer.correct),
    stats,
    puzzle: completed ? null : {
      roundIndex: answers.length,
      known: puzzle.known,
      mystery: { first: puzzle.mystery.first, last: puzzle.mystery.last, code: puzzle.mystery.code },
      stat: puzzle.stat,
    },
  };
}
