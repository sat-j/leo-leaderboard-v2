export type PlayerLevel = 'PLUS' | 'INT' | 'ADV';

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
      processing_runs: {
        Row: {
          id: string;
          triggered_by_user_id: string | null;
          trigger_type: string;
          scope: string;
          status: string;
          started_at: string;
          finished_at: string | null;
          summary: Record<string, unknown> | null;
          error_message: string | null;
        };
        Insert: {
          id?: string;
          triggered_by_user_id?: string | null;
          trigger_type: string;
          scope: string;
          status: string;
          started_at?: string;
          finished_at?: string | null;
          summary?: Record<string, unknown> | null;
          error_message?: string | null;
        };
        Update: Partial<Database['public']['Tables']['processing_runs']['Insert']>;
      };
      rating_snapshots: {
        Row: {
          id: string;
          player_id: string;
          play_date_id: string;
          processing_run_id: string | null;
          mu: number;
          sigma: number;
          skill_rating: number;
          rating_change: number | null;
          rank_overall: number | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          player_id: string;
          play_date_id: string;
          processing_run_id?: string | null;
          mu: number;
          sigma: number;
          skill_rating: number;
          rating_change?: number | null;
          rank_overall?: number | null;
          created_at?: string;
        };
        Update: Partial<Database['public']['Tables']['rating_snapshots']['Insert']>;
      };
      player_date_stats: {
        Row: {
          id: string;
          player_id: string;
          play_date_id: string;
          matches_played: number;
          matches_won: number;
          win_rate: number;
          points_scored: number;
          points_conceded: number;
          points_difference: number;
          rating_change: number;
          created_at: string;
        };
        Insert: {
          id?: string;
          player_id: string;
          play_date_id: string;
          matches_played?: number;
          matches_won?: number;
          win_rate?: number;
          points_scored?: number;
          points_conceded?: number;
          points_difference?: number;
          rating_change?: number;
          created_at?: string;
        };
        Update: Partial<Database['public']['Tables']['player_date_stats']['Insert']>;
      };
      public_submission_logs: {
        Row: {
          id: string;
          ip_hash: string;
          fingerprint_hash: string;
          source: string;
          status: string;
          reason_code: string | null;
          request_payload: Record<string, unknown>;
          match_id: string | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          ip_hash: string;
          fingerprint_hash: string;
          source?: string;
          status: string;
          reason_code?: string | null;
          request_payload: Record<string, unknown>;
          match_id?: string | null;
          created_at?: string;
        };
        Update: Partial<Database['public']['Tables']['public_submission_logs']['Insert']>;
      };
    };
  };
}
