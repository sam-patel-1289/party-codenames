import { useState, useEffect, useCallback } from 'react';
import { socket } from '@/lib/socket';
import { GameRoom, BoardCard, GamePlayer, TeamColor, CardType, PlayerRole } from '@/types/game';
import { getSessionId } from '@/lib/sessionId';
import { generateBoardWords, generateSecretKey, pickStartingTeam } from '@/lib/wordpack';
import { validateClue } from '@/lib/gameLogic';

export function useGameRoom(roomCode?: string) {
  // Normalize room code - trim whitespace and convert to uppercase
  const normalizedRoomCode = roomCode?.trim().toUpperCase();

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
    if (!normalizedRoomCode) {
      setIsLoading(false);
      return;
    }

    let hasJoined = false; // Prevent double joining from StrictMode

    console.log(`[useGameRoom] Effect started for room ${normalizedRoomCode}`);
    console.log(`[useGameRoom] Socket connected: ${socket.connected}, Socket ID: ${socket.id}`);

    const joinRoom = () => {
      if (hasJoined) {
        console.log(`[useGameRoom] Already joined, skipping duplicate join`);
        return;
      }
      hasJoined = true;
      console.log(`[useGameRoom] Emitting join_room for ${normalizedRoomCode}, sessionId: ${sessionId}`);
      socket.emit('join_room', { roomCode: normalizedRoomCode, sessionId });
    };

    const onConnect = () => {
      console.log(`[useGameRoom] Socket connected event fired, now joining`);
      joinRoom();
    };

    // Wait for socket to be connected before joining
    // This fixes the race condition where direct URL access tries to join before socket connects
    if (socket.connected) {
      console.log(`[useGameRoom] Socket already connected, joining immediately`);
      joinRoom();
    } else {
      console.log(`[useGameRoom] Socket not connected, waiting for connect event...`);
      socket.on('connect', onConnect);
    }

    // Listen for state updates
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const onStateUpdate = (updatedRoom: any) => {
      console.log(`[useGameRoom] Received state_update for room ${updatedRoom.room_code}`);
      setRoom(updatedRoom);
      setCards(updatedRoom.cards || []);

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
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
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const me = updatedRoom.players?.find((p: any) => p.sessionId === sessionId);
      if (me) {
        console.log(`[useGameRoom] Found current player: ${me.role}`);
        setCurrentPlayer({
          id: me.id,
          room_id: updatedRoom.id,
          session_id: me.sessionId,
          player_role: me.role,
          joined_at: me.joinedAt,
          last_seen: me.lastSeen
        });
      } else {
        console.log(`[useGameRoom] Current player not found in players list`);
      }

      setIsLoading(false);
    };

    const onError = (err: { message: string }) => {
      console.error(`[useGameRoom] Socket error:`, err);
      setError(err.message);
      setIsLoading(false);
    };

    socket.on('state_update', onStateUpdate);
    socket.on('error', onError);

    return () => {
      console.log(`[useGameRoom] Cleanup for room ${normalizedRoomCode}`);
      hasJoined = true; // Prevent any pending joins after cleanup
      socket.off('connect', onConnect);
      socket.off('state_update', onStateUpdate);
      socket.off('error', onError);
    };
  }, [normalizedRoomCode, sessionId]);


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
    socket.emit('join_room', { roomCode: code.trim().toUpperCase(), role, sessionId });
    return true;
  }, [sessionId]);

  const joinAsPlayer = useCallback(async (): Promise<boolean> => {
    if (!normalizedRoomCode) return false;
    socket.emit('join_room', { roomCode: normalizedRoomCode, role: 'spectator', sessionId });
    return true;
  }, [normalizedRoomCode, sessionId]);

  const assignRole = useCallback(async (role: PlayerRole): Promise<boolean> => {
    if (!normalizedRoomCode) return false;
    socket.emit('join_room', { roomCode: normalizedRoomCode, role, sessionId });
    return true;
  }, [normalizedRoomCode, sessionId]);

  const startGame = useCallback(async (): Promise<boolean> => {
    if (!room || !normalizedRoomCode) return false;

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

    socket.emit('init_game', { roomCode: normalizedRoomCode, cards: newCards, startingTeam });
    return true;
  }, [room, normalizedRoomCode]);

  const submitClue = useCallback(async (word: string, number: number): Promise<boolean> => {
    if (!room || !normalizedRoomCode) return false;

    // Strict validation
    if (room.strict_clue_rules) {
      const boardWords = cards.filter(c => !c.is_revealed).map(c => c.word);
      const validation = validateClue(word, boardWords);
      if (!validation.valid) {
        setError(validation.reason || "Invalid clue");
        return false;
      }
    }

    socket.emit('submit_clue', { roomCode: normalizedRoomCode, word, number });
    return true;
  }, [room, normalizedRoomCode, cards]);

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const selectWord = useCallback(async (cardId: string): Promise<any> => {
    if (!normalizedRoomCode) return { success: false };
    socket.emit('select_card', { roomCode: normalizedRoomCode, cardId });
    return { success: true };
  }, [normalizedRoomCode]);

  const endTurnEarly = useCallback(async (): Promise<boolean> => {
    if (!normalizedRoomCode) return false;
    socket.emit('end_turn', { roomCode: normalizedRoomCode });
    return true;
  }, [normalizedRoomCode]);

  const resetGame = useCallback(async (): Promise<boolean> => {
    if (!normalizedRoomCode) return false;
    socket.emit('reset_game', { roomCode: normalizedRoomCode });
    return true;
  }, [normalizedRoomCode]);

  // Challenge
  const challengeClue = useCallback(async (): Promise<boolean> => {
    if (!normalizedRoomCode) return false;
    socket.emit('challenge_clue', { roomCode: normalizedRoomCode });
    return true;
  }, [normalizedRoomCode]);

  const resolveChallenge = useCallback(async (decision: 'allowed' | 'rejected'): Promise<boolean> => {
    if (!normalizedRoomCode) return false;
    socket.emit('resolve_challenge', { roomCode: normalizedRoomCode, decision });
    return true;
  }, [normalizedRoomCode]);


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
