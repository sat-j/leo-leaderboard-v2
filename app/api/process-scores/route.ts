import { NextRequest, NextResponse } from 'next/server';
import { timingSafeEqual } from 'node:crypto';
import { Rating } from 'ts-trueskill';
import { isAdminRequest } from '@/lib/auth/adminSession';
import { readScoresTab, readPlayersTab, readRatingsTab, writeRatingsTab } from '@/lib/googleSheets';
import { calculateWeekRatings } from '@/lib/trueskill';
import { getAdminSecret, getRequiredSpreadsheetId } from '@/lib/config';
import { normalizePlayerLevel } from '@/lib/playerLevels';

interface PlayerRatingMap {
  [playerName: string]: Rating;
}

interface ProcessingWarning {
  code: 'MISSING_PLAYER_NAME' | 'INVALID_WEEK_NUMBER' | 'DUPLICATE_PLAYER_IN_MATCH' | 'TIED_SCORE';
  message: string;
  weekNumber?: number;
  rowNumber?: number;
}

const INITIAL_RATINGS = {
  PLUS: { mu: 20, sigma: 8.33 },
  INT: { mu: 25, sigma: 8.33 },
  ADV: { mu: 35, sigma: 8.33 },
} as const;

function secretsMatch(expected: string, actual: string): boolean {
  const expectedBuffer = Buffer.from(expected);
  const actualBuffer = Buffer.from(actual);

  if (expectedBuffer.length !== actualBuffer.length) {
    return false;
  }

  return timingSafeEqual(expectedBuffer, actualBuffer);
}

