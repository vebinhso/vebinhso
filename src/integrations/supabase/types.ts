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
    PostgrestVersion: "14.5"
  }
  public: {
    Tables: {
      admin_config: {
        Row: {
          key: string
          updated_at: string
          value: Json
        }
        Insert: {
          key: string
          updated_at?: string
          value: Json
        }
        Update: {
          key?: string
          updated_at?: string
          value?: Json
        }
        Relationships: []
      }
      character_outfit: {
        Row: {
          outfit: Json
          updated_at: string
          user_id: string
        }
        Insert: {
          outfit?: Json
          updated_at?: string
          user_id: string
        }
        Update: {
          outfit?: Json
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      friends: {
        Row: {
          created_at: string
          friend_id: string
          status: string
          user_id: string
        }
        Insert: {
          created_at?: string
          friend_id: string
          status?: string
          user_id: string
        }
        Update: {
          created_at?: string
          friend_id?: string
          status?: string
          user_id?: string
        }
        Relationships: []
      }
      game_state: {
        Row: {
          answer_streak: number
          banned: boolean
          bricks: number
          concrete: number
          correct_answers: number
          level: number
          money: number
          net_worth: number
          owned_palettes: Json
          roof_tiles: number
          roof_tiles_ton: number
          updated_at: string
          user_id: string
          wall_color: string
        }
        Insert: {
          answer_streak?: number
          banned?: boolean
          bricks?: number
          concrete?: number
          correct_answers?: number
          level?: number
          money?: number
          net_worth?: number
          owned_palettes?: Json
          roof_tiles?: number
          roof_tiles_ton?: number
          updated_at?: string
          user_id: string
          wall_color?: string
        }
        Update: {
          answer_streak?: number
          banned?: boolean
          bricks?: number
          concrete?: number
          correct_answers?: number
          level?: number
          money?: number
          net_worth?: number
          owned_palettes?: Json
          roof_tiles?: number
          roof_tiles_ton?: number
          updated_at?: string
          user_id?: string
          wall_color?: string
        }
        Relationships: []
      }
      login_streaks: {
        Row: {
          current_streak: number
          last_login_date: string | null
          total_days: number
          updated_at: string
          user_id: string
        }
        Insert: {
          current_streak?: number
          last_login_date?: string | null
          total_days?: number
          updated_at?: string
          user_id: string
        }
        Update: {
          current_streak?: number
          last_login_date?: string | null
          total_days?: number
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      messages: {
        Row: {
          created_at: string
          delivered_at: string | null
          from_id: string
          id: string
          seen_at: string | null
          text: string
          thread_key: string
          to_id: string
        }
        Insert: {
          created_at?: string
          delivered_at?: string | null
          from_id: string
          id?: string
          seen_at?: string | null
          text: string
          thread_key: string
          to_id: string
        }
        Update: {
          created_at?: string
          delivered_at?: string | null
          from_id?: string
          id?: string
          seen_at?: string | null
          text?: string
          thread_key?: string
          to_id?: string
        }
        Relationships: []
      }
      pets: {
        Row: {
          created_at: string
          equipped: boolean
          id: string
          level: number
          name: string | null
          pet_id: string
          user_id: string
          xp: number
        }
        Insert: {
          created_at?: string
          equipped?: boolean
          id?: string
          level?: number
          name?: string | null
          pet_id: string
          user_id: string
          xp?: number
        }
        Update: {
          created_at?: string
          equipped?: boolean
          id?: string
          level?: number
          name?: string | null
          pet_id?: string
          user_id?: string
          xp?: number
        }
        Relationships: []
      }
      placed_items: {
        Row: {
          created_at: string
          floor: number
          id: string
          item_id: string
          rotation: number
          user_id: string
          x: number
          z: number
        }
        Insert: {
          created_at?: string
          floor?: number
          id?: string
          item_id: string
          rotation?: number
          user_id: string
          x: number
          z: number
        }
        Update: {
          created_at?: string
          floor?: number
          id?: string
          item_id?: string
          rotation?: number
          user_id?: string
          x?: number
          z?: number
        }
        Relationships: []
      }
      profiles: {
        Row: {
          avatar: string | null
          avatar_url: string | null
          created_at: string
          display_name: string | null
          email: string | null
          name_changes: number
          updated_at: string
          user_id: string
          username: string
        }
        Insert: {
          avatar?: string | null
          avatar_url?: string | null
          created_at?: string
          display_name?: string | null
          email?: string | null
          name_changes?: number
          updated_at?: string
          user_id: string
          username: string
        }
        Update: {
          avatar?: string | null
          avatar_url?: string | null
          created_at?: string
          display_name?: string | null
          email?: string | null
          name_changes?: number
          updated_at?: string
          user_id?: string
          username?: string
        }
        Relationships: []
      }
      questions_bank: {
        Row: {
          answer_index: number
          category: string | null
          choices: Json
          correct_indexes: Json
          created_at: string
          enabled: boolean
          id: string
          image_url: string | null
          maps: Json
          priority: number
          reward: number
          text: string
          updated_at: string
        }
        Insert: {
          answer_index?: number
          category?: string | null
          choices?: Json
          correct_indexes?: Json
          created_at?: string
          enabled?: boolean
          id?: string
          image_url?: string | null
          maps?: Json
          priority?: number
          reward?: number
          text: string
          updated_at?: string
        }
        Update: {
          answer_index?: number
          category?: string | null
          choices?: Json
          correct_indexes?: Json
          created_at?: string
          enabled?: boolean
          id?: string
          image_url?: string | null
          maps?: Json
          priority?: number
          reward?: number
          text?: string
          updated_at?: string
        }
        Relationships: []
      }
      roofs: {
        Row: {
          ax: number
          az: number
          bx: number
          bz: number
          created_at: string
          floor: number
          id: string
          style: Database["public"]["Enums"]["roof_style"]
          user_id: string
          value: number
        }
        Insert: {
          ax: number
          az: number
          bx: number
          bz: number
          created_at?: string
          floor?: number
          id?: string
          style?: Database["public"]["Enums"]["roof_style"]
          user_id: string
          value?: number
        }
        Update: {
          ax?: number
          az?: number
          bx?: number
          bz?: number
          created_at?: string
          floor?: number
          id?: string
          style?: Database["public"]["Enums"]["roof_style"]
          user_id?: string
          value?: number
        }
        Relationships: []
      }
      user_roles: {
        Row: {
          created_at: string
          id: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          role?: Database["public"]["Enums"]["app_role"]
          user_id?: string
        }
        Relationships: []
      }
      walls: {
        Row: {
          ax: number
          az: number
          bx: number
          bz: number
          color: string
          created_at: string
          floor: number
          id: string
          user_id: string
          value: number
        }
        Insert: {
          ax: number
          az: number
          bx: number
          bz: number
          color?: string
          created_at?: string
          floor?: number
          id?: string
          user_id: string
          value?: number
        }
        Update: {
          ax?: number
          az?: number
          bx?: number
          bz?: number
          color?: string
          created_at?: string
          floor?: number
          id?: string
          user_id?: string
          value?: number
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
    }
    Enums: {
      app_role: "admin" | "moderator" | "user"
      roof_style: "tile" | "ton"
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
      app_role: ["admin", "moderator", "user"],
      roof_style: ["tile", "ton"],
    },
  },
} as const
