import { Match, PlayerRating, TopPlayer, PlayerGameCount, PlayerWinRate, PlayerPair, RockstarPlayer, PlayerLevel } from '@/types';

export function calculateTopPlayersByGain(
  matches: Match[],
  week: number,
  previousRatings: Map<string, PlayerRating>,
  currentRatings: Map<string, PlayerRating>
): TopPlayer[] {
  const weekMatches = matches.filter(m => m.weekNumber === week);
  const playersInWeek = new Set<string>();
  
  weekMatches.forEach(match => {
    playersInWeek.add(match.player1);
    playersInWeek.add(match.player2);
    playersInWeek.add(match.player3);
    playersInWeek.add(match.player4);
  });

  const gains: TopPlayer[] = [];
  playersInWeek.forEach(playerName => {
    const prevRating = previousRatings.get(playerName);
    const currRating = currentRatings.get(playerName);
    
    if (prevRating && currRating) {
      gains.push({
        playerName,
        ratingGain: currRating.mu - prevRating.mu
      });
    }
  });

  return gains.sort((a, b) => b.ratingGain - a.ratingGain).slice(0, 3);
}

export function calculateMostGamesPlayed(matches: Match[], week: number): PlayerGameCount[] {
  const weekMatches = matches.filter(m => m.weekNumber === week);
  const gameCounts = new Map<string, number>();

  weekMatches.forEach(match => {
    [match.player1, match.player2, match.player3, match.player4].forEach(player => {
      gameCounts.set(player, (gameCounts.get(player) || 0) + 1);
    });
  });

  return Array.from(gameCounts.entries())
    .map(([playerName, gamesPlayed]) => ({ playerName, gamesPlayed }))
    .sort((a, b) => b.gamesPlayed - a.gamesPlayed)
    .slice(0, 3);
}

export function calculateBestWinPercentage(matches: Match[], week: number): PlayerWinRate[] {
  const weekMatches = matches.filter(m => m.weekNumber === week);
  const playerStats = new Map<string, { wins: number; total: number }>();

  weekMatches.forEach(match => {
    const team1Won = match.score1 > match.score2;
    
    [match.player1, match.player2].forEach(player => {
      const stats = playerStats.get(player) || { wins: 0, total: 0 };
      stats.total += 1;
      if (team1Won) stats.wins += 1;
      playerStats.set(player, stats);
    });

    [match.player3, match.player4].forEach(player => {
      const stats = playerStats.get(player) || { wins: 0, total: 0 };
      stats.total += 1;
      if (!team1Won) stats.wins += 1;
      playerStats.set(player, stats);
    });
  });

  const winRates: PlayerWinRate[] = [];
  playerStats.forEach((stats, playerName) => {
    if (stats.total >= 3) {
      winRates.push({
        playerName,
        winPercentage: (stats.wins / stats.total) * 100,
        gamesPlayed: stats.total
      });
    }
  });

  return winRates.sort((a, b) => b.winPercentage - a.winPercentage).slice(0, 3);
}

export function calculateMostImproved(
  week1Ratings: Map<string, PlayerRating>,
  currentRatings: Map<string, PlayerRating>
): RockstarPlayer[] {
  const improvements: RockstarPlayer[] = [];
  
  currentRatings.forEach((currRating, playerName) => {
    const week1Rating = week1Ratings.get(playerName);
    if (week1Rating) {
      improvements.push({
        playerName,
        week1Rating: week1Rating.mu,
        currentRating: currRating.mu,
        improvement: currRating.mu - week1Rating.mu
      });
    }
  });

  return improvements.sort((a, b) => b.improvement - a.improvement).slice(0, 3);
}

export function calculateCloseBuddies(matches: Match[], upToWeek: number): PlayerPair[] {
  const pairCounts = new Map<string, number>();
  
  matches.filter(m => m.weekNumber <= upToWeek).forEach(match => {
    // Team 1
    const pair1 = [match.player1, match.player2].sort().join('|');
    pairCounts.set(pair1, (pairCounts.get(pair1) || 0) + 1);
    
    // Team 2
    const pair2 = [match.player3, match.player4].sort().join('|');
    pairCounts.set(pair2, (pairCounts.get(pair2) || 0) + 1);
  });

  return Array.from(pairCounts.entries())
    .map(([pair, count]) => {
      const [player1, player2] = pair.split('|');
      return { player1, player2, count };
    })
    .sort((a, b) => b.count - a.count)
    .slice(0, 3);
}

export function calculateRivalries(matches: Match[], upToWeek: number): PlayerPair[] {
  const rivalryCounts = new Map<string, number>();
  
  matches.filter(m => m.weekNumber <= upToWeek).forEach(match => {
    const team1 = [match.player1, match.player2];
    const team2 = [match.player3, match.player4];
    
    // Count each player from team1 vs each player from team2
    team1.forEach(p1 => {
      team2.forEach(p2 => {
        const pair = [p1, p2].sort().join('|');
        rivalryCounts.set(pair, (rivalryCounts.get(pair) || 0) + 1);
      });
    });
  });

  return Array.from(rivalryCounts.entries())
    .map(([pair, count]) => {
      const [player1, player2] = pair.split('|');
      return { player1, player2, count };
    })
    .sort((a, b) => b.count - a.count)
    .slice(0, 3);
}

export function getLevelLeaderboards(
  ratings: Map<string, PlayerRating>,
  players: Map<string, PlayerLevel>,
  matches: Match[],
  currentWeek: number
): { [key in PlayerLevel]?: PlayerRating[] } {
  const leaderboards: { [key in PlayerLevel]?: PlayerRating[] } = {};
  
  // Get players who played in the current week
  const playersWhoPlayed = new Set<string>();
  matches
    .filter(m => m.weekNumber === currentWeek)
    .forEach(match => {
      playersWhoPlayed.add(match.player1);
      playersWhoPlayed.add(match.player2);
      playersWhoPlayed.add(match.player3);
      playersWhoPlayed.add(match.player4);
    });
  
  // Group players by level
  const levels: PlayerLevel[] = ['ADV', 'INT', 'PLUS', 'BEG'];
  
  levels.forEach(level => {
    const levelPlayers: PlayerRating[] = [];
    
    ratings.forEach((rating, playerName) => {
      if (players.get(playerName) === level && playersWhoPlayed.has(playerName)) {
        levelPlayers.push(rating);
      }
    });
    
    leaderboards[level] = levelPlayers
      .sort((a, b) => b.mu - a.mu)
      .slice(0, 5);
  });
  
  return leaderboards;
}
