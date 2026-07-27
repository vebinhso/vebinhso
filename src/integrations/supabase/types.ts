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
      class_join_requests: {
        Row: {
          class_id: string
          created_at: string
          id: string
          status: string
          student_id: string
          updated_at: string
        }
        Insert: {
          class_id: string
          created_at?: string
          id?: string
          status?: string
          student_id: string
          updated_at?: string
        }
        Update: {
          class_id?: string
          created_at?: string
          id?: string
          status?: string
          student_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "class_join_requests_class_id_fkey"
            columns: ["class_id"]
            isOneToOne: false
            referencedRelation: "classes"
            referencedColumns: ["id"]
          },
        ]
      }
      class_posts: {
        Row: {
          class_id: string
          content: string | null
          created_at: string
          due_at: string | null
          file_url: string | null
          id: string
          kind: string
          link_url: string | null
          teacher_id: string
          title: string
          updated_at: string
        }
        Insert: {
          class_id: string
          content?: string | null
          created_at?: string
          due_at?: string | null
          file_url?: string | null
          id?: string
          kind?: string
          link_url?: string | null
          teacher_id?: string
          title: string
          updated_at?: string
        }
        Update: {
          class_id?: string
          content?: string | null
          created_at?: string
          due_at?: string | null
          file_url?: string | null
          id?: string
          kind?: string
          link_url?: string | null
          teacher_id?: string
          title?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "class_posts_class_id_fkey"
            columns: ["class_id"]
            isOneToOne: false
            referencedRelation: "classes"
            referencedColumns: ["id"]
          },
        ]
      }
      class_submissions: {
        Row: {
          class_id: string
          created_at: string
          feedback: string | null
          file_name: string | null
          file_url: string | null
          grade: string | null
          id: string
          note: string | null
          post_id: string
          student_id: string
          updated_at: string
        }
        Insert: {
          class_id: string
          created_at?: string
          feedback?: string | null
          file_name?: string | null
          file_url?: string | null
          grade?: string | null
          id?: string
          note?: string | null
          post_id: string
          student_id?: string
          updated_at?: string
        }
        Update: {
          class_id?: string
          created_at?: string
          feedback?: string | null
          file_name?: string | null
          file_url?: string | null
          grade?: string | null
          id?: string
          note?: string | null
          post_id?: string
          student_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "class_submissions_class_id_fkey"
            columns: ["class_id"]
            isOneToOne: false
            referencedRelation: "classes"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "class_submissions_post_id_fkey"
            columns: ["post_id"]
            isOneToOne: false
            referencedRelation: "class_posts"
            referencedColumns: ["id"]
          },
        ]
      }
      classes: {
        Row: {
          code: string
          created_at: string
          id: string
          name: string
          subject: string | null
          teacher_id: string
          updated_at: string
          visibility: string
        }
        Insert: {
          code: string
          created_at?: string
          id?: string
          name: string
          subject?: string | null
          teacher_id: string
          updated_at?: string
          visibility?: string
        }
        Update: {
          code?: string
          created_at?: string
          id?: string
          name?: string
          subject?: string | null
          teacher_id?: string
          updated_at?: string
          visibility?: string
        }
        Relationships: []
      }
      classroom_members: {
        Row: {
          class_id: string
          id: string
          joined_at: string
          student_id: string
          teacher_id: string
        }
        Insert: {
          class_id: string
          id?: string
          joined_at?: string
          student_id: string
          teacher_id: string
        }
        Update: {
          class_id?: string
          id?: string
          joined_at?: string
          student_id?: string
          teacher_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "classroom_members_class_id_fkey"
            columns: ["class_id"]
            isOneToOne: false
            referencedRelation: "classes"
            referencedColumns: ["id"]
          },
        ]
      }
      duel_answers: {
        Row: {
          created_at: string
          duel_id: string
          id: string
          is_correct: boolean
          ms: number
          q_index: number
          selected: number
          user_id: string
        }
        Insert: {
          created_at?: string
          duel_id: string
          id?: string
          is_correct: boolean
          ms: number
          q_index: number
          selected: number
          user_id: string
        }
        Update: {
          created_at?: string
          duel_id?: string
          id?: string
          is_correct?: boolean
          ms?: number
          q_index?: number
          selected?: number
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "duel_answers_duel_id_fkey"
            columns: ["duel_id"]
            isOneToOne: false
            referencedRelation: "duels"
            referencedColumns: ["id"]
          },
        ]
      }
      duels: {
        Row: {
          created_at: string
          finished_at: string | null
          guest_id: string
          guest_score: number
          host_id: string
          host_score: number
          house_owner: string
          id: string
          payout: number
          question_ids: string[]
          status: string
          topic_category: string | null
          topic_domain: number | null
          winner_id: string | null
        }
        Insert: {
          created_at?: string
          finished_at?: string | null
          guest_id: string
          guest_score?: number
          host_id: string
          host_score?: number
          house_owner: string
          id?: string
          payout?: number
          question_ids?: string[]
          status?: string
          topic_category?: string | null
          topic_domain?: number | null
          winner_id?: string | null
        }
        Update: {
          created_at?: string
          finished_at?: string | null
          guest_id?: string
          guest_score?: number
          host_id?: string
          host_score?: number
          house_owner?: string
          id?: string
          payout?: number
          question_ids?: string[]
          status?: string
          topic_category?: string | null
          topic_domain?: number | null
          winner_id?: string | null
        }
        Relationships: []
      }
      floors: {
        Row: {
          ax: number
          az: number
          bx: number
          bz: number
          color: string | null
          created_at: string
          floor: number
          id: string
          updated_at: string
          user_id: string
          value: number
        }
        Insert: {
          ax: number
          az: number
          bx: number
          bz: number
          color?: string | null
          created_at?: string
          floor?: number
          id?: string
          updated_at?: string
          user_id: string
          value?: number
        }
        Update: {
          ax?: number
          az?: number
          bx?: number
          bz?: number
          color?: string | null
          created_at?: string
          floor?: number
          id?: string
          updated_at?: string
          user_id?: string
          value?: number
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
          paint: number
          roof_tiles: number
          roof_tiles_ton: number
          sign_labels: Json
          total_answered: number
          total_play_seconds: number
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
          paint?: number
          roof_tiles?: number
          roof_tiles_ton?: number
          sign_labels?: Json
          total_answered?: number
          total_play_seconds?: number
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
          paint?: number
          roof_tiles?: number
          roof_tiles_ton?: number
          sign_labels?: Json
          total_answered?: number
          total_play_seconds?: number
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
          angle_rad: number | null
          created_at: string
          floor: number
          id: string
          item_id: string
          rotation: number
          stack_y: number | null
          user_id: string
          x: number
          z: number
        }
        Insert: {
          angle_rad?: number | null
          created_at?: string
          floor?: number
          id?: string
          item_id: string
          rotation?: number
          stack_y?: number | null
          user_id: string
          x: number
          z: number
        }
        Update: {
          angle_rad?: number | null
          created_at?: string
          floor?: number
          id?: string
          item_id?: string
          rotation?: number
          stack_y?: number | null
          user_id?: string
          x?: number
          z?: number
        }
        Relationships: []
      }
      presence: {
        Row: {
          in_house_owner: string | null
          is_online: boolean
          last_seen: string
          updated_at: string
          user_id: string
        }
        Insert: {
          in_house_owner?: string | null
          is_online?: boolean
          last_seen?: string
          updated_at?: string
          user_id: string
        }
        Update: {
          in_house_owner?: string | null
          is_online?: boolean
          last_seen?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      profiles: {
        Row: {
          active_class_id: string | null
          active_teacher_id: string | null
          avatar: string | null
          avatar_url: string | null
          class_code: string | null
          coop_build: boolean
          created_at: string
          display_name: string | null
          email: string | null
          house_allow_list: string[]
          house_name: string | null
          house_privacy: string
          map_x: number
          map_y: number
          name_changes: number
          teacher_school: string | null
          teacher_status: Database["public"]["Enums"]["teacher_status"]
          teacher_subject: string | null
          updated_at: string
          user_id: string
          username: string
        }
        Insert: {
          active_class_id?: string | null
          active_teacher_id?: string | null
          avatar?: string | null
          avatar_url?: string | null
          class_code?: string | null
          coop_build?: boolean
          created_at?: string
          display_name?: string | null
          email?: string | null
          house_allow_list?: string[]
          house_name?: string | null
          house_privacy?: string
          map_x?: number
          map_y?: number
          name_changes?: number
          teacher_school?: string | null
          teacher_status?: Database["public"]["Enums"]["teacher_status"]
          teacher_subject?: string | null
          updated_at?: string
          user_id: string
          username: string
        }
        Update: {
          active_class_id?: string | null
          active_teacher_id?: string | null
          avatar?: string | null
          avatar_url?: string | null
          class_code?: string | null
          coop_build?: boolean
          created_at?: string
          display_name?: string | null
          email?: string | null
          house_allow_list?: string[]
          house_name?: string | null
          house_privacy?: string
          map_x?: number
          map_y?: number
          name_changes?: number
          teacher_school?: string | null
          teacher_status?: Database["public"]["Enums"]["teacher_status"]
          teacher_subject?: string | null
          updated_at?: string
          user_id?: string
          username?: string
        }
        Relationships: [
          {
            foreignKeyName: "profiles_active_class_id_fkey"
            columns: ["active_class_id"]
            isOneToOne: false
            referencedRelation: "classes"
            referencedColumns: ["id"]
          },
        ]
      }
      question_attempts: {
        Row: {
          class_id: string | null
          created_at: string
          id: string
          is_correct: boolean
          question_id: string
          selected_index: number
          user_id: string
        }
        Insert: {
          class_id?: string | null
          created_at?: string
          id?: string
          is_correct: boolean
          question_id: string
          selected_index: number
          user_id: string
        }
        Update: {
          class_id?: string | null
          created_at?: string
          id?: string
          is_correct?: boolean
          question_id?: string
          selected_index?: number
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "question_attempts_class_id_fkey"
            columns: ["class_id"]
            isOneToOne: false
            referencedRelation: "classes"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "question_attempts_question_id_fkey"
            columns: ["question_id"]
            isOneToOne: false
            referencedRelation: "questions_bank"
            referencedColumns: ["id"]
          },
        ]
      }
      questions_bank: {
        Row: {
          answer_index: number
          category: string | null
          choices: Json
          class_id: string | null
          competency_domain: number | null
          competency_level: number | null
          correct_indexes: Json
          created_at: string
          enabled: boolean
          id: string
          image_url: string | null
          maps: Json
          priority: number
          reward: number
          teacher_id: string | null
          text: string
          updated_at: string
        }
        Insert: {
          answer_index?: number
          category?: string | null
          choices?: Json
          class_id?: string | null
          competency_domain?: number | null
          competency_level?: number | null
          correct_indexes?: Json
          created_at?: string
          enabled?: boolean
          id?: string
          image_url?: string | null
          maps?: Json
          priority?: number
          reward?: number
          teacher_id?: string | null
          text: string
          updated_at?: string
        }
        Update: {
          answer_index?: number
          category?: string | null
          choices?: Json
          class_id?: string | null
          competency_domain?: number | null
          competency_level?: number | null
          correct_indexes?: Json
          created_at?: string
          enabled?: boolean
          id?: string
          image_url?: string | null
          maps?: Json
          priority?: number
          reward?: number
          teacher_id?: string | null
          text?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "questions_bank_class_id_fkey"
            columns: ["class_id"]
            isOneToOne: false
            referencedRelation: "classes"
            referencedColumns: ["id"]
          },
        ]
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
      _gen_class_code: { Args: never; Returns: string }
      admin_get_question: {
        Args: { qid: string }
        Returns: {
          answer_index: number
          category: string | null
          choices: Json
          class_id: string | null
          competency_domain: number | null
          competency_level: number | null
          correct_indexes: Json
          created_at: string
          enabled: boolean
          id: string
          image_url: string | null
          maps: Json
          priority: number
          reward: number
          teacher_id: string | null
          text: string
          updated_at: string
        }
        SetofOptions: {
          from: "*"
          to: "questions_bank"
          isOneToOne: true
          isSetofReturn: false
        }
      }
      admin_list_questions: {
        Args: never
        Returns: {
          answer_index: number
          category: string | null
          choices: Json
          class_id: string | null
          competency_domain: number | null
          competency_level: number | null
          correct_indexes: Json
          created_at: string
          enabled: boolean
          id: string
          image_url: string | null
          maps: Json
          priority: number
          reward: number
          teacher_id: string | null
          text: string
          updated_at: string
        }[]
        SetofOptions: {
          from: "*"
          to: "questions_bank"
          isOneToOne: false
          isSetofReturn: true
        }
      }
      approve_teacher: { Args: { uid: string }; Returns: string }
      can_coop_build: { Args: { owner: string }; Returns: boolean }
      can_visit_house: { Args: { owner: string }; Returns: boolean }
      create_class: {
        Args: { _name: string; _subject: string }
        Returns: {
          code: string
          created_at: string
          id: string
          name: string
          subject: string | null
          teacher_id: string
          updated_at: string
          visibility: string
        }
        SetofOptions: {
          from: "*"
          to: "classes"
          isOneToOne: true
          isSetofReturn: false
        }
      }
      decide_join_request: {
        Args: { _approve: boolean; _class_id: string; _student_id: string }
        Returns: undefined
      }
      delete_class: { Args: { _class_id: string }; Returns: undefined }
      get_class_roster: {
        Args: { _class_id: string }
        Returns: {
          display_name: string
          is_teacher: boolean
          user_id: string
          username: string
        }[]
      }
      get_class_students: {
        Args: { _class_id: string }
        Returns: {
          display_name: string
          email: string
          joined_at: string
          user_id: string
          username: string
        }[]
      }
      get_friend_houses: {
        Args: never
        Returns: {
          avatar_url: string
          display_name: string
          house_name: string
          house_privacy: string
          in_house_owner: string
          is_online: boolean
          map_x: number
          map_y: number
          user_id: string
          username: string
        }[]
      }
      get_leaderboard: {
        Args: never
        Returns: {
          avatar_url: string
          correct_answers: number
          display_name: string
          level: number
          net_worth: number
          user_id: string
          username: string
        }[]
      }
      get_my_classes: {
        Args: never
        Returns: {
          class_id: string
          code: string
          is_active: boolean
          name: string
          subject: string
          teacher_id: string
          teacher_name: string
          teacher_school: string
        }[]
      }
      get_my_email: { Args: never; Returns: string }
      get_or_create_my_class_code: { Args: never; Returns: string }
      get_student_answer_stats: {
        Args: { _class_id: string; _student_id: string }
        Returns: {
          attempts: number
          correct_count: number
          last_at: string
          last_correct: boolean
          question_id: string
          question_text: string
          wrong_count: number
        }[]
      }
      grade_answer: {
        Args: { qid: string; selected: number }
        Returns: {
          correct_indexes: number[]
          is_correct: boolean
          reward: number
        }[]
      }
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
      join_class: { Args: { code: string }; Returns: Json }
      leave_class: { Args: { _class_id?: string }; Returns: undefined }
      list_join_requests: {
        Args: { _class_id: string }
        Returns: {
          created_at: string
          display_name: string
          status: string
          student_id: string
          username: string
        }[]
      }
      list_my_taught_classes: {
        Args: never
        Returns: {
          code: string
          created_at: string
          id: string
          name: string
          question_count: number
          student_count: number
          subject: string
        }[]
      }
      list_pending_teachers: {
        Args: never
        Returns: {
          class_code: string
          display_name: string
          email: string
          teacher_school: string
          teacher_status: Database["public"]["Enums"]["teacher_status"]
          teacher_subject: string
          user_id: string
          username: string
        }[]
      }
      reject_teacher: { Args: { uid: string }; Returns: undefined }
      remove_class_student: {
        Args: { _class_id: string; _student_id: string }
        Returns: undefined
      }
      request_teacher: {
        Args: { school: string; subject: string }
        Returns: undefined
      }
      set_active_class: { Args: { _class_id: string }; Returns: undefined }
      set_class_visibility: {
        Args: { _class_id: string; _visibility: string }
        Returns: undefined
      }
    }
    Enums: {
      app_role: "admin" | "moderator" | "user" | "teacher"
      roof_style: "tile" | "ton"
      teacher_status: "none" | "pending" | "approved" | "rejected"
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
      app_role: ["admin", "moderator", "user", "teacher"],
      roof_style: ["tile", "ton"],
      teacher_status: ["none", "pending", "approved", "rejected"],
    },
  },
} as const
