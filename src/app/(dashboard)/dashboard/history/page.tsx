"use server";

import Link from "next/link";
import { getServerSession } from "next-auth";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow
} from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { db } from "@/db";
import { games, playersGames } from "@/db/schema";
import { eq, desc } from "drizzle-orm";
import { Eye, Trophy, Play } from "lucide-react";
import { safeParseUserId } from "@/lib/auth-utils";
import { authOptions } from "@/lib/[...nextauth]";

async function getUserGames(userId: number, status?: string) {
  try {
    // Base query for user's games
    let query = db
      .select({
        id: games.id,
        createdAt: games.createdAt,
        updatedAt: games.updatedAt,
        startingScore: games.startingScore,
        isComplete: games.isComplete,
        doubleIn: games.doubleIn,
        doubleOut: games.doubleOut,
        isWinner: playersGames.isWinner,
        finalScore: playersGames.finalScore,
        gamePoints: playersGames.gamePoints,
      })
      .from(games)
      .innerJoin(playersGames, eq(games.id, playersGames.gameId))
      .where(eq(playersGames.userId, userId))
      .orderBy(desc(games.updatedAt))
      .limit(50);

    // Filter by status if provided
    if (status === "active") {
      query = query.where(eq(games.isComplete, false));
    } else if (status === "completed") {
      query = query.where(eq(games.isComplete, true));
    }

    return await query;
  } catch (error) {
    console.error("Error fetching game history:", error);
    return [];
  }
}

export default async function HistoryPage({
  searchParams,
}: {
  searchParams: { status?: string }
}) {
  const session = await getServerSession(authOptions);

  const userId = safeParseUserId(session?.user?.id);
  if (!userId) {
    return null;
  }

  const status = searchParams.status;
  const userGames = await getUserGames(userId, status);

  // Create status title based on filters
  const statusTitle = status === "active"
    ? "Active Games"
    : status === "completed"
      ? "Completed Games"
      : "All Games";

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row md:items-end md:justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Game History</h1>
          <p className="text-muted-foreground">
            {statusTitle} - View your performance
          </p>
        </div>
        <div className="flex gap-2">
          <Button
            variant={!status ? "default" : "outline"}
            asChild
            size="sm"
          >
            <Link href="/dashboard/history">All Games</Link>
          </Button>
          <Button
            variant={status === "active" ? "default" : "outline"}
            asChild
            size="sm"
          >
            <Link href="/dashboard/history?status=active">Active</Link>
          </Button>
          <Button
            variant={status === "completed" ? "default" : "outline"}
            asChild
            size="sm"
          >
            <Link href="/dashboard/history?status=completed">Completed</Link>
          </Button>
        </div>
      </div>

      {userGames.length === 0 ? (
        <div className="rounded-lg border p-8 text-center">
          <Trophy className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
          <h2 className="text-2xl font-semibold mb-2">No Games Found</h2>
          <p className="text-muted-foreground mb-4">
            {status === "active"
              ? "You don't have any active games. Start a new game to track your progress."
              : status === "completed"
                ? "You haven't completed any games yet."
                : "You haven't played any games yet. Start a new game to track your progress."}
          </p>
          <Button asChild>
            <Link href="/dashboard/new-game">Start New Game</Link>
          </Button>
        </div>
      ) : (
        <div className="rounded-lg border">
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Game #</TableHead>
                  <TableHead>Date</TableHead>
                  <TableHead>Starting Score</TableHead>
                  <TableHead>Current Score</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Game Rules</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {userGames.map((game) => (
                  <TableRow key={game.id}>
                    <TableCell className="font-medium">{game.id}</TableCell>
                    <TableCell>
                      {new Date(game.updatedAt || game.createdAt).toLocaleDateString()}
                    </TableCell>
                    <TableCell>{game.startingScore}</TableCell>
                    <TableCell>{game.finalScore}</TableCell>
                    <TableCell>
                      {game.isComplete ? (
                        game.isWinner ? (
                          <Badge variant="success" className="bg-green-500 hover:bg-green-600">
                            Won
                          </Badge>
                        ) : (
                          <Badge variant="destructive">
                            Lost
                          </Badge>
                        )
                      ) : (
                        <Badge variant="outline" className="border-yellow-500 text-yellow-500">
                          In Progress
                        </Badge>
                      )}
                    </TableCell>
                    <TableCell>
                      <div className="flex gap-2">
                        {game.doubleIn && (
                          <Badge variant="outline">Double In</Badge>
                        )}
                        {game.doubleOut && (
                          <Badge variant="outline">Double Out</Badge>
                        )}
                      </div>
                    </TableCell>
                    <TableCell className="text-right">
                      {game.isComplete ? (
                        <Button
                          variant="ghost"
                          size="sm"
                          asChild
                        >
                          <Link href={`/dashboard/history/${game.id}`}>
                            <Eye className="h-4 w-4 mr-1" />
                            View
                          </Link>
                        </Button>
                      ) : (
                        <Button
                          variant="ghost"
                          size="sm"
                          asChild
                          className="text-green-600"
                        >
                          <Link href={`/dashboard/new-game?id=${game.id}`}>
                            <Play className="h-4 w-4 mr-1" />
                            Resume
                          </Link>
                        </Button>
                      )}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </div>
      )}
    </div>
  );
}
