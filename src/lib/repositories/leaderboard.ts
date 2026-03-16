import type {
  Match,
  PlayerLevel,
  PlayerPair,
  PlayerRating,
  PlayerWeekStat,
  PublicLeaderboardData,
  RockstarPlayer,
  TopPlayer,
  PlayerGameCount,
  PlayerWinRate,
  PlayDateOption,
} from '@/types';
import { createSupabaseAdminClient } from '@/lib/supabase/admin';

interface SnapshotRow {
  player_id: string;
  play_date_id: string;
  mu: number;
  sigma: number;
  skill_rating: number;
  rating_change: number | null;
  rank_overall: number | null;
  players?: {
    id: string;
    display_name: string;
    level: PlayerLevel;
  } | {
    id: string;
    display_name: string;
    level: PlayerLevel;
  }[];
}

interface PlayerDateStatsRow {
  player_id: string;
  play_date_id: string;
  matches_played: number;
  matches_won: number;
  win_rate: number;
  points_scored: number;
  points_conceded: number;
  points_difference: number;
  rating_change: number;
}

function getSingleRelation<T>(value: T | T[] | null | undefined): T | null {
  if (!value) {
    return null;
  }
  return Array.isArray(value) ? value[0] ?? null : value;
}

function buildMatchShape(
  row: any,
  dateSequenceMap: Map<string, number>
): Match | null {
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

function calculateCloseBuddies(matches: Match[]): PlayerPair[] {
  const pairCounts = new Map<string, number>();

  for (const match of matches) {
    const pair1 = [match.player1, match.player2].sort().join('|');
    const pair2 = [match.player3, match.player4].sort().join('|');
    pairCounts.set(pair1, (pairCounts.get(pair1) ?? 0) + 1);
    pairCounts.set(pair2, (pairCounts.get(pair2) ?? 0) + 1);
  }

  return Array.from(pairCounts.entries())
    .map(([pair, count]) => {
      const [player1, player2] = pair.split('|');
      return { player1, player2, count };
    })
    .sort((left, right) => right.count - left.count)
    .slice(0, 3);
}

function calculateRivalries(matches: Match[]): PlayerPair[] {
  const rivalryCounts = new Map<string, number>();

  for (const match of matches) {
    const team1 = [match.player1, match.player2];
    const team2 = [match.player3, match.player4];

    for (const player1 of team1) {
      for (const player2 of team2) {
        const pair = [player1, player2].sort().join('|');
        rivalryCounts.set(pair, (rivalryCounts.get(pair) ?? 0) + 1);
      }
    }
  }

  return Array.from(rivalryCounts.entries())
    .map(([pair, count]) => {
      const [player1, player2] = pair.split('|');
      return { player1, player2, count };
    })
    .sort((left, right) => right.count - left.count)
    .slice(0, 3);
}

export async function listProcessedPlayDates(): Promise<PlayDateOption[]> {
  const supabase = createSupabaseAdminClient();
  const { data, error } = await supabase
    .from('play_dates')
    .select('id, play_date, label_short, label_long, match_count')
    .eq('is_processed', true)
    .order('play_date', { ascending: true });

  if (error) {
    throw error;
  }

  return (data ?? []).map((row) => ({
    id: row.id,
    date: row.play_date,
    labelShort: row.label_short ?? row.play_date,
    labelLong: row.label_long ?? row.play_date,
    matchCount: row.match_count,
  }));
}

export async function getPublicLeaderboard(date?: string): Promise<PublicLeaderboardData> {
  const supabase = createSupabaseAdminClient();
  const playDates = await listProcessedPlayDates();

  if (playDates.length === 0) {
    throw new Error('No processed play dates found. Run rebuild first.');
  }

  const selectedIndex = date
    ? Math.max(
        0,
        playDates.findIndex((playDate) => playDate.date === date)
      )
    : playDates.length - 1;
  const selectedPlayDate = playDates[selectedIndex] ?? playDates[playDates.length - 1];
  const previousDate = selectedIndex > 0 ? playDates[selectedIndex - 1].date : null;
  const nextDate = selectedIndex < playDates.length - 1 ? playDates[selectedIndex + 1].date : null;
  const previousPlayDateId = selectedIndex > 0 ? playDates[selectedIndex - 1].id : null;
  const eligibleDateIds = playDates.slice(0, selectedIndex + 1).map((playDate) => playDate.id);
  const dateSequenceMap = new Map(playDates.map((playDate, index) => [playDate.date, index + 1]));

  const [{ data: currentSnapshotsRaw, error: snapshotError }, { data: previousSnapshotsRaw, error: previousError }, { data: playerDateStatsRaw, error: statsError }, { data: selectedMatchesRaw, error: selectedMatchesError }, { data: allMatchesRaw, error: allMatchesError }, { data: allSnapshotsRaw, error: allSnapshotsError }] =
    await Promise.all([
      supabase
        .from('rating_snapshots')
        .select('player_id, play_date_id, mu, sigma, skill_rating, rating_change, rank_overall, players ( id, display_name, level )')
        .eq('play_date_id', selectedPlayDate.id),
      previousPlayDateId
        ? supabase
            .from('rating_snapshots')
            .select('player_id, play_date_id, mu, sigma, skill_rating, rating_change, rank_overall, players ( id, display_name, level )')
            .eq('play_date_id', previousPlayDateId)
        : Promise.resolve({ data: [], error: null } as any),
      supabase
        .from('player_date_stats')
        .select('player_id, play_date_id, matches_played, matches_won, win_rate, points_scored, points_conceded, points_difference, rating_change')
        .eq('play_date_id', selectedPlayDate.id),
      supabase
        .from('matches')
        .select(
          'score1, score2, play_dates ( play_date ), match_participants ( team_number, seat_number, players ( display_name ) )'
        )
        .eq('play_date_id', selectedPlayDate.id)
        .eq('status', 'processed')
        .order('played_at', { ascending: true }),
      supabase
        .from('matches')
        .select(
          'score1, score2, play_dates ( play_date ), match_participants ( team_number, seat_number, players ( display_name ) )'
        )
        .in('play_date_id', eligibleDateIds)
        .eq('status', 'processed')
        .order('played_at', { ascending: true }),
      supabase
        .from('rating_snapshots')
        .select('player_id, mu, players ( display_name )')
        .in('play_date_id', eligibleDateIds),
    ]);

  if (snapshotError || previousError || statsError || selectedMatchesError || allMatchesError || allSnapshotsError) {
    throw (
      snapshotError ??
      previousError ??
      statsError ??
      selectedMatchesError ??
      allMatchesError ??
      allSnapshotsError ??
      new Error('Failed to load leaderboard data')
    );
  }

  const currentSnapshots = (currentSnapshotsRaw ?? []) as SnapshotRow[];
  const previousSnapshots = (previousSnapshotsRaw ?? []) as SnapshotRow[];
  const playerDateStats = (playerDateStatsRaw ?? []) as PlayerDateStatsRow[];
  const statsByPlayerId = new Map(playerDateStats.map((row) => [row.player_id, row]));
  const previousSnapshotByPlayerId = new Map(previousSnapshots.map((row) => [row.player_id, row]));

  const topPlayers: TopPlayer[] = currentSnapshots
    .filter((snapshot) => statsByPlayerId.has(snapshot.player_id))
    .map((snapshot) => ({
      playerName: getSingleRelation(snapshot.players)?.display_name ?? 'Unknown',
      ratingGain: snapshot.rating_change ?? 0,
    }))
    .sort((left, right) => right.ratingGain - left.ratingGain)
    .slice(0, 3);

  const mostGamesPlayed: PlayerGameCount[] = playerDateStats
    .map((row) => {
      const snapshot = currentSnapshots.find((entry) => entry.player_id === row.player_id);
      return {
        playerName: getSingleRelation(snapshot?.players)?.display_name ?? 'Unknown',
        gamesPlayed: row.matches_played,
      };
    })
    .sort((left, right) => right.gamesPlayed - left.gamesPlayed)
    .slice(0, 3);

  const bestWinPercentage: PlayerWinRate[] = playerDateStats
    .filter((row) => row.matches_played >= 3)
    .map((row) => {
      const snapshot = currentSnapshots.find((entry) => entry.player_id === row.player_id);
      return {
        playerName: getSingleRelation(snapshot?.players)?.display_name ?? 'Unknown',
        winPercentage: row.win_rate,
        gamesPlayed: row.matches_played,
      };
    })
    .sort((left, right) => right.winPercentage - left.winPercentage)
    .slice(0, 3);

  const levelLeaderboards: { [key in PlayerLevel]?: PlayerRating[] } = { ADV: [], INT: [], PLUS: [] };
  for (const snapshot of currentSnapshots) {
    const player = getSingleRelation(snapshot.players);
    const dateStats = statsByPlayerId.get(snapshot.player_id);
    if (!player || !dateStats || dateStats.matches_played === 0) {
      continue;
    }

    levelLeaderboards[player.level]?.push({
      playerName: player.display_name,
      mu: snapshot.mu,
      sigma: snapshot.sigma,
      week: selectedIndex + 1,
      level: player.level,
      ratingGain: snapshot.rating_change ?? 0,
    });
  }

  (['ADV', 'INT', 'PLUS'] as PlayerLevel[]).forEach((level) => {
    levelLeaderboards[level] = (levelLeaderboards[level] ?? [])
      .sort((left, right) => (right.ratingGain ?? 0) - (left.ratingGain ?? 0))
      .slice(0, 5);
  });

  const playerWeekStats: PlayerWeekStat[] = currentSnapshots
    .filter((snapshot) => statsByPlayerId.has(snapshot.player_id))
    .map((snapshot) => {
      const player = getSingleRelation(snapshot.players);
      const stats = statsByPlayerId.get(snapshot.player_id)!;
      return {
        playerName: player?.display_name ?? 'Unknown',
        level: player?.level ?? 'INT',
        skillRating: snapshot.skill_rating,
        totalMatches: stats.matches_played,
        matchesWon: stats.matches_won,
        winRate: stats.win_rate,
        totalPointsScored: stats.points_scored,
        pointsDifference: stats.points_difference,
        ratingChange: snapshot.mu - (previousSnapshotByPlayerId.get(snapshot.player_id)?.mu ?? snapshot.mu),
      };
    })
    .sort((left, right) => right.skillRating - left.skillRating);

  const allMatches = (allMatchesRaw ?? [])
    .map((row) => buildMatchShape(row, dateSequenceMap))
    .filter((match): match is Match => match !== null);
  const selectedMatches = (selectedMatchesRaw ?? [])
    .map((row) => buildMatchShape(row, dateSequenceMap))
    .filter((match): match is Match => match !== null);

  const snapshotHistory = new Map<string, { displayName: string; firstMu: number; latestMu: number }>();
  for (const row of allSnapshotsRaw ?? []) {
    const player = getSingleRelation((row as any).players);
    if (!player) {
      continue;
    }
    const existing = snapshotHistory.get(row.player_id);
    if (!existing) {
      snapshotHistory.set(row.player_id, {
        displayName: player.display_name,
        firstMu: Number(row.mu),
        latestMu: Number(row.mu),
      });
    } else {
      existing.latestMu = Number(row.mu);
    }
  }

  const rockstars: RockstarPlayer[] = Array.from(snapshotHistory.values())
    .map((entry) => ({
      playerName: entry.displayName,
      week1Rating: entry.firstMu,
      currentRating: entry.latestMu,
      improvement: entry.latestMu - entry.firstMu,
    }))
    .sort((left, right) => right.improvement - left.improvement)
    .slice(0, 3);

  return {
    selectedDate: selectedPlayDate.date,
    selectedDateLabel: selectedPlayDate.labelShort,
    previousDate,
    nextDate,
    playDates,
    weekStats: {
      week: selectedIndex + 1,
      gamesPlayed: selectedMatches.length,
      topPlayers,
      mostGamesPlayed,
      bestWinPercentage,
    },
    levelLeaderboards,
    rockstars,
    closeBuddies: calculateCloseBuddies(allMatches),
    rivalries: calculateRivalries(allMatches),
    matches: selectedMatches,
    playerWeekStats,
  };
}
