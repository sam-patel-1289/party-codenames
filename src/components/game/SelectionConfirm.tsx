import { useState } from 'react';
import { Button } from '@/components/ui/button';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { BoardCard, TeamColor } from '@/types/game';
import { cn } from '@/lib/utils';

interface SelectionConfirmProps {
  card: BoardCard | null;
  guessingTeam: TeamColor;
  onConfirm: () => Promise<void>;
  onCancel: () => void;
  isSubmitting: boolean;
}

export function SelectionConfirm({ 
  card, 
  guessingTeam, 
  onConfirm, 
  onCancel,
  isSubmitting 
}: SelectionConfirmProps) {
  if (!card) return null;

  const teamColor = guessingTeam === 'red' ? 'text-red-500' : 'text-blue-500';

  return (
    <AlertDialog open={!!card} onOpenChange={(open) => !open && onCancel()}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Confirm Selection</AlertDialogTitle>
          <AlertDialogDescription className="space-y-2">
            <span className={cn("font-bold", teamColor)}>
              {guessingTeam.toUpperCase()} Team
            </span>
            {' '}is guessing:
            <div className="text-2xl font-black text-foreground mt-2 p-4 bg-muted rounded-lg text-center">
              {card.word}
            </div>
            <p className="text-sm mt-2">
              Make sure this is the word they called out. This action cannot be undone.
            </p>
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel disabled={isSubmitting}>Cancel</AlertDialogCancel>
          <AlertDialogAction onClick={onConfirm} disabled={isSubmitting}>
            {isSubmitting ? 'Confirming...' : 'Confirm Selection'}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
