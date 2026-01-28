
import express from 'express';
import path from 'path';
import { fileURLToPath } from 'url';
import { dirname } from 'path';
import { createServer } from 'http';
import { Server } from 'socket.io';
import cors from 'cors';
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const app = express();
app.use(cors());
app.get('/', (req, res) => {
    res.send('Codenames Server Running');
});

// Serve static files from the React app build directory
app.use(express.static(path.join(__dirname, '../dist')));

// API/Health check
app.get('/health', (req, res) => {
    res.send('Codenames Server Running');
});

// The "catchall" handler: for any request that doesn't
// match one above, send back React's index.html file.
app.get(/.*/, (req, res) => {
    res.sendFile(path.join(__dirname, '../dist/index.html'));
});

const httpServer = createServer(app);
const io = new Server(httpServer, {
    cors: {
        origin: "*", // Allow all origins for local play
        methods: ["GET", "POST"]
    }
});

// --- Game Logic Helpers (copied/adapted from frontend) ---
function generateRoomCode() {
    const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
    let result = '';
    for (let i = 0; i < 6; i++) {
        result += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return result;
}

// Simple word list for generation (full list is in frontend which sends words, 
// OR we can just generate IDs and frontend maps them. 
// For simplicity, let's keep game logic on server to avoid cheating.)
// ACTUALLY: To keep it robust, let's move the game logic here.
// But we need the word list. 
// For now, let's trust the client (TV) to initialize the room with words.

// --- State ---
// Map<RoomCode, RoomState>
const rooms = new Map();

// RoomState structure:
// {
//   id: string,
//   code: string,
//   gameState: 'lobby' | 'playing' | 'game_over',
//   players: [],
//   cards: [],
//   currentTurn: 'red' | 'blue',
//   ...
// }

io.on('connection', (socket) => {
    console.log('Client connected:', socket.id);

    socket.on('join_room', ({ roomCode, role, sessionId }) => {
        const start = Date.now();
        const room = rooms.get(roomCode.toUpperCase());

        if (!room) {
            socket.emit('error', { message: 'Room not found' });
            return;
        }

        socket.join(roomCode.toUpperCase());

        // Update player list
        const existingPlayerIndex = room.players.findIndex(p => p.sessionId === sessionId);
        if (existingPlayerIndex >= 0) {
            // Update existing player socket?
            room.players[existingPlayerIndex].lastSeen = new Date();
            if (role && role !== 'spectator') {
                // Verify role availability
                const roleTaken = room.players.some(p => p.role === role && p.sessionId !== sessionId);
                if (!roleTaken) {
                    room.players[existingPlayerIndex].role = role;
                }
            }
        } else {
            room.players.push({
                id: socket.id,
                sessionId,
                role: role || 'spectator',
                joinedAt: new Date(),
                lastSeen: new Date()
            });
        }

        // Broadcast update
        io.to(roomCode.toUpperCase()).emit('state_update', room);
    });

    socket.on('create_room', () => {
        const code = generateRoomCode();
        const room = {
            id: Date.now().toString(),
            room_code: code,
            game_state: 'lobby',
            current_turn: null,
            starting_team: null,
            current_clue_word: null,
            current_clue_number: null,
            clue_status: 'allowed',
            strict_clue_rules: true,
            clue_penalty_enabled: true,
            guesses_remaining: 0,
            guesses_used: 0,
            red_score: 0,
            blue_score: 0,
            red_target: 8,
            blue_target: 8,
            winner: null,
            cards: [],
            players: [],
            logs: [] // Game history
        };

        rooms.set(code, room);
        socket.emit('room_created', code);
        console.log(`Room created: ${code}`);
    });

    socket.on('init_game', ({ roomCode, cards, startingTeam }) => {
        const room = rooms.get(roomCode);
        if (!room) return;

        room.cards = cards;
        room.starting_team = startingTeam;
        room.current_turn = startingTeam;
        room.game_state = 'playing';
        room.red_target = startingTeam === 'red' ? 9 : 8;
        room.blue_target = startingTeam === 'blue' ? 9 : 8;

        io.to(roomCode).emit('state_update', room);
    });

    socket.on('submit_clue', ({ roomCode, word, number }) => {
        const room = rooms.get(roomCode);
        if (!room) return;

        room.current_clue_word = word.toUpperCase();
        room.current_clue_number = number;
        room.clue_status = 'allowed'; // Reset status
        room.guesses_remaining = number + 1;
        room.guesses_used = 0;

        // Log
        room.logs.push({
            id: Date.now(),
            event_type: 'clue',
            team: room.current_turn,
            clue_word: word.toUpperCase(),
            clue_number: number,
            created_at: new Date()
        });

        io.to(roomCode).emit('state_update', room);
    });

    socket.on('challenge_clue', ({ roomCode }) => {
        const room = rooms.get(roomCode);
        if (!room) return;
        room.clue_status = 'challenged';
        io.to(roomCode).emit('state_update', room);
    });

    socket.on('resolve_challenge', ({ roomCode, decision }) => {
        const room = rooms.get(roomCode);
        if (!room) return;

        if (decision === 'allowed') {
            room.clue_status = 'allowed';
        } else {
            room.clue_status = 'rejected';
            // End turn logic + Penalty
            const challengingTeam = room.current_turn === 'red' ? 'blue' : 'red';
            // Find unrevealed card of challenging team to reveal as penalty
            const penaltyCard = room.cards.find(c => c.card_type === challengingTeam && !c.is_revealed);

            if (penaltyCard && room.clue_penalty_enabled) {
                penaltyCard.is_revealed = true;
                if (challengingTeam === 'red') room.red_score++;
                else room.blue_score++;
            }

            // End Turn
            room.current_turn = challengingTeam; // Switch turn
            room.current_clue_word = null;
            room.current_clue_number = null;
            room.guesses_remaining = 0;
        }
        io.to(roomCode).emit('state_update', room);
    });

    socket.on('select_card', ({ roomCode, cardId }) => {
        const room = rooms.get(roomCode);
        if (!room) return;

        const card = room.cards.find(c => c.id === cardId);
        if (!card || card.is_revealed) return;

        card.is_revealed = true;

        // Log
        room.logs.push({
            id: Date.now(),
            event_type: 'selection',
            team: room.current_turn,
            selected_word: card.word,
            selected_card_type: card.card_type,
            created_at: new Date()
        });

        // Score Logic
        let turnEnds = false;
        let gameOver = false;

        if (card.card_type === 'red') {
            room.red_score++;
            if (room.red_score >= room.red_target) {
                gameOver = true;
                room.winner = 'red';
            } else if (room.current_turn !== 'red') {
                turnEnds = true;
            }
        } else if (card.card_type === 'blue') {
            room.blue_score++;
            if (room.blue_score >= room.blue_target) {
                gameOver = true;
                room.winner = 'blue';
            } else if (room.current_turn !== 'blue') {
                turnEnds = true;
            }
        } else if (card.card_type === 'bystander') {
            turnEnds = true;
        } else if (card.card_type === 'assassin') {
            gameOver = true;
            room.winner = room.current_turn === 'red' ? 'blue' : 'red';
        }

        room.guesses_remaining--;
        room.guesses_used++;

        if (!gameOver && !turnEnds && room.guesses_remaining <= 0) {
            turnEnds = true;
        }

        if (gameOver) {
            room.game_state = 'game_over';
        } else if (turnEnds) {
            room.current_turn = room.current_turn === 'red' ? 'blue' : 'red';
            room.current_clue_word = null;
            room.current_clue_number = null;
            room.guesses_remaining = 0;
            room.guesses_used = 0;
        }

        io.to(roomCode).emit('state_update', room);
    });

    socket.on('end_turn', ({ roomCode }) => {
        const room = rooms.get(roomCode);
        if (!room) return;

        room.current_turn = room.current_turn === 'red' ? 'blue' : 'red';
        room.current_clue_word = null;
        room.current_clue_number = null;
        room.guesses_remaining = 0;
        room.guesses_used = 0;

        io.to(roomCode).emit('state_update', room);
    });

    socket.on('reset_game', ({ roomCode }) => {
        const room = rooms.get(roomCode);
        if (!room) return;

        room.game_state = 'lobby';
        room.current_turn = null;
        room.starting_team = null;
        room.current_clue_word = null;
        room.clue_status = 'allowed';
        room.red_score = 0;
        room.blue_score = 0;
        room.winner = null;
        room.cards = [];
        room.logs = [];

        io.to(roomCode).emit('state_update', room);
    });
});

const PORT = 3000;
httpServer.listen(PORT, '0.0.0.0', () => {
    console.log(`Server running on port ${PORT}`);
});
