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

interface DartScoreHistoryProps {
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

export function DartScoreHistory({
  initialPlayers,
  initialGameSettings,
  initialGameState,
  onGameComplete,
  onSaveGame,
  onEndGame,
  gameId
}: DartScoreHistoryProps) {
  // State for players
  const [players, setPlayers] = useState<Player[]>(initialPlayers);

  // State for game settings
  const [gameSettings, setGameSettings] = useState<GameSettings>(initialGameSettings);

  const [currentGame, setCurrentGame] = useState<CurrentGame>(
    initialGameState || {
      active: true,
      round: 1,
      winner: null,
      gamePoints: initialPlayers.reduce((acc, player) => {
        acc[player.id] = 0;
        return acc;
      }, {} as Record<string, number>),
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

  // Handle input change for individual dart
  const handleDartInputChange = (
    playerId: string,
    dartIndex: number,
    field: 'value' | 'multiplier',
    value: string
  ): void => {
    const updatedDartInputs = { ...dartInputs };

    if (!updatedDartInputs[playerId]) {
      updatedDartInputs[playerId] = [
        { value: '', multiplier: 1 },
        { value: '', multiplier: 1 },
        { value: '', multiplier: 1 }
      ];
    }

    if (field === 'value') {
      // Ensure it's a number between 0-20 or bullseye (25)
      if (value === '' || (/^\d+$/.test(value) && (parseInt(value) <= 20 || parseInt(value) === 25))) {
        updatedDartInputs[playerId][dartIndex].value = value;
      }
    } else if (field === 'multiplier') {
      // Multiplier can only be 1, 2, or 3
      const multiplier = parseInt(value);
      if ([1, 2, 3].includes(multiplier)) {
        updatedDartInputs[playerId][dartIndex].multiplier = multiplier;
      }
    }

    setDartInputs(updatedDartInputs);
  };

  // Calculate score for the current player's turn
  const calculateTurnScore = (playerId: string): number => {
    if (!dartInputs[playerId]) return 0;

    return dartInputs[playerId].reduce((total, dart) => {
      const value = dart.value === '' ? 0 : parseInt(dart.value as string);
      return total + (value * dart.multiplier);
    }, 0);
  };

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

  // Apply score for current player and move to next player
  const applyPlayerScore = (): void => {
    if (!currentGame.active || currentGame.winner) return;

    const currentPlayerIds = players.map(player => player.id);
    const currentPlayerId = currentPlayerIds[currentGame.currentPlayerIndex];
    const player = players.find(p => p.id === currentPlayerId);

    if (!player) return;

    // Calculate score
    const scoreValue = calculateTurnScore(currentPlayerId);
    const dartValues: DartValue[] = dartInputs[currentPlayerId].map(dart => ({
      value: dart.value === '' ? 0 : parseInt(dart.value as string),
      multiplier: dart.multiplier
    }));

    const newScore = player.score - scoreValue;

    // Check for double in requirement
    if (gameSettings.doubleIn &&
        player.history.length === 0 &&
        !dartValues.some(dart => dart.multiplier === 2)) {
      alert(`${player.name} needs to start with a double!`);
      return;
    }

    // Handle busting (going below 0)
    if (newScore < 0) {
      alert(`Bust! Score too high for ${player.name}`);
      resetCurrentPlayerInputs();
      return;
    }

    // Handle winning condition
    let isWinner = false;
    if (newScore === 0) {
      // Check if last dart was a double for double out requirement
      const lastDartIndex = findLastIndex(dartValues, dart =>
        typeof dart.value === 'number' ? dart.value > 0 : parseInt(dart.value as string) > 0
      );
      if (gameSettings.doubleOut && (lastDartIndex === -1 || dartValues[lastDartIndex].multiplier !== 2)) {
        alert(`${player.name} needs to finish on a double!`);
        resetCurrentPlayerInputs();
        return;
      }
      isWinner = true;
    }

    // Update player score and history
    const updatedPlayers = players.map(p => {
      if (p.id === currentPlayerId) {
        return {
          ...p,
          score: newScore,
          history: [...p.history, {
            round: currentGame.round,
            score: scoreValue,
            darts: dartValues
          }]
        };
      }
      return p;
    });

    setPlayers(updatedPlayers);

    // Reset inputs for current player
    resetCurrentPlayerInputs();

    // Handle winner if applicable
    if (isWinner) {
      const updatedGamePoints = { ...currentGame.gamePoints };
      updatedGamePoints[currentPlayerId] = (updatedGamePoints[currentPlayerId] || 0) + 1;

      // Check if player reached the game point threshold
      const reachedThreshold = updatedGamePoints[currentPlayerId] >= gameSettings.gamePointThreshold;

      setCurrentGame(prev => ({
        ...prev,
        winner: currentPlayerId,
        active: !reachedThreshold,
        gamePoints: updatedGamePoints
      }));

      const winningPlayer = updatedPlayers.find(p => p.id === currentPlayerId);

      if (reachedThreshold && winningPlayer && onGameComplete) {
        setTimeout(() => {
          onGameComplete(winningPlayer, updatedGamePoints);
        }, 100);
      } else if (winningPlayer) {
        setTimeout(() => {
          alert(`${winningPlayer.name} wins this game! Game point awarded.`);
          restartGame();
        }, 100);
      }
      return;
    }

    saveGameState();

    // Move to next player or next round
    if (currentGame.currentPlayerIndex < players.length - 1) {
      // Move to next player
      setCurrentGame(prev => ({
        ...prev,
        currentPlayerIndex: prev.currentPlayerIndex + 1
      }));
    } else {
      // All players have thrown, move to next round
      setCurrentGame(prev => ({
        ...prev,
        round: prev.round + 1,
        currentPlayerIndex: 0,
        roundComplete: true
      }));

      // Short delay before starting next round
      setTimeout(() => {
        setCurrentGame(prev => ({
          ...prev,
          roundComplete: false
        }));
      }, 800);
    }
  };

  // Reset inputs for current player
  const resetCurrentPlayerInputs = (): void => {
    const currentPlayer = players[currentGame.currentPlayerIndex];
    if (!currentPlayer) return;

    const resetInputs = { ...dartInputs };
    resetInputs[currentPlayer.id] = [
      { value: '', multiplier: 1 },
      { value: '', multiplier: 1 },
      { value: '', multiplier: 1 }
    ];

    setDartInputs(resetInputs);
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

  // Modify the render return statement to include save and end game buttons
  return (
    <div className="container mx-auto p-4 max-w-3xl">
        <>

          {/* Current scores summary card */}
          {renderCurrentScoresCard()}

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
