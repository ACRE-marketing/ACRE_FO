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
      agent_materials: {
        Row: {
          agent_id: string
          created_at: string
          description: string | null
          file_url: string
          id: string
          material_type: string
          sort_order: number | null
          title: string
        }
        Insert: {
          agent_id: string
          created_at?: string
          description?: string | null
          file_url: string
          id?: string
          material_type: string
          sort_order?: number | null
          title?: string
        }
        Update: {
          agent_id?: string
          created_at?: string
          description?: string | null
          file_url?: string
          id?: string
          material_type?: string
          sort_order?: number | null
          title?: string
        }
        Relationships: []
      }
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
      event_rsvps: {
        Row: {
          created_at: string
          event_id: string
          id: string
          status: string
          user_id: string
        }
        Insert: {
          created_at?: string
          event_id: string
          id?: string
          status?: string
          user_id: string
        }
        Update: {
          created_at?: string
          event_id?: string
          id?: string
          status?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "event_rsvps_event_id_fkey"
            columns: ["event_id"]
            isOneToOne: false
            referencedRelation: "events"
            referencedColumns: ["id"]
          },
        ]
      }
      events: {
        Row: {
          area: string | null
          capacity: number | null
          created_at: string
          created_by: string | null
          description: string | null
          end_time: string | null
          event_type: string
          external_rsvp_url: string | null
          id: string
          is_mandatory: boolean | null
          is_online: boolean | null
          is_recurring: boolean | null
          location: string | null
          lunch_included: boolean | null
          meeting_link: string | null
          recurrence_rule: string | null
          rsvp_deadline: string | null
          speaker: string | null
          start_time: string
          title: string
          zoom_password: string | null
        }
        Insert: {
          area?: string | null
          capacity?: number | null
          created_at?: string
          created_by?: string | null
          description?: string | null
          end_time?: string | null
          event_type?: string
          external_rsvp_url?: string | null
          id?: string
          is_mandatory?: boolean | null
          is_online?: boolean | null
          is_recurring?: boolean | null
          location?: string | null
          lunch_included?: boolean | null
          meeting_link?: string | null
          recurrence_rule?: string | null
          rsvp_deadline?: string | null
          speaker?: string | null
          start_time: string
          title: string
          zoom_password?: string | null
        }
        Update: {
          area?: string | null
          capacity?: number | null
          created_at?: string
          created_by?: string | null
          description?: string | null
          end_time?: string | null
          event_type?: string
          external_rsvp_url?: string | null
          id?: string
          is_mandatory?: boolean | null
          is_online?: boolean | null
          is_recurring?: boolean | null
          location?: string | null
          lunch_included?: boolean | null
          meeting_link?: string | null
          recurrence_rule?: string | null
          rsvp_deadline?: string | null
          speaker?: string | null
          start_time?: string
          title?: string
          zoom_password?: string | null
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
      link_clicks: {
        Row: {
          clicked_at: string
          id: string
          link_id: string
          referer: string | null
          user_agent: string | null
        }
        Insert: {
          clicked_at?: string
          id?: string
          link_id: string
          referer?: string | null
          user_agent?: string | null
        }
        Update: {
          clicked_at?: string
          id?: string
          link_id?: string
          referer?: string | null
          user_agent?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "link_clicks_link_id_fkey"
            columns: ["link_id"]
            isOneToOne: false
            referencedRelation: "tracking_links"
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
          bio: string | null
          created_at: string
          email: string | null
          headshot_url: string | null
          id: string
          languages: string | null
          name: string
          phone: string | null
          role: Database["public"]["Enums"]["app_role"]
          specialties: string | null
          wechat: string | null
        }
        Insert: {
          bio?: string | null
          created_at?: string
          email?: string | null
          headshot_url?: string | null
          id: string
          languages?: string | null
          name?: string
          phone?: string | null
          role?: Database["public"]["Enums"]["app_role"]
          specialties?: string | null
          wechat?: string | null
        }
        Update: {
          bio?: string | null
          created_at?: string
          email?: string | null
          headshot_url?: string | null
          id?: string
          languages?: string | null
          name?: string
          phone?: string | null
          role?: Database["public"]["Enums"]["app_role"]
          specialties?: string | null
          wechat?: string | null
        }
        Relationships: []
      }
      resource_documents: {
        Row: {
          category: string
          created_at: string
          created_by: string | null
          description: string | null
          file_url: string
          id: string
          title: string
        }
        Insert: {
          category?: string
          created_at?: string
          created_by?: string | null
          description?: string | null
          file_url: string
          id?: string
          title: string
        }
        Update: {
          category?: string
          created_at?: string
          created_by?: string | null
          description?: string | null
          file_url?: string
          id?: string
          title?: string
        }
        Relationships: []
      }
      tracking_links: {
        Row: {
          agent_id: string
          click_count: number
          created_at: string
          id: string
          listing_id: string | null
          short_code: string
          title: string
        }
        Insert: {
          agent_id: string
          click_count?: number
          created_at?: string
          id?: string
          listing_id?: string | null
          short_code: string
          title?: string
        }
        Update: {
          agent_id?: string
          click_count?: number
          created_at?: string
          id?: string
          listing_id?: string | null
          short_code?: string
          title?: string
        }
        Relationships: [
          {
            foreignKeyName: "tracking_links_listing_id_fkey"
            columns: ["listing_id"]
            isOneToOne: false
            referencedRelation: "listings"
            referencedColumns: ["id"]
          },
        ]
      }
      training_videos: {
        Row: {
          category: string
          created_at: string
          created_by: string | null
          description: string | null
          duration_seconds: number | null
          id: string
          thumbnail_url: string | null
          title: string
          video_url: string
        }
        Insert: {
          category?: string
          created_at?: string
          created_by?: string | null
          description?: string | null
          duration_seconds?: number | null
          id?: string
          thumbnail_url?: string | null
          title: string
          video_url: string
        }
        Update: {
          category?: string
          created_at?: string
          created_by?: string | null
          description?: string | null
          duration_seconds?: number | null
          id?: string
          thumbnail_url?: string | null
          title?: string
          video_url?: string
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
      vendors: {
        Row: {
          category: string
          created_at: string
          created_by: string | null
          description: string | null
          email: string | null
          id: string
          logo_url: string | null
          name: string
          phone: string | null
          specialties: string | null
          wechat_qr_url: string | null
        }
        Insert: {
          category: string
          created_at?: string
          created_by?: string | null
          description?: string | null
          email?: string | null
          id?: string
          logo_url?: string | null
          name: string
          phone?: string | null
          specialties?: string | null
          wechat_qr_url?: string | null
        }
        Update: {
          category?: string
          created_at?: string
          created_by?: string | null
          description?: string | null
          email?: string | null
          id?: string
          logo_url?: string | null
          name?: string
          phone?: string | null
          specialties?: string | null
          wechat_qr_url?: string | null
        }
        Relationships: []
      }
      video_progress: {
        Row: {
          completed: boolean | null
          id: string
          progress_seconds: number | null
          updated_at: string
          user_id: string
          video_id: string
        }
        Insert: {
          completed?: boolean | null
          id?: string
          progress_seconds?: number | null
          updated_at?: string
          user_id: string
          video_id: string
        }
        Update: {
          completed?: boolean | null
          id?: string
          progress_seconds?: number | null
          updated_at?: string
          user_id?: string
          video_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "video_progress_video_id_fkey"
            columns: ["video_id"]
            isOneToOne: false
            referencedRelation: "training_videos"
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
