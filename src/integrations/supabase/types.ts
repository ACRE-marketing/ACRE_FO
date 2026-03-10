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
      client_attachments: {
        Row: {
          client_id: string
          created_at: string
          file_url: string
          id: string
        }
        Insert: {
          client_id: string
          created_at?: string
          file_url: string
          id?: string
        }
        Update: {
          client_id?: string
          created_at?: string
          file_url?: string
          id?: string
        }
        Relationships: [
          {
            foreignKeyName: "client_attachments_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "clients"
            referencedColumns: ["id"]
          },
        ]
      }
      clients: {
        Row: {
          agent_id: string
          budget: string | null
          business_type: string | null
          client_occupation: string | null
          contact_channel: string | null
          contact_date: string | null
          created_at: string
          email: string | null
          id: string
          last_contact_at: string | null
          name: string
          needs_summary: string | null
          next_followup_date: string | null
          notes: string | null
          phone: string | null
          preferred_unit_type: string | null
          reminder_interval_days: number | null
          source: string | null
          stage: Database["public"]["Enums"]["client_stage"]
          target_area: string | null
          wechat: string | null
        }
        Insert: {
          agent_id: string
          budget?: string | null
          business_type?: string | null
          client_occupation?: string | null
          contact_channel?: string | null
          contact_date?: string | null
          created_at?: string
          email?: string | null
          id?: string
          last_contact_at?: string | null
          name: string
          needs_summary?: string | null
          next_followup_date?: string | null
          notes?: string | null
          phone?: string | null
          preferred_unit_type?: string | null
          reminder_interval_days?: number | null
          source?: string | null
          stage?: Database["public"]["Enums"]["client_stage"]
          target_area?: string | null
          wechat?: string | null
        }
        Update: {
          agent_id?: string
          budget?: string | null
          business_type?: string | null
          client_occupation?: string | null
          contact_channel?: string | null
          contact_date?: string | null
          created_at?: string
          email?: string | null
          id?: string
          last_contact_at?: string | null
          name?: string
          needs_summary?: string | null
          next_followup_date?: string | null
          notes?: string | null
          phone?: string | null
          preferred_unit_type?: string | null
          reminder_interval_days?: number | null
          source?: string | null
          stage?: Database["public"]["Enums"]["client_stage"]
          target_area?: string | null
          wechat?: string | null
        }
        Relationships: []
      }
      followup_logs: {
        Row: {
          action: string
          client_id: string
          created_at: string
          id: string
        }
        Insert: {
          action: string
          client_id: string
          created_at?: string
          id?: string
        }
        Update: {
          action?: string
          client_id?: string
          created_at?: string
          id?: string
        }
        Relationships: [
          {
            foreignKeyName: "followup_logs_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "clients"
            referencedColumns: ["id"]
          },
        ]
      }
      listings: {
        Row: {
          address: string | null
          amenities: Json | null
          architecture: string | null
          area: Database["public"]["Enums"]["listing_area"]
          area_info: string | null
          baths: number | null
          beds: number | null
          completion_date: string | null
          cover_image: string | null
          created_at: string
          created_by: string | null
          description: string | null
          highlights: Json | null
          id: string
          interior_design: string | null
          investment_info: string | null
          listing_type: Database["public"]["Enums"]["listing_type"]
          price: number | null
          promo_tag: Database["public"]["Enums"]["promo_tag"] | null
          property_type: string | null
          schools: string | null
          source_url: string | null
          sponsor: string | null
          status: Database["public"]["Enums"]["listing_status"]
          summary: string | null
          target_buyers: string | null
          title: string
          total_floors: number | null
          total_units: number | null
          transportation: string | null
          unit_types: Json | null
          updated_at: string
          views_description: string | null
        }
        Insert: {
          address?: string | null
          amenities?: Json | null
          architecture?: string | null
          area?: Database["public"]["Enums"]["listing_area"]
          area_info?: string | null
          baths?: number | null
          beds?: number | null
          completion_date?: string | null
          cover_image?: string | null
          created_at?: string
          created_by?: string | null
          description?: string | null
          highlights?: Json | null
          id?: string
          interior_design?: string | null
          investment_info?: string | null
          listing_type?: Database["public"]["Enums"]["listing_type"]
          price?: number | null
          promo_tag?: Database["public"]["Enums"]["promo_tag"] | null
          property_type?: string | null
          schools?: string | null
          source_url?: string | null
          sponsor?: string | null
          status?: Database["public"]["Enums"]["listing_status"]
          summary?: string | null
          target_buyers?: string | null
          title: string
          total_floors?: number | null
          total_units?: number | null
          transportation?: string | null
          unit_types?: Json | null
          updated_at?: string
          views_description?: string | null
        }
        Update: {
          address?: string | null
          amenities?: Json | null
          architecture?: string | null
          area?: Database["public"]["Enums"]["listing_area"]
          area_info?: string | null
          baths?: number | null
          beds?: number | null
          completion_date?: string | null
          cover_image?: string | null
          created_at?: string
          created_by?: string | null
          description?: string | null
          highlights?: Json | null
          id?: string
          interior_design?: string | null
          investment_info?: string | null
          listing_type?: Database["public"]["Enums"]["listing_type"]
          price?: number | null
          promo_tag?: Database["public"]["Enums"]["promo_tag"] | null
          property_type?: string | null
          schools?: string | null
          source_url?: string | null
          sponsor?: string | null
          status?: Database["public"]["Enums"]["listing_status"]
          summary?: string | null
          target_buyers?: string | null
          title?: string
          total_floors?: number | null
          total_units?: number | null
          transportation?: string | null
          unit_types?: Json | null
          updated_at?: string
          views_description?: string | null
        }
        Relationships: []
      }
      notifications: {
        Row: {
          created_at: string
          id: string
          is_read: boolean
          message: string
          type: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          is_read?: boolean
          message: string
          type?: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          is_read?: boolean
          message?: string
          type?: string
          user_id?: string
        }
        Relationships: []
      }
      profiles: {
        Row: {
          created_at: string
          email: string | null
          id: string
          name: string
          role: Database["public"]["Enums"]["app_role"]
        }
        Insert: {
          created_at?: string
          email?: string | null
          id: string
          name?: string
          role?: Database["public"]["Enums"]["app_role"]
        }
        Update: {
          created_at?: string
          email?: string | null
          id?: string
          name?: string
          role?: Database["public"]["Enums"]["app_role"]
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
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
    }
    Enums: {
      app_role: "pm" | "agent"
      client_stage: "active" | "opportunity" | "lost" | "pending"
      listing_area:
        | "LIC"
        | "Manhattan"
        | "Jersey City"
        | "Long Island"
        | "Queens"
        | "Flushing"
        | "Brooklyn"
        | "Bronx"
        | "Staten Island"
        | "Astoria"
        | "Williamsburg"
        | "Hoboken"
        | "Other"
      listing_status: "active" | "inactive"
      listing_type: "company_exclusive" | "featured" | "agent_exclusive"
      promo_tag: "limited_offer" | "rare" | "new_development"
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
      app_role: ["pm", "agent"],
      client_stage: ["active", "opportunity", "lost", "pending"],
      listing_area: [
        "LIC",
        "Manhattan",
        "Jersey City",
        "Long Island",
        "Queens",
        "Flushing",
        "Brooklyn",
        "Bronx",
        "Staten Island",
        "Astoria",
        "Williamsburg",
        "Hoboken",
        "Other",
      ],
      listing_status: ["active", "inactive"],
      listing_type: ["company_exclusive", "featured", "agent_exclusive"],
      promo_tag: ["limited_offer", "rare", "new_development"],
    },
  },
} as const
