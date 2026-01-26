import { useParams } from 'react-router-dom';
import { useGameRoom } from '@/hooks/useGameRoom';
import { GameBoard } from '@/components/game/GameBoard';
import { GameStatus } from '@/components/game/GameStatus';
import { GameOver } from '@/components/game/GameOver';
import { QRCode } from '@/components/game/QRCode';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Monitor, Users } from 'lucide-react';

export default function TVView() {
  const { roomCode } = useParams<{ roomCode: string }>();
  const { room, cards, players, isLoading, error, resetGame } = useGameRoom(roomCode);

  if (isLoading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-2xl text-muted-foreground animate-pulse">
          Loading game...
        </div>
      </div>
    );
  }

  if (error || !room) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <Card className="max-w-md">
          <CardHeader>
            <CardTitle className="text-destructive">Room Not Found</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-muted-foreground">
              The game room "{roomCode}" doesn't exist or has expired.
            </p>
          </CardContent>
        </Card>
      </div>
    );
  }

  // Game Over state
  if (room.game_state === 'game_over') {
    return <GameOver room={room} cards={cards} onPlayAgain={resetGame} isTV />;
  }

  // Lobby state - show room code and QR
  if (room.game_state === 'lobby') {
    const joinUrl = `${window.location.origin}/join/${room.room_code}`;
    const redSpymaster = players.find(p => p.player_role === 'red_spymaster');
    const blueSpymaster = players.find(p => p.player_role === 'blue_spymaster');

    return (
      <div className="min-h-screen bg-background flex flex-col items-center justify-center p-8 gap-8">
        <div className="flex items-center gap-3 text-muted-foreground">
          <Monitor className="w-8 h-8" />
          <span className="text-xl">TV Display</span>
        </div>

        <Card className="max-w-lg w-full text-center">
          <CardHeader>
            <CardTitle className="text-4xl tracking-widest font-mono">
              {room.room_code}
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-6">
            <p className="text-muted-foreground">
              Spymasters: Scan QR code or enter room code on your phone
            </p>
            
            <div className="flex justify-center">
              <QRCode value={joinUrl} size={200} />
            </div>

            <div className="text-sm text-muted-foreground">
              {joinUrl}
            </div>

            {/* Player Status */}
            <div className="border-t pt-4 mt-4">
              <div className="flex items-center justify-center gap-2 mb-3">
                <Users className="w-5 h-5" />
                <span className="font-semibold">Spymasters</span>
              </div>
              <div className="flex justify-center gap-8">
                <div className="text-center">
                  <div className="text-red-500 font-bold">Red</div>
                  <div className={redSpymaster ? "text-foreground" : "text-muted-foreground"}>
                    {redSpymaster ? "Ready ✓" : "Waiting..."}
                  </div>
                </div>
                <div className="text-center">
                  <div className="text-blue-500 font-bold">Blue</div>
                  <div className={blueSpymaster ? "text-foreground" : "text-muted-foreground"}>
                    {blueSpymaster ? "Ready ✓" : "Waiting..."}
                  </div>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        <p className="text-muted-foreground text-center max-w-md">
          Once both spymasters have joined, one of them will start the game from their phone.
        </p>
      </div>
    );
  }

  // Playing state - show the board
  return (
    <div className="min-h-screen bg-background p-4 flex flex-col">
      {/* Header with status */}
      <div className="mb-4">
        <GameStatus room={room} isTV />
      </div>

      {/* Game Board - Public View */}
      <div className="flex-1 flex items-center justify-center">
        <GameBoard 
          cards={cards} 
          showSecretKey={false}
          selectable={false}
        />
      </div>

      {/* Room code footer */}
      <div className="text-center text-muted-foreground py-2">
        Room: {room.room_code}
      </div>
    </div>
  );
}
