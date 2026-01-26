export type TeamColor = 'red' | 'blue';
export type CardType = 'red' | 'blue' | 'bystander' | 'assassin';
export type GameState = 'lobby' | 'team_setup' | 'playing' | 'game_over';
export type PlayerRole = 'red_spymaster' | 'blue_spymaster' | 'spectator';

export interface GameRoom {
  id: string;
  room_code: string;
  game_state: GameState;
  current_turn: TeamColor | null;
  starting_team: TeamColor | null;
  current_clue_word: string | null;
  current_clue_number: number | null;
  guesses_remaining: number;
  guesses_used: number;
  red_score: number;
  blue_score: number;
  red_target: number;
  blue_target: number;
  winner: TeamColor | null;
  created_at: string;
  updated_at: string;
}

export interface BoardCard {
  id: string;
  room_id: string;
  word: string;
  position: number;
  card_type: CardType;
  is_revealed: boolean;
  revealed_at: string | null;
  created_at: string;
}

export interface GamePlayer {
  id: string;
  room_id: string;
  session_id: string;
  player_role: PlayerRole;
  joined_at: string;
  last_seen: string;
}

export interface GameLog {
  id: string;
  room_id: string;
  event_type: string;
  team: TeamColor | null;
  clue_word: string | null;
  clue_number: number | null;
  selected_word: string | null;
  selected_card_type: CardType | null;
  actor_session_id: string | null;
  created_at: string;
}

// UI State
export interface GameUIState {
  room: GameRoom | null;
  cards: BoardCard[];
  players: GamePlayer[];
  currentPlayer: GamePlayer | null;
  isLoading: boolean;
  error: string | null;
}
