import { NextResponse } from "next/server";
import { getChatGPTUser } from "@/app/chatgpt-auth";
import {
  buildPuzzle,
  correctDriverCode,
  getAttemptKey,
  getChallengeNumber,
  getDailyStat,
  getUtcDateKey,
  MAX_MISTAKES,
  RULESET,
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
    const attempt = await getOrCreateAttempt(user.userId, getAttemptKey(dateKey));
    return NextResponse.json(
      toGameState(dateKey, attempt.answers, attempt.completed, await getPlayerStats(user.userId, RULESET)),
    );
  } catch (error) {
    console.error("Unable to load game state", error);
    return NextResponse.json(
      { error: "Your game is temporarily unavailable. Please try again." },
      { status: 503 },
    );
  }
}

export async function POST(request: Request) {
  try {
    const user = await getChatGPTUser();
    if (!user) return NextResponse.json({ error: "Sign in required." }, { status: 401 });

    const body = (await request.json()) as { choice?: unknown };
    if (typeof body.choice !== "string") {
      return NextResponse.json({ error: "Choose a driver." }, { status: 400 });
    }

    await ensureUser(user);
    const dateKey = getUtcDateKey();
    const attempt = await getOrCreateAttempt(user.userId, getAttemptKey(dateKey));
    if (attempt.completed) {
      return NextResponse.json(
        toGameState(dateKey, attempt.answers, true, await getPlayerStats(user.userId, RULESET)),
        { status: 409 },
      );
    }

    const roundIndex = attempt.answers.length;
    const puzzle = buildPuzzle(dateKey, roundIndex);
    const validCodes = puzzle.drivers.map((driver) => driver.code);
    if (!validCodes.includes(body.choice)) {
      return NextResponse.json({ error: "Choose one of the two drivers." }, { status: 400 });
    }

    const correctCode = correctDriverCode(puzzle);
    const answers = await recordAnswer(
      attempt.id,
      roundIndex,
      body.choice,
      body.choice === correctCode,
    );
    const completed = mistakes(answers) >= MAX_MISTAKES;
    if (completed) await completeAttempt(attempt.id, score(answers));

    return NextResponse.json({
      ...toGameState(dateKey, answers, completed, await getPlayerStats(user.userId, RULESET)),
      reveal: {
        correct: answers[roundIndex]?.correct ?? false,
        correctCode,
        selectedCode: body.choice,
      },
    });
  } catch (error) {
    console.error("Unable to record answer", error);
    return NextResponse.json(
      { error: "Your answer could not be saved. Please try again." },
      { status: 503 },
    );
  }
}

function score(answers: StoredAnswer[]): number {
  return answers.filter((answer) => answer.correct).length;
}

function mistakes(answers: StoredAnswer[]): number {
  return answers.filter((answer) => !answer.correct).length;
}

function toGameState(
  dateKey: string,
  answers: StoredAnswer[],
  completed: boolean,
  stats: { played: number; average: number | null; streak: number },
) {
  const dailyStat = getDailyStat(dateKey);
  const puzzle = buildPuzzle(dateKey, answers.length);
  return {
    dateKey,
    challengeNumber: getChallengeNumber(dateKey),
    completed,
    score: score(answers),
    mistakes: mistakes(answers),
    answers: answers.map((answer) => answer.correct),
    stats,
    category: { label: dailyStat.label, question: dailyStat.question },
    puzzle: completed ? null : {
      roundIndex: answers.length,
      drivers: puzzle.drivers.map(({ first, last, code }) => ({ first, last, code })),
    },
  };
}
