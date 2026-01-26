import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { TeamColor } from '@/types/game';
import { cn } from '@/lib/utils';

interface ClueInputProps {
  team: TeamColor;
  onSubmit: (word: string, number: number) => Promise<boolean>;
  disabled?: boolean;
}

export function ClueInput({ team, onSubmit, disabled = false }: ClueInputProps) {
  const [word, setWord] = useState('');
  const [number, setNumber] = useState(1);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    const trimmedWord = word.trim();
    if (!trimmedWord) {
      setError('Please enter a clue word');
      return;
    }

    if (trimmedWord.includes(' ')) {
      setError('Clue must be a single word');
      return;
    }

    setIsSubmitting(true);
    const success = await onSubmit(trimmedWord, number);
    setIsSubmitting(false);

    if (success) {
      setWord('');
      setNumber(1);
    }
  };

  const teamColor = team === 'red' ? 'text-red-500' : 'text-blue-500';
  const teamBorder = team === 'red' ? 'border-red-500' : 'border-blue-500';

  return (
    <Card className={cn("border-2", teamBorder)}>
      <CardHeader className="pb-2">
        <CardTitle className={cn("text-center", teamColor)}>
          Give Your Clue
        </CardTitle>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <Label htmlFor="clue-word">Clue Word</Label>
            <Input
              id="clue-word"
              value={word}
              onChange={(e) => setWord(e.target.value.toUpperCase())}
              placeholder="Enter one word..."
              disabled={disabled || isSubmitting}
              className="text-lg font-bold uppercase"
              autoComplete="off"
            />
          </div>
          
          <div>
            <Label htmlFor="clue-number">Number</Label>
            <div className="flex gap-2 flex-wrap">
              {[0, 1, 2, 3, 4, 5, 6, 7, 8, 9].map((n) => (
                <Button
                  key={n}
                  type="button"
                  variant={number === n ? "default" : "outline"}
                  size="sm"
                  onClick={() => setNumber(n)}
                  disabled={disabled || isSubmitting}
                  className="w-10 h-10"
                >
                  {n}
                </Button>
              ))}
              <Button
                type="button"
                variant={number === 99 ? "default" : "outline"}
                size="sm"
                onClick={() => setNumber(99)}
                disabled={disabled || isSubmitting}
                className="h-10 px-3"
              >
                ∞
              </Button>
            </div>
          </div>

          {error && (
            <p className="text-destructive text-sm">{error}</p>
          )}

          <Button 
            type="submit" 
            className="w-full" 
            disabled={disabled || isSubmitting || !word.trim()}
          >
            {isSubmitting ? 'Submitting...' : 'Submit Clue'}
          </Button>
        </form>
      </CardContent>
    </Card>
  );
}
