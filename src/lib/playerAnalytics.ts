import { Match } from '@/types';

export interface PartnershipStat {
  partner: string;
  wins: number;
  losses: number;
  totalMatches: number;
  winRate: number;
  verdict: string;
}

export interface OpponentStat {
  opponent: string;
  wins: number;
  losses: number;
}

export interface PlayerAnalytics {
  playerName: string;
  totalMatches: number;
  wins: number;
  losses: number;
  winRate: number;
  overallAvgWinRate: number;
  partnerships: PartnershipStat[];
  opponents: OpponentStat[];
}

function getPartnershipVerdict(wins: number, losses: number): string {
  if (wins >= 5 && losses === 0) return '🔥 Unbeatable combo!';
  if (wins >= 4 && losses <= 1) return '💪 Very strong pair';
  if (wins >= 2 && losses === 0) return '✅ Solid';
  if (wins === 0 && losses >= 3) return '👀 Needs more sync.';
  if (wins === 0 && losses >= 1) return '👀 Dont lose hope!';
  return '';
}

export function calculatePlayerAnalytics(playerName: string, allMatches: Match[]): PlayerAnalytics {
  let wins = 0;
  let losses = 0;

  const partnerMap = new Map<string, { wins: number; losses: number }>();
  const opponentMap = new Map<string, { wins: number; losses: number }>();

  allMatches.forEach(match => {
    const team1 = [match.player1, match.player2];
    const team2 = [match.player3, match.player4];

    const inTeam1 = team1.includes(playerName);
    const inTeam2 = team2.includes(playerName);

    if (!inTeam1 && !inTeam2) return;

    const team1Won = match.score1 > match.score2;
    const playerWon = (inTeam1 && team1Won) || (inTeam2 && !team1Won);

    if (playerWon) wins++;
    else losses++;

    // Partnership stats
    const teammates = inTeam1
      ? team1.filter(p => p !== playerName)
      : team2.filter(p => p !== playerName);

    teammates.forEach(partner => {
      const stat = partnerMap.get(partner) || { wins: 0, losses: 0 };
      if (playerWon) stat.wins++;
      else stat.losses++;
      partnerMap.set(partner, stat);
    });

    // Opponent stats
    const opponents = inTeam1 ? team2 : team1;
    opponents.forEach(opponent => {
      const stat = opponentMap.get(opponent) || { wins: 0, losses: 0 };
      if (playerWon) stat.wins++;
      else stat.losses++;
      opponentMap.set(opponent, stat);
    });
  });

  const totalMatches = wins + losses;
  const winRate = totalMatches > 0 ? (wins / totalMatches) * 100 : 0;

  // Calculate overall average win rate across all players
  const allPlayerWins = new Map<string, number>();
  const allPlayerMatches = new Map<string, number>();
  allMatches.forEach(match => {
    const team1Won = match.score1 > match.score2;
    [match.player1, match.player2].forEach(p => {
      allPlayerMatches.set(p, (allPlayerMatches.get(p) || 0) + 1);
      if (team1Won) allPlayerWins.set(p, (allPlayerWins.get(p) || 0) + 1);
    });
    [match.player3, match.player4].forEach(p => {
      allPlayerMatches.set(p, (allPlayerMatches.get(p) || 0) + 1);
      if (!team1Won) allPlayerWins.set(p, (allPlayerWins.get(p) || 0) + 1);
    });
  });

  let totalWinRateSum = 0;
  let totalPlayers = 0;
  allPlayerMatches.forEach((matches, player) => {
    if (matches > 0) {
      totalWinRateSum += ((allPlayerWins.get(player) || 0) / matches) * 100;
      totalPlayers++;
    }
  });
  const overallAvgWinRate = totalPlayers > 0 ? totalWinRateSum / totalPlayers : 50;

  const partnerships: PartnershipStat[] = Array.from(partnerMap.entries())
    .map(([partner, stat]) => ({
      partner,
      wins: stat.wins,
      losses: stat.losses,
      totalMatches: stat.wins + stat.losses,
      winRate: stat.wins + stat.losses > 0 ? (stat.wins / (stat.wins + stat.losses)) * 100 : 0,
      verdict: getPartnershipVerdict(stat.wins, stat.losses),
    }))
    .sort((a, b) => b.winRate - a.winRate || b.wins - a.wins);

  const opponents: OpponentStat[] = Array.from(opponentMap.entries())
    .map(([opponent, stat]) => ({
      opponent,
      wins: stat.wins,
      losses: stat.losses,
    }));

  return {
    playerName,
    totalMatches,
    wins,
    losses,
    winRate,
    overallAvgWinRate,
    partnerships,
    opponents,
  };
}
