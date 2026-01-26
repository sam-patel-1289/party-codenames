export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  // Allows to automatically instantiate createClient with right options
  // instead of createClient<Database, { PostgrestVersion: 'XX' }>(URL, KEY)
  __InternalSupabase: {
    PostgrestVersion: "14.1"
  }
  public: {
    Tables: {
      board_cards: {
        Row: {
          card_type: Database["public"]["Enums"]["card_type"]
          created_at: string | null
          id: string
          is_revealed: boolean | null
          position: number
          revealed_at: string | null
          room_id: string
          word: string
        }
        Insert: {
          card_type: Database["public"]["Enums"]["card_type"]
          created_at?: string | null
          id?: string
          is_revealed?: boolean | null
          position: number
          revealed_at?: string | null
          room_id: string
          word: string
        }
        Update: {
          card_type?: Database["public"]["Enums"]["card_type"]
          created_at?: string | null
          id?: string
          is_revealed?: boolean | null
          position?: number
          revealed_at?: string | null
          room_id?: string
          word?: string
        }
        Relationships: [
          {
            foreignKeyName: "board_cards_room_id_fkey"
            columns: ["room_id"]
            isOneToOne: false
            referencedRelation: "game_rooms"
            referencedColumns: ["id"]
          },
        ]
      }
      game_log: {
        Row: {
          actor_session_id: string | null
          clue_number: number | null
          clue_word: string | null
          created_at: string | null
          event_type: string
          id: string
          room_id: string
          selected_card_type: Database["public"]["Enums"]["card_type"] | null
          selected_word: string | null
          team: Database["public"]["Enums"]["team_color"] | null
        }
        Insert: {
          actor_session_id?: string | null
          clue_number?: number | null
          clue_word?: string | null
          created_at?: string | null
          event_type: string
          id?: string
          room_id: string
          selected_card_type?: Database["public"]["Enums"]["card_type"] | null
          selected_word?: string | null
          team?: Database["public"]["Enums"]["team_color"] | null
        }
        Update: {
          actor_session_id?: string | null
          clue_number?: number | null
          clue_word?: string | null
          created_at?: string | null
          event_type?: string
          id?: string
          room_id?: string
          selected_card_type?: Database["public"]["Enums"]["card_type"] | null
          selected_word?: string | null
          team?: Database["public"]["Enums"]["team_color"] | null
        }
        Relationships: [
          {
            foreignKeyName: "game_log_room_id_fkey"
            columns: ["room_id"]
            isOneToOne: false
            referencedRelation: "game_rooms"
            referencedColumns: ["id"]
          },
        ]
      }
      game_players: {
        Row: {
          id: string
          joined_at: string | null
          last_seen: string | null
          player_role: Database["public"]["Enums"]["player_role"]
          room_id: string
          session_id: string
        }
        Insert: {
          id?: string
          joined_at?: string | null
          last_seen?: string | null
          player_role?: Database["public"]["Enums"]["player_role"]
          room_id: string
          session_id: string
        }
        Update: {
          id?: string
          joined_at?: string | null
          last_seen?: string | null
          player_role?: Database["public"]["Enums"]["player_role"]
          room_id?: string
          session_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "game_players_room_id_fkey"
            columns: ["room_id"]
            isOneToOne: false
            referencedRelation: "game_rooms"
            referencedColumns: ["id"]
          },
        ]
      }
      game_rooms: {
        Row: {
          blue_score: number | null
          blue_target: number | null
          created_at: string | null
          current_clue_number: number | null
          current_clue_word: string | null
          current_turn: Database["public"]["Enums"]["team_color"] | null
          game_state: Database["public"]["Enums"]["game_state"]
          guesses_remaining: number | null
          guesses_used: number | null
          id: string
          red_score: number | null
          red_target: number | null
          room_code: string
          starting_team: Database["public"]["Enums"]["team_color"] | null
          updated_at: string | null
          winner: Database["public"]["Enums"]["team_color"] | null
        }
        Insert: {
          blue_score?: number | null
          blue_target?: number | null
          created_at?: string | null
          current_clue_number?: number | null
          current_clue_word?: string | null
          current_turn?: Database["public"]["Enums"]["team_color"] | null
          game_state?: Database["public"]["Enums"]["game_state"]
          guesses_remaining?: number | null
          guesses_used?: number | null
          id?: string
          red_score?: number | null
          red_target?: number | null
          room_code: string
          starting_team?: Database["public"]["Enums"]["team_color"] | null
          updated_at?: string | null
          winner?: Database["public"]["Enums"]["team_color"] | null
        }
        Update: {
          blue_score?: number | null
          blue_target?: number | null
          created_at?: string | null
          current_clue_number?: number | null
          current_clue_word?: string | null
          current_turn?: Database["public"]["Enums"]["team_color"] | null
          game_state?: Database["public"]["Enums"]["game_state"]
          guesses_remaining?: number | null
          guesses_used?: number | null
          id?: string
          red_score?: number | null
          red_target?: number | null
          room_code?: string
          starting_team?: Database["public"]["Enums"]["team_color"] | null
          updated_at?: string | null
          winner?: Database["public"]["Enums"]["team_color"] | null
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      [_ in never]: never
    }
    Enums: {
      card_type: "red" | "blue" | "bystander" | "assassin"
      game_state: "lobby" | "team_setup" | "playing" | "game_over"
      player_role: "red_spymaster" | "blue_spymaster" | "spectator"
      team_color: "red" | "blue"
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
}

type DatabaseWithoutInternals = Omit<Database, "__InternalSupabase">

type DefaultSchema = DatabaseWithoutInternals[Extract<keyof Database, "public">]

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
      DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])[TableName] extends {
      Row: infer R
    }
    ? R
    : never
  : DefaultSchemaTableNameOrOptions extends keyof (DefaultSchema["Tables"] &
        DefaultSchema["Views"])
    ? (DefaultSchema["Tables"] &
        DefaultSchema["Views"])[DefaultSchemaTableNameOrOptions] extends {
        Row: infer R
      }
      ? R
      : never
    : never

export type TablesInsert<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Insert: infer I
    }
    ? I
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Insert: infer I
      }
      ? I
      : never
    : never

export type TablesUpdate<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Update: infer U
    }
    ? U
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Update: infer U
      }
      ? U
      : never
    : never

export type Enums<
  DefaultSchemaEnumNameOrOptions extends
    | keyof DefaultSchema["Enums"]
    | { schema: keyof DatabaseWithoutInternals },
  EnumName extends DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never = never,
> = DefaultSchemaEnumNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema["Enums"]
    ? DefaultSchema["Enums"][DefaultSchemaEnumNameOrOptions]
    : never

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    | keyof DefaultSchema["CompositeTypes"]
    | { schema: keyof DatabaseWithoutInternals },
  CompositeTypeName extends PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never = never,
> = PublicCompositeTypeNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
    ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never

export const Constants = {
  public: {
    Enums: {
      card_type: ["red", "blue", "bystander", "assassin"],
      game_state: ["lobby", "team_setup", "playing", "game_over"],
      player_role: ["red_spymaster", "blue_spymaster", "spectator"],
      team_color: ["red", "blue"],
    },
  },
} as const
