// ============================================================
// SUPABASE DATABASE TYPES
// Auto-generate with: supabase gen types typescript --project-id YOUR_PROJECT_REF > types/supabase.ts
// This is a placeholder — replace with the generated output after running schema.sql
// ============================================================

export type Json = string | number | boolean | null | { [key: string]: Json | undefined } | Json[];

export interface Database {
  public: {
    Tables: {
      user_profiles: {
        Row: {
          id: string;
          email: string;
          full_name: string;
          role: string;
          avatar_url: string | null;
          phone: string | null;
          is_active: boolean;
          created_at: string;
          updated_at: string;
        };
        Insert: Omit<Database["public"]["Tables"]["user_profiles"]["Row"], "created_at" | "updated_at">;
        Update: Partial<Database["public"]["Tables"]["user_profiles"]["Insert"]>;
      };
      clients: {
        Row: {
          id: string;
          email: string;
          full_name: string;
          phone: string | null;
          id_number: string | null;
          client_type: string;
          status: string;
          company_name: string | null;
          vat_number: string | null;
          tax_zone: string;
          preferred_currency: string;
          payment_terms_days: number;
          address: string | null;
          city: string | null;
          country: string;
          notes: string | null;
          created_by: string;
          created_at: string;
          updated_at: string;
        };
        Insert: Omit<Database["public"]["Tables"]["clients"]["Row"], "id" | "created_at" | "updated_at">;
        Update: Partial<Database["public"]["Tables"]["clients"]["Insert"]>;
      };
      vehicles: {
        Row: {
          id: string;
          registration: string;
          make: string;
          model: string;
          year: number;
          color: string;
          category: string;
          fuel_type: string;
          seating_capacity: number;
          drive_modes: string;
          status: string;
          daily_rate_zar: number;
          chauffeur_rate_zar: number;
          odometer_km: number;
          last_service_date: string | null;
          next_service_due_km: number | null;
          insurance_expiry: string | null;
          roadworthy_expiry: string | null;
          gps_tracker_id: string | null;
          image_url: string | null;
          notes: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: Omit<Database["public"]["Tables"]["vehicles"]["Row"], "id" | "created_at" | "updated_at">;
        Update: Partial<Database["public"]["Tables"]["vehicles"]["Insert"]>;
      };
      bookings: {
        Row: {
          id: string;
          booking_reference: string;
          client_id: string;
          vehicle_id: string;
          driver_id: string | null;
          assigned_by: string | null;
          booking_type: string;
          status: string;
          pickup_datetime: string;
          dropoff_datetime: string;
          actual_return_datetime: string | null;
          pickup_location: string;
          dropoff_location: string;
          pickup_lat: number | null;
          pickup_lng: number | null;
          currency: string;
          exchange_rate_locked: number;
          subtotal_zar: number;
          discount_amount_zar: number;
          vat_amount_zar: number;
          total_zar: number;
          deposit_amount_zar: number;
          deposit_paid: boolean;
          deposit_paid_at: string | null;
          balance_due_zar: number;
          payment_terms_days: number;
          extra_services: Json | null;
          special_requirements: string | null;
          internal_notes: string | null;
          voucher_url: string | null;
          voucher_sent_at: string | null;
          arrival_alert_sent: boolean;
          created_by: string;
          created_at: string;
          updated_at: string;
        };
        Insert: Omit<Database["public"]["Tables"]["bookings"]["Row"], "id" | "created_at" | "updated_at">;
        Update: Partial<Database["public"]["Tables"]["bookings"]["Insert"]>;
      };
      drivers: {
        Row: {
          id: string;
          user_id: string | null;
          full_name: string;
          phone: string;
          email: string | null;
          id_number: string;
          license_number: string;
          license_code: string;
          license_expiry: string;
          pdp_expiry: string | null;
          status: string;
          rating: number | null;
          total_trips: number;
          created_at: string;
          updated_at: string;
        };
        Insert: Omit<Database["public"]["Tables"]["drivers"]["Row"], "id" | "created_at" | "updated_at">;
        Update: Partial<Database["public"]["Tables"]["drivers"]["Insert"]>;
      };
      invoices: {
        Row: {
          id: string;
          invoice_number: string;
          booking_id: string;
          client_id: string;
          status: string;
          line_items: Json;
          subtotal_zar: number;
          vat_rate: number;
          vat_amount_zar: number;
          total_zar: number;
          amount_paid_zar: number;
          balance_due_zar: number;
          due_date: string;
          paid_date: string | null;
          payment_method: string | null;
          payment_reference: string | null;
          pdf_url: string | null;
          notes: string | null;
          created_by: string;
          created_at: string;
          updated_at: string;
        };
        Insert: Omit<Database["public"]["Tables"]["invoices"]["Row"], "id" | "created_at" | "updated_at">;
        Update: Partial<Database["public"]["Tables"]["invoices"]["Insert"]>;
      };
      payments: {
        Row: {
          id: string;
          invoice_id: string;
          amount_zar: number;
          method: string;
          reference: string | null;
          notes: string | null;
          created_by: string;
          created_at: string;
        };
        Insert: Omit<Database["public"]["Tables"]["payments"]["Row"], "id" | "created_at">;
        Update: never;
      };
      vault_documents: {
        Row: {
          id: string;
          entity_type: string;
          entity_id: string;
          document_type: string;
          file_name: string;
          file_path: string;
          file_size_bytes: number;
          mime_type: string;
          expiry_date: string | null;
          is_verified: boolean;
          verified_by: string | null;
          verified_at: string | null;
          notes: string | null;
          uploaded_by: string;
          created_at: string;
        };
        Insert: Omit<Database["public"]["Tables"]["vault_documents"]["Row"], "id" | "created_at">;
        Update: Partial<Database["public"]["Tables"]["vault_documents"]["Insert"]>;
      };
      audit_logs: {
        Row: {
          id: string;
          table_name: string;
          record_id: string;
          action: string;
          old_data: Json | null;
          new_data: Json | null;
          changed_by: string;
          changed_by_email: string | null;
          changed_by_role: string | null;
          ip_address: string | null;
          user_agent: string | null;
          created_at: string;
        };
        Insert: Omit<Database["public"]["Tables"]["audit_logs"]["Row"], "id" | "created_at">;
        Update: never; // IMMUTABLE — no updates allowed
      };
      maintenance_records: {
        Row: {
          id: string;
          vehicle_id: string;
          maintenance_type: string;
          description: string;
          cost_zar: number;
          odometer_at_service: number;
          service_provider: string;
          service_date: string;
          next_service_date: string | null;
          documents: Json | null;
          logged_by: string;
          created_at: string;
        };
        Insert: Omit<Database["public"]["Tables"]["maintenance_records"]["Row"], "id" | "created_at">;
        Update: Partial<Database["public"]["Tables"]["maintenance_records"]["Insert"]>;
      };
      exchange_rates: {
        Row: {
          id: string;
          currency_from: string;
          currency_to: string;
          rate: number;
          locked_by: string | null;
          locked_until: string | null;
          created_at: string;
        };
        Insert: Omit<Database["public"]["Tables"]["exchange_rates"]["Row"], "id" | "created_at">;
        Update: Partial<Database["public"]["Tables"]["exchange_rates"]["Insert"]>;
      };
    };
    Views: Record<string, never>;
    Functions: {
      check_vehicle_availability: {
        Args: {
          p_vehicle_id: string;
          p_pickup_datetime: string;
          p_dropoff_datetime: string;
          p_booking_type: string;
          p_exclude_booking_id: string | null;
        };
        Returns: boolean;
      };
    };
    Enums: Record<string, never>;
  };
}
