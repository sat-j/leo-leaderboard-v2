import { Rating, rate, TrueSkill } from 'ts-trueskill';
import { Match, PlayerLevel } from '@/types';

export const TRUESKILL_CONFIG = {
  mu: 25,
  sigma: 8.33,
  beta: 4.17,
  tau: 0.083,
  draw_probability: 0
};

export const INITIAL_RATINGS: { [key in PlayerLevel]: { mu: number; sigma: number } } = {
  BEG: { mu: 10, sigma: 8.33 },
  PLUS: { mu: 20, sigma: 8.33 },
  INT: { mu: 25, sigma: 8.33 },
  ADV: { mu: 35, sigma: 8.33 }
};

const trueskill = new TrueSkill(
  TRUESKILL_CONFIG.mu,
  TRUESKILL_CONFIG.sigma,
  TRUESKILL_CONFIG.beta,
  TRUESKILL_CONFIG.tau,
  TRUESKILL_CONFIG.draw_probability
);

export interface PlayerRatingMap {
  [playerName: string]: Rating;
}

export function initializePlayerRating(level: PlayerLevel): Rating {
  const initial = INITIAL_RATINGS[level];
  return trueskill.createRating(initial.mu, initial.sigma);
}

export function calculateMatchRatings(
  match: Match,
  currentRatings: PlayerRatingMap
): PlayerRatingMap {
  // Get current ratings for all players
  const team1Player1Rating = currentRatings[match.player1];
  const team1Player2Rating = currentRatings[match.player2];
  const team2Player1Rating = currentRatings[match.player3];
  const team2Player2Rating = currentRatings[match.player4];

  // Determine winner (rank 0 = winner, rank 1 = loser)
  const team1Rank = match.score1 > match.score2 ? 0 : 1;
  const team2Rank = match.score1 > match.score2 ? 1 : 0;

  // Rate the match - team ratings
  const [[newTeam1Player1, newTeam1Player2], [newTeam2Player1, newTeam2Player2]] = rate([
    [team1Player1Rating, team1Player2Rating],
    [team2Player1Rating, team2Player2Rating]
  ], [team1Rank, team2Rank]);

  // Return updated ratings
  return {
    ...currentRatings,
    [match.player1]: newTeam1Player1,
    [match.player2]: newTeam1Player2,
    [match.player3]: newTeam2Player1,
    [match.player4]: newTeam2Player2
  };
}

export function calculateWeekRatings(
  matches: Match[],
  initialRatings: PlayerRatingMap
): PlayerRatingMap {
  let currentRatings = { ...initialRatings };
  
  // Process each match sequentially
  for (const match of matches) {
    currentRatings = calculateMatchRatings(match, currentRatings);
  }
  
  return currentRatings;
}

export function createRating(mu: number, sigma: number): Rating {
  return trueskill.createRating(mu, sigma);
}
