export type Json = string | number | boolean | null | { [key: string]: Json | undefined } | Json[];

export type BookingStatus = 'active' | 'completed' | 'cancelled';
export type BookingType = 'boarding' | 'daycare';
export type RateType = 'boarding' | 'daycare';

export interface Database {
  public: {
    Tables: {
      booking_days: {
        Row: {
          id: string;
          booking_id: string;
          date: string;
          rate_type: RateType;
          is_holiday: boolean;
          amount: number;
          notes: string | null;
        };
        Insert: {
          id?: string;
          booking_id: string;
          date: string;
          rate_type: RateType;
          is_holiday?: boolean;
          amount?: number;
          notes?: string | null;
        };
        Update: {
          id?: string;
          booking_id?: string;
          date?: string;
          rate_type?: RateType;
          is_holiday?: boolean;
          amount?: number;
          notes?: string | null;
        };
        Relationships: [
          {
            foreignKeyName: 'booking_days_booking_id_fkey';
            columns: ['booking_id'];
            isOneToOne: false;
            referencedRelation: 'bookings';
            referencedColumns: ['id'];
          },
        ];
      };
      bookings: {
        Row: {
          id: string;
          sitter_id: string;
          dog_id: string;
          start_date: string;
          end_date: string;
          type: BookingType;
          is_holiday: boolean;
          gcal_event_id: string | null;
          status: BookingStatus;
          total_amount: number;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          sitter_id: string;
          dog_id: string;
          start_date: string;
          end_date: string;
          type: BookingType;
          is_holiday?: boolean;
          gcal_event_id?: string | null;
          status?: BookingStatus;
          total_amount?: number;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          sitter_id?: string;
          dog_id?: string;
          start_date?: string;
          end_date?: string;
          type?: BookingType;
          is_holiday?: boolean;
          gcal_event_id?: string | null;
          status?: BookingStatus;
          total_amount?: number;
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: 'bookings_dog_id_fkey';
            columns: ['dog_id'];
            isOneToOne: false;
            referencedRelation: 'dogs';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'bookings_sitter_id_fkey';
            columns: ['sitter_id'];
            isOneToOne: false;
            referencedRelation: 'profiles';
            referencedColumns: ['id'];
          },
        ];
      };
      dogs: {
        Row: {
          id: string;
          sitter_id: string;
          name: string;
          owner_name: string | null;
          owner_phone: string | null;
          photo_url: string | null;
          notes: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          sitter_id: string;
          name: string;
          owner_name?: string | null;
          owner_phone?: string | null;
          photo_url?: string | null;
          notes?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          sitter_id?: string;
          name?: string;
          owner_name?: string | null;
          owner_phone?: string | null;
          photo_url?: string | null;
          notes?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: 'dogs_sitter_id_fkey';
            columns: ['sitter_id'];
            isOneToOne: false;
            referencedRelation: 'profiles';
            referencedColumns: ['id'];
          },
        ];
      };
      profiles: {
        Row: {
          id: string;
          display_name: string | null;
          email: string | null;
          nightly_rate: number;
          daycare_rate: number;
          holiday_surcharge: number;
          cutoff_time: string;
          gcal_calendar_id: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id: string;
          display_name?: string | null;
          email?: string | null;
          nightly_rate?: number;
          daycare_rate?: number;
          holiday_surcharge?: number;
          cutoff_time?: string;
          gcal_calendar_id?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          display_name?: string | null;
          email?: string | null;
          nightly_rate?: number;
          daycare_rate?: number;
          holiday_surcharge?: number;
          cutoff_time?: string;
          gcal_calendar_id?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [];
      };
    };
    Views: Record<string, never>;
    Functions: Record<string, never>;
    Enums: Record<string, never>;
    CompositeTypes: Record<string, never>;
  };
}

export type Profile = Database['public']['Tables']['profiles']['Row'];
export type Dog = Database['public']['Tables']['dogs']['Row'];
export type Booking = Database['public']['Tables']['bookings']['Row'];
export type BookingDay = Database['public']['Tables']['booking_days']['Row'];

export type ProfileRates = Pick<
  Profile,
  'nightly_rate' | 'daycare_rate' | 'holiday_surcharge' | 'cutoff_time'
>;

export type BookingWithDog = Booking & { dog: Dog };

export type BookingWithDays = Booking & {
  booking_days: BookingDay[];
  dog: Dog;
};

export type ProfileInsert = Database['public']['Tables']['profiles']['Insert'];
export type ProfileUpdate = Database['public']['Tables']['profiles']['Update'];

export type DogInsert = Database['public']['Tables']['dogs']['Insert'];
export type DogUpdate = Database['public']['Tables']['dogs']['Update'];

export type BookingInsert = Database['public']['Tables']['bookings']['Insert'];
export type BookingUpdate = Database['public']['Tables']['bookings']['Update'];

export type BookingDayInsert = Database['public']['Tables']['booking_days']['Insert'];
export type BookingDayUpdate = Database['public']['Tables']['booking_days']['Update'];
