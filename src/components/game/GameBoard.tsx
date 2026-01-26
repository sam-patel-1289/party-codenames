import { BoardCard, CardType, TeamColor } from '@/types/game';
import { cn } from '@/lib/utils';

interface GameBoardProps {
  cards: BoardCard[];
  showSecretKey: boolean;
  onCardClick?: (cardId: string) => void;
  selectable?: boolean;
  selectedCardId?: string | null;
}

const cardTypeStyles: Record<CardType, { revealed: string; secret: string }> = {
  red: {
    revealed: 'bg-red-600 text-white border-red-700',
    secret: 'ring-2 ring-red-500 ring-inset'
  },
  blue: {
    revealed: 'bg-blue-600 text-white border-blue-700',
    secret: 'ring-2 ring-blue-500 ring-inset'
  },
  bystander: {
    revealed: 'bg-amber-200 text-amber-900 border-amber-300',
    secret: 'ring-2 ring-amber-400 ring-inset'
  },
  assassin: {
    revealed: 'bg-gray-900 text-white border-gray-800',
    secret: 'ring-2 ring-gray-900 ring-inset'
  }
};

export function GameBoard({ 
  cards, 
  showSecretKey, 
  onCardClick, 
  selectable = false,
  selectedCardId 
}: GameBoardProps) {
  // Sort cards by position
  const sortedCards = [...cards].sort((a, b) => a.position - b.position);

  return (
    <div className="grid grid-cols-5 gap-2 sm:gap-3 md:gap-4 w-full max-w-5xl mx-auto p-2 sm:p-4">
      {sortedCards.map((card) => {
        const styles = cardTypeStyles[card.card_type];
        const isRevealed = card.is_revealed;
        const isSelected = selectedCardId === card.id;
        
        return (
          <button
            key={card.id}
            onClick={() => onCardClick?.(card.id)}
            disabled={!selectable || isRevealed}
            className={cn(
              "aspect-[4/3] rounded-lg border-2 flex items-center justify-center p-1 sm:p-2 transition-all duration-300",
              "text-xs sm:text-sm md:text-base lg:text-lg font-bold uppercase tracking-wide",
              "shadow-md hover:shadow-lg",
              isRevealed 
                ? styles.revealed 
                : cn(
                    "bg-card text-card-foreground border-border",
                    showSecretKey && styles.secret,
                    selectable && !isRevealed && "hover:scale-105 cursor-pointer hover:border-primary",
                    isSelected && "ring-4 ring-primary scale-105"
                  ),
              !selectable && !isRevealed && "cursor-default"
            )}
          >
            <span className="text-center leading-tight break-words hyphens-auto">
              {card.word}
            </span>
          </button>
        );
      })}
    </div>
  );
}
