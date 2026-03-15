interface AppConfig {
  adminSecret: string | null;
  googleCredentials: string | null;
  spreadsheetId: string | null;
  supabaseAnonKey: string | null;
  supabaseServiceRoleKey: string | null;
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
    googleCredentials: readEnv('GOOGLE_CREDENTIALS'),
    spreadsheetId: readEnv('GOOGLE_SHEET_ID') ?? readEnv('GOOGLE_SHEETS_ID'),
    supabaseAnonKey: readEnv('SUPABASE_ANON_KEY') ?? readEnv('NEXT_PUBLIC_SUPABASE_ANON_KEY'),
    supabaseServiceRoleKey: readEnv('SUPABASE_SERVICE_ROLE_KEY'),
    supabaseUrl: readEnv('SUPABASE_URL') ?? readEnv('NEXT_PUBLIC_SUPABASE_URL'),
  };

  return cachedConfig;
}

export function getAdminSecret(): string | null {
  return loadConfig().adminSecret;
}

export function getGoogleCredentials(): string | null {
  return loadConfig().googleCredentials;
}

export function getSpreadsheetId(): string | null {
  return loadConfig().spreadsheetId;
}

export function getRequiredSpreadsheetId(): string {
  const spreadsheetId = getSpreadsheetId();
  if (!spreadsheetId) {
    throw new Error('Google Sheet ID not configured');
  }

  return spreadsheetId;
}

export function getSupabaseUrl(): string | null {
  return loadConfig().supabaseUrl;
}

export function getSupabaseAnonKey(): string | null {
  return loadConfig().supabaseAnonKey;
}

export function getSupabaseServiceRoleKey(): string | null {
  return loadConfig().supabaseServiceRoleKey;
}

export function getRequiredSupabaseUrl(): string {
  const value = getSupabaseUrl();
  if (!value) {
    throw new Error('SUPABASE_URL not configured');
  }
  return value;
}

export function getRequiredSupabaseAnonKey(): string {
  const value = getSupabaseAnonKey();
  if (!value) {
    throw new Error('SUPABASE_ANON_KEY not configured');
  }
  return value;
}

export function getRequiredSupabaseServiceRoleKey(): string {
  const value = getSupabaseServiceRoleKey();
  if (!value) {
    throw new Error('SUPABASE_SERVICE_ROLE_KEY not configured');
  }
  return value;
}
