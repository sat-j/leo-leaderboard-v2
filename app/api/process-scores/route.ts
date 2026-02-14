import { NextRequest, NextResponse } from 'next/server';
import { readPlayersTab, readScoresTab, writeRatingsTab } from '@/lib/googleSheets';
import { calculateWeekRatings, createRating, PlayerRatingMap } from '@/lib/trueskill';
import { PlayerLevel } from '@/types';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { scoresTabName, adminSecret } = body;

    // Verify admin secret
    if (adminSecret !== process.env.ADMIN_SECRET) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    if (!scoresTabName) {
      return NextResponse.json({ error: 'Scores tab name is required' }, { status: 400 });
    }

    const spreadsheetId = process.env.GOOGLE_SHEET_ID;
    if (!spreadsheetId) {
      return NextResponse.json({ error: 'Google Sheet ID not configured' }, { status: 500 });
    }

    // Read data from Google Sheets
    const players = await readPlayersTab(spreadsheetId);
    const matches = await readScoresTab(spreadsheetId, scoresTabName);

    if (players.length === 0) {
      return NextResponse.json({ error: 'No players found in Players tab' }, { status: 400 });
    }

    if (matches.length === 0) {
      return NextResponse.json({ error: 'No matches found in scores tab' }, { status: 400 });
    }

    // Initialize player ratings from Players tab
    const playerLevels = new Map<string, PlayerLevel>();
    const initialRatings: PlayerRatingMap = {};
    
    players.forEach(player => {
      playerLevels.set(player.name, player.level);
      initialRatings[player.name] = createRating(player.initialMu, player.initialSigma);
    });

    // Group matches by week
    const maxWeek = Math.max(...matches.map(m => m.weekNumber));
    const weeklyRatings: Map<number, PlayerRatingMap> = new Map();

    // Calculate ratings for each week sequentially
    let currentRatings = { ...initialRatings };
    
    for (let week = 1; week <= maxWeek; week++) {
      const weekMatches = matches.filter(m => m.weekNumber === week);
      
      if (weekMatches.length > 0) {
        currentRatings = calculateWeekRatings(weekMatches, currentRatings);
        weeklyRatings.set(week, { ...currentRatings });
      }
    }

    // Prepare data for Ratings sheet
    const headers = ['PlayerName'];
    for (let week = 1; week <= maxWeek; week++) {
      headers.push(`Week${week}_Mu`, `Week${week}_Sigma`);
    }
    headers.push('CurrentLevel');

    const ratingsData: (string | number)[][] = [headers];

    // Add player ratings
    players.forEach(player => {
      const row = [player.name];
      
      for (let week = 1; week <= maxWeek; week++) {
        const weekRatings = weeklyRatings.get(week);
        if (weekRatings && weekRatings[player.name]) {
          row.push(
            weekRatings[player.name].mu.toFixed(2),
            weekRatings[player.name].sigma.toFixed(2)
          );
        } else {
          row.push('', '');
        }
      }
      
      row.push(player.level);
      ratingsData.push(row as string[]);
    });

    // Write to Ratings sheet
    await writeRatingsTab(spreadsheetId, ratingsData);

    return NextResponse.json({ 
      success: true,
      message: `Processed ${matches.length} matches across ${maxWeek} weeks for ${players.length} players`,
      weeksProcessed: maxWeek
    });

  } catch (error) {
    console.error('Error processing scores:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    return NextResponse.json({ 
      error: 'Failed to process scores',
      details: errorMessage 
    }, { status: 500 });
  }
}
