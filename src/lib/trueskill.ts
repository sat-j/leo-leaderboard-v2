import { rate, Rating } from 'ts-trueskill';
import { Match } from '@/types';

interface PlayerRatingMap {
  [playerName: string]: Rating;
}

function normalizePlayerName(name: string): string {
  return name.trim();
}

export function calculateWeekRatings(
  matches: Match[],
  initialRatings: PlayerRatingMap
): PlayerRatingMap {
  console.log(`\nStarting rating calculation`);
  console.log(`Initial ratings count: ${Object.keys(initialRatings).length}`);
  console.log(`Matches to process: ${matches.length}`);

  const normalizedRatings: PlayerRatingMap = {};
  for (const [playerName, rating] of Object.entries(initialRatings)) {
    normalizedRatings[normalizePlayerName(playerName)] = rating;
  }

  const currentRatings = { ...normalizedRatings };

  console.log('Available players:', Object.keys(currentRatings).slice(0, 5).join(', '), '...');

  let matchCount = 0;
  let skippedMatches = 0;

  for (const match of matches) {
    matchCount++;

    const player1 = normalizePlayerName((match as any).Player1 || (match as any).player1);
    const player2 = normalizePlayerName((match as any).Player2 || (match as any).player2);
    const player3 = normalizePlayerName((match as any).Player3 || (match as any).player3);
    const player4 = normalizePlayerName((match as any).Player4 || (match as any).player4);

    const missingPlayers: string[] = [];
    if (!currentRatings[player1]) missingPlayers.push(player1);
    if (!currentRatings[player2]) missingPlayers.push(player2);
    if (!currentRatings[player3]) missingPlayers.push(player3);
    if (!currentRatings[player4]) missingPlayers.push(player4);

    if (missingPlayers.length > 0) {
      console.warn(`Match ${matchCount}: skipping - players not found in Players tab:`, missingPlayers);
      console.warn('Available players start with:', Object.keys(currentRatings).slice(0, 3));
      skippedMatches++;
      continue;
    }

    const playersToCheck = [player1, player2, player3, player4];
    let hasError = false;

    for (const playerName of playersToCheck) {
      const playerRating = currentRatings[playerName];
      if (!playerRating) {
        console.error(`Player ${playerName} has no rating`);
        hasError = true;
        break;
      }
      if (playerRating.mu === undefined || playerRating.sigma === undefined) {
        console.error(`Player ${playerName} rating is incomplete:`, playerRating);
        hasError = true;
        break;
      }
    }

    if (hasError) {
      skippedMatches++;
      continue;
    }

    const team1 = [
      new Rating(currentRatings[player1].mu, currentRatings[player1].sigma),
      new Rating(currentRatings[player2].mu, currentRatings[player2].sigma),
    ];
    const team2 = [
      new Rating(currentRatings[player3].mu, currentRatings[player3].sigma),
      new Rating(currentRatings[player4].mu, currentRatings[player4].sigma),
    ];

    const score1 = parseInt(String((match as any).Score1 || (match as any).score1), 10);
    const score2 = parseInt(String((match as any).Score2 || (match as any).score2), 10);

    if (isNaN(score1) || isNaN(score2)) {
      console.warn(`Match ${matchCount}: invalid scores (${(match as any).Score1}, ${(match as any).Score2})`);
      skippedMatches++;
      continue;
    }

    const ranks = score1 > score2 ? [1, 2] : [2, 1];

    console.log(
      `Match ${matchCount}: ${player1}/${player2} (${score1}) vs ${player3}/${player4} (${score2}) - winner: Team ${ranks[0] === 1 ? 1 : 2}`
    );

    try {
      const [[newR1, newR2], [newR3, newR4]] = rate([team1, team2], ranks);

      currentRatings[player1] = newR1;
      currentRatings[player2] = newR2;
      currentRatings[player3] = newR3;
      currentRatings[player4] = newR4;
    } catch (error) {
      console.error(`Error calculating ratings for match ${matchCount}:`, error);
      console.error('Match data:', match);
      console.error('Team1 ratings:', team1);
      console.error('Team2 ratings:', team2);
      skippedMatches++;
    }
  }

  console.log(`Processed ${matchCount - skippedMatches} matches successfully`);
  if (skippedMatches > 0) {
    console.warn(`Skipped ${skippedMatches} matches due to missing players or errors`);
  }

  return currentRatings;
}

export type { PlayerRatingMap };
