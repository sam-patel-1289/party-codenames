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
import { Smartphone, Play, Hand, Eye, EyeOff, AlertTriangle, Check, X } from 'lucide-react';
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
    joinAsPlayer,
    assignRole,
    startGame,
    submitClue,
    selectWord,
    endTurnEarly,
    resetGame,
    challengeClue,
    resolveChallenge,
    clearError
  } = useGameRoom(roomCode);

  const [selectedCard, setSelectedCard] = useState<BoardCard | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showSecretKey, setShowSecretKey] = useState(true);
  const [hasJoined, setHasJoined] = useState(false);

  // Determine player state
  const isRedSpymaster = currentPlayer?.player_role === 'red_spymaster';
  const isBlueSpymaster = currentPlayer?.player_role === 'blue_spymaster';
  const isSpymaster = isRedSpymaster || isBlueSpymaster;
  const myTeam = isRedSpymaster ? 'red' : isBlueSpymaster ? 'blue' : null;
  const opposingTeam = myTeam === 'red' ? 'blue' : myTeam === 'blue' ? 'red' : null;

  // Is it my turn to give clue?
  const isMyTurnToClue = room?.game_state === 'playing' &&
    room?.current_turn === myTeam &&
    !room?.current_clue_word;

  // Is it my turn to select (for opponent)?
  const isMyTurnToSelect = room?.game_state === 'playing' &&
    room?.current_turn === opposingTeam &&
    !!room?.current_clue_word &&
    (room?.guesses_remaining || 0) > 0;

  // Auto-join as player when room is loaded
  useEffect(() => {
    if (room && !isLoading && !hasJoined && !currentPlayer) {
      joinAsPlayer().then(success => {
        if (success) setHasJoined(true);
      });
    } else if (currentPlayer) {
      setHasJoined(true);
    }
  }, [room, isLoading, hasJoined, currentPlayer, joinAsPlayer]);

  // Auto-hide key when it's my turn to select (prevent accidental cheating)
  useEffect(() => {
    if (isMyTurnToSelect) {
      setShowSecretKey(false);
    }
  }, [isMyTurnToSelect]);

  if (isLoading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center p-4">
        <div className="text-lg text-muted-foreground animate-pulse">
          Joining game...
        </div>
      </div>
    );
  }

  if ((!room && !isLoading) || (!room && error)) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center p-4">
        <Card className="max-w-sm w-full">
          <CardHeader>
            <CardTitle className="text-destructive">Room Not Found</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <p className="text-muted-foreground">
              The room "{roomCode}" doesn't exist or could not be loaded.
            </p>
            <Button onClick={() => navigate('/')} className="w-full">
              Go Home
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  // Ensure room exists for safety, though the check above handles it
  if (!room) return null;



  // Is clue challenged?
  const isChallenged = room.clue_status === 'challenged';
  const isRejected = room.clue_status === 'rejected';

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

      {/* Transient Error Display */}
      {error && (
        <div className="bg-destructive/15 text-destructive border border-destructive/20 p-3 rounded-md flex items-center justify-between text-sm">
          <div className="flex items-center gap-2">
            <AlertTriangle className="w-4 h-4" />
            <span>{error}</span>
          </div>
          <Button
            variant="ghost"
            size="sm"
            className="h-auto p-1 text-destructive hover:bg-destructive/10"
            onClick={clearError}
          >
            <X className="w-4 h-4" />
          </Button>
        </div>
      )}

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
        <Card className={cn(isChallenged && "border-yellow-500 animate-pulse")}>
          <CardContent className="pt-6 text-center text-muted-foreground flex flex-col gap-4">
            <p>
              Waiting for <span className={opposingColor}>
                {opposingTeam?.toUpperCase()}
              </span> spymaster to give a clue...
            </p>
            {/* Allow challenge if they just gave a clue (but client logic hides this block if clue exists... wait) 
                Actually, this block shows when NO clue exists. Challenge button should appear AFTER clue is given but BEFORE guesses start?
                Or rather, validation happens immediately. 
                Wait, if clue is 'allowed' by default, opposing team can challenge it.
            */}
          </CardContent>
        </Card>
      )}

      {/* Challenge Logic Display */}
      {room.current_clue_word && (
        <div className="flex gap-2 justify-center pb-2">
          {/* Show Challenge UI if I am the opposing spymaster (the one selecting) and status is allowed */}
          {isMyTurnToSelect && room.clue_status === 'allowed' && (
            <Button
              variant="destructive"
              size="sm"
              className="gap-2 w-full max-w-xs"
              onClick={() => challengeClue()}
            >
              <AlertTriangle className="w-4 h-4" />
              Challenge Clue "{room.current_clue_word}"
            </Button>
          )}

          {/* Show Resolution UI if status is challenged */}
          {isChallenged && (
            <Card className="w-full border-yellow-500 bg-yellow-500/10">
              <CardHeader className="py-3">
                <CardTitle className="text-sm text-yellow-600 flex items-center gap-2">
                  <AlertTriangle className="w-4 h-4" />
                  Clue Challenged!
                </CardTitle>
                <CardDescription>
                  Is "{room.current_clue_word}" a valid clue?
                </CardDescription>
              </CardHeader>
              <CardContent className="flex gap-4 pt-0">
                <Button
                  className="flex-1 bg-green-600 hover:bg-green-700 text-white"
                  onClick={() => resolveChallenge('allowed')}
                >
                  <Check className="w-4 h-4 mr-2" />
                  Valid
                </Button>
                <Button
                  className="flex-1 bg-red-600 hover:bg-red-700 text-white"
                  onClick={() => resolveChallenge('rejected')}
                >
                  <X className="w-4 h-4 mr-2" />
                  Invalid
                </Button>
              </CardContent>
            </Card>
          )}
        </div>
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
