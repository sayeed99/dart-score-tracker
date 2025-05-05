CREATE TABLE `games` (
	`id` serial AUTO_INCREMENT NOT NULL,
	`creator_id` bigint unsigned NOT NULL,
	`starting_score` int NOT NULL DEFAULT 501,
	`double_in` boolean NOT NULL DEFAULT false,
	`double_out` boolean NOT NULL DEFAULT true,
	`game_point_threshold` int NOT NULL DEFAULT 1,
	`is_complete` boolean NOT NULL DEFAULT false,
	`winner_id` bigint unsigned,
	`created_at` timestamp NOT NULL DEFAULT (now()),
	`updated_at` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `games_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `players_games` (
	`id` serial AUTO_INCREMENT NOT NULL,
	`user_id` bigint unsigned,
	`name` varchar(255) NOT NULL,
	`game_id` bigint unsigned NOT NULL,
	`is_winner` boolean DEFAULT false,
	`final_score` int NOT NULL,
	`game_points` int DEFAULT 0,
	`created_at` timestamp NOT NULL DEFAULT (now()),
	`updated_at` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `players_games_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `rounds` (
	`id` serial AUTO_INCREMENT NOT NULL,
	`game_id` bigint unsigned NOT NULL,
	`round_number` int NOT NULL,
	`created_at` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `rounds_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `scores` (
	`id` serial AUTO_INCREMENT NOT NULL,
	`round_id` bigint unsigned NOT NULL,
	`player_id` bigint unsigned NOT NULL,
	`score_value` int NOT NULL,
	`dart_values` json NOT NULL,
	`remaining_score` int NOT NULL,
	`created_at` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `scores_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `users` (
	`id` serial AUTO_INCREMENT NOT NULL,
	`name` varchar(255) NOT NULL,
	`email` varchar(255) NOT NULL,
	`password_hash` varchar(255) NOT NULL,
	`created_at` timestamp NOT NULL DEFAULT (now()),
	`updated_at` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `users_id` PRIMARY KEY(`id`),
	CONSTRAINT `users_email_unique` UNIQUE(`email`)
);
--> statement-breakpoint
ALTER TABLE `games` ADD CONSTRAINT `games_creator_id_users_id_fk` FOREIGN KEY (`creator_id`) REFERENCES `users`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `games` ADD CONSTRAINT `games_winner_id_users_id_fk` FOREIGN KEY (`winner_id`) REFERENCES `users`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `players_games` ADD CONSTRAINT `players_games_user_id_users_id_fk` FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `players_games` ADD CONSTRAINT `players_games_game_id_games_id_fk` FOREIGN KEY (`game_id`) REFERENCES `games`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `rounds` ADD CONSTRAINT `rounds_game_id_games_id_fk` FOREIGN KEY (`game_id`) REFERENCES `games`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `scores` ADD CONSTRAINT `scores_round_id_rounds_id_fk` FOREIGN KEY (`round_id`) REFERENCES `rounds`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `scores` ADD CONSTRAINT `scores_player_id_users_id_fk` FOREIGN KEY (`player_id`) REFERENCES `users`(`id`) ON DELETE no action ON UPDATE no action;