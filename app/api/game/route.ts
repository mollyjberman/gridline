import { NextResponse } from "next/server";
import { getCurrentUser, getCountryCode } from "@/app/auth";
import {
  buildPuzzle,
  correctDriverCode,
  getAttemptKey,
  getChallengeNumber,
  getDailyStat,
  getDriverTeamArt,
  getChallengeDateKey,
  MAX_MISTAKES,
  RULESET,
} from "@/app/game-data";
import {
  completeAttempt,
  getLeaderboards,
  getOrCreateAttempt,
  getPlayerStats,
  recordAnswer,
  type StoredAnswer,
} from "@/db/game";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  try {
    const user = await getCurrentUser(request);
    if (!user) return NextResponse.json({ error: "Sign in required." }, { status: 401 });

    const countryCode = user.countryCode ?? getCountryCode(request);
    const dateKey = getChallengeDateKey();
    const attempt = await getOrCreateAttempt(user.id, getAttemptKey(dateKey));
    return NextResponse.json(
      toGameState(
        dateKey,
        attempt.answers,
        attempt.completed,
        await getPlayerContext(user.id, dateKey, countryCode, user.favoriteTeam),
      ),
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
    const user = await getCurrentUser(request);
    if (!user) return NextResponse.json({ error: "Sign in required." }, { status: 401 });

    const body = (await request.json()) as { choice?: unknown };
    if (typeof body.choice !== "string") {
      return NextResponse.json({ error: "Choose a driver." }, { status: 400 });
    }

    const countryCode = user.countryCode ?? getCountryCode(request);
    const dateKey = getChallengeDateKey();
    const attempt = await getOrCreateAttempt(user.id, getAttemptKey(dateKey));
    if (attempt.completed) {
      return NextResponse.json(
        toGameState(
          dateKey,
          attempt.answers,
          true,
          await getPlayerContext(user.id, dateKey, countryCode, user.favoriteTeam),
        ),
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
      ...toGameState(
        dateKey,
        answers,
        completed,
        await getPlayerContext(user.id, dateKey, countryCode, user.favoriteTeam),
      ),
      reveal: {
        correct: answers[roundIndex]?.correct ?? false,
        correctCode,
        selectedCode: body.choice,
        values: Object.fromEntries(puzzle.drivers.map((driver) => [driver.code, driver[puzzle.stat.key]])),
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
  context: Awaited<ReturnType<typeof getPlayerContext>>,
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
    stats: context.stats,
    leaderboards: context.leaderboards,
    countryCode: context.countryCode,
    favoriteTeam: context.favoriteTeam,
    category: { label: dailyStat.label, question: dailyStat.question },
    puzzle: completed ? null : {
      roundIndex: answers.length,
      drivers: puzzle.drivers.map(({ first, last, code }) => ({ first, last, code, ...getDriverTeamArt(code) })),
    },
  };
}

async function getPlayerContext(userId: string, dateKey: string, countryCode: string | null, favoriteTeam: string) {
  const [stats, leaderboards] = await Promise.all([
    getPlayerStats(userId, RULESET),
    getLeaderboards(getAttemptKey(dateKey), userId, countryCode, favoriteTeam),
  ]);
  return { stats, leaderboards, countryCode, favoriteTeam };
}
