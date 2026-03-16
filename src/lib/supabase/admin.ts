import { createClient } from '@supabase/supabase-js';
import { getRequiredSupabaseSecretKey, getRequiredSupabaseUrl } from '@/lib/config';

export function createSupabaseAdminClient() {
  return createClient(getRequiredSupabaseUrl(), getRequiredSupabaseSecretKey(), {
    auth: {
      persistSession: false,
      autoRefreshToken: false,
    },
  });
}
