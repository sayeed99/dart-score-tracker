"use client";

import React, { useState, useEffect } from 'react';
import { Trophy, RefreshCw, UserPlus, X, ArrowRight, ArrowLeft, Save, Power } from 'lucide-react';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogClose, DialogFooter } from '@/components/ui/dialog';
import { Switch } from '@/components/ui/switch';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { toast } from 'sonner';

// Define TypeScript interfaces
interface DartValue {
  value: number | string;
  multiplier: number;
}

interface RoundHistory {
  round: number;
  score: number;
  darts: DartValue[];
}

interface Player {
  id: string;
  name: string;
  score: number;
  history: RoundHistory[];
}

interface GameSettings {
  startingScore: number;
  doubleIn: boolean;
  doubleOut: boolean;
  gamePointThreshold: number;
}

interface CurrentGame {
  active: boolean;
  round: number;
  winner: string | null;
  gamePoints: Record<string, number>;
  currentPlayerIndex: number;
  roundComplete: boolean;
}

interface DartInput {
  value: string;
  multiplier: number;
}

interface DartScoreTrackerProps {
  initialPlayers: Player[];
  initialGameSettings: GameSettings;
  initialGameState?: CurrentGame; // Add this new prop
  onGameComplete?: (winner: Player, gamePoints: Record<string, number>) => void;
  onSaveGame?: (gameState: {
    players: Player[];
    currentGame: CurrentGame;
    gameSettings: GameSettings;
  }) => Promise<void>;
  onEndGame?: () => void;
  gameId?: number;
}

