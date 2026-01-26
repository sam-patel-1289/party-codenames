import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useGameRoom } from '@/hooks/useGameRoom';
import { GameBoard } from '@/components/game/GameBoard';
import { GameStatus } from '@/components/game/GameStatus';
import { ClueInput } from '@/components/game/ClueInput';
import { RoleSelector } from '@/components/game/RoleSelector';
import { SelectionConfirm } from '@/components/game/SelectionConfirm';
import { GameOver } from '@/components/game/GameOver';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Smartphone, Play, Hand, Eye, EyeOff } from 'lucide-react';
import { cn } from '@/lib/utils';
import { BoardCard } from '@/types/game';

export default function SpymasterView() {
  const { roomCode } = useParams<{ roomCode: string }>();
  const navigate = useNavigate();
  const {
    room,
    cards,
    players,
    currentPlayer,
    isLoading,
    error,
    joinRoom,
    assignRole,
    startGame,
    submitClue,
    selectWord,
    endTurnEarly,
    resetGame
  } = useGameRoom(roomCode);

  const [selectedCard, setSelectedCard] = useState<BoardCard | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showSecretKey, setShowSecretKey] = useState(true);

  // Auto-join room on mount
  useEffect(() => {
    if (roomCode && !room && !isLoading) {
      joinRoom(roomCode);
    }
  }, [roomCode, room, isLoading, joinRoom]);

  if (isLoading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center p-4">
        <div className="text-lg text-muted-foreground animate-pulse">
          Joining game...
        </div>
      </div>
    );
  }

  if (error || !room) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center p-4">
        <Card className="max-w-sm w-full">
          <CardHeader>
            <CardTitle className="text-destructive">Room Not Found</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <p className="text-muted-foreground">
              The room "{roomCode}" doesn't exist.
            </p>
            <Button onClick={() => navigate('/')} className="w-full">
              Go Home
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  // Determine player state
  const isRedSpymaster = currentPlayer?.player_role === 'red_spymaster';
  const isBlueSpymaster = currentPlayer?.player_role === 'blue_spymaster';
  const isSpymaster = isRedSpymaster || isBlueSpymaster;
  const myTeam = isRedSpymaster ? 'red' : isBlueSpymaster ? 'blue' : null;
  const opposingTeam = myTeam === 'red' ? 'blue' : myTeam === 'blue' ? 'red' : null;

  // Is it my turn to give clue?
  const isMyTurnToClue = room.game_state === 'playing' && 
    room.current_turn === myTeam && 
    !room.current_clue_word;

  // Is it my turn to select (for opponent)?
  const isMyTurnToSelect = room.game_state === 'playing' && 
    room.current_turn === opposingTeam && 
    !!room.current_clue_word &&
    room.guesses_remaining > 0;

  // Game Over
  if (room.game_state === 'game_over') {
    return <GameOver room={room} cards={cards} onPlayAgain={resetGame} />;
  }

  // Lobby / Team Setup
  if (room.game_state === 'lobby') {
    const redSpymaster = players.find(p => p.player_role === 'red_spymaster');
    const blueSpymaster = players.find(p => p.player_role === 'blue_spymaster');
    const bothReady = redSpymaster && blueSpymaster;

    return (
      <div className="min-h-screen bg-background p-4 space-y-6">
        <div className="flex items-center justify-center gap-2 text-muted-foreground">
          <Smartphone className="w-5 h-5" />
          <span>Spymaster Phone</span>
        </div>

        <Card className="text-center">
          <CardHeader className="pb-2">
            <CardTitle className="text-2xl font-mono tracking-widest">
              {room.room_code}
            </CardTitle>
            <CardDescription>Room Code</CardDescription>
          </CardHeader>
        </Card>

        <RoleSelector
          players={players}
          currentRole={currentPlayer?.player_role || 'spectator'}
          sessionId={currentPlayer?.session_id || ''}
          onSelectRole={assignRole}
        />

        {isSpymaster && bothReady && (
          <Card className="border-primary">
            <CardContent className="pt-6">
              <Button 
                onClick={startGame} 
                className="w-full h-14 text-lg gap-2"
              >
                <Play className="w-5 h-5" />
                Start Game
              </Button>
              <p className="text-sm text-muted-foreground text-center mt-2">
                Make sure the TV is showing the room code
              </p>
            </CardContent>
          </Card>
        )}

        {isSpymaster && !bothReady && (
          <Card>
            <CardContent className="pt-6 text-center text-muted-foreground">
              Waiting for the other spymaster to join...
            </CardContent>
          </Card>
        )}
      </div>
    );
  }

  // Playing state
  const handleCardClick = (cardId: string) => {
    if (!isMyTurnToSelect) return;
    const card = cards.find(c => c.id === cardId);
    if (card && !card.is_revealed) {
      setSelectedCard(card);
    }
  };

  const handleConfirmSelection = async () => {
    if (!selectedCard) return;
    setIsSubmitting(true);
    await selectWord(selectedCard.id);
    setSelectedCard(null);
    setIsSubmitting(false);
  };

  const teamColor = myTeam === 'red' ? 'text-red-500' : 'text-blue-500';
  const opposingColor = opposingTeam === 'red' ? 'text-red-500' : 'text-blue-500';

  return (
    <div className="min-h-screen bg-background p-4 space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <Badge variant="outline" className={cn("text-sm font-bold", teamColor)}>
          {myTeam?.toUpperCase()} Spymaster
        </Badge>
        <Button
          variant="ghost"
          size="sm"
          onClick={() => setShowSecretKey(!showSecretKey)}
          className="gap-1"
        >
          {showSecretKey ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
          {showSecretKey ? 'Hide' : 'Show'} Key
        </Button>
      </div>

      {/* Status */}
      <GameStatus room={room} />

      {/* Role-based UI */}
      {isMyTurnToClue && (
        <ClueInput 
          team={myTeam!}
          onSubmit={submitClue}
        />
      )}

      {isMyTurnToSelect && (
        <Card className={cn(
          "border-2",
          opposingTeam === 'red' ? 'border-red-500' : 'border-blue-500'
        )}>
          <CardHeader className="pb-2">
            <CardTitle className={cn("text-lg", opposingColor)}>
              <Hand className="inline w-5 h-5 mr-2" />
              Tap {opposingTeam?.toUpperCase()}'s Guess
            </CardTitle>
            <CardDescription>
              Listen to what the {opposingTeam} operatives choose, then tap that word below.
            </CardDescription>
          </CardHeader>
        </Card>
      )}

      {/* Not my turn */}
      {room.current_turn === myTeam && room.current_clue_word && !isMyTurnToClue && (
        <Card>
          <CardContent className="pt-6 text-center space-y-4">
            <p className="text-muted-foreground">
              Your operatives are guessing. The <span className={opposingColor}>
                {opposingTeam?.toUpperCase()}
              </span> spymaster will tap their selections.
            </p>
            {room.guesses_used >= 1 && (
              <Button 
                variant="outline" 
                onClick={endTurnEarly}
                className="gap-2"
              >
                End Turn Early
              </Button>
            )}
          </CardContent>
        </Card>
      )}

      {room.current_turn === opposingTeam && !room.current_clue_word && (
        <Card>
          <CardContent className="pt-6 text-center text-muted-foreground">
            Waiting for <span className={opposingColor}>
              {opposingTeam?.toUpperCase()}
            </span> spymaster to give a clue...
          </CardContent>
        </Card>
      )}

      {/* Game Board */}
      <GameBoard
        cards={cards}
        showSecretKey={showSecretKey && isSpymaster}
        onCardClick={handleCardClick}
        selectable={isMyTurnToSelect}
        selectedCardId={selectedCard?.id}
      />

      {/* Selection Confirmation Dialog */}
      <SelectionConfirm
        card={selectedCard}
        guessingTeam={opposingTeam!}
        onConfirm={handleConfirmSelection}
        onCancel={() => setSelectedCard(null)}
        isSubmitting={isSubmitting}
      />
    </div>
  );
}
