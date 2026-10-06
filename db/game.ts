import { env } from "cloudflare:workers";
import type { ChatGPTUser } from "@/app/chatgpt-auth";

export type StoredAnswer = {
  roundIndex: number;
  choice: "higher" | "lower";
  correct: boolean;
};

export type Attempt = {
  id: number;
  completed: boolean;
  answers: StoredAnswer[];
};

export async function ensureUser(user: ChatGPTUser): Promise<void> {
  await env.DB.prepare(
    `INSERT INTO users (id, email, display_name, created_at, updated_at)
     VALUES (?, ?, ?, datetime('now'), datetime('now'))
     ON CONFLICT(id) DO UPDATE SET
       email = excluded.email,
       display_name = excluded.display_name,
       updated_at = datetime('now')`,
  ).bind(user.userId, user.email, user.displayName).run();
}

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
  choice: "higher" | "lower",
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

export async function getPlayerStats(userId: string): Promise<{
  played: number;
  average: number | null;
  streak: number;
}> {
  const summary = await env.DB.prepare(
    `SELECT COUNT(*) AS played, AVG(score) AS average
     FROM daily_attempts
     WHERE user_id = ? AND completed = 1`,
  ).bind(userId).first<{ played: number; average: number | null }>();
  const rows = await env.DB.prepare(
    `SELECT challenge_date AS challengeDate
     FROM daily_attempts
     WHERE user_id = ? AND completed = 1
     ORDER BY challenge_date DESC
     LIMIT 366`,
  ).bind(userId).all<{ challengeDate: string }>();

  return {
    played: Number(summary?.played ?? 0),
    average: summary?.average == null ? null : Number(summary.average),
    streak: calculateStreak(rows.results.map((row) => row.challengeDate)),
  };
}

async function getAnswers(attemptId: number): Promise<StoredAnswer[]> {
  const rows = await env.DB.prepare(
    `SELECT round_index AS roundIndex, choice, correct
     FROM attempt_answers
     WHERE attempt_id = ?
     ORDER BY round_index`,
  ).bind(attemptId).all<{ roundIndex: number; choice: "higher" | "lower"; correct: number }>();
  return rows.results.map((row) => ({ ...row, correct: row.correct === 1 }));
}

function calculateStreak(dateKeys: string[]): number {
  if (dateKeys.length === 0) return 0;
  const completedDates = new Set(dateKeys);
  const cursor = new Date();
  cursor.setUTCHours(0, 0, 0, 0);
  if (!completedDates.has(cursor.toISOString().slice(0, 10))) cursor.setUTCDate(cursor.getUTCDate() - 1);

  let streak = 0;
  while (completedDates.has(cursor.toISOString().slice(0, 10))) {
    streak += 1;
    cursor.setUTCDate(cursor.getUTCDate() - 1);
  }
  return streak;
}
