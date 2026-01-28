import { GameRoom, TeamColor } from '@/types/game';
import { cn } from '@/lib/utils';

interface GameStatusProps {
  room: GameRoom;
  isTV?: boolean;
}

export function GameStatus({ room, isTV = false }: GameStatusProps) {
  const teamColors: Record<TeamColor, string> = {
    red: 'text-red-500',
    blue: 'text-blue-500'
  };

  const teamBgColors: Record<TeamColor, string> = {
    red: 'bg-red-500',
    blue: 'bg-blue-500'
  };

  return (
    <div className={cn(
      "w-full bg-card rounded-xl shadow-lg p-4 sm:p-6",
      isTV && "text-2xl sm:text-3xl"
    )}>
      {/* Turn Indicator */}
      <div className="text-center mb-4">
        {room.current_turn && (
          <div
            data-testid="turn-badge"
            className={cn(
              "inline-flex items-center gap-2 px-4 py-2 rounded-full",
              room.current_turn === 'red' ? 'bg-red-500/20' : 'bg-blue-500/20'
            )}>
            <div className={cn(
              "w-3 h-3 rounded-full animate-pulse",
              teamBgColors[room.current_turn]
            )} />
            <span className={cn(
              "font-bold uppercase tracking-wider",
              teamColors[room.current_turn]
            )}>
              {room.current_turn} Team's Turn
            </span>
          </div>
        )}
      </div>

      {/* Clue Display */}
      {room.current_clue_word && (
        <div className="text-center mb-4">
          <div className="text-muted-foreground text-sm uppercase tracking-wide mb-1">
            Current Clue
          </div>
          <div className={cn(
            "font-black tracking-tight",
            isTV ? "text-5xl sm:text-6xl" : "text-3xl sm:text-4xl"
          )}>
            {room.current_clue_word}
            <span className="text-primary ml-2">
              {room.current_clue_number}
            </span>
          </div>
          <div className="text-muted-foreground mt-2">
            Guesses: {room.guesses_used} / {room.guesses_remaining + room.guesses_used}
          </div>
        </div>
      )}

      {!room.current_clue_word && room.game_state === 'playing' && (
        <div className="text-center text-muted-foreground">
          <span className={teamColors[room.current_turn!]}>
            {room.current_turn?.toUpperCase()}
          </span>
          {' '}Spymaster is thinking...
        </div>
      )}

      {/* Score Display */}
      <div className="flex justify-center gap-8 mt-4">
        <div className="text-center">
          <div className="text-red-500 font-bold text-sm uppercase tracking-wide">Red</div>
          <div className={cn(
            "font-black text-red-500",
            isTV ? "text-4xl" : "text-2xl"
          )}>
            {room.red_score} / {room.red_target}
          </div>
        </div>
        <div className="text-center">
          <div className="text-blue-500 font-bold text-sm uppercase tracking-wide">Blue</div>
          <div className={cn(
            "font-black text-blue-500",
            isTV ? "text-4xl" : "text-2xl"
          )}>
            {room.blue_score} / {room.blue_target}
          </div>
        </div>
      </div>
    </div>
  );
}
