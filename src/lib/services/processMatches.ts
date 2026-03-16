import { Rating, rate } from 'ts-trueskill';
import { createSupabaseAdminClient } from '@/lib/supabase/admin';
import { getErrorMessage } from '@/lib/errors';
import { listMatchesForProcessing } from '@/lib/repositories/matches';
import type { ProcessingRunSummary } from '@/lib/repositories/processingRuns';

interface ProcessingPlayer {
  id: string;
  displayName: string;
  level: 'PLUS' | 'INT' | 'ADV';
  initialMu: number;
  initialSigma: number;
}

interface ProcessingParticipant {
  player: ProcessingPlayer;
  teamNumber: number;
  seatNumber: number;
}

interface ProcessingMatch {
  id: string;
  playedAt: string;
  playDateId: string;
  playDate: string;
  score1: number;
  score2: number;
  participants: ProcessingParticipant[];
}

interface DailyPlayerAccumulator {
  matchesPlayed: number;
  matchesWon: number;
  pointsScored: number;
  pointsConceded: number;
}

function chunkArray<T>(items: T[], size: number): T[][] {
  const chunks: T[][] = [];
  for (let index = 0; index < items.length; index += size) {
    chunks.push(items.slice(index, index + size));
  }
  return chunks;
}

function normalizeMatchRows(rows: Awaited<ReturnType<typeof listMatchesForProcessing>>): ProcessingMatch[] {
  return rows
    .map((row) => {
      const playDateRow = Array.isArray(row.play_dates) ? row.play_dates[0] : row.play_dates;
      const participants = (row.match_participants ?? [])
        .map((participant) => {
          const playerRow = Array.isArray(participant.players) ? participant.players[0] : participant.players;
          if (!playerRow) {
            return null;
          }

          return {
            teamNumber: participant.team_number,
            seatNumber: participant.seat_number,
            player: {
              id: playerRow.id,
              displayName: playerRow.display_name,
              level: playerRow.level,
              initialMu: Number(playerRow.initial_mu),
              initialSigma: Number(playerRow.initial_sigma),
            },
          };
        })
        .filter((participant): participant is ProcessingParticipant => participant !== null)
        .sort((left, right) => {
          if (left.teamNumber !== right.teamNumber) {
            return left.teamNumber - right.teamNumber;
          }
          return left.seatNumber - right.seatNumber;
        });

      if (!playDateRow || participants.length !== 4) {
        return null;
      }

      return {
        id: row.id,
        playedAt: row.played_at,
        playDateId: playDateRow.id,
        playDate: playDateRow.play_date,
        score1: row.score1,
        score2: row.score2,
        participants,
      };
    })
    .filter((match): match is ProcessingMatch => match !== null);
}

function skillRating(rating: Rating) {
  return rating.mu - 3 * rating.sigma;
}

