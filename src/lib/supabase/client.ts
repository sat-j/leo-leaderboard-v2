'use client';

import { createClient } from '@supabase/supabase-js';
import { getRequiredSupabaseAnonKey, getRequiredSupabaseUrl } from '@/lib/config';
import type { Database } from '@/lib/supabase/types';

let browserClient: ReturnType<typeof createClient<Database>> | null = null;

export function getSupabaseBrowserClient() {
  if (!browserClient) {
    browserClient = createClient<Database>(getRequiredSupabaseUrl(), getRequiredSupabaseAnonKey());
  }

  return browserClient;
}