function getLatestKnownRating(playerRating: Record<string, unknown>, weekNumber: number): Rating | null {
  for (let previousWeek = weekNumber - 1; previousWeek >= 1; previousWeek--) {
    const prevMu = playerRating[`Week${previousWeek}_Mu`];
    const prevSigma = playerRating[`Week${previousWeek}_Sigma`];

    if (typeof prevMu === 'number' && typeof prevSigma === 'number') {
      return new Rating(prevMu, prevSigma);
    }
  }

  return null;
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { adminSecret, scoresTabName } = body as {
      adminSecret?: string;
      scoresTabName?: string;
    };

    const expectedSecret = getAdminSecret();
    if (!expectedSecret) {
      return NextResponse.json({ error: 'Admin secret not configured' }, { status: 500 });
    }

    const hasAdminSession = isAdminRequest(request);
    const hasMatchingSecret = typeof adminSecret === 'string' && secretsMatch(expectedSecret, adminSecret);

    if (!hasAdminSession && !hasMatchingSecret) {
      return NextResponse.json({ error: 'Invalid admin secret' }, { status: 401 });
    }

    if (!scoresTabName) {
      return NextResponse.json({ error: 'Scores tab name is required' }, { status: 400 });
    }

    const spreadsheetId = getRequiredSpreadsheetId();
    const warnings: ProcessingWarning[] = [];

    console.log('Processing scores from tab:', scoresTabName);

    const scores = await readScoresTab(spreadsheetId, scoresTabName);
    const players = await readPlayersTab(spreadsheetId);

    console.log('Scores read:', scores.length);
    console.log('Players read:', players.length);

    if (scores.length === 0) {
      return NextResponse.json({ error: 'No scores found' }, { status: 400 });
    }

    const validScores = scores.filter((score, index) => {
      const rowNumber = index + 2;
      const participants = [score.player1, score.player2, score.player3, score.player4].map((value) => value.trim());
      const uniqueParticipants = new Set(participants);

      if (!score.weekNumber || Number.isNaN(score.weekNumber)) {
        warnings.push({
          code: 'INVALID_WEEK_NUMBER',
          message: `Skipping row ${rowNumber}: invalid week number.`,
          rowNumber,
        });
        return false;
      }

      if (participants.some((value) => !value)) {
        warnings.push({
          code: 'MISSING_PLAYER_NAME',
          message: `Skipping row ${rowNumber}: one or more player names are missing.`,
          weekNumber: score.weekNumber,
          rowNumber,
        });
        return false;
      }

      if (uniqueParticipants.size !== participants.length) {
        warnings.push({
          code: 'DUPLICATE_PLAYER_IN_MATCH',
          message: `Skipping row ${rowNumber}: duplicate player detected in the same match.`,
          weekNumber: score.weekNumber,
          rowNumber,
        });
        return false;
      }

      if (score.score1 === score.score2) {
        warnings.push({
          code: 'TIED_SCORE',
          message: `Skipping row ${rowNumber}: tied scores are not supported.`,
          weekNumber: score.weekNumber,
          rowNumber,
        });
        return false;
      }

      return true;
    });

    if (validScores.length === 0) {
      return NextResponse.json(
        {
          error: 'No valid scores found to process',
          summary: {
            totalRows: scores.length,
            validRows: 0,
            warningsCount: warnings.length,
          },
          warnings,
        },
        { status: 400 }
      );
    }

    const weekNumbers = [...new Set(validScores.map((score) => score.weekNumber))]
      .filter((weekNumber) => !Number.isNaN(weekNumber))
      .sort((a, b) => a - b);

    if (weekNumbers.length === 0) {
      return NextResponse.json({ error: 'No valid week numbers found in WeekNumber column' }, { status: 400 });
    }

    const existingRatings = await readRatingsTab(spreadsheetId);
    const initialRatingsMap: PlayerRatingMap = {};

    for (const player of players) {
      if (!player.name) {
        warnings.push({
          code: 'MISSING_PLAYER_NAME',
          message: `Skipping player row with missing name in Players tab.`,
        });
        continue;
      }

      const initialRating = INITIAL_RATINGS[player.level] || INITIAL_RATINGS.INT;
      initialRatingsMap[player.name] = new Rating(initialRating.mu, initialRating.sigma);
    }

    console.log(`Built initial ratings for ${Object.keys(initialRatingsMap).length} players`);

    const allUpdatedRatings: Record<string, unknown>[] = [...existingRatings];

    for (const weekNumber of weekNumbers) {
      console.log(`\nProcessing Week ${weekNumber}...`);

      const currentRatingsMap: PlayerRatingMap = {};

      if (weekNumber === 1 || allUpdatedRatings.length === 0) {
        Object.assign(currentRatingsMap, initialRatingsMap);
      } else {
        for (const [playerName, initialRating] of Object.entries(initialRatingsMap)) {
          const playerRating =
            allUpdatedRatings.find((rating) => {
              const ratingName = (rating.PlayerName || rating.playerName) as string | undefined;
              return ratingName === playerName;
            }) ?? null;

          if (!playerRating) {
            currentRatingsMap[playerName] = initialRating;
            continue;
          }

          const latestKnownRating = getLatestKnownRating(playerRating, weekNumber);
          currentRatingsMap[playerName] = latestKnownRating ?? initialRating;
        }
      }

      const weekMatches = validScores.filter((score) => score.weekNumber === weekNumber);
      const updatedRatings = calculateWeekRatings(weekMatches, currentRatingsMap);

      const ratingsArray = Object.entries(updatedRatings).map(([playerName, rating]) => {
        const player = players.find((entry) => entry.name === playerName);
        const existingData =
          allUpdatedRatings.find((entry) => {
            const ratingName = (entry.PlayerName || entry.playerName) as string | undefined;
            return ratingName === playerName;
          }) ?? {};

        return {
          ...existingData,
          PlayerName: playerName,
          CurrentLevel: normalizePlayerLevel(player?.level || 'INT'),
          [`Week${weekNumber}_Mu`]: rating.mu,
          [`Week${weekNumber}_Sigma`]: rating.sigma,
        };
      });

      for (const rating of ratingsArray) {
        const index = allUpdatedRatings.findIndex((entry) => {
          const ratingName = (entry.PlayerName || entry.playerName) as string | undefined;
          return ratingName === rating.PlayerName;
        });

        if (index >= 0) {
          allUpdatedRatings[index] = rating;
        } else {
          allUpdatedRatings.push(rating);
        }
      }

      const allColumns = new Set<string>();
      for (const rating of allUpdatedRatings) {
        Object.keys(rating).forEach((key) => allColumns.add(key));
      }

      const sortedColumns = Array.from(allColumns).sort((a, b) => {
        if (a === 'PlayerName') return -1;
        if (b === 'PlayerName') return 1;
        if (a === 'CurrentLevel') return -1;
        if (b === 'CurrentLevel') return 1;

        const weekRegex = /Week(\d+)_(Mu|Sigma)/;
        const matchA = a.match(weekRegex);
        const matchB = b.match(weekRegex);

        if (matchA && matchB) {
          const weekA = parseInt(matchA[1], 10);
          const weekB = parseInt(matchB[1], 10);
          if (weekA !== weekB) return weekA - weekB;
          return matchA[2] === 'Mu' ? -1 : 1;
        }

        return a.localeCompare(b);
      });

      const dataRows = allUpdatedRatings.map((rating) =>
        sortedColumns.map((column) => (rating[column] as string | number | undefined) ?? '')
      );
      const sheetData = [sortedColumns, ...dataRows];

      await writeRatingsTab(spreadsheetId, sheetData);
      console.log(`Week ${weekNumber} written to Ratings tab with ${sheetData.length - 1} players`);
    }

    return NextResponse.json({
      success: true,
      message: `Processed ${validScores.length} valid matches across ${weekNumbers.length} week(s) for ${players.length} players`,
      summary: {
        totalRows: scores.length,
        validRows: validScores.length,
        processedWeeks: weekNumbers.length,
        warningsCount: warnings.length,
      },
      warnings,
    });
  } catch (error: unknown) {
    console.error('Error:', error);
    const errorMessage = error instanceof Error ? error.message : 'Failed to process scores';

    return NextResponse.json(
      {
        error: errorMessage,
        details: error instanceof Error ? error.toString() : String(error),
      },
      { status: 500 }
    );
  }
}