export async function rebuildAllProcessedData(processingRunId: string): Promise<ProcessingRunSummary> {
  const supabase = createSupabaseAdminClient();
  let rawMatches;
  try {
    rawMatches = await listMatchesForProcessing();
  } catch (error) {
    throw new Error(`Failed loading raw matches: ${getErrorMessage(error)}`);
  }
  const matches = normalizeMatchRows(rawMatches);

  const ratings = new Map<string, Rating>();
  const playerMeta = new Map<string, ProcessingPlayer>();
  const warnings: string[] = [];

  for (const match of matches) {
    for (const participant of match.participants) {
      playerMeta.set(participant.player.id, participant.player);
      if (!ratings.has(participant.player.id)) {
        ratings.set(participant.player.id, new Rating(participant.player.initialMu, participant.player.initialSigma));
      }
    }
  }

  const matchesByDate = new Map<string, ProcessingMatch[]>();
  for (const match of matches) {
    const dateMatches = matchesByDate.get(match.playDateId) ?? [];
    dateMatches.push(match);
    matchesByDate.set(match.playDateId, dateMatches);
  }

  const sortedDates = Array.from(matchesByDate.entries()).sort((left, right) => {
    return left[1][0].playDate.localeCompare(right[1][0].playDate);
  });

  const ratingSnapshotRows: Array<{
    player_id: string;
    play_date_id: string;
    processing_run_id: string;
    mu: number;
    sigma: number;
    skill_rating: number;
    rating_change: number;
    rank_overall: number;
  }> = [];
  const playerDateStatRows: Array<{
    player_id: string;
    play_date_id: string;
    matches_played: number;
    matches_won: number;
    win_rate: number;
    points_scored: number;
    points_conceded: number;
    points_difference: number;
    rating_change: number;
  }> = [];
  const processedMatchIds: string[] = [];

  for (const [playDateId, dateMatches] of sortedDates) {
    const dailyStats = new Map<string, DailyPlayerAccumulator>();
    const previousMu = new Map<string, number>();

    for (const [playerId, rating] of ratings.entries()) {
      previousMu.set(playerId, rating.mu);
    }

    for (const match of dateMatches.sort((left, right) => left.playedAt.localeCompare(right.playedAt))) {
      if (match.participants.length !== 4) {
        warnings.push(`Skipped match ${match.id}: expected 4 participants.`);
        continue;
      }

      const team1Participants = match.participants.filter((participant) => participant.teamNumber === 1);
      const team2Participants = match.participants.filter((participant) => participant.teamNumber === 2);

      if (team1Participants.length !== 2 || team2Participants.length !== 2) {
        warnings.push(`Skipped match ${match.id}: invalid team layout.`);
        continue;
      }

      const team1 = team1Participants.map((participant) => ratings.get(participant.player.id) ?? new Rating(participant.player.initialMu, participant.player.initialSigma));
      const team2 = team2Participants.map((participant) => ratings.get(participant.player.id) ?? new Rating(participant.player.initialMu, participant.player.initialSigma));
      const ranks = match.score1 > match.score2 ? [1, 2] : [2, 1];

      const [[nextTeam1Player1, nextTeam1Player2], [nextTeam2Player1, nextTeam2Player2]] = rate([team1, team2], ranks);

      const nextRatings = [
        [team1Participants[0].player.id, nextTeam1Player1],
        [team1Participants[1].player.id, nextTeam1Player2],
        [team2Participants[0].player.id, nextTeam2Player1],
        [team2Participants[1].player.id, nextTeam2Player2],
      ] as const;

      for (const [playerId, nextRating] of nextRatings) {
        ratings.set(playerId, nextRating);
      }

      const team1Won = match.score1 > match.score2;
      for (const participant of team1Participants) {
        const current = dailyStats.get(participant.player.id) ?? {
          matchesPlayed: 0,
          matchesWon: 0,
          pointsScored: 0,
          pointsConceded: 0,
        };
        current.matchesPlayed += 1;
        current.pointsScored += match.score1;
        current.pointsConceded += match.score2;
        if (team1Won) {
          current.matchesWon += 1;
        }
        dailyStats.set(participant.player.id, current);
      }

      for (const participant of team2Participants) {
        const current = dailyStats.get(participant.player.id) ?? {
          matchesPlayed: 0,
          matchesWon: 0,
          pointsScored: 0,
          pointsConceded: 0,
        };
        current.matchesPlayed += 1;
        current.pointsScored += match.score2;
        current.pointsConceded += match.score1;
        if (!team1Won) {
          current.matchesWon += 1;
        }
        dailyStats.set(participant.player.id, current);
      }

      processedMatchIds.push(match.id);
    }

    const rankedPlayers = Array.from(ratings.entries())
      .map(([playerId, rating]) => ({
        playerId,
        rating,
        skill: skillRating(rating),
      }))
      .sort((left, right) => right.skill - left.skill);

    rankedPlayers.forEach((entry, index) => {
      ratingSnapshotRows.push({
        player_id: entry.playerId,
        play_date_id: playDateId,
        processing_run_id: processingRunId,
        mu: Number(entry.rating.mu.toFixed(3)),
        sigma: Number(entry.rating.sigma.toFixed(3)),
        skill_rating: Number(entry.skill.toFixed(3)),
        rating_change: Number((entry.rating.mu - (previousMu.get(entry.playerId) ?? entry.rating.mu)).toFixed(3)),
        rank_overall: index + 1,
      });
    });

    for (const [playerId, stats] of dailyStats.entries()) {
      const currentRating = ratings.get(playerId);
      const previous = previousMu.get(playerId) ?? currentRating?.mu ?? 0;
      const currentMu = currentRating?.mu ?? previous;
      playerDateStatRows.push({
        player_id: playerId,
        play_date_id: playDateId,
        matches_played: stats.matchesPlayed,
        matches_won: stats.matchesWon,
        win_rate: Number(((stats.matchesWon / stats.matchesPlayed) * 100).toFixed(2)),
        points_scored: stats.pointsScored,
        points_conceded: stats.pointsConceded,
        points_difference: stats.pointsScored - stats.pointsConceded,
        rating_change: Number((currentMu - previous).toFixed(3)),
      });
    }
  }

  const { error: deleteSnapshotsError } = await supabase.from('rating_snapshots').delete().gte('created_at', '1970-01-01T00:00:00+00:00');
  if (deleteSnapshotsError) {
    throw new Error(`Failed clearing rating_snapshots: ${getErrorMessage(deleteSnapshotsError)}`);
  }

  const { error: deleteStatsError } = await supabase.from('player_date_stats').delete().gte('created_at', '1970-01-01T00:00:00+00:00');
  if (deleteStatsError) {
    throw new Error(`Failed clearing player_date_stats: ${getErrorMessage(deleteStatsError)}`);
  }

  if (ratingSnapshotRows.length > 0) {
    const { error: snapshotInsertError } = await supabase.from('rating_snapshots').insert(ratingSnapshotRows);
    if (snapshotInsertError) {
      throw new Error(`Failed inserting rating_snapshots: ${getErrorMessage(snapshotInsertError)}`);
    }
  }

  if (playerDateStatRows.length > 0) {
    const { error: statsInsertError } = await supabase.from('player_date_stats').insert(playerDateStatRows);
    if (statsInsertError) {
      throw new Error(`Failed inserting player_date_stats: ${getErrorMessage(statsInsertError)}`);
    }
  }

  if (processedMatchIds.length > 0) {
    for (const matchIdChunk of chunkArray(processedMatchIds, 200)) {
      const { error: updateMatchesError } = await supabase
        .from('matches')
        .update({ status: 'processed' })
        .in('id', matchIdChunk);

      if (updateMatchesError) {
        throw new Error(`Failed updating match statuses: ${getErrorMessage(updateMatchesError)}`);
      }
    }
  }

  const processedDateIds = sortedDates.map(([playDateId]) => playDateId);
  if (processedDateIds.length > 0) {
    for (const playDateIdChunk of chunkArray(processedDateIds, 200)) {
      const { error: updateDatesError } = await supabase
        .from('play_dates')
        .update({
          is_processed: true,
          last_processed_at: new Date().toISOString(),
        })
        .in('id', playDateIdChunk);

      if (updateDatesError) {
        throw new Error(`Failed updating play_dates: ${getErrorMessage(updateDatesError)}`);
      }
    }
  }

  return {
    matchesProcessed: processedMatchIds.length,
    playDatesProcessed: sortedDates.length,
    snapshotsWritten: ratingSnapshotRows.length,
    playerDateStatsWritten: playerDateStatRows.length,
    warnings,
  };
}
