import { createClient } from '@supabase/supabase-js';
import { getRequiredSupabaseServiceRoleKey, getRequiredSupabaseUrl } from '@/lib/config';
import type { Database } from '@/lib/supabase/types';

export function createSupabaseAdminClient() {
  return createClient<Database>(getRequiredSupabaseUrl(), getRequiredSupabaseServiceRoleKey(), {
    auth: {
      persistSession: false,
      autoRefreshToken: false,
    },
  });
}
