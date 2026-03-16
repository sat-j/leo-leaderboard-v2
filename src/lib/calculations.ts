import { Match, PlayerRating, TopPlayer, PlayerGameCount, PlayerWinRate, PlayerPair, RockstarPlayer, PlayerLevel, PlayerWeekStat, PlayerOverallStat } from '@/types';

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
  previousRatings: Map<string, PlayerRating>,
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
  const levels: PlayerLevel[] = ['ADV', 'INT', 'PLUS'];
  
  levels.forEach(level => {
    const levelPlayers: PlayerRating[] = [];
    
    ratings.forEach((rating, playerName) => {
      if (players.get(playerName) === level && playersWhoPlayed.has(playerName)) {
        const prevRating = previousRatings.get(playerName);
        const ratingGain = prevRating ? rating.mu - prevRating.mu : undefined;
        
        levelPlayers.push({
          ...rating,
          ratingGain
        });
      }
    });
    
    // Sort by rating gain (current mu - previous mu) descending
    leaderboards[level] = levelPlayers
      .sort((a, b) => {
        const prevA = previousRatings.get(a.playerName);
        const prevB = previousRatings.get(b.playerName);
        // Previous ratings should always exist now (either from previous week or initial)
        const gainA = a.mu - (prevA?.mu ?? 25); // fallback to default initial rating
        const gainB = b.mu - (prevB?.mu ?? 25);
        return gainB - gainA;
      })
      .slice(0, 5);
  });
  
  return leaderboards;
}

export function calculatePlayerWeekStats(
  matches: Match[],
  week: number,
  currentRatings: Map<string, PlayerRating>,
  previousRatings: Map<string, PlayerRating>,
  playerLevels: Map<string, PlayerLevel>
): PlayerWeekStat[] {
  const weekMatches = matches.filter(m => m.weekNumber === week);
  const playerStats = new Map<string, {
    totalMatches: number;
    matchesWon: number;
    totalPointsScored: number;
    totalPointsConceded: number;
  }>();

  // Initialize stats for all players in the week
  weekMatches.forEach(match => {
    [match.player1, match.player2, match.player3, match.player4].forEach(player => {
      if (!playerStats.has(player)) {
        playerStats.set(player, {
          totalMatches: 0,
          matchesWon: 0,
          totalPointsScored: 0,
          totalPointsConceded: 0
        });
      }
    });
  });

  // Calculate stats from matches
  weekMatches.forEach(match => {
    const team1Won = match.score1 > match.score2;
    
    // Team 1 players
    [match.player1, match.player2].forEach(player => {
      const stats = playerStats.get(player)!;
      stats.totalMatches += 1;
      stats.totalPointsScored += match.score1;
      stats.totalPointsConceded += match.score2;
      if (team1Won) stats.matchesWon += 1;
    });

    // Team 2 players
    [match.player3, match.player4].forEach(player => {
      const stats = playerStats.get(player)!;
      stats.totalMatches += 1;
      stats.totalPointsScored += match.score2;
      stats.totalPointsConceded += match.score1;
      if (!team1Won) stats.matchesWon += 1;
    });
  });

  // Convert to PlayerWeekStat array
  const result: PlayerWeekStat[] = [];
  playerStats.forEach((stats, playerName) => {
    const currentRating = currentRatings.get(playerName);
    const previousRating = previousRatings.get(playerName);
    const level = playerLevels.get(playerName) || 'INT';
    
    if (currentRating) {
      // Calculate skill rating (mu - 3*sigma)
      const skillRating = currentRating.mu - 3 * currentRating.sigma;
      
      // Calculate rating change
      const ratingChange = previousRating 
        ? currentRating.mu - previousRating.mu 
        : 0;
      
      result.push({
        playerName,
        level,
        skillRating,
        totalMatches: stats.totalMatches,
        matchesWon: stats.matchesWon,
        winRate: stats.totalMatches > 0 ? (stats.matchesWon / stats.totalMatches) * 100 : 0,
        totalPointsScored: stats.totalPointsScored,
        pointsDifference: stats.totalPointsScored - stats.totalPointsConceded,
        ratingChange
      });
    }
  });

  // Sort by skill rating descending
  return result.sort((a, b) => b.skillRating - a.skillRating);
}

export function calculatePlayerOverallStats(
  allMatches: Match[],
  allWeekRatings: Map<number, Map<string, PlayerRating>>,
  playerLevels: Map<string, PlayerLevel>
): PlayerOverallStat[] {
  // Get all unique players who have played
  const allPlayers = new Set<string>();
  allMatches.forEach(match => {
    allPlayers.add(match.player1);
    allPlayers.add(match.player2);
    allPlayers.add(match.player3);
    allPlayers.add(match.player4);
  });

  const result: PlayerOverallStat[] = [];

  allPlayers.forEach(playerName => {
    let totalMatches = 0;
    let matchesWon = 0;
    let totalPointsScored = 0;
    let totalPointsConceded = 0;
    const weeksPlayed = new Set<number>();

    // Calculate stats across all matches
    allMatches.forEach(match => {
      const isInMatch = [match.player1, match.player2, match.player3, match.player4].includes(playerName);
      if (!isInMatch) return;

      weeksPlayed.add(match.weekNumber);
      totalMatches += 1;

      const team1Won = match.score1 > match.score2;
      const isTeam1 = [match.player1, match.player2].includes(playerName);
      
      if (isTeam1) {
        totalPointsScored += match.score1;
        totalPointsConceded += match.score2;
        if (team1Won) matchesWon += 1;
      } else {
        totalPointsScored += match.score2;
        totalPointsConceded += match.score1;
        if (!team1Won) matchesWon += 1;
      }
    });

    // Get current rating (latest week)
    const sortedWeeks = Array.from(allWeekRatings.keys()).sort((a, b) => b - a);
    let currentRating: PlayerRating | undefined;
    let initialRating: PlayerRating | undefined;
    
    for (const week of sortedWeeks) {
      const weekRatings = allWeekRatings.get(week)!;
      if (weekRatings.has(playerName)) {
        currentRating = weekRatings.get(playerName);
        break;
      }
    }

    // Get initial rating (first week)
    const sortedWeeksAsc = sortedWeeks.slice().reverse();
    for (const week of sortedWeeksAsc) {
      const weekRatings = allWeekRatings.get(week)!;
      if (weekRatings.has(playerName)) {
        initialRating = weekRatings.get(playerName);
        break;
      }
    }

    if (currentRating) {
      const level = playerLevels.get(playerName) || 'INT';
      const currentSkillRating = currentRating.mu - 3 * currentRating.sigma;
      const totalRatingChange = initialRating 
        ? currentRating.mu - initialRating.mu 
        : 0;

      result.push({
        playerName,
        level,
        currentRating: currentSkillRating,
        totalMatches,
        matchesWon,
        winRate: totalMatches > 0 ? (matchesWon / totalMatches) * 100 : 0,
        totalPointsScored,
        pointsDifference: totalPointsScored - totalPointsConceded,
        totalRatingChange,
        weeksPlayed: weeksPlayed.size
      });
    }
  });

  // Sort by current rating descending
  return result.sort((a, b) => b.currentRating - a.currentRating);
}
