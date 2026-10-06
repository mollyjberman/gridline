CREATE TABLE `attempt_answers` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`attempt_id` integer NOT NULL,
	`round_index` integer NOT NULL,
	`choice` text NOT NULL,
	`correct` integer NOT NULL,
	`answered_at` text NOT NULL,
	FOREIGN KEY (`attempt_id`) REFERENCES `daily_attempts`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE UNIQUE INDEX `attempt_answer_round_unique` ON `attempt_answers` (`attempt_id`,`round_index`);--> statement-breakpoint
CREATE TABLE `daily_attempts` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`user_id` text NOT NULL,
	`challenge_date` text NOT NULL,
	`score` integer DEFAULT 0 NOT NULL,
	`completed` integer DEFAULT false NOT NULL,
	`started_at` text NOT NULL,
	`completed_at` text,
	FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE UNIQUE INDEX `daily_attempt_user_date_unique` ON `daily_attempts` (`user_id`,`challenge_date`);--> statement-breakpoint
CREATE TABLE `users` (
	`id` text PRIMARY KEY NOT NULL,
	`email` text NOT NULL,
	`display_name` text NOT NULL,
	`created_at` text NOT NULL,
	`updated_at` text NOT NULL
);
