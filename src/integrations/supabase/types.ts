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
      bouts: {
        Row: {
          approved_at: string | null
          approved_by: string | null
          athlete_a: string
          athlete_b: string
          bout_date: string
          bout_type: string
          created_at: string | null
          created_by: string
          id: string
          notes: string | null
          rejected_at: string | null
          rejected_by: string | null
          score_a: number
          score_b: number
          status: string
          team_id: string
          weapon: string
        }
        Insert: {
          approved_at?: string | null
          approved_by?: string | null
          athlete_a: string
          athlete_b: string
          bout_date: string
          bout_type?: string
          created_at?: string | null
          created_by: string
          id?: string
          notes?: string | null
          rejected_at?: string | null
          rejected_by?: string | null
          score_a: number
          score_b: number
          status?: string
          team_id: string
          weapon: string
        }
        Update: {
          approved_at?: string | null
          approved_by?: string | null
          athlete_a?: string
          athlete_b?: string
          bout_date?: string
          bout_type?: string
          created_at?: string | null
          created_by?: string
          id?: string
          notes?: string | null
          rejected_at?: string | null
          rejected_by?: string | null
          score_a?: number
          score_b?: number
          status?: string
          team_id?: string
          weapon?: string
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
            foreignKeyName: "bouts_rejected_by_fkey"
            columns: ["rejected_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["user_id"]
          },
          {
            foreignKeyName: "bouts_team_id_fkey"
            columns: ["team_id"]
            isOneToOne: false
            referencedRelation: "teams"
            referencedColumns: ["id"]
          },
        ]
      }
      profiles: {
        Row: {
          birth_date: string
          created_at: string | null
          full_name: string
          gender: string
          photo_url: string | null
          role: string
          team_id: string
          user_id: string
        }
        Insert: {
          birth_date: string
          created_at?: string | null
          full_name: string
          gender: string
          photo_url?: string | null
          role?: string
          team_id: string
          user_id: string
        }
        Update: {
          birth_date?: string
          created_at?: string | null
          full_name?: string
          gender?: string
          photo_url?: string | null
          role?: string
          team_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "profiles_team_id_fkey"
            columns: ["team_id"]
            isOneToOne: false
            referencedRelation: "teams"
            referencedColumns: ["id"]
          },
        ]
      }
      teams: {
        Row: {
          created_at: string | null
          id: string
          name: string
        }
        Insert: {
          created_at?: string | null
          id?: string
          name: string
        }
        Update: {
          created_at?: string | null
          id?: string
          name?: string
        }
        Relationships: []
      }
    }
    Views: {
      my_pending_bouts: {
        Row: {
          approved_at: string | null
          approved_by: string | null
          athlete_a: string | null
          athlete_b: string | null
          bout_date: string | null
          bout_type: string | null
          created_at: string | null
          created_by: string | null
          id: string | null
          notes: string | null
          rejected_at: string | null
          rejected_by: string | null
          score_a: number | null
          score_b: number | null
          status: string | null
          team_id: string | null
          weapon: string | null
        }
        Insert: {
          approved_at?: string | null
          approved_by?: string | null
          athlete_a?: string | null
          athlete_b?: string | null
          bout_date?: string | null
          bout_type?: string | null
          created_at?: string | null
          created_by?: string | null
          id?: string | null
          notes?: string | null
          rejected_at?: string | null
          rejected_by?: string | null
          score_a?: number | null
          score_b?: number | null
          status?: string | null
          team_id?: string | null
          weapon?: string | null
        }
        Update: {
          approved_at?: string | null
          approved_by?: string | null
          athlete_a?: string | null
          athlete_b?: string | null
          bout_date?: string | null
          bout_type?: string | null
          created_at?: string | null
          created_by?: string | null
          id?: string | null
          notes?: string | null
          rejected_at?: string | null
          rejected_by?: string | null
          score_a?: number | null
          score_b?: number | null
          status?: string | null
          team_id?: string | null
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
            foreignKeyName: "bouts_rejected_by_fkey"
            columns: ["rejected_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["user_id"]
          },
          {
            foreignKeyName: "bouts_team_id_fkey"
            columns: ["team_id"]
            isOneToOne: false
            referencedRelation: "teams"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Functions: {
      decide_bout: {
        Args: { _bout_id: string; _decision: string }
        Returns: undefined
      }
      list_bouts: {
        Args: {
          _athletes?: string[]
          _from?: string
          _gender?: string
          _max_age?: number
          _min_age?: number
          _to?: string
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
      summary_by_athlete: {
        Args: {
          _athletes?: string[]
          _from?: string
          _gender?: string
          _max_age?: number
          _min_age?: number
          _to?: string
          _weapon?: string
        }
        Returns: {
          athlete_id: string
          avg_point_diff: number
          full_name: string
          last_training: string
          matches: number
          trainings: number
          win_rate: number
          wins: number
        }[]
      }
    }
    Enums: {
      [_ in never]: never
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
    Enums: {},
  },
} as const
