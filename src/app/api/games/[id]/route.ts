import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { db } from "@/db";
import { games, playersGames, rounds, scores, users } from "@/db/schema";
import { eq, and } from "drizzle-orm";
import { authOptions } from "@/lib/[...nextauth]";

export async function GET(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const userId = parseInt(session.user.id);
  const { id } = params;
  const gameId = parseInt(id);
  
  try {
    // 1. Check if the user is part of the game
    const playerInGame = await db
      .select()
      .from(playersGames)
      .where(
        and(
          eq(playersGames.gameId, gameId),
          eq(playersGames.userId, userId)
        )
      )
      .limit(1);
      
    if (playerInGame.length === 0) {
      return NextResponse.json(
        { error: "Game not found or you don't have access" },
        { status: 404 }
      );
    }
    
    // 2. Get the game details
    const gameQuery = await db
      .select()
      .from(games)
      .where(eq(games.id, gameId))
      .limit(1);
      
    if (gameQuery.length === 0) {
      return NextResponse.json({ error: "Game not found" }, { status: 404 });
    }
    const gameDetails = gameQuery[0];
    
    // 3. Get players for this game
    const playersQuery = await db
      .select()
      .from(playersGames)
      .where(eq(playersGames.gameId, gameId));
    
    // 4. Get all rounds for this game
    const roundsQuery = await db
      .select()
      .from(rounds)
      .where(eq(rounds.gameId, gameId))
      .orderBy(rounds.roundNumber);
      
    // 5. Get all scores, explicitly including the dartValues field
    const allScores = await db
      .select({
        id: scores.id,
        roundId: scores.roundId,
        playerId: scores.playerId,
        scoreValue: scores.scoreValue,
        dartValues: scores.dartValues,
        remainingScore: scores.remainingScore,
        roundNumber: rounds.roundNumber
      })
      .from(scores)
      .innerJoin(rounds, eq(scores.roundId, rounds.id))
      .where(eq(rounds.gameId, gameId));
    
    // Debug: Log the first score to see its structure
    if (allScores.length > 0) {
      console.log("First score structure:", JSON.stringify(allScores[0], null, 2));
    }
    
    // Group scores by player and round for easier access
    const scoresByPlayerRound = {};
    
    allScores.forEach(score => {
      const playerId = score.playerId;
      const roundNumber = score.roundNumber;
      
      if (!scoresByPlayerRound[playerId]) {
        scoresByPlayerRound[playerId] = {};
      }
      
      scoresByPlayerRound[playerId][roundNumber] = score;
    });
    
    // 6. Format player data with complete round history - THIS IS WHERE THE BUG IS
    const formattedPlayers = playersQuery.map(player => {
      // Create a Set to track which rounds we've already processed
      const processedRounds = new Set();
      
      // Create player history from rounds, ensuring each round appears only once
      const playerHistory = roundsQuery.map(round => {
        // Skip if we've already processed this round number
        if (processedRounds.has(round.roundNumber)) {
          return null; // This will be filtered out later
        }
        
        // Mark this round as processed
        processedRounds.add(round.roundNumber);
        
        // Look up score for this player and round
        const playerScore = scoresByPlayerRound[player.id]?.[round.roundNumber];
        
        return {
          round: round.roundNumber,
          score: playerScore ? playerScore.scoreValue : 0,
          darts: playerScore?.dartValues || []
        };
      }).filter(round => round !== null); // Remove the null entries
      
      // Rest of the player formatting code remains the same
      let remainingScore = gameDetails.startingScore;
      let playerTotal = 0;
      playerHistory.forEach(round => {
        remainingScore -= round.score;
        playerTotal = playerTotal + round.score
      });
      
      return {
        id: player.id.toString(),
        name: player.playerName,
        score: remainingScore,
        startingScore: gameDetails.startingScore,
        playerTotal: playerTotal,
        history: playerHistory,
        gamePoints: player.gamePoints || 0,
        isWinner: player.isWinner
      };
    });
    
    // Combine game details with players
    const fullGameData = {
      ...gameDetails,
      players: formattedPlayers,
    };
    
    return NextResponse.json(fullGameData);
    
  } catch (error) {
    console.error("Error fetching game:", error);
    return NextResponse.json(
      { error: "Failed to fetch game", details: error.message },
      { status: 500 }
    );
  }
}

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
              eq(playersGames.id, player.userId)
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
              });
              
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