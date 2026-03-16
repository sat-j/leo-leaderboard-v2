interface AppConfig {
  adminSecret: string | null;
  supabasePublishableKey: string | null;
  supabaseSecretKey: string | null;
  supabaseUrl: string | null;
}

let cachedConfig: AppConfig | null = null;

function readEnv(name: string): string | null {
  const value = process.env[name]?.trim();
  return value ? value : null;
}

function loadConfig(): AppConfig {
  if (cachedConfig) {
    return cachedConfig;
  }

  cachedConfig = {
    adminSecret: readEnv('ADMIN_SECRET'),
    supabasePublishableKey:
      readEnv('SUPABASE_PUBLISHABLE_KEY') ??
      readEnv('NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY') ??
      readEnv('SUPABASE_ANON_KEY') ??
      readEnv('NEXT_PUBLIC_SUPABASE_ANON_KEY'),
    supabaseSecretKey: readEnv('SUPABASE_SECRET_KEY') ?? readEnv('SUPABASE_SERVICE_ROLE_KEY'),
    supabaseUrl: readEnv('SUPABASE_URL') ?? readEnv('NEXT_PUBLIC_SUPABASE_URL'),
  };

  return cachedConfig;
}

export function getAdminSecret(): string | null {
  return loadConfig().adminSecret;
}

export function getSupabaseUrl(): string | null {
  return loadConfig().supabaseUrl;
}

export function getSupabasePublishableKey(): string | null {
  return loadConfig().supabasePublishableKey;
}

export function getSupabaseSecretKey(): string | null {
  return loadConfig().supabaseSecretKey;
}

export function getRequiredSupabaseUrl(): string {
  const value = getSupabaseUrl();
  if (!value) {
    throw new Error('SUPABASE_URL not configured');
  }
  return value;
}

export function getRequiredSupabasePublishableKey(): string {
  const value = getSupabasePublishableKey();
  if (!value) {
    throw new Error('SUPABASE_PUBLISHABLE_KEY not configured');
  }
  return value;
}

export function getRequiredSupabaseSecretKey(): string {
  const value = getSupabaseSecretKey();
  if (!value) {
    throw new Error('SUPABASE_SECRET_KEY not configured');
  }
  return value;
}
