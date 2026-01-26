import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { PlayerRole, GamePlayer } from '@/types/game';
import { cn } from '@/lib/utils';
import { Check, User } from 'lucide-react';

interface RoleSelectorProps {
  players: GamePlayer[];
  currentRole: PlayerRole;
  sessionId: string;
  onSelectRole: (role: PlayerRole) => Promise<boolean>;
}

export function RoleSelector({ players, currentRole, sessionId, onSelectRole }: RoleSelectorProps) {
  const redSpymaster = players.find(p => p.player_role === 'red_spymaster');
  const blueSpymaster = players.find(p => p.player_role === 'blue_spymaster');

  const isRedTaken = redSpymaster && redSpymaster.session_id !== sessionId;
  const isBlueTaken = blueSpymaster && blueSpymaster.session_id !== sessionId;

  const roles: { role: PlayerRole; label: string; color: string; bgColor: string; isTaken: boolean }[] = [
    { 
      role: 'red_spymaster', 
      label: 'Red Spymaster', 
      color: 'text-red-500',
      bgColor: 'bg-red-500/10 border-red-500 hover:bg-red-500/20',
      isTaken: !!isRedTaken
    },
    { 
      role: 'blue_spymaster', 
      label: 'Blue Spymaster', 
      color: 'text-blue-500',
      bgColor: 'bg-blue-500/10 border-blue-500 hover:bg-blue-500/20',
      isTaken: !!isBlueTaken
    }
  ];

  return (
    <Card>
      <CardHeader>
        <CardTitle>Choose Your Role</CardTitle>
        <CardDescription>
          Select your team. Spymasters will use their phones to give clues and select words.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-3">
        {roles.map(({ role, label, color, bgColor, isTaken }) => {
          const isSelected = currentRole === role;
          
          return (
            <Button
              key={role}
              variant="outline"
              className={cn(
                "w-full h-16 justify-between border-2",
                isSelected ? bgColor : "",
                isTaken && "opacity-50"
              )}
              onClick={() => onSelectRole(role)}
              disabled={isTaken}
            >
              <div className="flex items-center gap-3">
                <User className={cn("w-5 h-5", color)} />
                <span className={cn("font-bold", color)}>{label}</span>
              </div>
              {isSelected && <Check className="w-5 h-5 text-primary" />}
              {isTaken && <span className="text-xs text-muted-foreground">Taken</span>}
            </Button>
          );
        })}
      </CardContent>
    </Card>
  );
}
