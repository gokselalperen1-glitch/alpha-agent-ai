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
    PostgrestVersion: "13.0.5"
  }
  public: {
    Tables: {
      agents: {
        Row: {
          created_at: string
          description: string | null
          id: string
          is_paper_trading: boolean
          name: string
          status: Database["public"]["Enums"]["agent_status"]
          updated_at: string
          user_id: string
          workflow_json: Json
        }
        Insert: {
          created_at?: string
          description?: string | null
          id?: string
          is_paper_trading?: boolean
          name: string
          status?: Database["public"]["Enums"]["agent_status"]
          updated_at?: string
          user_id: string
          workflow_json?: Json
        }
        Update: {
          created_at?: string
          description?: string | null
          id?: string
          is_paper_trading?: boolean
          name?: string
          status?: Database["public"]["Enums"]["agent_status"]
          updated_at?: string
          user_id?: string
          workflow_json?: Json
        }
        Relationships: []
      }
      alerts: {
        Row: {
          agent_id: string | null
          created_at: string
          id: string
          is_read: boolean
          message: string
          severity: string
          title: string
          user_id: string
        }
        Insert: {
          agent_id?: string | null
          created_at?: string
          id?: string
          is_read?: boolean
          message: string
          severity?: string
          title: string
          user_id: string
        }
        Update: {
          agent_id?: string | null
          created_at?: string
          id?: string
          is_read?: boolean
          message?: string
          severity?: string
          title?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "alerts_agent_id_fkey"
            columns: ["agent_id"]
            isOneToOne: false
            referencedRelation: "agents"
            referencedColumns: ["id"]
          },
        ]
      }
      api_provider_keys: {
        Row: {
          api_key_encrypted: string
          created_at: string | null
          id: string
          is_active: boolean | null
          provider: string
          rate_limit_remaining: number | null
          rate_limit_reset_at: string | null
          updated_at: string | null
          user_id: string
        }
        Insert: {
          api_key_encrypted: string
          created_at?: string | null
          id?: string
          is_active?: boolean | null
          provider: string
          rate_limit_remaining?: number | null
          rate_limit_reset_at?: string | null
          updated_at?: string | null
          user_id: string
        }
        Update: {
          api_key_encrypted?: string
          created_at?: string | null
          id?: string
          is_active?: boolean | null
          provider?: string
          rate_limit_remaining?: number | null
          rate_limit_reset_at?: string | null
          updated_at?: string | null
          user_id?: string
        }
        Relationships: []
      }
      exchange_connections: {
        Row: {
          api_key_encrypted: string
          api_secret_encrypted: string
          created_at: string
          exchange_name: string
          health_status: string | null
          id: string
          is_active: boolean
          is_testnet: boolean | null
          last_health_check: string | null
          passphrase_encrypted: string | null
          permissions: Json | null
          rate_limit_config: Json | null
          supported_pairs: string[] | null
          updated_at: string
          user_id: string
        }
        Insert: {
          api_key_encrypted: string
          api_secret_encrypted: string
          created_at?: string
          exchange_name: string
          health_status?: string | null
          id?: string
          is_active?: boolean
          is_testnet?: boolean | null
          last_health_check?: string | null
          passphrase_encrypted?: string | null
          permissions?: Json | null
          rate_limit_config?: Json | null
          supported_pairs?: string[] | null
          updated_at?: string
          user_id: string
        }
        Update: {
          api_key_encrypted?: string
          api_secret_encrypted?: string
          created_at?: string
          exchange_name?: string
          health_status?: string | null
          id?: string
          is_active?: boolean
          is_testnet?: boolean | null
          last_health_check?: string | null
          passphrase_encrypted?: string | null
          permissions?: Json | null
          rate_limit_config?: Json | null
          supported_pairs?: string[] | null
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      executions: {
        Row: {
          agent_id: string
          completed_at: string | null
          error_message: string | null
          id: string
          logs: Json | null
          started_at: string
          status: Database["public"]["Enums"]["execution_status"]
          user_id: string
        }
        Insert: {
          agent_id: string
          completed_at?: string | null
          error_message?: string | null
          id?: string
          logs?: Json | null
          started_at?: string
          status?: Database["public"]["Enums"]["execution_status"]
          user_id: string
        }
        Update: {
          agent_id?: string
          completed_at?: string | null
          error_message?: string | null
          id?: string
          logs?: Json | null
          started_at?: string
          status?: Database["public"]["Enums"]["execution_status"]
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "executions_agent_id_fkey"
            columns: ["agent_id"]
            isOneToOne: false
            referencedRelation: "agents"
            referencedColumns: ["id"]
          },
        ]
      }
      portfolios: {
        Row: {
          asset_symbol: string
          average_buy_price: number | null
          current_value: number | null
          exchange_connection_id: string | null
          id: string
          last_updated: string
          quantity: number
          user_id: string
        }
        Insert: {
          asset_symbol: string
          average_buy_price?: number | null
          current_value?: number | null
          exchange_connection_id?: string | null
          id?: string
          last_updated?: string
          quantity?: number
          user_id: string
        }
        Update: {
          asset_symbol?: string
          average_buy_price?: number | null
          current_value?: number | null
          exchange_connection_id?: string | null
          id?: string
          last_updated?: string
          quantity?: number
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "portfolios_exchange_connection_id_fkey"
            columns: ["exchange_connection_id"]
            isOneToOne: false
            referencedRelation: "exchange_connections"
            referencedColumns: ["id"]
          },
        ]
      }
      profiles: {
        Row: {
          avatar_url: string | null
          created_at: string
          full_name: string | null
          id: string
          investment_goals: string | null
          investor_type: string | null
          risk_tolerance: Database["public"]["Enums"]["risk_tolerance"] | null
          updated_at: string
        }
        Insert: {
          avatar_url?: string | null
          created_at?: string
          full_name?: string | null
          id: string
          investment_goals?: string | null
          investor_type?: string | null
          risk_tolerance?: Database["public"]["Enums"]["risk_tolerance"] | null
          updated_at?: string
        }
        Update: {
          avatar_url?: string | null
          created_at?: string
          full_name?: string | null
          id?: string
          investment_goals?: string | null
          investor_type?: string | null
          risk_tolerance?: Database["public"]["Enums"]["risk_tolerance"] | null
          updated_at?: string
        }
        Relationships: []
      }
      transactions: {
        Row: {
          agent_id: string | null
          asset_symbol: string
          exchange_connection_id: string | null
          executed_at: string
          execution_id: string | null
          fees: number | null
          id: string
          is_paper_trade: boolean
          order_type: Database["public"]["Enums"]["order_type"]
          price: number
          quantity: number
          total_value: number
          transaction_type: Database["public"]["Enums"]["transaction_type"]
          user_id: string
        }
        Insert: {
          agent_id?: string | null
          asset_symbol: string
          exchange_connection_id?: string | null
          executed_at?: string
          execution_id?: string | null
          fees?: number | null
          id?: string
          is_paper_trade?: boolean
          order_type: Database["public"]["Enums"]["order_type"]
          price: number
          quantity: number
          total_value: number
          transaction_type: Database["public"]["Enums"]["transaction_type"]
          user_id: string
        }
        Update: {
          agent_id?: string | null
          asset_symbol?: string
          exchange_connection_id?: string | null
          executed_at?: string
          execution_id?: string | null
          fees?: number | null
          id?: string
          is_paper_trade?: boolean
          order_type?: Database["public"]["Enums"]["order_type"]
          price?: number
          quantity?: number
          total_value?: number
          transaction_type?: Database["public"]["Enums"]["transaction_type"]
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "transactions_agent_id_fkey"
            columns: ["agent_id"]
            isOneToOne: false
            referencedRelation: "agents"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "transactions_exchange_connection_id_fkey"
            columns: ["exchange_connection_id"]
            isOneToOne: false
            referencedRelation: "exchange_connections"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "transactions_execution_id_fkey"
            columns: ["execution_id"]
            isOneToOne: false
            referencedRelation: "executions"
            referencedColumns: ["id"]
          },
        ]
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
      workflows: {
        Row: {
          agent_id: string
          created_at: string
          edges: Json
          id: string
          nodes: Json
          updated_at: string
          version: number
        }
        Insert: {
          agent_id: string
          created_at?: string
          edges?: Json
          id?: string
          nodes?: Json
          updated_at?: string
          version?: number
        }
        Update: {
          agent_id?: string
          created_at?: string
          edges?: Json
          id?: string
          nodes?: Json
          updated_at?: string
          version?: number
        }
        Relationships: [
          {
            foreignKeyName: "workflows_agent_id_fkey"
            columns: ["agent_id"]
            isOneToOne: false
            referencedRelation: "agents"
            referencedColumns: ["id"]
          },
        ]
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
      agent_status: "draft" | "active" | "paused" | "error"
      app_role: "admin" | "user"
      execution_status:
        | "pending"
        | "running"
        | "completed"
        | "failed"
        | "cancelled"
      order_type: "market" | "limit"
      risk_tolerance: "conservative" | "moderate" | "aggressive"
      transaction_type: "buy" | "sell"
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
      agent_status: ["draft", "active", "paused", "error"],
      app_role: ["admin", "user"],
      execution_status: [
        "pending",
        "running",
        "completed",
        "failed",
        "cancelled",
      ],
      order_type: ["market", "limit"],
      risk_tolerance: ["conservative", "moderate", "aggressive"],
      transaction_type: ["buy", "sell"],
    },
  },
} as const
