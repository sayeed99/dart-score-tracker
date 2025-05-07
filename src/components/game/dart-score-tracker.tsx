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
  initialGameState?: CurrentGame;
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
  // --- Bust dialog state ---
  const [bustDialogOpen, setBustDialogOpen] = useState(false);
  const [bustMessage, setBustMessage] = useState('');
  const [pendingNext, setPendingNext] = useState<{ playerId: string; remainingDarts: number }>({
    playerId: '',
    remainingDarts: 0
  });

  // --- Win dialog state ---
  const [winDialogOpen, setWinDialogOpen] = useState(false);
  const [winMessage, setWinMessage] = useState('');
  const [pendingWin, setPendingWin] = useState<{ 
    playerId: string; 
    remainingDarts: number;
    newScore: number;
    dartsThrown: DartValue[];
  }>({
    playerId: '',
    remainingDarts: 0,
    newScore: 0,
    dartsThrown: []
  });

  // --- Sequential dart input state ---
  const [enabledDarts, setEnabledDarts] = useState<Record<string, boolean[]>>({});

  // State for players and game
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

  // Initialize enabled darts (only first dart enabled initially)
  useEffect(() => {
    const initialEnabledDarts: Record<string, boolean[]> = {};
    initialPlayers.forEach(player => {
      initialEnabledDarts[player.id] = [true, false, false];
    });
    setEnabledDarts(initialEnabledDarts);
  }, [initialPlayers]);

  // Effect to restore game state from history
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
        gamePoints[player.id] = 0;
      });
      
      // Set the current game state
      setCurrentGame({
        active: true,
        round: maxRound > 0 ? 
          (initialPlayers.length === playersWithMaxRound?.length ? maxRound + 1 : maxRound) : 1,
        winner: null,
        gamePoints,
        currentPlayerIndex,
        roundComplete: false
      });
    }
  }, [initialPlayers]);

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

  // Calculate score for the current player's turn
  const calculateTurnScore = (playerId: string) => {
    return (dartInputs[playerId] || []).reduce((sum, d) => {
      const v = d.value === '' ? 0 : parseInt(d.value as string, 10);
      return sum + v * d.multiplier;
    }, 0);
  };

  // Calculate score for the current player's turn
  const calculateTurnPending = (playerId: string) => {
    let data = (dartInputs[playerId] || []).reduce((sum, d) => {
      const v = d.value === '' ? 0 : parseInt(d.value as string, 10);
      return sum + v * d.multiplier;
    }, 0);
    const player = players.find(p => p.id === playerId);
    if(player) {
      data = player.score - data;
    }
    return data;
  };

  // Returns the count of darts thrown (darts with values) for a player
  const getDartsThrown = (playerId: string) => {
    return (dartInputs[playerId] || []).filter(d => d.value !== '').length;
  };

  // Convert dart inputs to dart values for a player
  const getDartValues = (playerId: string, dartsToInclude: number = 3) => {
    return (dartInputs[playerId] || [])
      .slice(0, dartsToInclude)
      .map(d => ({
        value: d.value === '' ? 0 : parseInt(d.value as string, 10),
        multiplier: d.multiplier
      }));
  };

  // Function to check for auto bust condition - updated with dartsThrown parameter
  const checkAutoBust = (playerId: string, dartsThrown: number) => {
    const player = players.find(p => p.id === playerId);
    if (!player) return false;

    const turnScore = calculateTurnScore(playerId);
    if (player.score - turnScore < 0) {
      // Auto bust condition
      setBustMessage(`${player.name} busts!`);
      setPendingNext({ 
        playerId, 
        remainingDarts: 3 - dartsThrown 
      });
      setBustDialogOpen(true);
      return true;
    }
    return false;
  };

  // Function to check for auto win condition - updated with dartsThrown parameter
  const checkAutoWin = (playerId: string, dartsThrown: number) => {
    const player = players.find(p => p.id === playerId);
    if (!player) return false;

    const turnScore = calculateTurnScore(playerId);
    const newScore = player.score - turnScore;

    console.log(newScore)
    
    if (newScore === 0) {
      // Check double out requirement if enabled
      const darts = getDartValues(playerId, dartsThrown);
      
      // Find the last non-zero dart
      const lastDart = [...darts].reverse().find(d => d.value > 0);
      
      if (gameSettings.doubleOut && (!lastDart || lastDart.multiplier !== 2)) {
        // Need double out, but last dart is not a double
        return false;
      }
      
      // Auto win condition
      setWinMessage(`${player.name} wins!`);
      setPendingWin({
        playerId,
        remainingDarts: 3 - dartsThrown,
        newScore,
        dartsThrown: darts
      });
      setWinDialogOpen(true);
      return true;
    }
    return false;
  };

  // Check game conditions after any dart entry
  const checkGameConditions = (playerId: string) => {

    const dartsThrown = getDartsThrown(playerId);
    
    // Don't check if no darts thrown yet
    if (dartsThrown === 0) return;
    
    if (dartsThrown < 3) {
      setEnabledDarts(prev => ({
        ...prev,
        [playerId]: prev[playerId].map((_, i) => 
          i <= dartsThrown ? true : false
        )
      }));
    }

    // Check for bust first
    if (checkAutoBust(playerId, dartsThrown)) {
      return;
    }
    
    // Then check for win
    // if (checkAutoWin(playerId, dartsThrown)) {
    //   return;
    // }    
  };

