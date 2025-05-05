"use server";

import Link from "next/link";
import { getServerSession } from "next-auth";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { db } from "@/db";
import { games, playersGames, scores } from "@/db/schema";
import { inArray } from "drizzle-orm";
import { eq, count, avg, max, desc, and } from "drizzle-orm";
import { PlusCircle, Trophy, Target, BarChart3, Play } from "lucide-react";
import { safeParseUserId } from "@/lib/auth-utils";
import { authOptions } from "@/lib/[...nextauth]";

async function getUserStats(userId: number) {
  try {
    // Count total games
    const totalGamesResult = await db
      .select({ count: count() })
      .from(playersGames)
      .where(eq(playersGames.userId, userId));

    const totalGames = totalGamesResult[0]?.count || 0;

    // Count games won
    const gamesWonResult = await db
      .select({ count: count() })
      .from(playersGames)
      .where(eq(playersGames.userId, userId))
      .where(eq(playersGames.isWinner, true));

    const gamesWon = gamesWonResult[0]?.count || 0;

    // Calculate win percentage
    const winPercentage = totalGames > 0 ? (gamesWon / totalGames) * 100 : 0;

    // Get highest score in a round
    const highestScoreResult = await db
      .select({ maxScore: max(scores.scoreValue) })
      .from(scores)
      .where(eq(scores.playerId, userId));

    const highestScore = highestScoreResult[0]?.maxScore || 0;

    // Get average score per round
    const averageScoreResult = await db
      .select({ avgScore: avg(scores.scoreValue) })
      .from(scores)
      .where(eq(scores.playerId, userId));

    const averageScore = Math.round(averageScoreResult[0]?.avgScore || 0);

    return {
      totalGames,
      gamesWon,
      winPercentage: winPercentage.toFixed(1),
      highestScore,
      averageScore
    };
  } catch (error) {
    console.error("Error fetching user stats:", error);
    // Return default values if there's an error
    return {
      totalGames: 0,
      gamesWon: 0,
      winPercentage: "0.0",
      highestScore: 0,
      averageScore: 0
    };
  }
}

async function getRecentGames(userId: number, limit = 5) {
  try {
    // First, get distinct game IDs for this user
    const userGameIds = await db
      .selectDistinct({
        gameId: playersGames.gameId
      })
      .from(playersGames)
      .where(eq(playersGames.userId, userId))
      .orderBy(desc(playersGames.gameId))
      .limit(limit);
    
    const gameIdList = userGameIds.map(g => g.gameId);
    
    if (gameIdList.length === 0) {
      return [];
    }
    
    // Now get the game details
    const gameDetails = await db
      .select({
        id: games.id,
        createdAt: games.createdAt,
        startingScore: games.startingScore,
        isComplete: games.isComplete,
      })
      .from(games)
      .where(inArray(games.id, gameIdList))
      .orderBy(desc(games.createdAt));
    
    // Now get the player-specific information
    const playerInfo = await db
      .select({
        gameId: playersGames.gameId,
        finalScore: playersGames.finalScore,
        isWinner: playersGames.isWinner,
      })
      .from(playersGames)
      .where(
        and(
          eq(playersGames.userId, userId),
          inArray(playersGames.gameId, gameIdList)
        )
      );
    
    // Create a lookup for player info by game ID
    const playerInfoByGameId = {};
    playerInfo.forEach(info => {
      playerInfoByGameId[info.gameId] = info;
    });
    
    // Combine game details with player info
    return gameDetails.map(game => ({
      ...game,
      finalScore: playerInfoByGameId[game.id]?.finalScore || 0,
      isWinner: playerInfoByGameId[game.id]?.isWinner || false,
    }));
  } catch (error) {
    console.error("Error fetching recent games:", error);
    return [];
  }
}

