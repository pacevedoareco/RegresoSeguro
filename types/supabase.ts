export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  public: {
    Tables: {
      driver_profiles: {
        Row: {
          availability: Database["public"]["Enums"]["driver_availability"]
          created_at: string
          current_lat: number | null
          current_lng: number | null
          dni: string
          id: string
          is_active: boolean
          license_category: string
          license_number: string
          location_updated_at: string | null
          updated_at: string
        }
        Insert: {
          availability?: Database["public"]["Enums"]["driver_availability"]
          created_at?: string
          current_lat?: number | null
          current_lng?: number | null
          dni: string
          id: string
          is_active?: boolean
          license_category: string
          license_number: string
          location_updated_at?: string | null
          updated_at?: string
        }
        Update: {
          availability?: Database["public"]["Enums"]["driver_availability"]
          created_at?: string
          current_lat?: number | null
          current_lng?: number | null
          dni?: string
          id?: string
          is_active?: boolean
          license_category?: string
          license_number?: string
          location_updated_at?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "driver_profiles_id_fkey"
            columns: ["id"]
            isOneToOne: true
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      pricing_config: {
        Row: {
          id: number
          price_per_km: number
          updated_at: string
          updated_by: string
        }
        Insert: {
          id: number
          price_per_km: number
          updated_at?: string
          updated_by: string
        }
        Update: {
          id?: number
          price_per_km?: number
          updated_at?: string
          updated_by?: string
        }
        Relationships: [
          {
            foreignKeyName: "pricing_config_updated_by_fkey"
            columns: ["updated_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      profiles: {
        Row: {
          average_rating: number | null
          created_at: string
          full_name: string
          id: string
          is_suspended: boolean
          phone: string | null
          rating_count: number
          registered_as_driver: boolean
          role: Database["public"]["Enums"]["user_role"]
          strikes: number
          updated_at: string
        }
        Insert: {
          average_rating?: number | null
          created_at?: string
          full_name: string
          id: string
          is_suspended?: boolean
          phone?: string | null
          rating_count?: number
          registered_as_driver?: boolean
          role?: Database["public"]["Enums"]["user_role"]
          strikes?: number
          updated_at?: string
        }
        Update: {
          average_rating?: number | null
          created_at?: string
          full_name?: string
          id?: string
          is_suspended?: boolean
          phone?: string | null
          rating_count?: number
          registered_as_driver?: boolean
          role?: Database["public"]["Enums"]["user_role"]
          strikes?: number
          updated_at?: string
        }
        Relationships: []
      }
      push_subscriptions: {
        Row: {
          auth: string
          created_at: string
          endpoint: string
          id: string
          p256dh: string
          updated_at: string
          user_id: string
        }
        Insert: {
          auth: string
          created_at?: string
          endpoint: string
          id?: string
          p256dh: string
          updated_at?: string
          user_id: string
        }
        Update: {
          auth?: string
          created_at?: string
          endpoint?: string
          id?: string
          p256dh?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "push_subscriptions_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      ratings: {
        Row: {
          comment: string | null
          created_at: string
          id: string
          ratee_id: string
          rater_id: string
          service_id: string
          stars: number
        }
        Insert: {
          comment?: string | null
          created_at?: string
          id?: string
          ratee_id: string
          rater_id: string
          service_id: string
          stars: number
        }
        Update: {
          comment?: string | null
          created_at?: string
          id?: string
          ratee_id?: string
          rater_id?: string
          service_id?: string
          stars?: number
        }
        Relationships: [
          {
            foreignKeyName: "ratings_ratee_id_fkey"
            columns: ["ratee_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "ratings_rater_id_fkey"
            columns: ["rater_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "ratings_service_id_fkey"
            columns: ["service_id"]
            isOneToOne: false
            referencedRelation: "services"
            referencedColumns: ["id"]
          },
        ]
      }
      service_status_log: {
        Row: {
          changed_at: string
          changed_by: string
          from_status: Database["public"]["Enums"]["service_status"] | null
          id: string
          notes: string | null
          service_id: string
          to_status: Database["public"]["Enums"]["service_status"]
        }
        Insert: {
          changed_at?: string
          changed_by: string
          from_status?: Database["public"]["Enums"]["service_status"] | null
          id?: string
          notes?: string | null
          service_id: string
          to_status: Database["public"]["Enums"]["service_status"]
        }
        Update: {
          changed_at?: string
          changed_by?: string
          from_status?: Database["public"]["Enums"]["service_status"] | null
          id?: string
          notes?: string | null
          service_id?: string
          to_status?: Database["public"]["Enums"]["service_status"]
        }
        Relationships: [
          {
            foreignKeyName: "service_status_log_changed_by_fkey"
            columns: ["changed_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "service_status_log_service_id_fkey"
            columns: ["service_id"]
            isOneToOne: false
            referencedRelation: "services"
            referencedColumns: ["id"]
          },
        ]
      }
      services: {
        Row: {
          assigned_at: string | null
          cancellation_reason: string | null
          cancelled_at: string | null
          cancelled_by: string | null
          completed_at: string | null
          destination_address: string
          destination_lat: number
          destination_lng: number
          driver_id: string | null
          estimated_pickup_km: number | null
          estimated_price: number | null
          estimated_return_km: number | null
          estimated_ride_km: number | null
          final_pickup_km: number | null
          final_price: number | null
          final_return_km: number | null
          final_ride_km: number | null
          id: string
          pickup_address: string
          pickup_lat: number
          pickup_lng: number
          price_per_km_at_time: number | null
          requested_at: string
          rider_id: string
          status: Database["public"]["Enums"]["service_status"]
          vehicle_id: string
        }
        Insert: {
          assigned_at?: string | null
          cancellation_reason?: string | null
          cancelled_at?: string | null
          cancelled_by?: string | null
          completed_at?: string | null
          destination_address: string
          destination_lat: number
          destination_lng: number
          driver_id?: string | null
          estimated_pickup_km?: number | null
          estimated_price?: number | null
          estimated_return_km?: number | null
          estimated_ride_km?: number | null
          final_pickup_km?: number | null
          final_price?: number | null
          final_return_km?: number | null
          final_ride_km?: number | null
          id?: string
          pickup_address: string
          pickup_lat: number
          pickup_lng: number
          price_per_km_at_time?: number | null
          requested_at?: string
          rider_id: string
          status?: Database["public"]["Enums"]["service_status"]
          vehicle_id: string
        }
        Update: {
          assigned_at?: string | null
          cancellation_reason?: string | null
          cancelled_at?: string | null
          cancelled_by?: string | null
          completed_at?: string | null
          destination_address?: string
          destination_lat?: number
          destination_lng?: number
          driver_id?: string | null
          estimated_pickup_km?: number | null
          estimated_price?: number | null
          estimated_return_km?: number | null
          estimated_ride_km?: number | null
          final_pickup_km?: number | null
          final_price?: number | null
          final_return_km?: number | null
          final_ride_km?: number | null
          id?: string
          pickup_address?: string
          pickup_lat?: number
          pickup_lng?: number
          price_per_km_at_time?: number | null
          requested_at?: string
          rider_id?: string
          status?: Database["public"]["Enums"]["service_status"]
          vehicle_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "services_cancelled_by_fkey"
            columns: ["cancelled_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "services_driver_id_fkey"
            columns: ["driver_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "services_rider_id_fkey"
            columns: ["rider_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "services_vehicle_id_fkey"
            columns: ["vehicle_id"]
            isOneToOne: false
            referencedRelation: "vehicles"
            referencedColumns: ["id"]
          },
        ]
      }
      vehicles: {
        Row: {
          color: string
          created_at: string
          id: string
          is_active: boolean
          license_plate: string
          make_model: string
          rider_id: string
        }
        Insert: {
          color: string
          created_at?: string
          id?: string
          is_active?: boolean
          license_plate: string
          make_model: string
          rider_id: string
        }
        Update: {
          color?: string
          created_at?: string
          id?: string
          is_active?: boolean
          license_plate?: string
          make_model?: string
          rider_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "vehicles_rider_id_fkey"
            columns: ["rider_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      current_user_role: { Args: never; Returns: string }
    }
    Enums: {
      driver_availability: "online" | "offline"
      service_status:
        | "requested"
        | "assigned"
        | "en_route"
        | "in_progress"
        | "completed"
        | "cancelled"
      user_role: "rider" | "driver" | "operator" | "super_admin"
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
}

export type Tables<
  PublicTableNameOrOptions extends
    | keyof (Database["public"]["Tables"] & Database["public"]["Views"])
    | { schema: keyof Database },
  TableName extends PublicTableNameOrOptions extends { schema: keyof Database }
    ? keyof (Database[PublicTableNameOrOptions["schema"]]["Tables"] &
        Database[PublicTableNameOrOptions["schema"]]["Views"])
    : never = never,
> = PublicTableNameOrOptions extends { schema: keyof Database }
  ? (Database[PublicTableNameOrOptions["schema"]]["Tables"] &
      Database[PublicTableNameOrOptions["schema"]]["Views"])[TableName] extends {
      Row: infer R
    }
    ? R
    : never
  : PublicTableNameOrOptions extends keyof (Database["public"]["Tables"] &
        Database["public"]["Views"])
    ? (Database["public"]["Tables"] &
        Database["public"]["Views"])[PublicTableNameOrOptions] extends {
        Row: infer R
      }
      ? R
      : never
    : never

export type TablesInsert<
  PublicTableNameOrOptions extends
    | keyof Database["public"]["Tables"]
    | { schema: keyof Database },
  TableName extends PublicTableNameOrOptions extends { schema: keyof Database }
    ? keyof Database[PublicTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = PublicTableNameOrOptions extends { schema: keyof Database }
  ? Database[PublicTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Insert: infer I
    }
    ? I
    : never
  : PublicTableNameOrOptions extends keyof Database["public"]["Tables"]
    ? Database["public"]["Tables"][PublicTableNameOrOptions] extends {
        Insert: infer I
      }
      ? I
      : never
    : never

export type TablesUpdate<
  PublicTableNameOrOptions extends
    | keyof Database["public"]["Tables"]
    | { schema: keyof Database },
  TableName extends PublicTableNameOrOptions extends { schema: keyof Database }
    ? keyof Database[PublicTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = PublicTableNameOrOptions extends { schema: keyof Database }
  ? Database[PublicTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Update: infer U
    }
    ? U
    : never
  : PublicTableNameOrOptions extends keyof Database["public"]["Tables"]
    ? Database["public"]["Tables"][PublicTableNameOrOptions] extends {
        Update: infer U
      }
      ? U
      : never
    : never

export type Enums<
  PublicEnumNameOrOptions extends
    | keyof Database["public"]["Enums"]
    | { schema: keyof Database },
  EnumName extends PublicEnumNameOrOptions extends { schema: keyof Database }
    ? keyof Database[PublicEnumNameOrOptions["schema"]]["Enums"]
    : never = never,
> = PublicEnumNameOrOptions extends { schema: keyof Database }
  ? Database[PublicEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : PublicEnumNameOrOptions extends keyof Database["public"]["Enums"]
    ? Database["public"]["Enums"][PublicEnumNameOrOptions]
    : never

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    | keyof Database["public"]["CompositeTypes"]
    | { schema: keyof Database },
  CompositeTypeName extends PublicCompositeTypeNameOrOptions extends {
    schema: keyof Database
  }
    ? keyof Database[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never = never,
> = PublicCompositeTypeNameOrOptions extends { schema: keyof Database }
  ? Database[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof Database["public"]["CompositeTypes"]
    ? Database["public"]["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never

export const Constants = {
  graphql_public: {
    Enums: {},
  },
  public: {
    Enums: {
      driver_availability: ["online", "offline"],
      service_status: [
        "requested",
        "assigned",
        "en_route",
        "in_progress",
        "completed",
        "cancelled",
      ],
      user_role: ["rider", "driver", "operator", "super_admin"],
    },
  },
} as const
