-- Create enum for team colors
CREATE TYPE public.team_color AS ENUM ('red', 'blue');

-- Create enum for card types
CREATE TYPE public.card_type AS ENUM ('red', 'blue', 'bystander', 'assassin');

-- Create enum for game state
CREATE TYPE public.game_state AS ENUM ('lobby', 'team_setup', 'playing', 'game_over');

-- Create enum for player role
CREATE TYPE public.player_role AS ENUM ('red_spymaster', 'blue_spymaster', 'spectator');

-- Create game rooms table
CREATE TABLE public.game_rooms (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    room_code VARCHAR(6) NOT NULL UNIQUE,
    game_state public.game_state NOT NULL DEFAULT 'lobby',
    current_turn public.team_color,
    starting_team public.team_color,
    current_clue_word VARCHAR(100),
    current_clue_number INTEGER,
    guesses_remaining INTEGER DEFAULT 0,
    guesses_used INTEGER DEFAULT 0,
    red_score INTEGER DEFAULT 0,
    blue_score INTEGER DEFAULT 0,
    red_target INTEGER DEFAULT 8,
    blue_target INTEGER DEFAULT 8,
    winner public.team_color,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Create board cards table (25 cards per game)
CREATE TABLE public.board_cards (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    room_id UUID NOT NULL REFERENCES public.game_rooms(id) ON DELETE CASCADE,
    word VARCHAR(50) NOT NULL,
    position INTEGER NOT NULL CHECK (position >= 0 AND position < 25),
    card_type public.card_type NOT NULL,
    is_revealed BOOLEAN DEFAULT false,
    revealed_at TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
    UNIQUE(room_id, position)
);

-- Create players table (for spymasters)
CREATE TABLE public.game_players (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    room_id UUID NOT NULL REFERENCES public.game_rooms(id) ON DELETE CASCADE,
    session_id VARCHAR(100) NOT NULL,
    player_role public.player_role NOT NULL DEFAULT 'spectator',
    joined_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
    last_seen TIMESTAMP WITH TIME ZONE DEFAULT now(),
    UNIQUE(room_id, session_id)
);

-- Create game log table for history
CREATE TABLE public.game_log (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    room_id UUID NOT NULL REFERENCES public.game_rooms(id) ON DELETE CASCADE,
    event_type VARCHAR(50) NOT NULL,
    team public.team_color,
    clue_word VARCHAR(100),
    clue_number INTEGER,
    selected_word VARCHAR(50),
    selected_card_type public.card_type,
    actor_session_id VARCHAR(100),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Enable Row Level Security
ALTER TABLE public.game_rooms ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.board_cards ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.game_players ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.game_log ENABLE ROW LEVEL SECURITY;

-- Create policies for public access (no auth required for party game)
CREATE POLICY "Anyone can view game rooms" ON public.game_rooms
    FOR SELECT USING (true);

CREATE POLICY "Anyone can create game rooms" ON public.game_rooms
    FOR INSERT WITH CHECK (true);

CREATE POLICY "Anyone can update game rooms" ON public.game_rooms
    FOR UPDATE USING (true);

CREATE POLICY "Anyone can view board cards" ON public.board_cards
    FOR SELECT USING (true);

CREATE POLICY "Anyone can create board cards" ON public.board_cards
    FOR INSERT WITH CHECK (true);

CREATE POLICY "Anyone can update board cards" ON public.board_cards
    FOR UPDATE USING (true);

CREATE POLICY "Anyone can view players" ON public.game_players
    FOR SELECT USING (true);

CREATE POLICY "Anyone can join as player" ON public.game_players
    FOR INSERT WITH CHECK (true);

CREATE POLICY "Anyone can update player status" ON public.game_players
    FOR UPDATE USING (true);

CREATE POLICY "Anyone can leave game" ON public.game_players
    FOR DELETE USING (true);

CREATE POLICY "Anyone can view game log" ON public.game_log
    FOR SELECT USING (true);

CREATE POLICY "Anyone can add to game log" ON public.game_log
    FOR INSERT WITH CHECK (true);

-- Create function to update timestamps
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = now();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger for game_rooms
CREATE TRIGGER update_game_rooms_updated_at
    BEFORE UPDATE ON public.game_rooms
    FOR EACH ROW
    EXECUTE FUNCTION public.update_updated_at_column();

-- Enable realtime for game tables
ALTER PUBLICATION supabase_realtime ADD TABLE public.game_rooms;
ALTER PUBLICATION supabase_realtime ADD TABLE public.board_cards;
ALTER PUBLICATION supabase_realtime ADD TABLE public.game_players;

-- Create index for room code lookups
CREATE INDEX idx_game_rooms_room_code ON public.game_rooms(room_code);
CREATE INDEX idx_board_cards_room_id ON public.board_cards(room_id);
CREATE INDEX idx_game_players_room_id ON public.game_players(room_id);