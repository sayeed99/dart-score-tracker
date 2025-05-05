import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { db } from "@/db";
import { games, playersGames, rounds, scores } from "@/db/schema";
import { eq, and, desc } from "drizzle-orm";
import { authOptions } from "@/lib/[...nextauth]";
import { redirect } from "next/navigation";

// GET /api/games - Get all games for the current user
export async function GET(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const userId = parseInt(session.user.id);
  const url = new URL(req.url);
  const status = url.searchParams.get("status"); // 'active', 'completed', or null for all

  try {
    // Base query to get games that include the current user
    const query = db
      .select({
        id: games.id,
        creatorId: games.creatorId,
        startingScore: games.startingScore,
        doubleIn: games.doubleIn,
        doubleOut: games.doubleOut,
        gamePointThreshold: games.gamePointThreshold,
        isComplete: games.isComplete,
        winnerId: games.winnerId,
        createdAt: games.createdAt,
        updatedAt: games.updatedAt,
        playerData: playersGames,
      })
      .from(games)
      .innerJoin(
        playersGames,
        and(
          eq(games.id, playersGames.gameId),
          eq(playersGames.userId, userId)
        )
      )
      .orderBy(desc(games.updatedAt));

    // Filter by status if specified
    let filteredGames;
    if (status === "active") {
      filteredGames = await query.where(eq(games.isComplete, false));
    } else if (status === "completed") {
      filteredGames = await query.where(eq(games.isComplete, true));
    } else {
      filteredGames = await query;
    }

    // Format the results to remove the nested player data
    const formattedGames = filteredGames.map((game) => ({
      id: game.id,
      creatorId: game.creatorId,
      startingScore: game.startingScore,
      doubleIn: game.doubleIn,
      doubleOut: game.doubleOut,
      gamePointThreshold: game.gamePointThreshold,
      isComplete: game.isComplete,
      winnerId: game.winnerId,
      createdAt: game.createdAt,
      updatedAt: game.updatedAt,
      finalScore: game.playerData.finalScore,
      isWinner: game.playerData.isWinner,
      gamePoints: game.playerData.gamePoints,
    }));

    return NextResponse.json(formattedGames);
  } catch (error) {
    console.error("Error fetching games:", error);
    return NextResponse.json(
      { error: "Failed to fetch games" },
      { status: 500 }
    );
  }
}

// POST /api/games - Create a new game
export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const { startingScore, doubleIn, doubleOut, gamePointThreshold, players } =
      await req.json();

    const creatorId = parseInt(session.user.id);

    // Create the game
    const [newGame] = await db
      .insert(games)
      .values({
        creatorId,
        startingScore,
        doubleIn,
        doubleOut,
        gamePointThreshold,
      })

    const playerInserts = players.map((p: { id: number|null, name: string }) => ({
      gameId: newGame.insertId,
      userId: creatorId,
      playerName: p.name,
      finalScore: startingScore,
      gamePoints: 0,
    }));

    await db.insert(playersGames).values(playerInserts);

    return NextResponse.json({
      message: "Game created successfully",
      game: newGame,
    });
  } catch (error) {
    console.error("Error creating game:", error);
    return NextResponse.json(
      { error: "Failed to create game" },
      { status: 500 }
    );
  }
}


// GET endpoint remains the same...

export async function PUT(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const gameId = parseInt(params.id);
    const { isComplete, winnerId, playerScores, playerHistory } = await req.json();

    // Update the game
    await db
      .update(games)
      .set({
        isComplete: isComplete ?? false,
        winnerId: winnerId || null,
        updatedAt: new Date(),
      })
      .where(eq(games.id, gameId));

    // Update player scores if provided
    if (playerScores && Array.isArray(playerScores)) {
      for (const player of playerScores) {
        await db
          .update(playersGames)
          .set({
            finalScore: player.finalScore,
            isWinner: player.isWinner || false,
            gamePoints: player.gamePoints || 0,
          })
          .where(
            and(
              eq(playersGames.gameId, gameId),
              eq(playersGames.userId, player.userId)
            )
          );
      }
    }

    // Save player history if provided
    if (playerHistory && Array.isArray(playerHistory)) {
      for (const history of playerHistory) {
        // For each round in the player's history
        for (const round of history.rounds) {
          // Check if round exists
          let roundId;
          const existingRound = await db
            .select()
            .from(rounds)
            .where(
              and(
                eq(rounds.gameId, gameId),
                eq(rounds.roundNumber, round.roundNumber)
              )
            )
            .limit(1);

          if (existingRound.length === 0) {
            // Create new round
            const [newRound] = await db
              .insert(rounds)
              .values({
                gameId,
                roundNumber: round.roundNumber,
              })
              
            roundId = newRound.insertId;
          } else {
            roundId = existingRound[0].id;
          }

          // Save the score for this round
          await db.insert(scores).values({
            roundId,
            playerId: history.playerId,
            scoreValue: round.score,
            dartValues: round.darts,
            remainingScore: round.remainingScore,
          });
        }
      }
    }

    return NextResponse.json({ message: "Game updated successfully" });
  } catch (error) {
    console.error("Error updating game:", error);
    return NextResponse.json(
      { error: "Failed to update game" },
      { status: 500 }
    );
  }
}