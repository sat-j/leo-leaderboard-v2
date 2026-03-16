import type { Match, PlayerOverallStat, PlayDateOption } from '@/types';
import type { PlayerAnalytics } from '@/lib/playerAnalytics';
import { calculatePlayerAnalytics } from '@/lib/playerAnalytics';
import { createSupabaseAdminClient } from '@/lib/supabase/admin';
import { listProcessedPlayDates } from '@/lib/repositories/leaderboard';

function getSingleRelation<T>(value: T | T[] | null | undefined): T | null {
  if (!value) {
    return null;
  }
  return Array.isArray(value) ? value[0] ?? null : value;
}

function buildMatchShape(row: any, dateSequenceMap: Map<string, number>): Match | null {
  const playDateRow = getSingleRelation(row.play_dates);
  const participants = [...(row.match_participants ?? [])].sort((left, right) => {
    if (left.team_number !== right.team_number) {
      return left.team_number - right.team_number;
    }
    return left.seat_number - right.seat_number;
  });

  if (!playDateRow || participants.length !== 4) {
    return null;
  }

  const names = participants.map((participant) => getSingleRelation(participant.players)?.display_name ?? 'Unknown');
  return {
    weekNumber: dateSequenceMap.get(playDateRow.play_date) ?? 0,
    player1: names[0],
    player2: names[1],
    player3: names[2],
    player4: names[3],
    score1: row.score1,
    score2: row.score2,
  };
}

export async function getOverallStats(): Promise<{
  overallStats: PlayerOverallStat[];
  totalPlayDates: number;
  totalMatches: number;
}> {
  const supabase = createSupabaseAdminClient();
  const playDates = await listProcessedPlayDates();
  const latestPlayDate = playDates[playDates.length - 1] ?? null;

  const [{ data: snapshotsRaw, error: snapshotsError }, { data: statsRaw, error: statsError }, { count: matchCount, error: matchCountError }] =
    await Promise.all([
      latestPlayDate
        ? supabase
            .from('rating_snapshots')
            .select('player_id, mu, sigma, skill_rating, players ( display_name, level )')
            .eq('play_date_id', latestPlayDate.id)
        : Promise.resolve({ data: [], error: null } as any),
      supabase
        .from('player_date_stats')
        .select('player_id, matches_played, matches_won, points_scored, points_difference, rating_change'),
      supabase.from('matches').select('id', { count: 'exact', head: true }).eq('status', 'processed'),
    ]);

  if (snapshotsError || statsError || matchCountError) {
    throw snapshotsError ?? statsError ?? matchCountError ?? new Error('Failed to load overall stats');
  }

  const aggregateStats = new Map<
    string,
    {
      totalMatches: number;
      matchesWon: number;
      totalPointsScored: number;
      pointsDifference: number;
      totalRatingChange: number;
      weeksPlayed: number;
    }
  >();

  for (const row of statsRaw ?? []) {
    const current = aggregateStats.get(row.player_id) ?? {
      totalMatches: 0,
      matchesWon: 0,
      totalPointsScored: 0,
      pointsDifference: 0,
      totalRatingChange: 0,
      weeksPlayed: 0,
    };
    current.totalMatches += row.matches_played;
    current.matchesWon += row.matches_won;
    current.totalPointsScored += row.points_scored;
    current.pointsDifference += row.points_difference;
    current.totalRatingChange += row.rating_change;
    current.weeksPlayed += 1;
    aggregateStats.set(row.player_id, current);
  }

  const overallStats: PlayerOverallStat[] = ((snapshotsRaw ?? []) as Array<{
    player_id: string;
    mu: number;
    sigma: number;
    skill_rating: number;
    players?: { display_name: string; level: 'PLUS' | 'INT' | 'ADV' } | { display_name: string; level: 'PLUS' | 'INT' | 'ADV' }[];
  }>)
    .map((snapshot) => {
      const player = getSingleRelation(snapshot.players);
      const stats = aggregateStats.get(snapshot.player_id);
      if (!player || !stats) {
        return null;
      }

      return {
        playerName: player.display_name,
        level: player.level,
        currentRating: snapshot.skill_rating,
        totalMatches: stats.totalMatches,
        matchesWon: stats.matchesWon,
        winRate: stats.totalMatches > 0 ? (stats.matchesWon / stats.totalMatches) * 100 : 0,
        totalPointsScored: stats.totalPointsScored,
        pointsDifference: stats.pointsDifference,
        totalRatingChange: stats.totalRatingChange,
        weeksPlayed: stats.weeksPlayed,
      } satisfies PlayerOverallStat;
    })
    .filter((row): row is PlayerOverallStat => row !== null)
    .sort((left: PlayerOverallStat, right: PlayerOverallStat) => right.currentRating - left.currentRating);

  return {
    overallStats,
    totalPlayDates: playDates.length,
    totalMatches: matchCount ?? 0,
  };
}

export async function getPlayerAnalyticsBySlug(slug: string, date?: string): Promise<{
  analytics: PlayerAnalytics;
  playDates: PlayDateOption[];
  selectedDate: string | null;
  player: { slug: string; displayName: string };
}> {
  const supabase = createSupabaseAdminClient();
  const playDates = await listProcessedPlayDates();
  const dateSequenceMap = new Map(playDates.map((playDate, index) => [playDate.date, index + 1]));

  const { data: playerRow, error: playerError } = await supabase
    .from('players')
    .select('id, slug, display_name')
    .eq('slug', slug)
    .single();

  if (playerError || !playerRow) {
    throw playerError ?? new Error(`Player "${slug}" not found`);
  }

  const selectedDate = date ?? null;
  const selectedPlayDate = selectedDate ? playDates.find((playDate) => playDate.date === selectedDate) : null;

  let matchQuery = supabase
    .from('matches')
    .select(
      'score1, score2, play_dates ( play_date ), match_participants ( team_number, seat_number, players ( display_name ) )'
    )
    .eq('status', 'processed')
    .order('played_at', { ascending: true });

  if (selectedPlayDate) {
    matchQuery = matchQuery.eq('play_date_id', selectedPlayDate.id);
  }

  const { data: matchRows, error: matchError } = await matchQuery;
  if (matchError) {
    throw matchError;
  }

  const matches = (matchRows ?? [])
    .map((row) => buildMatchShape(row, dateSequenceMap))
    .filter((match): match is Match => match !== null);

  const analytics = calculatePlayerAnalytics(playerRow.display_name, matches);

  return {
    analytics,
    playDates,
    selectedDate,
    player: {
      slug: playerRow.slug,
      displayName: playerRow.display_name,
    },
  };
}
