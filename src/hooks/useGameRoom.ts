import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { GameRoom, BoardCard, GamePlayer, TeamColor, CardType, PlayerRole } from '@/types/game';
import { getSessionId } from '@/lib/sessionId';
import { generateRoomCode, generateBoardWords, generateSecretKey, pickStartingTeam } from '@/lib/wordpack';

export function useGameRoom(roomCode?: string) {
  const [room, setRoom] = useState<GameRoom | null>(null);
  const [cards, setCards] = useState<BoardCard[]>([]);
  const [players, setPlayers] = useState<GamePlayer[]>([]);
  const [currentPlayer, setCurrentPlayer] = useState<GamePlayer | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const sessionId = getSessionId();

  // Create a new game room
  const createRoom = useCallback(async (): Promise<string | null> => {
    try {
      const code = generateRoomCode();
      
      const { data: roomData, error: roomError } = await supabase
        .from('game_rooms')
        .insert({
          room_code: code,
          game_state: 'lobby'
        })
        .select()
        .single();

      if (roomError) throw roomError;

      return code;
    } catch (err) {
      console.error('Error creating room:', err);
      setError('Failed to create room');
      return null;
    }
  }, []);

  // Join an existing room
  const joinRoom = useCallback(async (code: string, role: PlayerRole = 'spectator'): Promise<boolean> => {
    try {
      setIsLoading(true);
      setError(null);

      // Find the room
      const { data: roomData, error: roomError } = await supabase
        .from('game_rooms')
        .select('*')
        .eq('room_code', code.toUpperCase())
        .single();

      if (roomError || !roomData) {
        setError('Room not found');
        return false;
      }

      // Add or update player
      const { data: playerData, error: playerError } = await supabase
        .from('game_players')
        .upsert({
          room_id: roomData.id,
          session_id: sessionId,
          player_role: role,
          last_seen: new Date().toISOString()
        }, {
          onConflict: 'room_id,session_id'
        })
        .select()
        .single();

      if (playerError) throw playerError;

      setRoom(roomData as GameRoom);
      setCurrentPlayer(playerData as GamePlayer);
      return true;
    } catch (err) {
      console.error('Error joining room:', err);
      setError('Failed to join room');
      return false;
    } finally {
      setIsLoading(false);
    }
  }, [sessionId]);

  // Assign role to current player
  const assignRole = useCallback(async (role: PlayerRole): Promise<boolean> => {
    if (!room || !currentPlayer) return false;

    try {
      // Check if role is already taken (for spymasters)
      if (role !== 'spectator') {
        const existingPlayer = players.find(p => p.player_role === role && p.session_id !== sessionId);
        if (existingPlayer) {
          setError(`${role === 'red_spymaster' ? 'Red' : 'Blue'} Spymaster role is already taken`);
          return false;
        }
      }

      const { error: updateError } = await supabase
        .from('game_players')
        .update({ player_role: role })
        .eq('id', currentPlayer.id);

      if (updateError) throw updateError;

      setCurrentPlayer({ ...currentPlayer, player_role: role });
      return true;
    } catch (err) {
      console.error('Error assigning role:', err);
      setError('Failed to assign role');
      return false;
    }
  }, [room, currentPlayer, players, sessionId]);

  // Start the game
  const startGame = useCallback(async (): Promise<boolean> => {
    if (!room) return false;

    try {
      const startingTeam = pickStartingTeam();
      const words = generateBoardWords();
      const secretKey = generateSecretKey(startingTeam);

      // Create board cards
      const cardInserts = words.map((word, index) => ({
        room_id: room.id,
        word,
        position: index,
        card_type: secretKey[index],
        is_revealed: false
      }));

      const { error: cardsError } = await supabase
        .from('board_cards')
        .insert(cardInserts);

      if (cardsError) throw cardsError;

      // Update room state
      const { error: roomError } = await supabase
        .from('game_rooms')
        .update({
          game_state: 'playing',
          current_turn: startingTeam,
          starting_team: startingTeam,
          red_target: startingTeam === 'red' ? 9 : 8,
          blue_target: startingTeam === 'blue' ? 9 : 8,
          guesses_remaining: 0,
          guesses_used: 0
        })
        .eq('id', room.id);

      if (roomError) throw roomError;

      return true;
    } catch (err) {
      console.error('Error starting game:', err);
      setError('Failed to start game');
      return false;
    }
  }, [room]);

  // Submit a clue (spymaster action)
  const submitClue = useCallback(async (word: string, number: number): Promise<boolean> => {
    if (!room || !currentPlayer) return false;

    // Verify it's the current player's turn to give clue
    const expectedRole = room.current_turn === 'red' ? 'red_spymaster' : 'blue_spymaster';
    if (currentPlayer.player_role !== expectedRole) {
      setError("It's not your turn to give a clue");
      return false;
    }

    try {
      const { error: updateError } = await supabase
        .from('game_rooms')
        .update({
          current_clue_word: word.toUpperCase(),
          current_clue_number: number,
          guesses_remaining: number + 1,
          guesses_used: 0
        })
        .eq('id', room.id);

      if (updateError) throw updateError;

      // Log the clue
      await supabase.from('game_log').insert({
        room_id: room.id,
        event_type: 'clue',
        team: room.current_turn,
        clue_word: word.toUpperCase(),
        clue_number: number,
        actor_session_id: sessionId
      });

      return true;
    } catch (err) {
      console.error('Error submitting clue:', err);
      setError('Failed to submit clue');
      return false;
    }
  }, [room, currentPlayer, sessionId]);

  // Select a word (opposing spymaster action)
  const selectWord = useCallback(async (cardId: string): Promise<{ success: boolean; cardType?: CardType; gameOver?: boolean; winner?: TeamColor }> => {
    if (!room || !currentPlayer) return { success: false };

    // The opposing spymaster should be selecting
    const opposingRole = room.current_turn === 'red' ? 'blue_spymaster' : 'red_spymaster';
    if (currentPlayer.player_role !== opposingRole) {
      setError("Only the opposing spymaster can select words");
      return { success: false };
    }

    const card = cards.find(c => c.id === cardId);
    if (!card || card.is_revealed) {
      setError("Invalid card selection");
      return { success: false };
    }

    try {
      // Reveal the card
      const { error: cardError } = await supabase
        .from('board_cards')
        .update({ 
          is_revealed: true,
          revealed_at: new Date().toISOString()
        })
        .eq('id', cardId);

      if (cardError) throw cardError;

      // Log the selection
      await supabase.from('game_log').insert({
        room_id: room.id,
        event_type: 'selection',
        team: room.current_turn,
        selected_word: card.word,
        selected_card_type: card.card_type,
        actor_session_id: sessionId
      });

      // Calculate new scores
      let newRedScore = room.red_score;
      let newBlueScore = room.blue_score;
      let newGuessesRemaining = room.guesses_remaining - 1;
      let newGuessesUsed = room.guesses_used + 1;
      let turnEnds = false;
      let gameOver = false;
      let winner: TeamColor | null = null;

      if (card.card_type === 'red') {
        newRedScore++;
        if (newRedScore >= room.red_target) {
          gameOver = true;
          winner = 'red';
        } else if (room.current_turn !== 'red') {
          turnEnds = true;
        }
      } else if (card.card_type === 'blue') {
        newBlueScore++;
        if (newBlueScore >= room.blue_target) {
          gameOver = true;
          winner = 'blue';
        } else if (room.current_turn !== 'blue') {
          turnEnds = true;
        }
      } else if (card.card_type === 'bystander') {
        turnEnds = true;
      } else if (card.card_type === 'assassin') {
        gameOver = true;
        winner = room.current_turn === 'red' ? 'blue' : 'red';
      }

      // Check if guesses exhausted
      if (!turnEnds && !gameOver && newGuessesRemaining <= 0) {
        turnEnds = true;
      }

      // Update room state
      const roomUpdate: Partial<GameRoom> = {
        red_score: newRedScore,
        blue_score: newBlueScore,
        guesses_remaining: newGuessesRemaining,
        guesses_used: newGuessesUsed
      };

      if (gameOver) {
        roomUpdate.game_state = 'game_over';
        roomUpdate.winner = winner;
        roomUpdate.current_clue_word = null;
        roomUpdate.current_clue_number = null;
      } else if (turnEnds) {
        roomUpdate.current_turn = room.current_turn === 'red' ? 'blue' : 'red';
        roomUpdate.current_clue_word = null;
        roomUpdate.current_clue_number = null;
        roomUpdate.guesses_remaining = 0;
        roomUpdate.guesses_used = 0;
      }

      const { error: roomError } = await supabase
        .from('game_rooms')
        .update(roomUpdate)
        .eq('id', room.id);

      if (roomError) throw roomError;

      return { 
        success: true, 
        cardType: card.card_type,
        gameOver,
        winner: winner || undefined
      };
    } catch (err) {
      console.error('Error selecting word:', err);
      setError('Failed to select word');
      return { success: false };
    }
  }, [room, currentPlayer, cards, sessionId]);

  // End turn early
  const endTurnEarly = useCallback(async (): Promise<boolean> => {
    if (!room || room.guesses_used < 1) return false;

    try {
      const { error: updateError } = await supabase
        .from('game_rooms')
        .update({
          current_turn: room.current_turn === 'red' ? 'blue' : 'red',
          current_clue_word: null,
          current_clue_number: null,
          guesses_remaining: 0,
          guesses_used: 0
        })
        .eq('id', room.id);

      if (updateError) throw updateError;

      return true;
    } catch (err) {
      console.error('Error ending turn:', err);
      setError('Failed to end turn');
      return false;
    }
  }, [room]);

  // Reset game for play again
  const resetGame = useCallback(async (): Promise<boolean> => {
    if (!room) return false;

    try {
      // Delete old cards
      await supabase
        .from('board_cards')
        .delete()
        .eq('room_id', room.id);

      // Reset room state
      const { error: roomError } = await supabase
        .from('game_rooms')
        .update({
          game_state: 'lobby',
          current_turn: null,
          starting_team: null,
          current_clue_word: null,
          current_clue_number: null,
          guesses_remaining: 0,
          guesses_used: 0,
          red_score: 0,
          blue_score: 0,
          red_target: 8,
          blue_target: 8,
          winner: null
        })
        .eq('id', room.id);

      if (roomError) throw roomError;

      return true;
    } catch (err) {
      console.error('Error resetting game:', err);
      setError('Failed to reset game');
      return false;
    }
  }, [room]);

  // Join as player helper - exposed so views can call it
  const joinAsPlayer = useCallback(async (): Promise<boolean> => {
    if (!room) return false;
    
    try {
      // Check if already a player
      const existingPlayer = players.find(p => p.session_id === sessionId);
      if (existingPlayer) {
        setCurrentPlayer(existingPlayer);
        return true;
      }

      // Create player record
      const { data: playerData, error: playerError } = await supabase
        .from('game_players')
        .upsert({
          room_id: room.id,
          session_id: sessionId,
          player_role: 'spectator',
          last_seen: new Date().toISOString()
        }, {
          onConflict: 'room_id,session_id'
        })
        .select()
        .single();

      if (playerError) throw playerError;

      setCurrentPlayer(playerData as GamePlayer);
      setPlayers(prev => {
        const filtered = prev.filter(p => p.session_id !== sessionId);
        return [...filtered, playerData as GamePlayer];
      });
      return true;
    } catch (err) {
      console.error('Error joining as player:', err);
      return false;
    }
  }, [room, players, sessionId]);

  // Fetch and subscribe to room data
  useEffect(() => {
    if (!roomCode) {
      setIsLoading(false);
      return;
    }

    const fetchData = async () => {
      setIsLoading(true);
      
      try {
        // Fetch room
        const { data: roomData, error: roomError } = await supabase
          .from('game_rooms')
          .select('*')
          .eq('room_code', roomCode.toUpperCase())
          .maybeSingle();

        if (roomError || !roomData) {
          setError('Room not found');
          setIsLoading(false);
          return;
        }

        setRoom(roomData as GameRoom);

        // Fetch cards
        const { data: cardsData } = await supabase
          .from('board_cards')
          .select('*')
          .eq('room_id', roomData.id)
          .order('position');

        setCards((cardsData as BoardCard[]) || []);

        // Fetch players
        const { data: playersData } = await supabase
          .from('game_players')
          .select('*')
          .eq('room_id', roomData.id);

        setPlayers((playersData as GamePlayer[]) || []);

        // Find current player
        const player = playersData?.find(p => p.session_id === sessionId);
        setCurrentPlayer(player as GamePlayer || null);
      } catch (err) {
        console.error('Error fetching data:', err);
        setError('Failed to load game');
      } finally {
        setIsLoading(false);
      }
    };

    fetchData();

    // Set up realtime subscriptions - using roomId from fetchData closure
    let currentRoomId: string | null = null;
    
    const setupSubscription = async () => {
      const { data: roomData } = await supabase
        .from('game_rooms')
        .select('id')
        .eq('room_code', roomCode.toUpperCase())
        .maybeSingle();
      
      if (!roomData) return null;
      currentRoomId = roomData.id;

      return supabase
        .channel(`room-${roomCode}`)
        .on('postgres_changes', {
          event: '*',
          schema: 'public',
          table: 'game_rooms',
          filter: `room_code=eq.${roomCode.toUpperCase()}`
        }, (payload) => {
          if (payload.new) {
            setRoom(payload.new as GameRoom);
          }
        })
        .on('postgres_changes', {
          event: '*',
          schema: 'public',
          table: 'board_cards',
          filter: `room_id=eq.${currentRoomId}`
        }, async () => {
          if (!currentRoomId) return;
          const { data } = await supabase
            .from('board_cards')
            .select('*')
            .eq('room_id', currentRoomId)
            .order('position');
          if (data) setCards(data as BoardCard[]);
        })
        .on('postgres_changes', {
          event: '*',
          schema: 'public',
          table: 'game_players',
          filter: `room_id=eq.${currentRoomId}`
        }, async () => {
          if (!currentRoomId) return;
          const { data } = await supabase
            .from('game_players')
            .select('*')
            .eq('room_id', currentRoomId);
          if (data) {
            setPlayers(data as GamePlayer[]);
            const player = data.find(p => p.session_id === sessionId);
            setCurrentPlayer(player as GamePlayer || null);
          }
        })
        .subscribe();
    };

    const channelPromise = setupSubscription();

    return () => {
      channelPromise.then(channel => {
        if (channel) supabase.removeChannel(channel);
      });
    };
  }, [roomCode, sessionId]);

  return {
    room,
    cards,
    players,
    currentPlayer,
    isLoading,
    error,
    sessionId,
    createRoom,
    joinRoom,
    joinAsPlayer,
    assignRole,
    startGame,
    submitClue,
    selectWord,
    endTurnEarly,
    resetGame,
    clearError: () => setError(null)
  };
}
