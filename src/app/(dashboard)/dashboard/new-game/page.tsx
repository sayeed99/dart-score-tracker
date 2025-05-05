"use client";

import { useState, useEffect, useCallback, Suspense } from "react";
import { redirect, useRouter, useSearchParams } from "next/navigation";
import { useSession } from "next-auth/react";
import { toast } from "sonner";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { UserPlus, X, ArrowRight, ArrowLeft, Play, Loader, ArrowUp, ArrowDown } from "lucide-react";
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

const GameStartForm = ({ onStartGame }: GameStartFormProps) => {
  const { data: session } = useSession();
  const [step, setStep] = useState<1 | 2>(1);
  const [gameMode, setGameMode] = useState<GameMode>("local");
  const [players, setPlayers] = useState<string[]>([session?.user?.name || "Player 1"]);
  const [newPlayerName, setNewPlayerName] = useState("");
  const [settings, setSettings] = useState<GameSettings>({
    startingScore: 501,
    doubleIn: false,
    doubleOut: true,
    gamePointThreshold: 1
  });

  const movePlayerUp = (index: number) => {
    if (index === 0) return; // Can't move first player up
    
    const newPlayers = [...players];
    const temp = newPlayers[index];
    newPlayers[index] = newPlayers[index - 1];
    newPlayers[index - 1] = temp;
    setPlayers(newPlayers);
  };
  
  const movePlayerDown = (index: number) => {
    if (index === players.length - 1) return; // Can't move last player down
    
    const newPlayers = [...players];
    const temp = newPlayers[index];
    newPlayers[index] = newPlayers[index + 1];
    newPlayers[index + 1] = temp;
    setPlayers(newPlayers);
  };  

  const addPlayer = () => {
    if (newPlayerName.trim() === "") return;
    setPlayers([...players, newPlayerName]);
    setNewPlayerName("");
  };

  const removePlayer = (index: number) => {
    setPlayers(players.filter((_, i) => i !== index));
  };

  const handleStartGame = () => {
    if (players.length < 1) {
      toast.error("Add at least one player to continue");
      return;
    }
    onStartGame(settings, players);
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>
          {step === 1 ? "Add Players" : "Game Settings"}
        </CardTitle>
        <CardDescription>
          {step === 1
            ? "Who will be playing in this game?"
            : "Configure your dart game"
          }
        </CardDescription>
      </CardHeader>
      <CardContent>
        {step === 1 ? (
          <>
            <div className="space-y-4">
              <div className="flex gap-2 mb-4">
                <Input
                  type="text"
                  placeholder="Player Name"
                  value={newPlayerName}
                  onChange={(e) => setNewPlayerName(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && addPlayer()}
                />
                <Button onClick={addPlayer} disabled={!newPlayerName.trim()}>
                  <UserPlus className="h-4 w-4 mr-1" /> Add
                </Button>
              </div>

              <div className="space-y-2">
                <Label>Players:</Label>
                {players.length === 0 ? (
                  <div className="text-center py-4 text-muted-foreground border rounded-md">
                    No players added yet. Add some players to get started.
                  </div>
                ) : (
                  <div className="space-y-2">
                    {players.map((player, index) => (
                      <div
                        key={index}
                        className="flex justify-between items-center p-3 border rounded-md"
                      >
                        <div className="flex items-center gap-2">
                          <span>{player}</span>
                          {index === 0 && session?.user?.name === player && (
                            <Badge variant="outline">You</Badge>
                          )}
                        </div>
                        <div className="flex items-center gap-1">
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => movePlayerUp(index)}
                            disabled={index === 0}
                            title="Move player up"
                          >
                            <ArrowUp className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => movePlayerDown(index)}
                            disabled={index === players.length - 1}
                            title="Move player down"
                          >
                            <ArrowDown className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => removePlayer(index)}
                            disabled={index === 0 && session?.user?.name === player}
                            title="Remove player"
                          >
                            <X className="h-4 w-4" />
                          </Button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </>
        ) : (
          <div className="space-y-6">
            <div className="space-y-2">
              <Label htmlFor="startingScore">Starting Score</Label>
              <Select
                value={settings.startingScore.toString()}
                onValueChange={(value) =>
                  setSettings({...settings, startingScore: parseInt(value)})
                }
              >
                <SelectTrigger id="startingScore">
                  <SelectValue placeholder="Select Starting Score" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="101">101</SelectItem>
                  <SelectItem value="301">301</SelectItem>
                  <SelectItem value="501">501</SelectItem>
                  <SelectItem value="701">701</SelectItem>
                  <SelectItem value="1001">1001</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="flex items-center justify-between">
              <Label htmlFor="doubleIn">Require Double to Start</Label>
              <Switch
                id="doubleIn"
                checked={settings.doubleIn}
                onCheckedChange={(checked) =>
                  setSettings({...settings, doubleIn: checked})
                }
              />
            </div>

            <div className="flex items-center justify-between">
              <Label htmlFor="doubleOut">Require Double to Finish</Label>
              <Switch
                id="doubleOut"
                checked={settings.doubleOut}
                onCheckedChange={(checked) =>
                  setSettings({...settings, doubleOut: checked})
                }
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="gamePointThreshold">Games to Win Match</Label>
              <Select
                value={settings.gamePointThreshold.toString()}
                onValueChange={(value) =>
                  setSettings({...settings, gamePointThreshold: parseInt(value)})
                }
              >
                <SelectTrigger id="gamePointThreshold">
                  <SelectValue placeholder="Select Number of Games" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="1">Best of 1</SelectItem>
                  <SelectItem value="2">Best of 3</SelectItem>
                  <SelectItem value="3">Best of 5</SelectItem>
                  <SelectItem value="5">Best of 9</SelectItem>
                  <SelectItem value="7">Best of 13</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        )}
      </CardContent>
      <CardFooter className="flex justify-between">
        {step === 1 ? (
          <>
            <div></div>
            <Button
              onClick={() => setStep(2)}
              disabled={players.length < 1}
            >
              Continue <ArrowRight className="ml-2 h-4 w-4" />
            </Button>
          </>
        ) : (
          <>
            <Button variant="outline" onClick={() => setStep(1)}>
              <ArrowLeft className="mr-2 h-4 w-4" /> Back
            </Button>
            <Button onClick={handleStartGame}>
              Start Game <Play className="ml-2 h-4 w-4" />
            </Button>
          </>
        )}
      </CardFooter>
    </Card>
  );
};

// Client component that uses useSearchParams
function GameLoader({ onLoadGame }: { onLoadGame: (id: number) => void }) {
  const searchParams = useSearchParams();
  const { data: session, status } = useSession();
  
  useEffect(() => {
    // Only run in the browser, and wait for session to be available
    if (typeof window !== 'undefined' && status !== 'loading') {
      const id = searchParams.get("id");

      if (id) {
        onLoadGame(parseInt(id));
      }
    }
  }, [searchParams, status, onLoadGame]);
  
  return null; // This component doesn't render anything
}

export default function NewGamePage() {
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

  const [currentGameState, setCurrentGameState] = useState<any>({
    active: true,
    round: 1,
    winner: null,
    gamePoints: {},
    currentPlayerIndex: 0,
    roundComplete: false
  });

  // src/app/(dashboard)/dashboard/new-game/page.tsx
  const loadExistingGame = useCallback(async(id: number) => {
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
  }, [session?.user?.id]);

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
      setGameId(data.game.insertId);
      setGameSettings(settings);
      // setPlayers(playerNames);
      setGameStarted(true);
 
      toast.success("Game started!");
      window.location.href = `/dashboard/game/${data.game.insertId}`;
    } catch (error) {
      console.log(error)
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

  return (
    <>
      {/* Wrap the search params usage in Suspense */}
      <Suspense>
        <GameLoader onLoadGame={loadExistingGame} />
      </Suspense>

      {!gameStarted ? (
        <div className="max-w-3xl mx-auto">
          <h1 className="text-3xl font-bold mb-6">Start New Game</h1>
          <GameStartForm onStartGame={handleStartGame} />
        </div>
      ) : (
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
      )}
    </>
  );
}