async function getActiveGames(userId: number, limit = 3) {
  try {
    // First, get distinct active game IDs for this user
    const userActiveGameIds = await db
      .selectDistinct({
        gameId: playersGames.gameId
      })
      .from(playersGames)
      .innerJoin(games, eq(playersGames.gameId, games.id))
      .where(
        and(
          eq(playersGames.userId, userId),
          eq(games.isComplete, false)
        )
      )
      .orderBy(desc(games.updatedAt))
      .limit(limit);
    
    const gameIdList = userActiveGameIds.map(g => g.gameId);
    
    if (gameIdList.length === 0) {
      return [];
    }
    
    // Now get the game details
    const gameDetails = await db
      .select({
        id: games.id,
        createdAt: games.createdAt,
        updatedAt: games.updatedAt,
        startingScore: games.startingScore,
        isComplete: games.isComplete,
      })
      .from(games)
      .where(inArray(games.id, gameIdList))
      .orderBy(desc(games.updatedAt));
    
    // Now get the player-specific information
    const playerInfo = await db
      .select({
        gameId: playersGames.gameId,
        finalScore: playersGames.finalScore,
      })
      .from(playersGames)
      .where(
        and(
          eq(playersGames.userId, userId),
          inArray(playersGames.gameId, gameIdList)
        )
      );
    
    // Create a lookup for player info by game ID
    const playerInfoByGameId = {};
    playerInfo.forEach(info => {
      playerInfoByGameId[info.gameId] = info;
    });
    
    // Combine game details with player info
    return gameDetails.map(game => ({
      ...game,
      finalScore: playerInfoByGameId[game.id]?.finalScore || 0,
    }));
  } catch (error) {
    console.error("Error fetching active games:", error);
    return [];
  }
}

export default async function DashboardPage() {
  const session = await getServerSession(authOptions);

  const userId = safeParseUserId(session?.user?.id);

  if (!userId) {
    return null;
  }

  const stats = await getUserStats(userId);
  const recentGames = await getRecentGames(userId);
  const activeGames = await getActiveGames(userId);

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Dashboard</h1>
          <p className="text-muted-foreground">
            Welcome back, {session.user.name}!
          </p>
        </div>
        <Button asChild>
          <Link href="/dashboard/new-game">
            <PlusCircle className="mr-2 h-4 w-4" />
            New Game
          </Link>
        </Button>
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Games</CardTitle>
            <Target className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.totalGames}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Games Won</CardTitle>
            <Trophy className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.gamesWon}</div>
            <p className="text-xs text-muted-foreground">
              {stats.winPercentage}% win rate
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Highest Score</CardTitle>
            <BarChart3 className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.highestScore}</div>
            <p className="text-xs text-muted-foreground">
              In a single round
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Avg. Score</CardTitle>
            <BarChart3 className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.averageScore}</div>
            <p className="text-xs text-muted-foreground">
              Per round
            </p>
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        {/* Active Games Card */}
        {activeGames.length > 0 && (
          <Card className="col-span-1">
            <CardHeader>
              <CardTitle>Active Games</CardTitle>
              <CardDescription>
                Your ongoing dart games
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {activeGames.map((game) => (
                  <div
                    key={game.id}
                    className="flex items-center justify-between border-b pb-4 last:border-0 last:pb-0"
                  >
                    <div>
                      <p className="font-medium">
                        Game #{game.id}
                      </p>
                      <p className="text-sm text-muted-foreground">
                        Last played: {new Date(game.updatedAt).toLocaleDateString()}
                      </p>
                    </div>
                    <div className="flex items-center gap-2">
                      <p className="font-medium">
                        {game.finalScore}/{game.startingScore}
                      </p>
                      <Button asChild size="sm" className="bg-green-600 hover:bg-green-700">
                        <Link href={`/dashboard/new-game?id=${game.id}`}>
                          <Play className="h-4 w-4" />
                        </Link>
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
            <CardFooter>
              <Button asChild variant="outline" className="w-full">
                <Link href="/dashboard/history?status=active">
                  View All Active Games
                </Link>
              </Button>
            </CardFooter>
          </Card>
        )}

        {/* Recent Games Card */}
        <Card className="col-span-1">
          <CardHeader>
            <CardTitle>Recent Games</CardTitle>
            <CardDescription>
              Your most recent games
            </CardDescription>
          </CardHeader>
          <CardContent>
            {recentGames.length === 0 ? (
              <p className="text-center py-6 text-muted-foreground">
                You haven't played any games yet.
              </p>
            ) : (
              <div className="space-y-4">
                {recentGames.map((game, id) => (
                  <div
                    key={game.id}
                    className="flex items-center justify-between border-b pb-4 last:border-0 last:pb-0"
                  >
                    <div>
                      <p className="font-medium">
                        Game #{recentGames.length - (id)}
                      </p>
                      <p className="text-sm text-muted-foreground">
                        {new Date(game.createdAt).toLocaleDateString()}
                      </p>
                    </div>
                    <div className="text-right">
                      <p className="font-medium">
                        {game.finalScore}/{game.startingScore}
                      </p>
                      <p className={`text-sm ${game.isComplete ? "text-green-500" : "text-red-500"}`}>
                        {game.isWinner ? "Completed" : "Pending"}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
          <CardFooter>
            <Button asChild variant="outline" className="w-full">
              <Link href="/dashboard/history">
                View All Games
              </Link>
            </Button>
          </CardFooter>
        </Card>
      </div>
    </div>
  );
}
