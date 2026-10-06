import { env } from "cloudflare:workers";
import { getChallengeDateKey } from "@/app/game-data";

export type StoredAnswer = {
  roundIndex: number;
  choice: string;
  correct: boolean;
};

export type Attempt = {
  id: number;
  completed: boolean;
  answers: StoredAnswer[];
};

export type LeaderboardEntry = {
  rank: number;
  name: string;
  score: number;
  isCurrentUser: boolean;
};

export async function getOrCreateAttempt(userId: string, dateKey: string): Promise<Attempt> {
  await env.DB.prepare(
    `INSERT INTO daily_attempts (user_id, challenge_date, started_at)
     VALUES (?, ?, datetime('now'))
     ON CONFLICT(user_id, challenge_date) DO NOTHING`,
  ).bind(userId, dateKey).run();

  const row = await env.DB.prepare(
    `SELECT id, completed
     FROM daily_attempts
     WHERE user_id = ? AND challenge_date = ?`,
  ).bind(userId, dateKey).first<{ id: number; completed: number }>();

  if (!row) throw new Error("Unable to create today's attempt.");
  return { id: row.id, completed: row.completed === 1, answers: await getAnswers(row.id) };
}

export async function recordAnswer(
  attemptId: number,
  roundIndex: number,
  choice: string,
  correct: boolean,
): Promise<StoredAnswer[]> {
  await env.DB.prepare(
    `INSERT INTO attempt_answers (attempt_id, round_index, choice, correct, answered_at)
     VALUES (?, ?, ?, ?, datetime('now'))
     ON CONFLICT(attempt_id, round_index) DO NOTHING`,
  ).bind(attemptId, roundIndex, choice, correct ? 1 : 0).run();
  return getAnswers(attemptId);
}

export async function completeAttempt(attemptId: number, score: number): Promise<void> {
  await env.DB.prepare(
    `UPDATE daily_attempts
     SET score = ?, completed = 1, completed_at = datetime('now')
     WHERE id = ? AND completed = 0`,
  ).bind(score, attemptId).run();
}

export async function getPlayerStats(userId: string, ruleset: string): Promise<{
  played: number;
  highest: number | null;
  streak: number;
  overallRank: number | null;
}> {
  const [summary, overall, rows] = await Promise.all([env.DB.prepare(
    `SELECT COUNT(*) AS played, MAX(score) AS highest
     FROM daily_attempts
     WHERE user_id = ? AND completed = 1 AND challenge_date LIKE ?`,
  ).bind(userId, `%:${ruleset}`).first<{ played: number; highest: number | null }>(), env.DB.prepare(
    `WITH daily_ranked AS (
       SELECT user_id,
              RANK() OVER (
                PARTITION BY challenge_date
                ORDER BY score DESC, completed_at ASC, user_id ASC
              ) AS daily_rank
       FROM daily_attempts
       WHERE completed = 1 AND challenge_date LIKE ?
     ), average_ranks AS (
       SELECT user_id, AVG(daily_rank) AS average_rank
       FROM daily_ranked
       GROUP BY user_id
     ), overall_ranked AS (
       SELECT user_id,
              RANK() OVER (ORDER BY average_rank ASC) AS overall_rank
       FROM average_ranks
     )
     SELECT overall_rank AS overallRank
     FROM overall_ranked
     WHERE user_id = ?`,
  ).bind(`%:${ruleset}`, userId).first<{ overallRank: number }>(), env.DB.prepare(
    `SELECT challenge_date AS challengeDate
     FROM daily_attempts
     WHERE user_id = ? AND completed = 1 AND challenge_date LIKE ?
     ORDER BY challenge_date DESC
     LIMIT 366`,
  ).bind(userId, `%:${ruleset}`).all<{ challengeDate: string }>()]);

  return {
    played: Number(summary?.played ?? 0),
    highest: summary?.highest == null ? null : Number(summary.highest),
    streak: calculateStreak(rows.results.map((row) => row.challengeDate)),
    overallRank: overall?.overallRank == null ? null : Number(overall.overallRank),
  };
}

export async function getLeaderboards(
  attemptKey: string,
  userId: string,
  countryCode: string | null,
  favoriteTeam: string,
): Promise<{ worldwide: LeaderboardEntry[]; national: LeaderboardEntry[]; team: LeaderboardEntry[] }> {
  const worldwide = await queryLeaderboard(attemptKey, userId);
  const national = countryCode ? await queryLeaderboard(attemptKey, userId, countryCode) : [];
  const team = await queryLeaderboard(attemptKey, userId, undefined, favoriteTeam);
  return { worldwide, national, team };
}

async function queryLeaderboard(
  attemptKey: string,
  userId: string,
  countryCode?: string,
  favoriteTeam?: string,
): Promise<LeaderboardEntry[]> {
  const countryClause = countryCode ? "AND u.country_code = ?" : "";
  const teamClause = favoriteTeam ? "AND u.favorite_team = ?" : "";
  const statement = env.DB.prepare(
    `WITH ranked AS (
       SELECT
         da.user_id AS userId,
         u.username AS name,
         da.score AS score,
         ROW_NUMBER() OVER (ORDER BY da.score DESC, da.completed_at ASC, da.user_id ASC) AS rank
       FROM daily_attempts da
       JOIN users u ON u.id = da.user_id
       WHERE da.challenge_date = ?
         AND da.completed = 1
         AND u.username IS NOT NULL
         ${countryClause} ${teamClause}
     )
     SELECT rank, userId, name, score
     FROM ranked
     WHERE rank <= 10 OR userId = ?
     ORDER BY rank`,
  );
  const filters = [attemptKey, ...(countryCode ? [countryCode] : []), ...(favoriteTeam ? [favoriteTeam] : []), userId];
  const rows = await statement.bind(...filters).all<{
        rank: number;
        userId: string;
        name: string;
        score: number;
      }>();
  return rows.results.map((row) => ({
    rank: Number(row.rank),
    name: row.name,
    score: Number(row.score),
    isCurrentUser: row.userId === userId,
  }));
}

async function getAnswers(attemptId: number): Promise<StoredAnswer[]> {
  const rows = await env.DB.prepare(
    `SELECT round_index AS roundIndex, choice, correct
     FROM attempt_answers
     WHERE attempt_id = ?
     ORDER BY round_index`,
  ).bind(attemptId).all<{ roundIndex: number; choice: string; correct: number }>();
  return rows.results.map((row) => ({ ...row, correct: row.correct === 1 }));
}

function calculateStreak(attemptKeys: string[]): number {
  const dateKeys = attemptKeys.map((key) => key.split(":", 1)[0]);
  if (dateKeys.length === 0) return 0;
  const completedDates = new Set(dateKeys);
  const cursor = new Date(`${getChallengeDateKey()}T12:00:00Z`);
  if (!completedDates.has(cursor.toISOString().slice(0, 10))) cursor.setUTCDate(cursor.getUTCDate() - 1);

  let streak = 0;
  while (completedDates.has(cursor.toISOString().slice(0, 10))) {
    streak += 1;
    cursor.setUTCDate(cursor.getUTCDate() - 1);
  }
  return streak;
}