export function DartScoreTracker({
  initialPlayers,
  initialGameSettings,
  initialGameState,
  onGameComplete,
  onSaveGame,
  onEndGame,
  gameId
}: DartScoreTrackerProps) {
  // State for players
  const [players, setPlayers] = useState<Player[]>(initialPlayers);
  const [gameSettings, setGameSettings] = useState<GameSettings>(initialGameSettings);
  const [currentGame, setCurrentGame] = useState<CurrentGame>(
    initialGameState || {
      active: true,
      round: 1,
      winner: null,
      gamePoints: initialPlayers.reduce((acc, p) => ({ ...acc, [p.id]: 0 }), {} as Record<string, number>),
      currentPlayerIndex: 0,
      roundComplete: false
    }
  );
  
  // Replace this section in your useEffect
  useEffect(() => {
    // Check if we're loading an existing game with history
    if (initialPlayers.some(p => p.history && p.history.length > 0)) {
      // Find the max round number
      const maxRound = Math.max(...initialPlayers.flatMap(player => 
        player.history.map(h => h.round)
      ), 0);
      
      // For each player, check if they have a history entry for the max round
      const playersWithMaxRound = initialPlayers.filter(player => 
        player.history.some(h => h.round === maxRound)
      );
      
      // Calculate which player's turn it should be
      let currentPlayerIndex = 0;      
      if (maxRound > 0) {
        
        if (playersWithMaxRound.length < initialPlayers.length) {
          // Not all players have played this round yet
          // Find the next player who hasn't played the current round
          const nextPlayerIndex = initialPlayers.findIndex(player =>
            !(player.history?.some(h => h.round === maxRound))
          );
          
          if (nextPlayerIndex !== -1) {
            currentPlayerIndex = nextPlayerIndex;
          }
        }
      }
      
      // Initialize game points using the game state from API or default to zero
      const gamePoints: Record<string, number> = {};
      initialPlayers.forEach(player => {
        // Don't try to access player.gamePoints directly
        // Instead, use initialGamePoints if available or default to 0
        gamePoints[player.id] = 0;
      });
      
      // Set the current game state
      setCurrentGame({
        active: true, // If we're resuming, it's active
        round: maxRound > 0 ? 
          (initialPlayers.length === playersWithMaxRound?.length ? maxRound + 1 : maxRound) : 1,
        winner: null, // If there was a winner, we wouldn't be resuming
        gamePoints, // Use our initialized game points
        currentPlayerIndex,
        roundComplete: false
      });
    }
  }, [initialPlayers]);
  // State for scoring
  // Deep-clone dart inputs per player
  const [dartInputs, setDartInputs] = useState<Record<string, DartInput[]>>(
    initialPlayers.reduce((acc, player) => {
      acc[player.id] = [
        { value: '', multiplier: 1 },
        { value: '', multiplier: 1 },
        { value: '', multiplier: 1 }
      ];
      return acc;
    }, {} as Record<string, DartInput[]>)
  );

  // Add useEffect to initialize the dart inputs from player history
  useEffect(() => {
    // For resumed games, initialize dart inputs from the last round
    if (initialPlayers.some(p => p.history && p.history.length > 0)) {
      let maxRound = 0;
      initialPlayers.forEach(player => {
        if (player.history && player.history.length > 0) {
          const playerMaxRound = Math.max(...player.history.map(h => h.round));
          maxRound = Math.max(maxRound, playerMaxRound);
        }
      });
      
      setCurrentGame(prev => ({
        ...prev,
        round: maxRound + 1
      }));
    }
  }, [initialPlayers]);

  // New state for end game confirmation dialog
  const [endGameDialogOpen, setEndGameDialogOpen] = useState(false);

  // Function to save the current game state
  const saveGameState = async (): Promise<void> => {
    if (!onSaveGame) return;

    try {
      await onSaveGame({
        players,
        currentGame,
        gameSettings
      });
      toast.success('Game saved successfully!');
    } catch (error) {
      console.error('Error saving game:', error);
      toast.error('Failed to save game.');
    }
  };

  // Function to end the current game
  const endGame = (): void => {
    if (onEndGame) {
      onEndGame();
    }
  };

  // Restart current game (same players and settings)
  const restartGame = (): void => {
    const initialGamePoints: Record<string, number> = currentGame.gamePoints || {};
    const initialDartInputs: Record<string, DartInput[]> = {};

    players.forEach(player => {
      if (!initialGamePoints[player.id]) {
        initialGamePoints[player.id] = 0;
      }
      initialDartInputs[player.id] = [
        { value: '', multiplier: 1 },
        { value: '', multiplier: 1 },
        { value: '', multiplier: 1 }
      ];
    });

    setPlayers(players.map(player => ({
      ...player,
      score: gameSettings.startingScore,
      history: []
    })));

    setDartInputs(initialDartInputs);

    setCurrentGame({
      active: true,
      round: 1,
      winner: null,
      gamePoints: initialGamePoints,
      currentPlayerIndex: 0,
      roundComplete: false
    });
  };

  // Handle input change with deep clone
  const handleDartInputChange = (
    playerId: string,
    dartIndex: number,
    field: 'value' | 'multiplier',
    raw: string
  ): void => {
    setDartInputs(prev => {
      // 1) clone this one player’s darts array
      const oldDarts = prev[playerId] ?? [
        { value: '', multiplier: 1 },
        { value: '', multiplier: 1 },
        { value: '', multiplier: 1 }
      ];
      const newDarts = oldDarts.map((d, i) =>
        i === dartIndex ? { ...d } : d
      );
  
      // 2) apply your normal validation logic
      if (field === 'value') {
        if (
          raw === '' ||
          (/^\d+$/.test(raw) && (parseInt(raw) <= 20 || parseInt(raw) === 25))
        ) {
          newDarts[dartIndex].value = raw;
        } else {
          return prev; // invalid entry: ignore
        }
      } else {
        const m = parseInt(raw, 10);
        if ([1, 2, 3].includes(m)) {
          newDarts[dartIndex].multiplier = m;
        } else {
          return prev; // invalid entry
        }
      }
  
      // 3) return a *new* state object with only that player’s darts replaced
      return {
        ...prev,
        [playerId]: newDarts
      };
    });
  };

  // Calculate score for the current player's turn
  const calculateTurnScore = (playerId: string) =>
    (dartInputs[playerId] || []).reduce((sum, d) => {
      const v = d.value === '' ? 0 : parseInt(d.value as string, 10);
      return sum + v * d.multiplier;
  }, 0);

  // Find last index function (replacement for findLastIndex)
  const findLastIndex = <T,>(
    array: T[],
    predicate: (value: T, index: number, array: T[]) => boolean
  ): number => {
    for (let i = array.length - 1; i >= 0; i--) {
      if (predicate(array[i], i, array)) {
        return i;
      }
    }
    return -1;
  };

  // Reset only the given player's inputs
  const resetPlayerInputs = (playerId: string) => {
    setDartInputs(prev => ({
      ...prev,
      [playerId]: [
        { value: '', multiplier: 1 },
        { value: '', multiplier: 1 },
        { value: '', multiplier: 1 }
      ]
    }));
  };

  // Fixed applyPlayerScore function that correctly handles player rounds
  const applyPlayerScore = () => {
    // Use functional updates for both state variables to avoid stale closures
    setCurrentGame(prev => {
      // If game is not active or already has a winner, return unchanged state
      if (!prev.active || prev.winner) return prev;
      
      // Get current player info - use the currentPlayerIndex from currentGame state
      const currentPlayerIndex = prev.currentPlayerIndex;
      const currentPlayer = players[currentPlayerIndex];
      const pid = currentPlayer.id;
      
      // Calculate score from dart inputs
      const turnScore = calculateTurnScore(pid);
      const darts = (dartInputs[pid] || []).map(d => ({
        value: d.value === '' ? 0 : parseInt(d.value as string, 10),
        multiplier: d.multiplier
      }));
      
      // Calculate new score
      let newScore = currentPlayer.score - turnScore;
      
      // Handle double in validation
      if (gameSettings.doubleIn && 
          currentPlayer.history.length === 0 && 
          !darts.some(d => d.multiplier === 2)) {
        alert(`${currentPlayer.name} needs to start with a double!`);
        resetPlayerInputs(pid);
        return prev; // Return unchanged state
      }
      
      // Handle bust validation
      if (newScore < 0) {
        alert(`Bust! Score too high for ${currentPlayer.name}`);
        resetPlayerInputs(pid);
        return prev; // Return unchanged state
      }
      
      // Handle win validation
      let isWin = false;
      if (newScore === 0) {
        const last = darts.slice().reverse().find(d => d.value > 0);
        if (gameSettings.doubleOut && (!last || last.multiplier !== 2)) {
          alert(`${currentPlayer.name} needs to finish on a double!`);
          resetPlayerInputs(pid);
          return prev; // Return unchanged state
        }
        isWin = true;
      }
      
      // Create an updated copy of players array with the current player's new info
      const updatedPlayers = players.map(p =>
        p.id === pid
          ? { 
              ...p, 
              score: newScore, 
              history: [...p.history, { 
                round: prev.round, 
                score: turnScore, 
                darts 
              }] 
            }
          : p
      );
      
      // Important: Update the players state with the new array
      setPlayers(updatedPlayers);
      
      // Reset input fields for this player
      resetPlayerInputs(pid);
      
      // Update game points if player won
      const updatedPoints = { ...prev.gamePoints };
      if (isWin) {
        updatedPoints[pid] = (updatedPoints[pid] || 0) + 1;
      }
      
      // Determine next player and round
      const lastPlayer = currentPlayerIndex === players.length - 1;
      const nextIndex = lastPlayer ? 0 : currentPlayerIndex + 1;
      const nextRound = lastPlayer ? prev.round + 1 : prev.round;
      const nextActive = !isWin || (isWin && updatedPoints[pid] < gameSettings.gamePointThreshold);
      
      // Handle game completion
      if (isWin && updatedPoints[pid] >= gameSettings.gamePointThreshold && onGameComplete) {
        setTimeout(() => onGameComplete(updatedPlayers.find(p => p.id === pid)!, updatedPoints), 100);
      } else if (isWin) {
        setTimeout(() => {
          alert(`${updatedPlayers.find(p => p.id === pid)!.name} wins this game!`);
          restartGame();
        }, 100);
      }
      
      // Save game state with the updated players and game state
      if (onSaveGame) {
        const updatedGameState = {
          active: nextActive,
          round: nextRound,
          winner: isWin && updatedPoints[pid] >= gameSettings.gamePointThreshold ? pid : null,
          gamePoints: updatedPoints,
          currentPlayerIndex: nextIndex,
          roundComplete: lastPlayer
        };
        
        onSaveGame({ 
          players: updatedPlayers, 
          currentGame: updatedGameState, 
          gameSettings 
        });
      }
      
      // Return updated game state
      return {
        ...prev,
        gamePoints: updatedPoints,
        currentPlayerIndex: nextIndex,
        round: nextRound,
        roundComplete: lastPlayer,
        active: nextActive,
        winner: isWin && updatedPoints[pid] >= gameSettings.gamePointThreshold ? pid : prev.winner
      };
    });
  };


  const resetCurrentPlayerInputs = (playerId: string): void => {
    setDartInputs(prev => ({
      ...prev,
      [playerId]: [
        { value: '', multiplier: 1 },
        { value: '', multiplier: 1 },
        { value: '', multiplier: 1 }
      ]
    }));
  };

  // Get current player
  const getCurrentPlayer = (): Player | null => {
    if (!currentGame.active || players.length === 0) return null;
    return players[currentGame.currentPlayerIndex];
  };

  // Render current scores card
  const renderCurrentScoresCard = (): React.ReactNode => {
    if (players.length === 0) return null;

    const currentPlayer = getCurrentPlayer();

    return (
      <Card className="mb-6">
        <CardHeader className="pb-2">
          <CardTitle>Current Game Scores</CardTitle>
          <CardDescription>Round {currentGame.round}</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4">
            {players.map(player => (
              <div
                key={player.id}
                className={`p-3 border rounded-md text-center ${
                  player.id === currentPlayer?.id ? 'bg-primary/20 border-primary' : ''
                }`}
              >
                <div className="font-medium">{player.name}</div>
                <div className="text-xl font-bold">{player.score}</div>
                <div className="text-xs text-muted-foreground">
                  Game Points: {currentGame.gamePoints[player.id] || 0}
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    );
  };

  // Render game scores history table
  const renderGameHistoryTable = (): React.ReactNode => {
    if (players.length === 0) return null;

    // Find max rounds played
    const maxRounds = Math.max(...players.flatMap(player =>
      player.history.map(h => h.round)
    ), 0);

    // If no rounds played yet
    if (maxRounds === 0) return null;

    return (
      <Card className="mb-6 overflow-x-auto">
        <CardHeader className="pb-2">
          <CardTitle>Game History</CardTitle>
        </CardHeader>
        <CardContent>
          <table className="w-full border-collapse min-w-full">
            <thead>
              <tr>
                <th className="border p-2">Round</th>
                {players.map(player => (
                  <th key={player.id} className="border p-2">{player.name}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {Array.from({ length: maxRounds }, (_, roundIndex) => (
                <tr key={roundIndex + 1}>
                  <td className="border p-2 text-center font-medium">{roundIndex + 1}</td>
                  {players.map(player => {
                    const roundHistory = player.history.find(h => h.round === roundIndex + 1);
                    return (
                      <td key={`${player.id}-${roundIndex}`} className="border p-2 text-center">
                        {roundHistory ? (
                          <div>
                            <div className="font-medium">{roundHistory.score}</div>
                            <div className="text-xs">
                              {roundHistory.darts.map((dart, i) =>
                                dart.value ? `${dart.value}${dart.multiplier > 1 ? 'x' + dart.multiplier : ''}${i < 2 ? ', ' : ''}` : ''
                              )}
                            </div>
                          </div>
                        ) : '—'}
                      </td>
                    );
                  })}
                </tr>
              ))}
            </tbody>
          </table>
        </CardContent>
      </Card>
    );
  };

  // Render player entry form
  const renderPlayerEntryForm = (): React.ReactNode => {
    const currentPlayer = getCurrentPlayer();
    if (!currentPlayer || !currentGame.active || currentGame.winner) return null;

    const playerDartInputs = dartInputs[currentPlayer.id] || [
      { value: '', multiplier: 1 },
      { value: '', multiplier: 1 },
      { value: '', multiplier: 1 }
    ];

    return (
      <Card className="mb-6">
        <CardHeader>
          <CardTitle>{currentPlayer.name}'s Turn</CardTitle>
          <CardDescription>Round {currentGame.round} - Remaining: {currentPlayer.score}</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-3 gap-3 mb-4">
            {[0, 1, 2].map(dartIndex => (
              <div key={dartIndex} className="space-y-2">
                <Label>Dart {dartIndex + 1}</Label>
                <div className="flex gap-1">
                  <Input
                    type="text"
                    inputMode="numeric"
                    placeholder="0-20, 25"
                    value={playerDartInputs[dartIndex]?.value || ''}
                    onChange={(e) => handleDartInputChange(currentPlayer.id, dartIndex, 'value', e.target.value)}
                    className="flex-1 text-xl w-12 h-12 text-center font-medium"
                  />
                  <Select
                    value={String(playerDartInputs[dartIndex]?.multiplier || 1)}
                    onValueChange={(value) => handleDartInputChange(currentPlayer.id, dartIndex, 'multiplier', value)}
                  >
                    <SelectTrigger className="w-24 h-12">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="1">x1</SelectItem>
                      <SelectItem value="2">x2</SelectItem>
                      <SelectItem value="3">x3</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
            ))}
          </div>

          <div className="flex justify-between items-center mt-4">
            <div className="text-xl font-bold">
              Score: {calculateTurnScore(currentPlayer.id)}
            </div>
            <div className="space-x-2">
              <Button variant="outline" onClick={resetCurrentPlayerInputs}>
                Reset
              </Button>
              <Button onClick={applyPlayerScore} className="bg-green-600 hover:bg-green-700">
                Enter Score
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>
    );
  };

  // Modify the render return statement to include save and end game buttons
  return (
    <div className="container mx-auto p-4 max-w-3xl">
      {currentGame.winner ? (
        <div className="text-center mb-6">
          <div className="text-2xl font-bold mb-4">
            {players.find(p => p.id === currentGame.winner)?.name} wins!
          </div>
          <Trophy className="mx-auto h-16 w-16 text-yellow-500 mb-4" />
          <div className="flex gap-4 justify-center">
            <Button onClick={restartGame} className="bg-blue-600 hover:bg-blue-700">
              <RefreshCw className="h-4 w-4 mr-2" /> Restart Game
            </Button>
            {onEndGame && (
              <Button onClick={() => setEndGameDialogOpen(true)} variant="destructive">
                <Power className="h-4 w-4 mr-2" /> End Game
              </Button>
            )}
          </div>
        </div>
      ) : (
        <>
          <div className="flex gap-4 mb-6 justify-between">
            <Button variant="outline" onClick={restartGame}>
              <RefreshCw className="h-4 w-4 mr-2" /> Restart
            </Button>
            <div className="flex gap-2">
              {onSaveGame && (
                <Button variant="outline" onClick={saveGameState}>
                  <Save className="h-4 w-4 mr-2" /> Save
                </Button>
              )}
              {onEndGame && (
                <Button variant="destructive" onClick={() => setEndGameDialogOpen(true)}>
                  <Power className="h-4 w-4 mr-2" /> End
                </Button>
              )}
            </div>
          </div>

          {/* Current scores summary card */}
          {renderCurrentScoresCard()}

          {/* Current player entry form */}
          {renderPlayerEntryForm()}

          {/* Game history table */}
          {renderGameHistoryTable()}

          {/* Game info */}
          <div className="mt-4">
            <Alert>
              <AlertTitle>Game Info</AlertTitle>
              <AlertDescription className="flex flex-col gap-1">
                <div>Starting Score: {gameSettings.startingScore}</div>
                <div>Double In: {gameSettings.doubleIn ? 'Required' : 'Not Required'}</div>
                <div>Double Out: {gameSettings.doubleOut ? 'Required' : 'Not Required'}</div>
                <div>Win Threshold: {gameSettings.gamePointThreshold} game points</div>
                {gameId && <div>Game ID: {gameId}</div>}
              </AlertDescription>
            </Alert>
          </div>
        </>
      )}

      {/* End Game Confirmation Dialog */}
      <Dialog open={endGameDialogOpen} onOpenChange={setEndGameDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>End Game?</DialogTitle>
          </DialogHeader>
          <div className="py-4">
            Are you sure you want to end this game? This will save the current state and return to the dashboard.
          </div>
          <DialogFooter>
            <DialogClose asChild>
              <Button variant="outline">Cancel</Button>
            </DialogClose>
            <Button variant="destructive" onClick={endGame}>
              End Game
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
