// TypeScript type definitions

export interface Game {
  id: string;
  name: string;
  date: Date;
}

export interface PlayerRating {
  playerId: string;
  rating: number;
  deviation: number;
}

export interface WeekStats {
  week: number;
  gamesPlayed: number;
  averageRating: number;
}

export interface PlayerStats {
  playerId: string;
  stats: WeekStats[];
}