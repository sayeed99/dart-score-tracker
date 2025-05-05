"use client";

import * as React from "react";
import { useState, useEffect } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { useSession } from "next-auth/react";
import { toast } from "sonner";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { UserPlus, X, ArrowRight, ArrowLeft, Play, Loader } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { DartScoreTracker } from "@/components/game/dart-score-tracker";
import { safeParseUserId } from "@/lib/auth-utils";

type GameMode = "local" | "online" | "practice";

interface GameStartFormProps {
    onStartGame: (settings: GameSettings, players: string[]) => void;
}

interface GameSettings {
    startingScore: number;
    doubleIn: boolean;
    doubleOut: boolean;
    gamePointThreshold: number;
}


export default function GamePage({params}) {
    const { id } = React.use(params)
    const [playerObjects, setPlayerObjects] = useState<any[]>([]);
    const [currentGame, setCurrentGame] = useState<any>({
        active: true,
        round: 1,
        winner: null,
        gamePoints: {},
        currentPlayerIndex: 0,
        roundComplete: false
    });
    const [gameStarted, setGameStarted] = useState(false);
    const [gameSettings, setGameSettings] = useState<GameSettings | null>(null);
    const [players, setPlayers] = useState<string[]>([]);
    const [loading, setLoading] = useState(false);
    const [gameId, setGameId] = useState<number | null>(null);
    const router = useRouter();
    const { data: session, status } = useSession();
    const searchParams = useSearchParams();

    const [currentGameState, setCurrentGameState] = useState<any>({
        active: true,
        round: 1,
        winner: null,
        gamePoints: {},
        currentPlayerIndex: 0,
        roundComplete: false
    });

    // Check for a game ID in URL (for resuming a game)
    useEffect(() => {
        // Only run in the browser, and wait for session to be available
        if (typeof window !== 'undefined' && status !== 'loading') {
            if (id) {
                loadExistingGame(parseInt(id));
            }
        }
    }, [status]);

    // src/app/(dashboard)/dashboard/new-game/page.tsx
    const loadExistingGame = async (id: number) => {
        if (!session?.user?.id) {
            toast.error("You must be logged in to resume a game");
            return;
        }

        setLoading(true);
        try {
            const response = await fetch(`/api/games/${id}`);

            if (!response.ok) {
                throw new Error("Failed to load game");
            }

            const game = await response.json();

            setGameId(game.id);
            setGameSettings({
                startingScore: game.startingScore,
                doubleIn: game.doubleIn,
                doubleOut: game.doubleOut,
                gamePointThreshold: game.gamePointThreshold
            });

            // Extract player data and history from API response
            const playerObjects = game.players.map((player: any) => ({
                id: player.id?.toString() || "0",
                name: player.name,
                score: player.score, // This should be the remaining score from API
                history: player.history || []
            }));

            setPlayers(playerObjects.map((p: any) => p.name));

            // Set the full player objects with history for DartScoreTracker
            setPlayerObjects(playerObjects);

            // Initialize game points as a separate object
            const gamePoints: Record<string, number> = {};
            game.players.forEach((player: any) => {
                gamePoints[player.id?.toString() || "0"] = player.gamePoints || 0;
            });

            // Calculate which player's turn it should be
            let currentPlayerIndex = 0;

            // Find the max round played
            const maxRound = Math.max(...playerObjects.flatMap((player: { history: any[]; }) =>
                player.history.map((h: any) => h.round)
            ), 0);

            // For each player, check if they have a history entry for the max round
            const playersWithMaxRound = playerObjects.filter((player: { history: any[]; }) =>
                player.history.some((h: any) => h.round === maxRound)
            );

            if (maxRound > 0) {
                if (playersWithMaxRound.length < playerObjects.length) {
                    // Not all players have played this round yet
                    // Find the next player who hasn't played the current round
                    const nextPlayerIndex = playerObjects.findIndex((player: { history: any[]; }) =>
                        !player.history.some((h: any) => h.round === maxRound)
                    );

                    if (nextPlayerIndex !== -1) {
                        currentPlayerIndex = nextPlayerIndex;
                    }
                }
            }

            // Set the current game state with the calculated player index and game points
            setCurrentGameState({
                active: !game.isComplete,
                round: maxRound > 0 ?
                    (playerObjects.length === playersWithMaxRound.length ? maxRound + 1 : maxRound) : 1,
                winner: game.isComplete ? game.winnerId?.toString() || null : null,
                gamePoints: gamePoints, // Use the gamePoints from API
                currentPlayerIndex: currentPlayerIndex,
                roundComplete: false
            });

            setGameStarted(true);
            toast.success("Game loaded successfully");
        } catch (error) {
            console.error("Error loading game:", error);
            toast.error("Failed to load game");
        } finally {
            setLoading(false);
        }
    };

    const handleStartGame = async (settings: GameSettings, playerNames: string[]) => {
        if (!session?.user?.id) {
            toast.error("You must be logged in to start a game");
            return;
        }

        setLoading(true);
        try {
            const userId = safeParseUserId(session.user.id);
            if (!userId) {
                toast.error("Invalid user ID in session");
                setLoading(false);
                return;
            }

            const response = await fetch("/api/games", {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                },
                body: JSON.stringify({
                    startingScore: settings.startingScore,
                    doubleIn: settings.doubleIn,
                    doubleOut: settings.doubleOut,
                    gamePointThreshold: settings.gamePointThreshold,
                    players: playerNames.map(name => ({
                        name,
                        id: name === session.user?.name ? userId : null
                    }))
                }),
            });

            if (!response.ok) {
                throw new Error("Failed to create game");
            }

            const data = await response.json();
            setGameId(data.game.id);
            setGameSettings(settings);
            setPlayers(playerNames);
            setGameStarted(true);

            toast.success("Game started!");
        } catch (error) {
            console.error("Error creating game:", error);
            toast.error("Failed to create game");
        } finally {
            setLoading(false);
        }
    };

    // Update in src/app/(dashboard)/dashboard/new-game/page.tsx
    const handleSaveGame = async (gameState: any) => {
        if (!gameId || !session?.user?.id) {
            toast.error("Cannot save game: missing game ID or user session");
            return Promise.reject(new Error("Missing game ID or user session"));
        }

        try {
            const userId = safeParseUserId(session.user.id);
            if (!userId) {
                toast.error("Invalid user ID in session");
                return Promise.reject(new Error("Invalid user ID"));
            }

            // Map players to database format
            const playerScores = gameState.players.map((player: any) => ({
                userId: player.id === "0" ? userId : parseInt(player.id),
                finalScore: player.score,
                isWinner: gameState.currentGame.winner === player.id,
                gamePoints: gameState.currentGame.gamePoints[player.id] || 0
            }));

            // Format player history for saving rounds and scores
            const playerHistory = gameState.players.map((player: any) => ({
                playerId: player.id === "0" ? userId : parseInt(player.id),
                rounds: player.history.map((round: any) => ({
                    roundNumber: round.round,
                    score: round.score,
                    darts: round.darts,
                    remainingScore: player.score + round.score // Calculate remaining score after this round
                }))
            }));

            // Save to the database
            const response = await fetch(`/api/games/${gameId}`, {
                method: "PUT",
                headers: {
                    "Content-Type": "application/json",
                },
                body: JSON.stringify({
                    isComplete: gameState.currentGame.winner !== null,
                    winnerId: gameState.currentGame.winner !== null
                        ? (gameState.currentGame.winner === "0" ? userId : parseInt(gameState.currentGame.winner))
                        : null,
                    playerScores,
                    playerHistory
                }),
            });

            if (!response.ok) {
                throw new Error("Failed to save game");
            }

            return Promise.resolve();
        } catch (error) {
            console.error("Error saving game:", error);
            return Promise.reject(error);
        }
    };

    const handleEndGame = () => {
        router.push("/dashboard");
    };

    // Handle game completion
    const handleGameComplete = async (winner: any, gamePoints: Record<string, number>) => {
        if (gameId && session?.user?.id) {
            try {
                const userId = safeParseUserId(session.user.id);
                if (!userId) {
                    toast.error("Invalid user ID in session");
                    return;
                }

                // Update the game as complete in the database
                const response = await fetch(`/api/games/${gameId}`, {
                    method: "PUT",
                    headers: {
                        "Content-Type": "application/json",
                    },
                    body: JSON.stringify({
                        isComplete: true,
                        winnerId: winner.id === "0" ? userId : parseInt(winner.id),
                        playerScores: Object.keys(gamePoints).map(playerId => ({
                            userId: playerId === "0" ? userId : parseInt(playerId),
                            isWinner: playerId === winner.id,
                            gamePoints: gamePoints[playerId] || 0,
                            finalScore: playerObjects.find(p => p.id === playerId)?.score || 0
                        }))
                    }),
                });

                if (!response.ok) {
                    throw new Error("Failed to update game");
                }
            } catch (error) {
                console.error("Error updating game:", error);
                toast.error("Failed to update game");
            }
        }

        toast.success(`Game complete! ${winner.name} wins!`);

        setTimeout(() => {
            router.push("/dashboard");
        }, 2000);
    };

    if (loading) {
        return (
            <div className="flex items-center justify-center h-[50vh]">
                <Loader className="animate-spin h-8 w-8 mr-2" />
                <p>Loading game...</p>
            </div>
        );
    }

    if (!gameStarted) {
        return (
            <div className="max-w-3xl mx-auto">
                <h1 className="text-3xl font-bold mb-6">Loading Game...</h1>
            </div>
        );
    }

    return (
        <div className="max-w-3xl mx-auto">
            <h1 className="text-3xl font-bold mb-6">Game in Progress</h1>
            <DartScoreTracker
                initialPlayers={playerObjects}
                initialGameSettings={gameSettings!}
                initialGameState={currentGameState} // Pass the current game state
                onGameComplete={handleGameComplete}
                onSaveGame={handleSaveGame}
                onEndGame={handleEndGame}
                gameId={gameId || undefined}
            />
        </div>
    );
}
