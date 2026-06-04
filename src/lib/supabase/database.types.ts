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
      answers: {
        Row: {
          audio_path: string | null
          book_sort: number | null
          created_at: string
          duration_sec: number | null
          family_id: string
          id: string
          in_book: boolean
          is_followup: boolean
          lang: string
          parent_answer_id: string | null
          prompt_id: string | null
          question_text: string | null
          session_id: string | null
          storyteller_id: string
          transcript: string | null
        }
        Insert: {
          audio_path?: string | null
          book_sort?: number | null
          created_at?: string
          duration_sec?: number | null
          family_id: string
          id?: string
          in_book?: boolean
          is_followup?: boolean
          lang?: string
          parent_answer_id?: string | null
          prompt_id?: string | null
          question_text?: string | null
          session_id?: string | null
          storyteller_id: string
          transcript?: string | null
        }
        Update: {
          audio_path?: string | null
          book_sort?: number | null
          created_at?: string
          duration_sec?: number | null
          family_id?: string
          id?: string
          in_book?: boolean
          is_followup?: boolean
          lang?: string
          parent_answer_id?: string | null
          prompt_id?: string | null
          question_text?: string | null
          session_id?: string | null
          storyteller_id?: string
          transcript?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "answers_family_id_fkey"
            columns: ["family_id"]
            isOneToOne: false
            referencedRelation: "families"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "answers_parent_answer_id_fkey"
            columns: ["parent_answer_id"]
            isOneToOne: false
            referencedRelation: "answers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "answers_prompt_id_fkey"
            columns: ["prompt_id"]
            isOneToOne: false
            referencedRelation: "prompts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "answers_session_id_fkey"
            columns: ["session_id"]
            isOneToOne: false
            referencedRelation: "sessions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "answers_storyteller_id_fkey"
            columns: ["storyteller_id"]
            isOneToOne: false
            referencedRelation: "storytellers"
            referencedColumns: ["id"]
          },
        ]
      }
      families: {
        Row: {
          created_at: string
          id: string
          name: string
          plan: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          id?: string
          name: string
          plan?: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          id?: string
          name?: string
          plan?: string
          updated_at?: string
        }
        Relationships: []
      }
      insights: {
        Row: {
          created_at: string
          dismissed_at: string | null
          family_id: string
          id: string
          payload: Json
          storyteller_id: string
          type: Database["public"]["Enums"]["insight_type"]
        }
        Insert: {
          created_at?: string
          dismissed_at?: string | null
          family_id: string
          id?: string
          payload?: Json
          storyteller_id: string
          type: Database["public"]["Enums"]["insight_type"]
        }
        Update: {
          created_at?: string
          dismissed_at?: string | null
          family_id?: string
          id?: string
          payload?: Json
          storyteller_id?: string
          type?: Database["public"]["Enums"]["insight_type"]
        }
        Relationships: [
          {
            foreignKeyName: "insights_family_id_fkey"
            columns: ["family_id"]
            isOneToOne: false
            referencedRelation: "families"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "insights_storyteller_id_fkey"
            columns: ["storyteller_id"]
            isOneToOne: false
            referencedRelation: "storytellers"
            referencedColumns: ["id"]
          },
        ]
      }
      invitations: {
        Row: {
          accepted_at: string | null
          created_at: string
          email: string
          expires_at: string
          family_id: string
          id: string
          role: Database["public"]["Enums"]["membership_role"]
          token: string
        }
        Insert: {
          accepted_at?: string | null
          created_at?: string
          email: string
          expires_at: string
          family_id: string
          id?: string
          role?: Database["public"]["Enums"]["membership_role"]
          token: string
        }
        Update: {
          accepted_at?: string | null
          created_at?: string
          email?: string
          expires_at?: string
          family_id?: string
          id?: string
          role?: Database["public"]["Enums"]["membership_role"]
          token?: string
        }
        Relationships: [
          {
            foreignKeyName: "invitations_family_id_fkey"
            columns: ["family_id"]
            isOneToOne: false
            referencedRelation: "families"
            referencedColumns: ["id"]
          },
        ]
      }
      memberships: {
        Row: {
          alert_phone: string | null
          created_at: string
          family_id: string
          id: string
          role: Database["public"]["Enums"]["membership_role"]
          user_id: string
        }
        Insert: {
          alert_phone?: string | null
          created_at?: string
          family_id: string
          id?: string
          role?: Database["public"]["Enums"]["membership_role"]
          user_id: string
        }
        Update: {
          alert_phone?: string | null
          created_at?: string
          family_id?: string
          id?: string
          role?: Database["public"]["Enums"]["membership_role"]
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "memberships_family_id_fkey"
            columns: ["family_id"]
            isOneToOne: false
            referencedRelation: "families"
            referencedColumns: ["id"]
          },
        ]
      }
      prompts: {
        Row: {
          applies_to: Database["public"]["Enums"]["relationship_type"][]
          category: string
          created_at: string
          emotional_weight: Database["public"]["Enums"]["emo_weight"]
          family_id: string | null
          follow_ups: string[]
          id: string
          lang: string
          photo_friendly: boolean
          prompt: string
          warm_up: boolean
        }
        Insert: {
          applies_to?: Database["public"]["Enums"]["relationship_type"][]
          category: string
          created_at?: string
          emotional_weight?: Database["public"]["Enums"]["emo_weight"]
          family_id?: string | null
          follow_ups?: string[]
          id?: string
          lang?: string
          photo_friendly?: boolean
          prompt: string
          warm_up?: boolean
        }
        Update: {
          applies_to?: Database["public"]["Enums"]["relationship_type"][]
          category?: string
          created_at?: string
          emotional_weight?: Database["public"]["Enums"]["emo_weight"]
          family_id?: string | null
          follow_ups?: string[]
          id?: string
          lang?: string
          photo_friendly?: boolean
          prompt?: string
          warm_up?: boolean
        }
        Relationships: [
          {
            foreignKeyName: "prompts_family_id_fkey"
            columns: ["family_id"]
            isOneToOne: false
            referencedRelation: "families"
            referencedColumns: ["id"]
          },
        ]
      }
      schedules: {
        Row: {
          days_of_week: string[]
          family_id: string
          id: string
          last_nudged_at: string | null
          paused: boolean
          questions_per: number
          quiet_after: string | null
          send_time_local: string
          signal_engagement_enabled: boolean
          signal_engagement_sensitivity: Database["public"]["Enums"]["engagement_sensitivity"]
          signal_schedule_suggestion_enabled: boolean
          storyteller_id: string
          timezone: string | null
          updated_at: string
        }
        Insert: {
          days_of_week?: string[]
          family_id: string
          id?: string
          last_nudged_at?: string | null
          paused?: boolean
          questions_per?: number
          quiet_after?: string | null
          send_time_local?: string
          signal_engagement_enabled?: boolean
          signal_engagement_sensitivity?: Database["public"]["Enums"]["engagement_sensitivity"]
          signal_schedule_suggestion_enabled?: boolean
          storyteller_id: string
          timezone?: string | null
          updated_at?: string
        }
        Update: {
          days_of_week?: string[]
          family_id?: string
          id?: string
          last_nudged_at?: string | null
          paused?: boolean
          questions_per?: number
          quiet_after?: string | null
          send_time_local?: string
          signal_engagement_enabled?: boolean
          signal_engagement_sensitivity?: Database["public"]["Enums"]["engagement_sensitivity"]
          signal_schedule_suggestion_enabled?: boolean
          storyteller_id?: string
          timezone?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "schedules_family_id_fkey"
            columns: ["family_id"]
            isOneToOne: false
            referencedRelation: "families"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "schedules_storyteller_id_fkey"
            columns: ["storyteller_id"]
            isOneToOne: true
            referencedRelation: "storytellers"
            referencedColumns: ["id"]
          },
        ]
      }
      sessions: {
        Row: {
          completed_at: string | null
          created_at: string
          family_id: string
          id: string
          scheduled_at: string | null
          sent_at: string | null
          started_at: string | null
          status: Database["public"]["Enums"]["session_status"]
          storyteller_id: string
        }
        Insert: {
          completed_at?: string | null
          created_at?: string
          family_id: string
          id?: string
          scheduled_at?: string | null
          sent_at?: string | null
          started_at?: string | null
          status?: Database["public"]["Enums"]["session_status"]
          storyteller_id: string
        }
        Update: {
          completed_at?: string | null
          created_at?: string
          family_id?: string
          id?: string
          scheduled_at?: string | null
          sent_at?: string | null
          started_at?: string | null
          status?: Database["public"]["Enums"]["session_status"]
          storyteller_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "sessions_family_id_fkey"
            columns: ["family_id"]
            isOneToOne: false
            referencedRelation: "families"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "sessions_storyteller_id_fkey"
            columns: ["storyteller_id"]
            isOneToOne: false
            referencedRelation: "storytellers"
            referencedColumns: ["id"]
          },
        ]
      }
      story_photos: {
        Row: {
          answer_id: string
          caption: string | null
          created_at: string
          family_id: string
          id: string
          sort: number
          storage_path: string
        }
        Insert: {
          answer_id: string
          caption?: string | null
          created_at?: string
          family_id: string
          id?: string
          sort?: number
          storage_path: string
        }
        Update: {
          answer_id?: string
          caption?: string | null
          created_at?: string
          family_id?: string
          id?: string
          sort?: number
          storage_path?: string
        }
        Relationships: [
          {
            foreignKeyName: "story_photos_answer_id_fkey"
            columns: ["answer_id"]
            isOneToOne: false
            referencedRelation: "answers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "story_photos_family_id_fkey"
            columns: ["family_id"]
            isOneToOne: false
            referencedRelation: "families"
            referencedColumns: ["id"]
          },
        ]
      }
      storyteller_relationships: {
        Row: {
          address_term: string
          asker_relation: string | null
          created_at: string
          family_id: string
          id: string
          is_interviewer: boolean
          kind: Database["public"]["Enums"]["relationship_type"]
          storyteller_id: string
          user_id: string
          voice_profile_id: string | null
        }
        Insert: {
          address_term: string
          asker_relation?: string | null
          created_at?: string
          family_id: string
          id?: string
          is_interviewer?: boolean
          kind?: Database["public"]["Enums"]["relationship_type"]
          storyteller_id: string
          user_id: string
          voice_profile_id?: string | null
        }
        Update: {
          address_term?: string
          asker_relation?: string | null
          created_at?: string
          family_id?: string
          id?: string
          is_interviewer?: boolean
          kind?: Database["public"]["Enums"]["relationship_type"]
          storyteller_id?: string
          user_id?: string
          voice_profile_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "storyteller_relationships_family_id_fkey"
            columns: ["family_id"]
            isOneToOne: false
            referencedRelation: "families"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "storyteller_relationships_storyteller_id_fkey"
            columns: ["storyteller_id"]
            isOneToOne: false
            referencedRelation: "storytellers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "storyteller_relationships_voice_profile_id_fkey"
            columns: ["voice_profile_id"]
            isOneToOne: false
            referencedRelation: "voice_profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      storyteller_tokens: {
        Row: {
          created_at: string
          family_id: string
          id: string
          last_used_at: string | null
          revoked_at: string | null
          storyteller_id: string
          token_enc: string | null
          token_hash: string
        }
        Insert: {
          created_at?: string
          family_id: string
          id?: string
          last_used_at?: string | null
          revoked_at?: string | null
          storyteller_id: string
          token_enc?: string | null
          token_hash: string
        }
        Update: {
          created_at?: string
          family_id?: string
          id?: string
          last_used_at?: string | null
          revoked_at?: string | null
          storyteller_id?: string
          token_enc?: string | null
          token_hash?: string
        }
        Relationships: [
          {
            foreignKeyName: "storyteller_tokens_family_id_fkey"
            columns: ["family_id"]
            isOneToOne: false
            referencedRelation: "families"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "storyteller_tokens_storyteller_id_fkey"
            columns: ["storyteller_id"]
            isOneToOne: false
            referencedRelation: "storytellers"
            referencedColumns: ["id"]
          },
        ]
      }
      storytellers: {
        Row: {
          birth_year: number | null
          book_chapter_order: string[] | null
          created_at: string
          family_id: string
          id: string
          language: string
          name: string
          phone: string | null
          pronouns: Database["public"]["Enums"]["pronoun_set"]
          status: string
          updated_at: string
        }
        Insert: {
          birth_year?: number | null
          book_chapter_order?: string[] | null
          created_at?: string
          family_id: string
          id?: string
          language?: string
          name: string
          phone?: string | null
          pronouns?: Database["public"]["Enums"]["pronoun_set"]
          status?: string
          updated_at?: string
        }
        Update: {
          birth_year?: number | null
          book_chapter_order?: string[] | null
          created_at?: string
          family_id?: string
          id?: string
          language?: string
          name?: string
          phone?: string | null
          pronouns?: Database["public"]["Enums"]["pronoun_set"]
          status?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "storytellers_family_id_fkey"
            columns: ["family_id"]
            isOneToOne: false
            referencedRelation: "families"
            referencedColumns: ["id"]
          },
        ]
      }
      topic_preferences: {
        Row: {
          category: string
          family_id: string
          id: string
          preference: Database["public"]["Enums"]["topic_preference"]
          storyteller_id: string
          updated_at: string
        }
        Insert: {
          category: string
          family_id: string
          id?: string
          preference: Database["public"]["Enums"]["topic_preference"]
          storyteller_id: string
          updated_at?: string
        }
        Update: {
          category?: string
          family_id?: string
          id?: string
          preference?: Database["public"]["Enums"]["topic_preference"]
          storyteller_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "topic_preferences_family_id_fkey"
            columns: ["family_id"]
            isOneToOne: false
            referencedRelation: "families"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "topic_preferences_storyteller_id_fkey"
            columns: ["storyteller_id"]
            isOneToOne: false
            referencedRelation: "storytellers"
            referencedColumns: ["id"]
          },
        ]
      }
      voice_profiles: {
        Row: {
          created_at: string
          family_id: string
          id: string
          label: string
          lang: string
          owner_user_id: string | null
          provider: string
          provider_voice: string | null
        }
        Insert: {
          created_at?: string
          family_id: string
          id?: string
          label: string
          lang?: string
          owner_user_id?: string | null
          provider?: string
          provider_voice?: string | null
        }
        Update: {
          created_at?: string
          family_id?: string
          id?: string
          label?: string
          lang?: string
          owner_user_id?: string | null
          provider?: string
          provider_voice?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "voice_profiles_family_id_fkey"
            columns: ["family_id"]
            isOneToOne: false
            referencedRelation: "families"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      accept_invitation: { Args: { p_token: string }; Returns: string }
      create_family: { Args: { p_name: string }; Returns: string }
      has_family_role: {
        Args: {
          p_family: string
          p_min: Database["public"]["Enums"]["membership_role"]
        }
        Returns: boolean
      }
      is_member_of: { Args: { p_family: string }; Returns: boolean }
    }
    Enums: {
      emo_weight: "light" | "medium" | "heavy"
      engagement_sensitivity: "gentle" | "standard" | "sensitive"
      insight_type: "mic_failed" | "schedule_suggestion" | "engagement_drop"
      membership_role: "owner" | "admin" | "viewer"
      pronoun_set: "he_him" | "she_her" | "they_them"
      relationship_type:
        | "any"
        | "parent"
        | "grandparent"
        | "aunt_uncle"
        | "sibling"
        | "spouse"
        | "other"
      session_status:
        | "scheduled"
        | "sent"
        | "in_progress"
        | "completed"
        | "skipped"
        | "missed"
      topic_preference: "focus" | "ease_off" | "avoid"
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
      emo_weight: ["light", "medium", "heavy"],
      engagement_sensitivity: ["gentle", "standard", "sensitive"],
      insight_type: ["mic_failed", "schedule_suggestion", "engagement_drop"],
      membership_role: ["owner", "admin", "viewer"],
      pronoun_set: ["he_him", "she_her", "they_them"],
      relationship_type: [
        "any",
        "parent",
        "grandparent",
        "aunt_uncle",
        "sibling",
        "spouse",
        "other",
      ],
      session_status: [
        "scheduled",
        "sent",
        "in_progress",
        "completed",
        "skipped",
        "missed",
      ],
      topic_preference: ["focus", "ease_off", "avoid"],
    },
  },
} as const