// Handle dart input change with immediate bust/win checking
const handleDartInputChange = (
  playerId: string,
  dartIndex: number,
  field: 'value' | 'multiplier',
  raw: string
): void => {
  // Create an updated inputs object to use locally and for state update
  const updateDartInputs = (prevInputs: Record<string, DartInput[]>) => {
    // 1) clone this one player's darts array
    const oldDarts = prevInputs[playerId] ?? [
      { value: '', multiplier: 1 },
      { value: '', multiplier: 1 },
      { value: '', multiplier: 1 }
    ];
    const newDarts = oldDarts.map((d, i) =>
      i === dartIndex ? { ...d } : d
    );
  
    // 2) apply validation logic
    if (field === 'value') {
      if (
        raw === '' ||
        (/^\d+$/.test(raw) && (parseInt(raw) <= 20 || parseInt(raw) === 25))
      ) {
        newDarts[dartIndex].value = raw;
      } else {
        return prevInputs; // invalid entry: ignore
      }
    } else {
      const m = parseInt(raw, 10);
      if ([1, 2, 3].includes(m)) {
        newDarts[dartIndex].multiplier = m;
      } else {
        return prevInputs; // invalid entry
      }
    }
  
    // 3) return a new state object with only that player's darts replaced
    return {
      ...prevInputs,
      [playerId]: newDarts
    };
  };

  // Update the state
  setDartInputs(prev => {
    const newInputs = updateDartInputs(prev);
    
    // Immediately after updating inputs, enable the next dart if applicable
    if (field === 'value' && raw !== '') {
      // Calculate darts thrown in the updated state
      const dartsThrown = newInputs[playerId].filter(d => d.value !== '').length;
      
      // Enable the next dart input immediately
      if (dartsThrown > 0 && dartsThrown < 3) {
        setTimeout(() => {
          setEnabledDarts(prev => ({
            ...prev,
            [playerId]: prev[playerId].map((_, i) => 
              i <= dartsThrown ? true : false
            )
          }));
        }, 0);
      }
    }
    
    return newInputs;
  });

  // Check game conditions (win/bust) after a short delay to ensure state is updated
  setTimeout(() => {
    checkGameConditions(playerId);
  }, 400);
}

  // Process bust confirmation
  const proceedAfterBust = () => {
    const { playerId, remainingDarts } = pendingNext;

    // Record zeros for any unthrown darts
    const dartsThisTurn = getDartValues(playerId);
    
    // Fill remaining darts with zeros
    for (let i = 3 - remainingDarts; i < 3; i++) {
      dartsThisTurn[i] = { value: 0, multiplier: 1 };
    }

    // Append this round to history with zeroed darts
    const updatedPlayers = players.map(p =>
      p.id === playerId
        ? {
            ...p,
            history: [
              ...p.history,
              { round: currentGame.round, score: 0, darts: dartsThisTurn }
            ],
            // score resets to start-of-turn (no change)
          }
        : p
    );
    setPlayers(updatedPlayers);
    resetPlayerInputs(playerId);

    // Advance turn
    setCurrentGame(prev => {
      const isLast = prev.currentPlayerIndex === players.length - 1;
      return {
        ...prev,
        currentPlayerIndex: isLast ? 0 : prev.currentPlayerIndex + 1,
        round: isLast ? prev.round + 1 : prev.round,
        roundComplete: isLast
      };
    });

    setBustDialogOpen(false);
    
    // Save game state if needed
    if (onSaveGame) {
      setTimeout(() => {
        onSaveGame({
          players: updatedPlayers,
          currentGame: {
            ...currentGame,
            currentPlayerIndex: currentGame.currentPlayerIndex === players.length - 1 ? 0 : currentGame.currentPlayerIndex + 1,
            round: currentGame.currentPlayerIndex === players.length - 1 ? currentGame.round + 1 : currentGame.round,
            roundComplete: currentGame.currentPlayerIndex === players.length - 1
          },
          gameSettings
        });
      }, 100);
    }
  };

  // Process win confirmation
  const proceedAfterWin = () => {
    const { playerId, remainingDarts, newScore, dartsThrown } = pendingWin;
    
    // Create complete dart array with zeros for unthrown darts
    const completeDarts = [...dartsThrown];
    for (let i = dartsThrown.length; i < 3; i++) {
      completeDarts.push({ value: 0, multiplier: 1 });
    }

    // Calculate turn score
    const turnScore = players.find(p => p.id === playerId)!.score - newScore;
    
    // Append this round to history
    const updatedPlayers = players.map(p =>
      p.id === playerId
        ? {
            ...p,
            score: newScore,
            history: [
              ...p.history,
              { round: currentGame.round, score: turnScore, darts: completeDarts }
            ]
          }
        : p
    );
    setPlayers(updatedPlayers);
    resetPlayerInputs(playerId);

    // Update game points
    const updatedPoints = { ...currentGame.gamePoints };
    updatedPoints[playerId] = (updatedPoints[playerId] || 0) + 1;
    
    // Check if player has reached game point threshold
    const isMatchWin = updatedPoints[playerId] >= gameSettings.gamePointThreshold;
    
    // Handle game completion
    if (isMatchWin && onGameComplete) {
      setTimeout(() => onGameComplete(updatedPlayers.find(p => p.id === playerId)!, updatedPoints), 100);
    }
    
    // Update game state
    setCurrentGame(prev => {
      const isLast = prev.currentPlayerIndex === players.length - 1;
      return {
        ...prev,
        currentPlayerIndex: isLast ? 0 : prev.currentPlayerIndex + 1,
        round: isLast ? prev.round + 1 : prev.round,
        gamePoints: updatedPoints,
        winner: isMatchWin ? playerId : null,
        active: !isMatchWin,
        roundComplete: isLast
      };
    });

    setWinDialogOpen(false);
    
    // If not match win, restart game for next leg
    if (!isMatchWin) {
      restartGame();
    }
    
    // Save game state if needed
    if (onSaveGame && !isMatchWin) {
      setTimeout(() => {
        onSaveGame({
          players: updatedPlayers.map(p => ({
            ...p,
            score: gameSettings.startingScore,
            history: []
          })),
          currentGame: {
            active: true,
            round: 1,
            winner: null,
            gamePoints: updatedPoints,
            currentPlayerIndex: 0,
            roundComplete: false
          },
          gameSettings
        });
      }, 100);
    }
  };

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
    const initialEnabledDarts: Record<string, boolean[]> = {};

    players.forEach(player => {
      if (!initialGamePoints[player.id]) {
        initialGamePoints[player.id] = 0;
      }
      initialDartInputs[player.id] = [
        { value: '', multiplier: 1 },
        { value: '', multiplier: 1 },
        { value: '', multiplier: 1 }
      ];
      initialEnabledDarts[player.id] = [true, false, false];
    });

    setPlayers(players.map(player => ({
      ...player,
      score: gameSettings.startingScore,
      history: []
    })));

    setDartInputs(initialDartInputs);
    setEnabledDarts(initialEnabledDarts);

    setCurrentGame({
      active: true,
      round: 1,
      winner: null,
      gamePoints: initialGamePoints,
      currentPlayerIndex: 0,
      roundComplete: false
    });
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
    
    setEnabledDarts(prev => ({
      ...prev,
      [playerId]: [true, false, false]
    }));
  };

  // Apply player score (manual score entry) - Modified to use the auto bust/win logic
  const applyPlayerScore = () => {
    const currentPlayerIndex = currentGame.currentPlayerIndex;
    const currentPlayer = players[currentPlayerIndex];
    const playerId = currentPlayer.id;
    
    // Count darts thrown
    const dartsThrown = getDartsThrown(playerId);
    
    // If no darts thrown, don't do anything
    if (dartsThrown === 0) {
      toast.error("Enter at least one dart score");
      return;
    }
    
    // Check double in validation
    if (gameSettings.doubleIn && 
        currentPlayer.history.length === 0 && 
        !getDartValues(playerId, dartsThrown).some(d => d.multiplier === 2)) {
      toast.error(`${currentPlayer.name} needs to start with a double!`);
      resetPlayerInputs(playerId);
      return;
    }
    
    // Use the same bust and win checking logic that we use for auto-detection
    if (checkAutoBust(playerId, dartsThrown)) {
      return;
    }
    
    if (checkAutoWin(playerId, dartsThrown)) {
      return;
    }
    
    // If we reach here, it's a normal score entry (no bust, no win)
    const turnScore = calculateTurnScore(playerId);
    const newScore = currentPlayer.score - turnScore;
    const darts = getDartValues(playerId, dartsThrown);
    
    // Fill remaining darts with zeros
    for (let i = dartsThrown; i < 3; i++) {
      darts[i] = { value: 0, multiplier: 1 };
    }
    
    // Update player state
    const updatedPlayers = players.map(p =>
      p.id === playerId
        ? { 
            ...p, 
            score: newScore, 
            history: [...p.history, { 
              round: currentGame.round, 
              score: turnScore, 
              darts 
            }] 
          }
        : p
    );
    
    setPlayers(updatedPlayers);
    resetPlayerInputs(playerId);
    
    // Advance to next player
    const isLast = currentGame.currentPlayerIndex === players.length - 1;
    setCurrentGame(prev => ({
      ...prev,
      currentPlayerIndex: isLast ? 0 : prev.currentPlayerIndex + 1,
      round: isLast ? prev.round + 1 : prev.round,
      roundComplete: isLast
    }));
    
    // Save game state if needed
    if (onSaveGame) {
      setTimeout(() => {
        onSaveGame({
          players: updatedPlayers,
          currentGame: {
            ...currentGame,
            currentPlayerIndex: isLast ? 0 : currentGame.currentPlayerIndex + 1,
            round: isLast ? currentGame.round + 1 : currentGame.round,
            roundComplete: isLast
          },
          gameSettings
        });
      }, 100);
    }
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

  // Render player entry form with sequential dart unlocking
  const renderPlayerEntryForm = (): React.ReactNode => {
    const currentPlayer = getCurrentPlayer();
    if (!currentPlayer || !currentGame.active || currentGame.winner) return null;

    const playerDartInputs = dartInputs[currentPlayer.id] || [
      { value: '', multiplier: 1 },
      { value: '', multiplier: 1 },
      { value: '', multiplier: 1 }
    ];
    
    const playerEnabledDarts = enabledDarts[currentPlayer.id] || [true, false, false];

    return (
      <Card className="mb-6">
        <CardHeader>
          <CardTitle>{currentPlayer.name}'s Turn</CardTitle>
          <CardDescription>Round {currentGame.round} - Remaining: {currentPlayer.score}</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3 mb-4">
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
            <div className="text-xl font-bold">
              Remaining: {calculateTurnPending(currentPlayer.id)}
            </div>
            <div className="space-x-2">
              <Button 
                variant="outline" 
                onClick={() => resetPlayerInputs(currentPlayer.id)}
              >
                Reset
              </Button>
              <Button 
                onClick={applyPlayerScore} 
                className="bg-green-600 hover:bg-green-700"
              >
                Enter Score
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>
    );
  };

  // Render main component
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

      {/* Bust Confirmation Dialog */}
      <Dialog open={bustDialogOpen} onOpenChange={setBustDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Bust!</DialogTitle>
          </DialogHeader>
          <div className="py-4">
            {bustMessage}
          </div>
          <DialogFooter>
            <Button onClick={proceedAfterBust}>
              Continue
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Win Confirmation Dialog */}
      <Dialog open={winDialogOpen} onOpenChange={setWinDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Game Won!</DialogTitle>
          </DialogHeader>
          <div className="py-4">
            {winMessage}
          </div>
          <DialogFooter>
            <Button onClick={proceedAfterWin}>
              Continue
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

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