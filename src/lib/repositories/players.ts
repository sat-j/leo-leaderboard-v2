import { createSupabaseAdminClient } from '@/lib/supabase/admin';

export interface PlayerListFilters {
  active?: boolean;
  search?: string;
  limit?: number;
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
