import { createClient } from '@supabase/supabase-js';
import { getRequiredSupabaseAnonKey, getRequiredSupabaseUrl } from '@/lib/config';
import type { Database } from '@/lib/supabase/types';

export function createSupabaseServerClient() {
  return createClient<Database>(getRequiredSupabaseUrl(), getRequiredSupabaseAnonKey(), {
    auth: {
      persistSession: false,
      autoRefreshToken: false,
    },
  });
}
