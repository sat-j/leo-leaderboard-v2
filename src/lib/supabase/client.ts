'use client';

import { createClient } from '@supabase/supabase-js';
import { getRequiredSupabasePublishableKey, getRequiredSupabaseUrl } from '@/lib/config';

let browserClient: ReturnType<typeof createClient> | null = null;

export function getSupabaseBrowserClient() {
  if (!browserClient) {
    browserClient = createClient(getRequiredSupabaseUrl(), getRequiredSupabasePublishableKey());
  }

  return browserClient;
}
