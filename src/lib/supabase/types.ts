export type PlayerLevel = 'BEG' | 'PLUS' | 'INT' | 'ADV';

export interface Database {
  public: {
    Tables: {
      players: {
        Row: {
          id: string;
          display_name: string;
          slug: string;
          level: PlayerLevel;
          initial_mu: number;
          initial_sigma: number;
          is_active: boolean;
          joined_on: string | null;
          notes: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          display_name: string;
          slug: string;
          level: PlayerLevel;
          initial_mu: number;
          initial_sigma: number;
          is_active?: boolean;
          joined_on?: string | null;
          notes?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: Partial<Database['public']['Tables']['players']['Insert']>;
      };
      play_dates: {
        Row: {
          id: string;
          play_date: string;
          label_short: string | null;
          label_long: string | null;
          match_count: number;
          is_processed: boolean;
          last_processed_at: string | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          play_date: string;
          label_short?: string | null;
          label_long?: string | null;
          match_count?: number;
          is_processed?: boolean;
          last_processed_at?: string | null;
          created_at?: string;
        };
        Update: Partial<Database['public']['Tables']['play_dates']['Insert']>;
      };
      matches: {
        Row: {
          id: string;
          play_date_id: string;
          played_at: string;
          score1: number;
          score2: number;
          submitted_by_user_id: string | null;
          submitted_via: string;
          source: string;
          status: string;
          validation_notes: Record<string, unknown> | null;
          external_source_id: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          play_date_id: string;
          played_at: string;
          score1: number;
          score2: number;
          submitted_by_user_id?: string | null;
          submitted_via?: string;
          source?: string;
          status?: string;
          validation_notes?: Record<string, unknown> | null;
          external_source_id?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: Partial<Database['public']['Tables']['matches']['Insert']>;
      };
      match_participants: {
        Row: {
          id: string;
          match_id: string;
          player_id: string;
          team_number: number;
          seat_number: number;
          created_at: string;
        };
        Insert: {
          id?: string;
          match_id: string;
          player_id: string;
          team_number: number;
          seat_number: number;
          created_at?: string;
        };
        Update: Partial<Database['public']['Tables']['match_participants']['Insert']>;
      };
    };
  };
}
