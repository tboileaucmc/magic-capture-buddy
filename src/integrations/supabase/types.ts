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
    PostgrestVersion: "14.18"
  }
  public: {
    Tables: {
      invitation_sends: {
        Row: {
          completed_at: string | null
          created_at: string
          error_message: string | null
          event_id: string | null
          id: string
          mission_end: string
          mission_id: string
          mission_start: string
          mission_title: string
          recipients: Json
          status: string
          user_id: string
        }
        Insert: {
          completed_at?: string | null
          created_at?: string
          error_message?: string | null
          event_id?: string | null
          id?: string
          mission_end: string
          mission_id: string
          mission_start: string
          mission_title: string
          recipients?: Json
          status?: string
          user_id: string
        }
        Update: {
          completed_at?: string | null
          created_at?: string
          error_message?: string | null
          event_id?: string | null
          id?: string
          mission_end?: string
          mission_id?: string
          mission_start?: string
          mission_title?: string
          recipients?: Json
          status?: string
          user_id?: string
        }
        Relationships: []
      }
      mission_history: {
        Row: {
          action: string
          after: Json | null
          before: Json | null
          created_at: string
          date_iso: string | null
          id: string
          mission_id: string
          technicians: string | null
          title: string | null
          user_email: string | null
          user_id: string | null
        }
        Insert: {
          action: string
          after?: Json | null
          before?: Json | null
          created_at?: string
          date_iso?: string | null
          id?: string
          mission_id: string
          technicians?: string | null
          title?: string | null
          user_email?: string | null
          user_id?: string | null
        }
        Update: {
          action?: string
          after?: Json | null
          before?: Json | null
          created_at?: string
          date_iso?: string | null
          id?: string
          mission_id?: string
          technicians?: string | null
          title?: string | null
          user_email?: string | null
          user_id?: string | null
        }
        Relationships: []
      }
      planning_state: {
        Row: {
          broadcast_list: string[]
          data: Json
          id: string
          updated_at: string
        }
        Insert: {
          broadcast_list?: string[]
          data?: Json
          id?: string
          updated_at?: string
        }
        Update: {
          broadcast_list?: string[]
          data?: Json
          id?: string
          updated_at?: string
        }
        Relationships: []
      }
      planning_usage_daily: {
        Row: {
          database_bytes: number
          day: string
          exception_count: number
          history_table_bytes: number
          measured_at: string
          mission_count: number
          planning_json_bytes: number
          planning_table_bytes: number
          recurring_count: number
        }
        Insert: {
          database_bytes: number
          day: string
          exception_count: number
          history_table_bytes: number
          measured_at?: string
          mission_count: number
          planning_json_bytes: number
          planning_table_bytes: number
          recurring_count: number
        }
        Update: {
          database_bytes?: number
          day?: string
          exception_count?: number
          history_table_bytes?: number
          measured_at?: string
          mission_count?: number
          planning_json_bytes?: number
          planning_table_bytes?: number
          recurring_count?: number
        }
        Relationships: []
      }
      technician_profiles: {
        Row: {
          btp_card: string | null
          equipment: Json
          extension_3cx: string | null
          fuel_card: string | null
          last_ct: string | null
          phone: string | null
          plate: string | null
          technician_id: string
          trainings: Json
          updated_at: string
          vehicle: string | null
        }
        Insert: {
          btp_card?: string | null
          equipment?: Json
          extension_3cx?: string | null
          fuel_card?: string | null
          last_ct?: string | null
          phone?: string | null
          plate?: string | null
          technician_id: string
          trainings?: Json
          updated_at?: string
          vehicle?: string | null
        }
        Update: {
          btp_card?: string | null
          equipment?: Json
          extension_3cx?: string | null
          fuel_card?: string | null
          last_ct?: string | null
          phone?: string | null
          plate?: string | null
          technician_id?: string
          trainings?: Json
          updated_at?: string
          vehicle?: string | null
        }
        Relationships: []
      }
      user_roles: {
        Row: {
          id: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Insert: {
          id?: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Update: {
          id?: string
          role?: Database["public"]["Enums"]["app_role"]
          user_id?: string
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      admin_delete_user: { Args: { _target: string }; Returns: undefined }
      admin_list_users: {
        Args: never
        Returns: {
          email: string
          role: string
          user_id: string
        }[]
      }
      admin_planning_usage: { Args: never; Returns: Json }
      admin_set_editor: {
        Args: { _can_edit: boolean; _target: string }
        Returns: undefined
      }
      admin_set_role: {
        Args: { _role: string; _target: string }
        Returns: undefined
      }
      can_edit: { Args: { _user_id: string }; Returns: boolean }
      capture_planning_usage: { Args: never; Returns: undefined }
      get_technician_profile: {
        Args: { _technician_id: string }
        Returns: Json
      }
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
      is_planning_signup_email: { Args: { _email: string }; Returns: boolean }
      is_support_editor: { Args: { _user_id: string }; Returns: boolean }
      planning_changed_missions: {
        Args: { _new: Json; _old: Json }
        Returns: {
          after_mission: Json
          before_mission: Json
        }[]
      }
      read_planning_snapshot: { Args: never; Returns: Json }
      read_planning_version: { Args: never; Returns: string }
      support_technician_ids: { Args: { _data: Json }; Returns: Json }
      write_planning_delta: {
        Args: { _next_version: string; _patch: Json; _previous_version: string }
        Returns: string
      }
      write_planning_snapshot: {
        Args: { _data: Json; _next_version: string; _previous_version: string }
        Returns: string
      }
    }
    Enums: {
      app_role: "admin" | "editor" | "support_editor"
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
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never) = never,
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
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never) = never,
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
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never) = never,
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
  EnumName extends (DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never) = never,
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
  CompositeTypeName extends (PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never) = never,
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
      app_role: ["admin", "editor", "support_editor"],
    },
  },
} as const
