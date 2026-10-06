import { integer, sqliteTable, text, uniqueIndex } from "drizzle-orm/sqlite-core";

export const users = sqliteTable("users", {
  id: text("id").primaryKey(),
  email: text("email").notNull(),
  displayName: text("display_name").notNull(),
  createdAt: text("created_at").notNull(),
  updatedAt: text("updated_at").notNull(),
});

export const dailyAttempts = sqliteTable(
  "daily_attempts",
  {
    id: integer("id").primaryKey({ autoIncrement: true }),
    userId: text("user_id").notNull().references(() => users.id),
    challengeDate: text("challenge_date").notNull(),
    score: integer("score").notNull().default(0),
    completed: integer("completed", { mode: "boolean" }).notNull().default(false),
    startedAt: text("started_at").notNull(),
    completedAt: text("completed_at"),
  },
  (table) => [uniqueIndex("daily_attempt_user_date_unique").on(table.userId, table.challengeDate)],
);

export const attemptAnswers = sqliteTable(
  "attempt_answers",
  {
    id: integer("id").primaryKey({ autoIncrement: true }),
    attemptId: integer("attempt_id").notNull().references(() => dailyAttempts.id),
    roundIndex: integer("round_index").notNull(),
    choice: text("choice", { enum: ["higher", "lower"] }).notNull(),
    correct: integer("correct", { mode: "boolean" }).notNull(),
    answeredAt: text("answered_at").notNull(),
  },
  (table) => [uniqueIndex("attempt_answer_round_unique").on(table.attemptId, table.roundIndex)],
);
