import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useGameRoom } from '@/hooks/useGameRoom';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Monitor, Smartphone, Play, Users, Zap } from 'lucide-react';

export default function Index() {
  const navigate = useNavigate();
  const { createRoom, isLoading } = useGameRoom();
  const [joinCode, setJoinCode] = useState('');
  const [isCreating, setIsCreating] = useState(false);

  const handleCreateRoom = async () => {
    setIsCreating(true);
    const code = await createRoom();
    setIsCreating(false);
    if (code) {
      navigate(`/tv/${code}`);
    }
  };

  const handleJoinRoom = () => {
    const code = joinCode.trim().toUpperCase();
    if (code.length >= 4) {
      navigate(`/join/${code}`);
    }
  };

  return (
    <div className="min-h-screen bg-background flex flex-col items-center justify-center p-4">
      <div className="max-w-lg w-full space-y-8">
        {/* Header */}
        <div className="text-center space-y-2">
          <h1 className="text-4xl sm:text-5xl font-black tracking-tight">
            CODENAMES
          </h1>
          <p className="text-muted-foreground text-lg">
            TV Edition with Cross-Spymaster Selection
          </p>
        </div>

        {/* Main Actions */}
        <Tabs defaultValue="host" className="w-full">
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="host" className="gap-2">
              <Monitor className="w-4 h-4" />
              Host Game
            </TabsTrigger>
            <TabsTrigger value="join" className="gap-2">
              <Smartphone className="w-4 h-4" />
              Join Game
            </TabsTrigger>
          </TabsList>

          <TabsContent value="host">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Monitor className="w-5 h-5" />
                  Host on TV
                </CardTitle>
                <CardDescription>
                  Start a new game and display the board on your TV or shared screen.
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <Button 
                  onClick={handleCreateRoom} 
                  className="w-full h-14 text-lg gap-2"
                  disabled={isCreating}
                >
                  <Play className="w-5 h-5" />
                  {isCreating ? 'Creating...' : 'Create New Game'}
                </Button>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="join">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Smartphone className="w-5 h-5" />
                  Join as Spymaster
                </CardTitle>
                <CardDescription>
                  Enter the room code shown on the TV to join as a spymaster.
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <Input
                  placeholder="ROOM CODE"
                  value={joinCode}
                  onChange={(e) => setJoinCode(e.target.value.toUpperCase())}
                  className="text-center text-2xl font-mono tracking-widest h-14"
                  maxLength={6}
                />
                <Button 
                  onClick={handleJoinRoom}
                  className="w-full h-12"
                  disabled={joinCode.length < 4}
                >
                  Join Room
                </Button>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>

        {/* How to Play */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-lg flex items-center gap-2">
              <Users className="w-5 h-5" />
              How to Play
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3 text-sm text-muted-foreground">
            <div className="flex gap-3">
              <span className="font-bold text-foreground shrink-0">1.</span>
              <span>Host displays the game on TV. Two spymasters join with their phones.</span>
            </div>
            <div className="flex gap-3">
              <span className="font-bold text-foreground shrink-0">2.</span>
              <span>Spymasters see the secret key. Give one-word clues to your operatives.</span>
            </div>
            <div className="flex gap-3">
              <span className="font-bold text-foreground shrink-0">3.</span>
              <span>
                <span className="font-semibold text-foreground">Twist:</span> The <em>opposing</em> spymaster taps guesses for the active team. No cheating!
              </span>
            </div>
            <div className="flex gap-3">
              <span className="font-bold text-foreground shrink-0">4.</span>
              <span>First team to find all their agents wins. Avoid the assassin!</span>
            </div>
          </CardContent>
        </Card>

        {/* Footer */}
        <div className="text-center text-xs text-muted-foreground">
          <Zap className="w-3 h-3 inline mr-1" />
          Real-time multiplayer • No app download required
        </div>
      </div>
    </div>
  );
}
