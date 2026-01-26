import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { GameRoom, BoardCard } from '@/types/game';
import { GameBoard } from './GameBoard';
import { Trophy, RotateCcw } from 'lucide-react';
import { cn } from '@/lib/utils';

interface GameOverProps {
  room: GameRoom;
  cards: BoardCard[];
  onPlayAgain: () => Promise<boolean>;
  isTV?: boolean;
}

export function GameOver({ room, cards, onPlayAgain, isTV = false }: GameOverProps) {
  const winnerColor = room.winner === 'red' ? 'text-red-500' : 'text-blue-500';
  const winnerBg = room.winner === 'red' ? 'bg-red-500/10' : 'bg-blue-500/10';

  return (
    <div className="flex flex-col items-center justify-center min-h-screen p-4 gap-8">
      {/* Winner Announcement */}
      <Card className={cn("w-full max-w-lg text-center", winnerBg)}>
        <CardHeader>
          <CardTitle className="flex items-center justify-center gap-3">
            <Trophy className={cn("w-8 h-8", winnerColor)} />
            <span className={cn(isTV ? "text-5xl" : "text-3xl", winnerColor)}>
              {room.winner?.toUpperCase()} WINS!
            </span>
            <Trophy className={cn("w-8 h-8", winnerColor)} />
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex justify-center gap-8 text-lg">
            <div>
              <span className="text-red-500 font-bold">Red: </span>
              <span>{room.red_score} / {room.red_target}</span>
            </div>
            <div>
              <span className="text-blue-500 font-bold">Blue: </span>
              <span>{room.blue_score} / {room.blue_target}</span>
            </div>
          </div>
          
          {!isTV && (
            <Button onClick={onPlayAgain} className="gap-2">
              <RotateCcw className="w-4 h-4" />
              Play Again
            </Button>
          )}
        </CardContent>
      </Card>

      {/* Full Key Reveal */}
      <div className="w-full max-w-5xl">
        <h3 className={cn(
          "text-center font-bold mb-4 text-muted-foreground",
          isTV ? "text-2xl" : "text-lg"
        )}>
          Complete Board
        </h3>
        <GameBoard 
          cards={cards.map(c => ({ ...c, is_revealed: true }))} 
          showSecretKey={false}
        />
      </div>
    </div>
  );
}
