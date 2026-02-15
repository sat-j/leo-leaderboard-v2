import { rate, Rating } from 'ts-trueskill';
import { Match, Player } from '@/types';

interface PlayerRatingMap {
  [playerName: string]: Rating;
}

// TrueSkill configuration
const TRUESKILL_CONFIG = {
  mu: 25,
  sigma: 8.33,
  beta: 4.17,
  tau: 0.083,
};

// Helper function to normalize player names (trim whitespace, handle case)
function normalizePlayerName(name: string): string {
  return name.trim();
}

export function calculateWeekRatings(
  matches: Match[],
  initialRatings: PlayerRatingMap
): PlayerRatingMap {
  console.log(`\n🎯 Starting rating calculation`);
  console.log(`📊 Initial ratings count: ${Object.keys(initialRatings).length}`);
  console.log(`🏸 Matches to process: ${matches.length}`);

  // Normalize all keys in initialRatings
  const normalizedRatings: PlayerRatingMap = {};
  for (const [playerName, rating] of Object.entries(initialRatings)) {
    normalizedRatings[normalizePlayerName(playerName)] = rating;
  }

  let currentRatings = { ...normalizedRatings };

  console.log('📋 Available players:', Object.keys(currentRatings).slice(0, 5).join(', '), '...');

  // Process each match
  let matchCount = 0;
  let skippedMatches = 0;
  
  for (const match of matches) {
    matchCount++;
    
    // Normalize player names - handle both uppercase and lowercase property names
    const Player1 = normalizePlayerName((match as any).Player1 || (match as any).player1);
    const Player2 = normalizePlayerName((match as any).Player2 || (match as any).player2);
    const Player3 = normalizePlayerName((match as any).Player3 || (match as any).player3);
    const Player4 = normalizePlayerName((match as any).Player4 || (match as any).player4);

    // Validate all players exist in ratings
    const missingPlayers = [];
    if (!currentRatings[Player1]) missingPlayers.push(Player1);
    if (!currentRatings[Player2]) missingPlayers.push(Player2);
    if (!currentRatings[Player3]) missingPlayers.push(Player3);
    if (!currentRatings[Player4]) missingPlayers.push(Player4);

    if (missingPlayers.length > 0) {
      console.warn(`⚠️ Match ${matchCount}: Skipping - Players not found in Players tab:`, missingPlayers);
      console.warn(`   Available players start with:`, Object.keys(currentRatings).slice(0, 3));
      skippedMatches++;
      continue;
    }

    // Validate ratings have required properties
    const playersToCheck = [Player1, Player2, Player3, Player4];
    let hasError = false;
    
    for (const playerName of playersToCheck) {
      const playerRating = currentRatings[playerName];
      if (!playerRating) {
        console.error(`❌ Player ${playerName} has no rating`);
        hasError = true;
        break;
      }
      if (playerRating.mu === undefined || playerRating.sigma === undefined) {
        console.error(`❌ Player ${playerName} rating is incomplete:`, playerRating);
        hasError = true;
        break;
      }
    }

    if (hasError) {
      skippedMatches++;
      continue;
    }

    // Get current ratings as TrueSkill Rating objects
    const team1 = [
      new Rating(currentRatings[Player1].mu, currentRatings[Player1].sigma),
      new Rating(currentRatings[Player2].mu, currentRatings[Player2].sigma)
    ];
    const team2 = [
      new Rating(currentRatings[Player3].mu, currentRatings[Player3].sigma),
      new Rating(currentRatings[Player4].mu, currentRatings[Player4].sigma)
    ];

    // Determine winner (ranks: [1, 2] means team1 wins, [2, 1] means team2 wins)
    const score1 = parseInt(String((match as any).Score1 || (match as any).score1));
    const score2 = parseInt(String((match as any).Score2 || (match as any).score2));
    
    if (isNaN(score1) || isNaN(score2)) {
      console.warn(`⚠️ Match ${matchCount}: Invalid scores (${(match as any).Score1}, ${(match as any).Score2})`);
      skippedMatches++;
      continue;
    }

    const ranks = score1 > score2 ? [1, 2] : [2, 1];

    console.log(`🏸 Match ${matchCount}: ${Player1}/${Player2} (${score1}) vs ${Player3}/${Player4} (${score2}) - Winner: Team ${ranks[0] === 1 ? 1 : 2}`);

    try {
      // Calculate new ratings
      const [[newR1, newR2], [newR3, newR4]] = rate(
        [team1, team2],
        ranks
      );

      // Update ratings in the map (Rating objects have mu and sigma properties)
      currentRatings[Player1] = newR1;
      currentRatings[Player2] = newR2;
      currentRatings[Player3] = newR3;
      currentRatings[Player4] = newR4;

    } catch (error) {
      console.error(`❌ Error calculating ratings for match ${matchCount}:`, error);
      console.error('Match data:', match);
      console.error('Team1 ratings:', team1);
      console.error('Team2 ratings:', team2);
      skippedMatches++;
    }
  }

  console.log(`✅ Processed ${matchCount - skippedMatches} matches successfully`);
  if (skippedMatches > 0) {
    console.warn(`⚠️ Skipped ${skippedMatches} matches due to missing players or errors`);
  }
  
  return currentRatings;
}

// Export the type so it can be used elsewhere
export type { PlayerRatingMap };