ALTER TABLE `scores` DROP FOREIGN KEY `scores_player_id_users_id_fk`;
--> statement-breakpoint
ALTER TABLE `scores` MODIFY COLUMN `player_id` bigint unsigned;