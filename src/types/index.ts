// TypeScript type definitions

export type PlayerLevel = 'PLUS' | 'INT' | 'ADV';

export interface Rating {
  mu: number;
  sigma: number;
}

export interface Player {
  name: string;
  level: PlayerLevel;
  initialMu: number;
  initialSigma: number;
}

export interface Match {
  weekNumber: number;
  player1: string;
  player2: string;
  player3: string;
  player4: string;
  score1: number;
  score2: number;
}

export interface PlayerRating extends Rating {
  playerName: string;
  week: number;
  level: PlayerLevel;
  ratingGain?: number;
}

export interface WeekStats {
  week: number;
  gamesPlayed: number;
  topPlayers: TopPlayer[];
  mostGamesPlayed: PlayerGameCount[];
  bestWinPercentage: PlayerWinRate[];
}

export interface TopPlayer {
  playerName: string;
  ratingGain: number;
}

export interface PlayerGameCount {
  playerName: string;
  gamesPlayed: number;
}

export interface PlayerWinRate {
  playerName: string;
  winPercentage: number;
  gamesPlayed: number;
}

export interface PlayerPair {
  player1: string;
  player2: string;
  count: number;
}

export interface RockstarPlayer {
  playerName: string;
  week1Rating: number;
  currentRating: number;
  improvement: number;
}

export interface PlayerWeekStat {
  playerName: string;
  level: PlayerLevel;
  skillRating: number;
  totalMatches: number;
  matchesWon: number;
  winRate: number;
  totalPointsScored: number;
  pointsDifference: number;
  ratingChange: number;
}

export interface PlayerOverallStat {
  playerName: string;
  level: PlayerLevel;
  currentRating: number;
  totalMatches: number;
  matchesWon: number;
  winRate: number;
  totalPointsScored: number;
  pointsDifference: number;
  totalRatingChange: number;
  weeksPlayed: number;
}

export interface LeaderboardData {
  currentWeek: number;
  weekStats: WeekStats;
  levelLeaderboards: {
    [key in PlayerLevel]?: PlayerRating[];
  };
  rockstars: RockstarPlayer[];
  closeBuddies: PlayerPair[];
  rivalries: PlayerPair[];
  matches: Match[];
  playerWeekStats?: PlayerWeekStat[];
}

export interface PlayDateOption {
  id: string;
  date: string;
  labelShort: string;
  labelLong: string;
  matchCount: number;
}

export interface PublicLeaderboardData extends Omit<LeaderboardData, 'currentWeek'> {
  selectedDate: string;
  selectedDateLabel: string;
  previousDate: string | null;
  nextDate: string | null;
  playDates: PlayDateOption[];
}
