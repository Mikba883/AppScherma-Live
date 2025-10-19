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
    PostgrestVersion: "13.0.4"
  }
  public: {
    Tables: {
      activity_logs: {
        Row: {
          activity_points: number
          athlete_id: string
          created_at: string | null
          gym_id: string | null
          id: string
          matches_count: number
          week_start: string
        }
        Insert: {
          activity_points?: number
          athlete_id: string
          created_at?: string | null
          gym_id?: string | null
          id?: string
          matches_count?: number
          week_start: string
        }
        Update: {
          activity_points?: number
          athlete_id?: string
          created_at?: string | null
          gym_id?: string | null
          id?: string
          matches_count?: number
          week_start?: string
        }
        Relationships: []
      }
      bouts: {
        Row: {
          approved_at: string | null
          approved_by: string | null
          approved_by_a: string | null
          approved_by_b: string | null
          athlete_a: string
          athlete_b: string
          bout_date: string
          bout_type: string
          bracket_match_number: number | null
          bracket_round: number | null
          created_at: string | null
          created_by: string
          gym_id: string | null
          id: string
          next_match_id: string | null
          notes: string | null
          rejected_at: string | null
          rejected_by: string | null
          round_number: number | null
          score_a: number | null
          score_b: number | null
          seed_a: number | null
          seed_b: number | null
          status: string
          tournament_id: string | null
          weapon: string | null
        }
        Insert: {
          approved_at?: string | null
          approved_by?: string | null
          approved_by_a?: string | null
          approved_by_b?: string | null
          athlete_a: string
          athlete_b: string
          bout_date: string
          bout_type?: string
          bracket_match_number?: number | null
          bracket_round?: number | null
          created_at?: string | null
          created_by: string
          gym_id?: string | null
          id?: string
          next_match_id?: string | null
          notes?: string | null
          rejected_at?: string | null
          rejected_by?: string | null
          round_number?: number | null
          score_a?: number | null
          score_b?: number | null
          seed_a?: number | null
          seed_b?: number | null
          status?: string
          tournament_id?: string | null
          weapon?: string | null
        }
        Update: {
          approved_at?: string | null
          approved_by?: string | null
          approved_by_a?: string | null
          approved_by_b?: string | null
          athlete_a?: string
          athlete_b?: string
          bout_date?: string
          bout_type?: string
          bracket_match_number?: number | null
          bracket_round?: number | null
          created_at?: string | null
          created_by?: string
          gym_id?: string | null
          id?: string
          next_match_id?: string | null
          notes?: string | null
          rejected_at?: string | null
          rejected_by?: string | null
          round_number?: number | null
          score_a?: number | null
          score_b?: number | null
          seed_a?: number | null
          seed_b?: number | null
          status?: string
          tournament_id?: string | null
          weapon?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "bouts_approved_by_fkey"
            columns: ["approved_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["user_id"]
          },
          {
            foreignKeyName: "bouts_athlete_a_fkey"
            columns: ["athlete_a"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["user_id"]
          },
          {
            foreignKeyName: "bouts_athlete_b_fkey"
            columns: ["athlete_b"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["user_id"]
          },
          {
            foreignKeyName: "bouts_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["user_id"]
          },
          {
            foreignKeyName: "bouts_next_match_id_fkey"
            columns: ["next_match_id"]
            isOneToOne: false
            referencedRelation: "bouts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "bouts_rejected_by_fkey"
            columns: ["rejected_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["user_id"]
          },
          {
            foreignKeyName: "bouts_tournament_id_fkey"
            columns: ["tournament_id"]
            isOneToOne: false
            referencedRelation: "tournaments"
            referencedColumns: ["id"]
          },
        ]
      }
      gym_invitations: {
        Row: {
          accepted_at: string | null
          created_at: string | null
          created_by: string
          email: string
          expires_at: string
          gym_id: string
          id: string
          role: string
          status: string | null
          token: string
        }
        Insert: {
          accepted_at?: string | null
          created_at?: string | null
          created_by: string
          email: string
          expires_at?: string
          gym_id: string
          id?: string
          role: string
          status?: string | null
          token: string
        }
        Update: {
          accepted_at?: string | null
          created_at?: string | null
          created_by?: string
          email?: string
          expires_at?: string
          gym_id?: string
          id?: string
          role?: string
          status?: string | null
          token?: string
        }
        Relationships: [
          {
            foreignKeyName: "gym_invitations_gym_id_fkey"
            columns: ["gym_id"]
            isOneToOne: false
            referencedRelation: "gyms"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "gym_invitations_gym_id_fkey"
            columns: ["gym_id"]
            isOneToOne: false
            referencedRelation: "public_gym_info"
            referencedColumns: ["id"]
          },
        ]
      }
      gym_public_links: {
        Row: {
          created_at: string
          created_by: string
          gym_id: string
          id: string
          is_active: boolean
          max_uses: number | null
          token: string
          uses_count: number
        }
        Insert: {
          created_at?: string
          created_by: string
          gym_id: string
          id?: string
          is_active?: boolean
          max_uses?: number | null
          token: string
          uses_count?: number
        }
        Update: {
          created_at?: string
          created_by?: string
          gym_id?: string
          id?: string
          is_active?: boolean
          max_uses?: number | null
          token?: string
          uses_count?: number
        }
        Relationships: [
          {
            foreignKeyName: "gym_public_links_gym_id_fkey"
            columns: ["gym_id"]
            isOneToOne: false
            referencedRelation: "gyms"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "gym_public_links_gym_id_fkey"
            columns: ["gym_id"]
            isOneToOne: false
            referencedRelation: "public_gym_info"
            referencedColumns: ["id"]
          },
        ]
      }
      gyms: {
        Row: {
          created_at: string | null
          id: string
          logo_url: string | null
          name: string
          owner_email: string
          owner_id: string
          owner_name: string
          shifts: string[] | null
          updated_at: string | null
        }
        Insert: {
          created_at?: string | null
          id?: string
          logo_url?: string | null
          name: string
          owner_email: string
          owner_id: string
          owner_name: string
          shifts?: string[] | null
          updated_at?: string | null
        }
        Update: {
          created_at?: string | null
          id?: string
          logo_url?: string | null
          name?: string
          owner_email?: string
          owner_id?: string
          owner_name?: string
          shifts?: string[] | null
          updated_at?: string | null
        }
        Relationships: []
      }
      notifications: {
        Row: {
          athlete_id: string
          created_at: string
          created_by: string | null
          gym_id: string | null
          id: string
          message: string
          read: boolean
          related_bout_id: string | null
          title: string
          type: string
        }
        Insert: {
          athlete_id: string
          created_at?: string
          created_by?: string | null
          gym_id?: string | null
          id?: string
          message: string
          read?: boolean
          related_bout_id?: string | null
          title: string
          type?: string
        }
        Update: {
          athlete_id?: string
          created_at?: string
          created_by?: string | null
          gym_id?: string | null
          id?: string
          message?: string
          read?: boolean
          related_bout_id?: string | null
          title?: string
          type?: string
        }
        Relationships: []
      }
      profiles: {
        Row: {
          birth_date: string
          created_at: string | null
          email: string | null
          full_name: string
          gender: string
          gym_id: string | null
          role: string
          shift: string | null
          user_id: string
        }
        Insert: {
          birth_date: string
          created_at?: string | null
          email?: string | null
          full_name: string
          gender: string
          gym_id?: string | null
          role?: string
          shift?: string | null
          user_id: string
        }
        Update: {
          birth_date?: string
          created_at?: string | null
          email?: string | null
          full_name?: string
          gender?: string
          gym_id?: string | null
          role?: string
          shift?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "profiles_gym_id_fkey"
            columns: ["gym_id"]
            isOneToOne: false
            referencedRelation: "gyms"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "profiles_gym_id_fkey"
            columns: ["gym_id"]
            isOneToOne: false
            referencedRelation: "public_gym_info"
            referencedColumns: ["id"]
          },
        ]
      }
      rankings: {
        Row: {
          activity_points: number
          athlete_id: string
          created_at: string | null
          elo_rating: number
          frequency_multiplier: number
          frequency_streak: number
          gym_id: string | null
          last_activity_date: string | null
          last_updated: string | null
          last_win_date: string | null
          matches_played: number
          peak_rating: number
          total_weeks_active: number
          weekly_matches: number
        }
        Insert: {
          activity_points?: number
          athlete_id: string
          created_at?: string | null
          elo_rating?: number
          frequency_multiplier?: number
          frequency_streak?: number
          gym_id?: string | null
          last_activity_date?: string | null
          last_updated?: string | null
          last_win_date?: string | null
          matches_played?: number
          peak_rating?: number
          total_weeks_active?: number
          weekly_matches?: number
        }
        Update: {
          activity_points?: number
          athlete_id?: string
          created_at?: string | null
          elo_rating?: number
          frequency_multiplier?: number
          frequency_streak?: number
          gym_id?: string | null
          last_activity_date?: string | null
          last_updated?: string | null
          last_win_date?: string | null
          matches_played?: number
          peak_rating?: number
          total_weeks_active?: number
          weekly_matches?: number
        }
        Relationships: []
      }
      tournaments: {
        Row: {
          bout_type: string
          created_at: string | null
          created_by: string
          gym_id: string | null
          id: string
          name: string
          phase: number
          status: string
          total_bracket_rounds: number | null
          tournament_date: string
          weapon: string | null
        }
        Insert: {
          bout_type: string
          created_at?: string | null
          created_by: string
          gym_id?: string | null
          id?: string
          name: string
          phase?: number
          status?: string
          total_bracket_rounds?: number | null
          tournament_date: string
          weapon?: string | null
        }
        Update: {
          bout_type?: string
          created_at?: string | null
          created_by?: string
          gym_id?: string | null
          id?: string
          name?: string
          phase?: number
          status?: string
          total_bracket_rounds?: number | null
          tournament_date?: string
          weapon?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "tournaments_gym_id_fkey"
            columns: ["gym_id"]
            isOneToOne: false
            referencedRelation: "gyms"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "tournaments_gym_id_fkey"
            columns: ["gym_id"]
            isOneToOne: false
            referencedRelation: "public_gym_info"
            referencedColumns: ["id"]
          },
        ]
      }
      user_roles: {
        Row: {
          created_at: string | null
          id: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Insert: {
          created_at?: string | null
          id?: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Update: {
          created_at?: string | null
          id?: string
          role?: Database["public"]["Enums"]["app_role"]
          user_id?: string
        }
        Relationships: []
      }
    }
    Views: {
      public_gym_info: {
        Row: {
          created_at: string | null
          id: string | null
          logo_url: string | null
          name: string | null
          shifts: string[] | null
        }
        Insert: {
          created_at?: string | null
          id?: string | null
          logo_url?: string | null
          name?: string | null
          shifts?: string[] | null
        }
        Update: {
          created_at?: string | null
          id?: string | null
          logo_url?: string | null
          name?: string | null
          shifts?: string[] | null
        }
        Relationships: []
      }
      tournament_phase1_rankings: {
        Row: {
          athlete_id: string | null
          point_diff: number | null
          points_against: number | null
          points_for: number | null
          tournament_id: string | null
          wins: number | null
        }
        Relationships: []
      }
    }
    Functions: {
      approve_tournament_match: {
        Args: { _bout_id: string }
        Returns: undefined
      }
      calculate_elo_change: {
        Args:
          | {
              _frequency_multiplier?: number
              _is_first_win_of_week?: boolean
              _matches_played: number
              _opponent_elo: number
              _player_elo: number
              _player_won: boolean
            }
          | {
              _frequency_multiplier?: number
              _matches_played: number
              _opponent_elo: number
              _player_elo: number
              _player_won: boolean
            }
        Returns: number
      }
      close_old_tournaments: {
        Args: Record<PropertyKey, never>
        Returns: undefined
      }
      create_gym: {
        Args: {
          _logo_url: string
          _name: string
          _owner_email: string
          _owner_name: string
          _shifts: string[]
        }
        Returns: string
      }
      create_gym_and_user: {
        Args:
          | {
              _email: string
              _full_name: string
              _gym_logo_url?: string
              _gym_name: string
              _password: string
              _shifts?: string[]
            }
          | {
              _email: string
              _full_name: string
              _gym_logo_url?: string
              _gym_name: string
              _shifts?: string[]
              _user_id: string
            }
        Returns: Json
      }
      decide_bout: {
        Args: { _bout_id: string; _decision: string }
        Returns: undefined
      }
      delete_bout_with_notification: {
        Args: { _bout_id: string }
        Returns: undefined
      }
      get_current_user_gym_id: {
        Args: Record<PropertyKey, never>
        Returns: string
      }
      get_current_user_role: {
        Args: Record<PropertyKey, never>
        Returns: string
      }
      get_gym_member_names: {
        Args: Record<PropertyKey, never>
        Returns: {
          full_name: string
          role: string
          user_id: string
        }[]
      }
      get_invitation_by_token: {
        Args: { _token: string }
        Returns: {
          expires_at: string
          gym_id: string
          gym_logo_url: string
          gym_name: string
          gym_shifts: string[]
          id: string
          role: string
          status: string
        }[]
      }
      get_my_active_tournament: {
        Args: Record<PropertyKey, never>
        Returns: {
          bout_type: string
          created_by: string
          phase: number
          tournament_date: string
          tournament_id: string
          tournament_name: string
          weapon: string
        }[]
      }
      get_my_pending_bouts: {
        Args: Record<PropertyKey, never>
        Returns: {
          athlete_a: string
          athlete_b: string
          bout_date: string
          bout_type: string
          created_at: string
          created_by: string
          id: string
          notes: string
          score_a: number
          score_b: number
          status: string
          weapon: string
        }[]
      }
      get_my_pending_tournament_matches: {
        Args: Record<PropertyKey, never>
        Returns: {
          approved_by_a: string
          approved_by_b: string
          athlete_a: string
          athlete_b: string
          bout_date: string
          bout_type: string
          id: string
          score_a: number
          score_b: number
          status: string
          tournament_id: string
          tournament_name: string
          weapon: string
        }[]
      }
      get_my_tournament_matches: {
        Args: Record<PropertyKey, never>
        Returns: {
          bout_date: string
          bout_id: string
          bout_type: string
          created_by: string
          i_approved: boolean
          my_score: number
          opponent_approved: boolean
          opponent_id: string
          opponent_name: string
          opponent_score: number
          status: string
          tournament_date: string
          tournament_id: string
          tournament_name: string
          weapon: string
        }[]
      }
      get_personal_ranking_with_elo: {
        Args: { _athlete_id: string }
        Returns: {
          elo_rating: number
          frequency_multiplier: number
          frequency_streak: number
          last_activity_date: string
          matches_played: number
          peak_rating: number
          ranking_position: number
        }[]
      }
      get_public_gym_by_token: {
        Args: { _token: string }
        Returns: {
          id: string
          logo_url: string
          name: string
          shifts: string[]
        }[]
      }
      get_rankings: {
        Args: {
          _gender?: string
          _max_age?: number
          _min_age?: number
          _weapon?: string
        }
        Returns: {
          athlete_id: string
          elo_rating: number
          frequency_multiplier: number
          frequency_streak: number
          full_name: string
          last_activity_date: string
          matches_played: number
          peak_rating: number
          ranking_position: number
        }[]
      }
      get_user_gym_id: {
        Args: Record<PropertyKey, never>
        Returns: string
      }
      get_user_role: {
        Args: { _user_id: string }
        Returns: string
      }
      gym_has_active_public_link: {
        Args: { _gym_id: string }
        Returns: boolean
      }
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
      list_bouts: {
        Args: {
          _athletes?: string[]
          _from?: string
          _gender?: string
          _max_age?: number
          _min_age?: number
          _tipo_match?: string
          _to?: string
          _turni?: string
          _weapon?: string
        }
        Returns: {
          athlete_a: string
          athlete_a_name: string
          athlete_b: string
          athlete_b_name: string
          bout_date: string
          bout_type: string
          id: string
          score_a: number
          score_b: number
          status: string
          weapon: string
        }[]
      }
      register_bout: {
        Args: {
          _bout_date: string
          _bout_type: string
          _my_score: number
          _opp_score: number
          _opponent: string
          _weapon: string
        }
        Returns: string
      }
      register_bout_instructor: {
        Args: {
          _athlete_a: string
          _athlete_b: string
          _bout_date: string
          _bout_type: string
          _score_a: number
          _score_b: number
          _weapon: string
        }
        Returns: string
      }
      register_tournament_matches: {
        Args: {
          _bout_type: string
          _matches: Json
          _tournament_date: string
          _tournament_name: string
          _weapon: string
        }
        Returns: string
      }
      summary_by_athlete: {
        Args: {
          _athletes?: string[]
          _from?: string
          _gender?: string
          _max_age?: number
          _min_age?: number
          _tipo_match?: string
          _to?: string
          _turni?: string
          _weapon?: string
        }
        Returns: {
          athlete_id: string
          avg_hits_given: number
          avg_hits_received: number
          avg_point_diff: number
          elo_rating: number
          full_name: string
          last_training: string
          matches: number
          ranking_position: number
          trainings: number
          win_rate: number
          wins: number
        }[]
      }
      tournament_summary_by_athlete: {
        Args: {
          _athletes?: string[]
          _from?: string
          _gender?: string
          _max_age?: number
          _min_age?: number
          _tipo_match?: string
          _to?: string
          _turni?: string
          _weapon?: string
        }
        Returns: {
          athlete_id: string
          avg_hits_given: number
          avg_hits_received: number
          avg_point_diff: number
          elo_rating: number
          full_name: string
          last_training: string
          matches: number
          ranking_position: number
          trainings: number
          win_rate: number
          wins: number
        }[]
      }
      update_frequency_stats: {
        Args: { _athlete_id: string }
        Returns: undefined
      }
      update_rankings_after_match: {
        Args: {
          _athlete_a: string
          _athlete_b: string
          _score_a: number
          _score_b: number
        }
        Returns: undefined
      }
    }
    Enums: {
      app_role: "allievo" | "istruttore" | "capo_palestra"
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
      app_role: ["allievo", "istruttore", "capo_palestra"],
    },
  },
} as const
