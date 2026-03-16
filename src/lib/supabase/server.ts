import { createClient } from '@supabase/supabase-js';
import { getRequiredSupabasePublishableKey, getRequiredSupabaseUrl } from '@/lib/config';

export function createSupabaseServerClient() {
  return createClient(getRequiredSupabaseUrl(), getRequiredSupabasePublishableKey(), {
    auth: {
      persistSession: false,
      autoRefreshToken: false,
    },
  });
}
