import { createSupabaseAdminClient } from '@/lib/supabase/admin';
import { normalizePlayerLevel } from '@/lib/playerLevels';
import type { PlayerLevel } from '@/types';

export interface PlayerListFilters {
  active?: boolean;
  search?: string;
  limit?: number;
}

interface PlayerDefaults {
  initialMu: number;
  initialSigma: number;
}

function slugifyPlayerName(value: string): string {
  return value
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .replace(/-{2,}/g, '-');
}

function getLevelDefaults(level: PlayerLevel): PlayerDefaults {
  if (level === 'ADV') {
    return { initialMu: 45, initialSigma: 8.33 };
  }

  if (level === 'PLUS') {
    return { initialMu: 35, initialSigma: 8.33 };
  }

  return { initialMu: 20, initialSigma: 8.33 };
}

async function buildUniqueSlug(baseName: string, currentPlayerId?: string): Promise<string> {
  const supabase = createSupabaseAdminClient();
  const baseSlug = slugifyPlayerName(baseName) || 'player';

  const { data, error } = await supabase.from('players').select('id, slug').ilike('slug', `${baseSlug}%`);
  if (error) {
    throw error;
  }

  const existingSlugs = new Set(
    (data ?? [])
      .filter((row) => row.id !== currentPlayerId)
      .map((row) => row.slug)
  );

  if (!existingSlugs.has(baseSlug)) {
    return baseSlug;
  }

  let counter = 2;
  while (existingSlugs.has(`${baseSlug}-${counter}`)) {
    counter += 1;
  }

  return `${baseSlug}-${counter}`;
}

export async function listPlayers(filters: PlayerListFilters = {}) {
  const supabase = createSupabaseAdminClient();
  const limit = Math.min(Math.max(filters.limit ?? 100, 1), 250);

  let query = supabase
    .from('players')
    .select('id, display_name, slug, level, is_active')
    .order('display_name', { ascending: true })
    .limit(limit);

  if (typeof filters.active === 'boolean') {
    query = query.eq('is_active', filters.active);
  }

  if (filters.search) {
    query = query.ilike('display_name', `%${filters.search}%`);
  }

  const { data, error } = await query;
  if (error) {
    throw error;
  }

  return (data ?? []).map((player) => ({
    id: player.id,
    displayName: player.display_name,
    slug: player.slug,
    level: player.level,
    isActive: player.is_active,
  }));
}

export async function createPlayer(input: {
  displayName: string;
  level: string;
  isActive?: boolean;
}) {
  const supabase = createSupabaseAdminClient();
  const displayName = input.displayName.trim();
  const level = normalizePlayerLevel(input.level);
  const slug = await buildUniqueSlug(displayName);
  const defaults = getLevelDefaults(level);

  const { data, error } = await supabase
    .from('players')
    .insert({
      display_name: displayName,
      slug,
      level,
      initial_mu: defaults.initialMu,
      initial_sigma: defaults.initialSigma,
      is_active: input.isActive ?? true,
    })
    .select('id, display_name, slug, level, is_active, initial_mu, initial_sigma')
    .single();

  if (error || !data) {
    throw error ?? new Error('Failed to create player');
  }

  return {
    id: data.id,
    displayName: data.display_name,
    slug: data.slug,
    level: data.level,
    isActive: data.is_active,
    initialMu: data.initial_mu,
    initialSigma: data.initial_sigma,
  };
}

export async function updatePlayer(
  playerId: string,
  input: {
    displayName?: string;
    level?: string;
    isActive?: boolean;
  }
) {
  const supabase = createSupabaseAdminClient();
  const updatePayload: Record<string, unknown> = {};

  if (typeof input.displayName === 'string') {
    const displayName = input.displayName.trim();
    updatePayload.display_name = displayName;
    updatePayload.slug = await buildUniqueSlug(displayName, playerId);
  }

  if (typeof input.level === 'string') {
    updatePayload.level = normalizePlayerLevel(input.level);
  }

  if (typeof input.isActive === 'boolean') {
    updatePayload.is_active = input.isActive;
  }

  const { data, error } = await supabase
    .from('players')
    .update(updatePayload)
    .eq('id', playerId)
    .select('id, display_name, slug, level, is_active')
    .single();

  if (error || !data) {
    throw error ?? new Error('Failed to update player');
  }

  return {
    id: data.id,
    displayName: data.display_name,
    slug: data.slug,
    level: data.level,
    isActive: data.is_active,
  };
}
