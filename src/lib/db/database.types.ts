export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  graphql_public: {
    Tables: {
      [_ in never]: never
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      graphql: {
        Args: {
          operationName?: string
          query?: string
          variables?: Json
          extensions?: Json
        }
        Returns: Json
      }
    }
    Enums: {
      [_ in never]: never
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
  public: {
    Tables: {
      bases: {
        Row: {
          base_link: string
          id: number
          layout_link: string
          level: number
        }
        Insert: {
          base_link: string
          id?: number
          layout_link: string
          level: number
        }
        Update: {
          base_link?: string
          id?: number
          layout_link?: string
          level?: number
        }
        Relationships: []
      }
      clans: {
        Row: {
          attacks_requirements: number | null
          clan_code: string
          clan_current_user: Json | null
          clan_data: Json | null
          clan_level: number
          clan_name: string
          clan_tag: string
          clangames_requirements: number | null
          donations_requirements: number | null
          id: number
        }
        Insert: {
          attacks_requirements?: number | null
          clan_code: string
          clan_current_user?: Json | null
          clan_data?: Json | null
          clan_level: number
          clan_name: string
          clan_tag: string
          clangames_requirements?: number | null
          donations_requirements?: number | null
          id?: number
        }
        Update: {
          attacks_requirements?: number | null
          clan_code?: string
          clan_current_user?: Json | null
          clan_data?: Json | null
          clan_level?: number
          clan_name?: string
          clan_tag?: string
          clangames_requirements?: number | null
          donations_requirements?: number | null
          id?: number
        }
        Relationships: []
      }
      coc_accounts: {
        Row: {
          account_tag: string
          discord_id: string
          id: number
        }
        Insert: {
          account_tag: string
          discord_id: string
          id?: number
        }
        Update: {
          account_tag?: string
          discord_id?: string
          id?: number
        }
        Relationships: [
          {
            foreignKeyName: "coc_accounts_discord_id_fkey"
            columns: ["discord_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["discord_id"]
          },
        ]
      }
      cwl_applications: {
        Row: {
          account_clan: string
          account_name: string
          account_tag: string
          account_weight: number
          applied_at: string
          assigned_clan: string
          discord_id: string
          discord_username: string
          id: number
          month: string
          preference_num: number
          year: number
        }
        Insert: {
          account_clan: string
          account_name: string
          account_tag: string
          account_weight: number
          applied_at?: string
          assigned_clan: string
          discord_id: string
          discord_username: string
          id?: number
          month: string
          preference_num: number
          year: number
        }
        Update: {
          account_clan?: string
          account_name?: string
          account_tag?: string
          account_weight?: number
          applied_at?: string
          assigned_clan?: string
          discord_id?: string
          discord_username?: string
          id?: number
          month?: string
          preference_num?: number
          year?: number
        }
        Relationships: [
          {
            foreignKeyName: "cwl_applications_assigned_clan_fkey"
            columns: ["assigned_clan"]
            isOneToOne: false
            referencedRelation: "cwl_clans"
            referencedColumns: ["clan_tag"]
          },
        ]
      }
      cwl_clans: {
        Row: {
          clan_name: string
          clan_tag: string
          id: number
        }
        Insert: {
          clan_name: string
          clan_tag: string
          id?: number
        }
        Update: {
          clan_name?: string
          clan_tag?: string
          id?: number
        }
        Relationships: []
      }
      join_applications: {
        Row: {
          account_tag: string
          created_at: string
          discord_id: string
          discord_username: string
          id: number
          player_data: Json
          status: Database["public"]["Enums"]["join_status"]
        }
        Insert: {
          account_tag: string
          created_at: string
          discord_id: string
          discord_username: string
          id?: number
          player_data: Json
          status: Database["public"]["Enums"]["join_status"]
        }
        Update: {
          account_tag?: string
          created_at?: string
          discord_id?: string
          discord_username?: string
          id?: number
          player_data?: Json
          status?: Database["public"]["Enums"]["join_status"]
        }
        Relationships: [
          {
            foreignKeyName: "join_applications_discord_id_fkey"
            columns: ["discord_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["discord_id"]
          },
        ]
      }
      role_permissions: {
        Row: {
          id: number
          permission: Database["public"]["Enums"]["app_permission"]
          role: Database["public"]["Enums"]["app_role"]
        }
        Insert: {
          id?: number
          permission: Database["public"]["Enums"]["app_permission"]
          role: Database["public"]["Enums"]["app_role"]
        }
        Update: {
          id?: number
          permission?: Database["public"]["Enums"]["app_permission"]
          role?: Database["public"]["Enums"]["app_role"]
        }
        Relationships: []
      }
      settings: {
        Row: {
          key: string
          type: string
          value: string
        }
        Insert: {
          key: string
          type: string
          value: string
        }
        Update: {
          key?: string
          type?: string
          value?: string
        }
        Relationships: []
      }
      user_roles: {
        Row: {
          id: number
          role: Database["public"]["Enums"]["app_role"]
          user_id: number
        }
        Insert: {
          id?: number
          role: Database["public"]["Enums"]["app_role"]
          user_id: number
        }
        Update: {
          id?: number
          role?: Database["public"]["Enums"]["app_role"]
          user_id?: number
        }
        Relationships: [
          {
            foreignKeyName: "user_roles_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      users: {
        Row: {
          created_at: string
          discord_id: string
          id: number
          is_active: boolean
        }
        Insert: {
          created_at?: string
          discord_id: string
          id?: number
          is_active: boolean
        }
        Update: {
          created_at?: string
          discord_id?: string
          id?: number
          is_active?: boolean
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      current_discord_id: {
        Args: Record<PropertyKey, never>
        Returns: string
      }
      custom_access_token_hook: {
        Args: { event: Json }
        Returns: Json
      }
      has_any_role: {
        Args: { roles: string[] }
        Returns: boolean
      }
    }
    Enums: {
      app_permission:
        | "read.all"
        | "write.all"
        | "read.cwl_applications"
        | "write.cwl_applications"
        | "read.join_applications"
        | "write.join_applications"
        | "read.rules"
        | "write.rules"
        | "read.settings"
        | "write.settings"
        | "read.users"
        | "write.users"
        | "read.clans"
        | "write.clans"
        | "read.bases"
        | "write.bases"
        | "read.coc_accounts"
        | "write.coc_accounts"
      app_role:
        | "admin"
        | "cwl_manager"
        | "join_manager"
        | "clan_manager"
        | "user_manager"
        | "rule_manager"
        | "setting_manager"
        | "base_manager"
        | "coc_account_manager"
      join_status: "accepted" | "rejected" | "pending"
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
}

type DefaultSchema = Database[Extract<keyof Database, "public">]

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    | { schema: keyof Database },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof Database
  }
    ? keyof (Database[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        Database[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never = never,
> = DefaultSchemaTableNameOrOptions extends { schema: keyof Database }
  ? (Database[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
      Database[DefaultSchemaTableNameOrOptions["schema"]]["Views"])[TableName] extends {
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
    | { schema: keyof Database },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof Database
  }
    ? keyof Database[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends { schema: keyof Database }
  ? Database[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
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
    | { schema: keyof Database },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof Database
  }
    ? keyof Database[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends { schema: keyof Database }
  ? Database[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
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
    | { schema: keyof Database },
  EnumName extends DefaultSchemaEnumNameOrOptions extends {
    schema: keyof Database
  }
    ? keyof Database[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never = never,
> = DefaultSchemaEnumNameOrOptions extends { schema: keyof Database }
  ? Database[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema["Enums"]
    ? DefaultSchema["Enums"][DefaultSchemaEnumNameOrOptions]
    : never

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    | keyof DefaultSchema["CompositeTypes"]
    | { schema: keyof Database },
  CompositeTypeName extends PublicCompositeTypeNameOrOptions extends {
    schema: keyof Database
  }
    ? keyof Database[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never = never,
> = PublicCompositeTypeNameOrOptions extends { schema: keyof Database }
  ? Database[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
    ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never

export const Constants = {
  graphql_public: {
    Enums: {},
  },
  public: {
    Enums: {
      app_permission: [
        "read.all",
        "write.all",
        "read.cwl_applications",
        "write.cwl_applications",
        "read.join_applications",
        "write.join_applications",
        "read.rules",
        "write.rules",
        "read.settings",
        "write.settings",
        "read.users",
        "write.users",
        "read.clans",
        "write.clans",
        "read.bases",
        "write.bases",
        "read.coc_accounts",
        "write.coc_accounts",
      ],
      app_role: [
        "admin",
        "cwl_manager",
        "join_manager",
        "clan_manager",
        "user_manager",
        "rule_manager",
        "setting_manager",
        "base_manager",
        "coc_account_manager",
      ],
      join_status: ["accepted", "rejected", "pending"],
    },
  },
} as const

