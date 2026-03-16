import { format } from 'date-fns';
import { createSupabaseAdminClient } from '@/lib/supabase/admin';
import type { MatchInput } from '@/lib/validation/matches';

function buildPlayDateLabels(date: Date) {
  return {
    short: format(date, 'EEE MMM d'),
    long: format(date, 'EEEE, MMMM d, yyyy'),
  };
}

async function ensurePlayersExist(playerIds: string[]) {
  const supabase = createSupabaseAdminClient();
  const { data, error } = await supabase.from('players').select('id').in('id', playerIds);

  if (error) {
    throw error;
  }

  const existingIds = new Set((data ?? []).map((player) => player.id));
  const missingIds = playerIds.filter((playerId) => !existingIds.has(playerId));

  return missingIds;
}

export async function createMatch(input: MatchInput) {
  const supabase = createSupabaseAdminClient();
  const playedAtDate = new Date(input.playedAt);
  const playDate = format(playedAtDate, 'yyyy-MM-dd');
  const labels = buildPlayDateLabels(playedAtDate);

  const missingPlayerIds = await ensurePlayersExist(input.players.map((player) => player.playerId));
  if (missingPlayerIds.length > 0) {
    throw new Error(`Unknown players: ${missingPlayerIds.join(', ')}`);
  }

  const { data: playDateRow, error: playDateError } = await supabase
    .from('play_dates')
    .upsert(
      {
        play_date: playDate,
        label_short: labels.short,
        label_long: labels.long,
      },
      { onConflict: 'play_date' }
    )
    .select('id')
    .single();

  if (playDateError || !playDateRow) {
    throw playDateError ?? new Error('Failed to create play date');
  }

  const { data: insertedMatch, error: matchError } = await supabase
    .from('matches')
    .insert({
      play_date_id: playDateRow.id,
      played_at: input.playedAt,
      score1: input.score1,
      score2: input.score2,
      submitted_via: input.submittedVia ?? 'admin',
      source: input.source ?? 'manual',
      status: 'validated',
      external_source_id: input.externalSourceId ?? null,
    })
    .select('id, play_date_id, played_at, score1, score2, status')
    .single();

  if (matchError || !insertedMatch) {
    throw matchError ?? new Error('Failed to create match');
  }

  const participantRows = input.players.map((player) => ({
    match_id: insertedMatch.id,
    player_id: player.playerId,
    team_number: player.team,
    seat_number: player.seat,
  }));

  const { error: participantsError } = await supabase.from('match_participants').insert(participantRows);
  if (participantsError) {
    throw participantsError;
  }

  const { error: countError } = await supabase.rpc('increment_play_date_match_count', { play_date_id_input: playDateRow.id });
  if (countError) {
    throw countError;
  }

  return {
    matchId: insertedMatch.id,
    playDate,
    status: insertedMatch.status,
  };
}

export async function listRecentMatches(limit = 25) {
  const supabase = createSupabaseAdminClient();
  const { data, error } = await supabase
    .from('matches')
    .select(
      `
        id,
        played_at,
        score1,
        score2,
        status,
        play_dates ( play_date, label_short ),
        match_participants (
          team_number,
          seat_number,
          players ( id, display_name )
        )
      `
    )
    .order('played_at', { ascending: false })
    .limit(limit);

  if (error) {
    throw error;
  }

  return data ?? [];
}
