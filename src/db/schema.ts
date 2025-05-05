import { mysqlTable, serial, varchar, timestamp, int, bigint, json, boolean, text, primaryKey } from 'drizzle-orm/mysql-core';
import { relations } from 'drizzle-orm';
import { type InferSelectModel, type InferInsertModel } from 'drizzle-orm';

// Users table
export const users = mysqlTable('users', {
  id: serial('id').primaryKey(),
  name: varchar('name', { length: 255 }).notNull(),
  email: varchar('email', { length: 255 }).notNull().unique(),
  passwordHash: varchar('password_hash', { length: 255 }).notNull(),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().onUpdateNow().notNull(),
});

export type User = InferSelectModel<typeof users>;
export type NewUser = InferInsertModel<typeof users>;

// User relations
export const usersRelations = relations(users, ({ many }) => ({
  games: many(games),
}));

// Players-Games join table for multiplayer games
export const playersGames = mysqlTable('players_games', {
  id: serial('id').primaryKey(),
  userId: bigint('user_id', {
    unsigned: true,
    mode: 'number'
  }).references(() => users.id, { onDelete: 'cascade' }),
  playerName: varchar('name', { length: 255 }).notNull(),
  gameId: bigint('game_id', {
    unsigned: true,
    mode: 'number'
  }).notNull().references(() => games.id, { onDelete: 'cascade' }),
  isWinner: boolean('is_winner').default(false),
  finalScore: int('final_score').notNull(),
  gamePoints: int('game_points').default(0),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().onUpdateNow().notNull(),
});

// Games table
export const games = mysqlTable('games', {
  id: serial('id').primaryKey(),
  creatorId: bigint('creator_id', {
    unsigned: true,
    mode: 'number'
  }).notNull().references(() => users.id),
  startingScore: int('starting_score').notNull().default(501),
  doubleIn: boolean('double_in').notNull().default(false),
  doubleOut: boolean('double_out').notNull().default(true),
  gamePointThreshold: int('game_point_threshold').notNull().default(1),
  isComplete: boolean('is_complete').notNull().default(false),
  winnerId: bigint('winner_id', {
    unsigned: true,
    mode: 'number'
  }),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().onUpdateNow().notNull(),
});

export type Game = InferSelectModel<typeof games>;
export type NewGame = InferInsertModel<typeof games>;

// Game relations
export const gamesRelations = relations(games, ({ one, many }) => ({
  creator: one(users, {
    fields: [games.creatorId],
    references: [users.id],
  }),
  winner: one(users, {
    fields: [games.winnerId],
    references: [users.id],
  }),
  rounds: many(rounds),
  players: many(playersGames),
}));

// Rounds table
export const rounds = mysqlTable('rounds', {
  id: serial('id').primaryKey(),
  gameId: bigint('game_id', {
    unsigned: true,
    mode: 'number'
  }).notNull().references(() => games.id, { onDelete: 'cascade' }),
  roundNumber: int('round_number').notNull(),
  createdAt: timestamp('created_at').defaultNow().notNull(),
});

export type Round = InferSelectModel<typeof rounds>;
export type NewRound = InferInsertModel<typeof rounds>;

// Rounds relations
export const roundsRelations = relations(rounds, ({ one, many }) => ({
  game: one(games, {
    fields: [rounds.gameId],
    references: [games.id],
  }),
  scores: many(scores),
}));

// Scores table (for each player's round score)
export const scores = mysqlTable('scores', {
  id: serial('id').primaryKey(),
  roundId: bigint('round_id', {
    unsigned: true,
    mode: 'number'
  }).notNull().references(() => rounds.id, { onDelete: 'cascade' }),
  playerId: bigint('player_id', {
    unsigned: true,
    mode: 'number'
  }),
  scoreValue: int('score_value').notNull(),
  // Store the dart values as JSON (e.g., [{value: 20, multiplier: 2}, {value: 19, multiplier: 1}, ...])
  dartValues: json('dart_values').$type<Array<{value: number, multiplier: number}>>().notNull(),
  remainingScore: int('remaining_score').notNull(),
  createdAt: timestamp('created_at').defaultNow().notNull(),
});

export type Score = InferSelectModel<typeof scores>;
export type NewScore = InferInsertModel<typeof scores>;

// Scores relations
export const scoresRelations = relations(scores, ({ one }) => ({
  round: one(rounds, {
    fields: [scores.roundId],
    references: [rounds.id],
  }),
  player: one(users, {
    fields: [scores.playerId],
    references: [users.id],
  }),
}));