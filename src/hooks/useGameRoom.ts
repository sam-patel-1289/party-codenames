import { useState, useEffect, useCallback } from 'react';
import { socket } from '@/lib/socket';
import { GameRoom, BoardCard, GamePlayer, TeamColor, CardType, PlayerRole } from '@/types/game';
import { getSessionId } from '@/lib/sessionId';
import { generateBoardWords, generateSecretKey, pickStartingTeam } from '@/lib/wordpack';
import { validateClue } from '@/lib/gameLogic';

export function useGameRoom(roomCode?: string) {
  const [room, setRoom] = useState<GameRoom | null>(null);
  const [cards, setCards] = useState<BoardCard[]>([]);
  const [players, setPlayers] = useState<GamePlayer[]>([]);
  const [currentPlayer, setCurrentPlayer] = useState<GamePlayer | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const sessionId = getSessionId();

  useEffect(() => {
    if (!socket.connected) {
      socket.connect();
    }

    function onConnect() {
      console.log('Socket connected');
    }

    socket.on('connect', onConnect);

    return () => {
      socket.off('connect', onConnect);
    };
  }, []);

  // Subscribe to room updates
  useEffect(() => {
    if (!roomCode) {
      setIsLoading(false);
      return;
    }

    // Request to join room
    socket.emit('join_room', { roomCode, sessionId });

    // Listen for state updates
    const onStateUpdate = (updatedRoom: any) => {
      setRoom(updatedRoom);
      setCards(updatedRoom.cards || []);

      const mappedPlayers = (updatedRoom.players || []).map((p: any) => ({
        id: p.id,
        room_id: updatedRoom.id,
        session_id: p.sessionId,
        player_role: p.role,
        joined_at: p.joinedAt,
        last_seen: p.lastSeen
      }));
      setPlayers(mappedPlayers);

      // Find self
      const me = updatedRoom.players?.find((p: any) => p.sessionId === sessionId);
      if (me) {
        setCurrentPlayer({
          id: me.id,
          room_id: updatedRoom.id,
          session_id: me.sessionId,
          player_role: me.role,
          joined_at: me.joinedAt,
          last_seen: me.lastSeen
        });
      }

      setIsLoading(false);
    };

    const onError = (err: { message: string }) => {
      setError(err.message);
      setIsLoading(false);
    };

    socket.on('state_update', onStateUpdate);
    socket.on('error', onError);

    return () => {
      socket.off('state_update', onStateUpdate);
      socket.off('error', onError);
    };
  }, [roomCode, sessionId]);


  const createRoom = useCallback(async (): Promise<string | null> => {
    return new Promise((resolve) => {
      socket.once('room_created', (code) => {
        resolve(code);
      });
      socket.emit('create_room');
      // Fallback timeout?
      setTimeout(() => resolve(null), 5000); // 5s timeout
    });
  }, []);

  // Join an existing room (Client side logic mostly handled by effect)
  const joinRoom = useCallback(async (code: string, role: PlayerRole = 'spectator'): Promise<boolean> => {
    // Just trigger the join
    socket.emit('join_room', { roomCode: code, role, sessionId });
    return true;
  }, [sessionId]);

  const joinAsPlayer = useCallback(async (): Promise<boolean> => {
    if (!roomCode) return false;
    socket.emit('join_room', { roomCode, role: 'spectator', sessionId });
    return true;
  }, [roomCode, sessionId]);

  const assignRole = useCallback(async (role: PlayerRole): Promise<boolean> => {
    if (!roomCode) return false;
    socket.emit('join_room', { roomCode, role, sessionId });
    return true;
  }, [roomCode, sessionId]);

  const startGame = useCallback(async (): Promise<boolean> => {
    if (!room || !roomCode) return false;

    const startingTeam = pickStartingTeam();
    const words = generateBoardWords();
    const secretKey = generateSecretKey(startingTeam);

    // Create board cards objects
    const newCards = words.map((word, index) => ({
      id: `card-${index}-${Date.now()}`,
      room_id: room.id,
      word,
      position: index,
      card_type: secretKey[index],
      is_revealed: false,
      created_at: new Date().toISOString(),
      revealed_at: null
    }));

    socket.emit('init_game', { roomCode, cards: newCards, startingTeam });
    return true;
  }, [room, roomCode]);

  const submitClue = useCallback(async (word: string, number: number): Promise<boolean> => {
    if (!room || !roomCode) return false;

    // Strict validation
    if (room.strict_clue_rules) {
      const boardWords = cards.filter(c => !c.is_revealed).map(c => c.word);
      const validation = validateClue(word, boardWords);
      if (!validation.valid) {
        setError(validation.reason || "Invalid clue");
        return false;
      }
    }

    socket.emit('submit_clue', { roomCode, word, number });
    return true;
  }, [room, roomCode, cards]);

  const selectWord = useCallback(async (cardId: string): Promise<any> => {
    if (!roomCode) return { success: false };
    socket.emit('select_card', { roomCode, cardId });
    return { success: true };
  }, [roomCode]);

  const endTurnEarly = useCallback(async (): Promise<boolean> => {
    if (!roomCode) return false;
    socket.emit('end_turn', { roomCode });
    return true;
  }, [roomCode]);

  const resetGame = useCallback(async (): Promise<boolean> => {
    if (!roomCode) return false;
    socket.emit('reset_game', { roomCode });
    return true;
  }, [roomCode]);

  // Challenge
  const challengeClue = useCallback(async (): Promise<boolean> => {
    if (!roomCode) return false;
    socket.emit('challenge_clue', { roomCode });
    return true;
  }, [roomCode]);

  const resolveChallenge = useCallback(async (decision: 'allowed' | 'rejected'): Promise<boolean> => {
    if (!roomCode) return false;
    socket.emit('resolve_challenge', { roomCode, decision });
    return true;
  }, [roomCode]);


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
    challengeClue,
    resolveChallenge,
    clearError: () => setError(null)
  };
}
