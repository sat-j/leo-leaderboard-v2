import { NextResponse } from 'next/server';
import { readPlayersTab, readScoresTab, readRatingsTab } from '@/lib/googleSheets';
import { calculatePlayerOverallStats } from '@/lib/calculations';
import { getSpreadsheetId } from '@/lib/config';
import { Match, PlayerRating, PlayerLevel } from '@/types';

export async function GET() {
  try {
    const spreadsheetId = getSpreadsheetId();
    if (!spreadsheetId) {
      return NextResponse.json({ error: 'Google Sheet ID not configured' }, { status: 500 });
    }

    // Read data from Google Sheets
    const players = await readPlayersTab(spreadsheetId);
    const ratingsData = await readRatingsTab(spreadsheetId);

    if (ratingsData.length === 0) {
      return NextResponse.json({ 
        error: 'No ratings data found. Please process scores first.' 
      }, { status: 404 });
    }

    // Parse ratings data
    const headers = Object.keys(ratingsData[0]);
    const playerRows = ratingsData.map(obj => 
      headers.map(header => obj[header])
    );

    // Find max week
    const weekColumns = headers.filter((h: string) => h.includes('Week') && h.includes('_Mu'));
    const maxWeek = weekColumns.length;

    if (maxWeek === 0) {
      return NextResponse.json({ 
        error: 'No week data found in ratings' 
      }, { status: 404 });
    }

    // Parse player ratings for all weeks
    const allWeekRatings = new Map<number, Map<string, PlayerRating>>();
    const playerLevels = new Map<string, PlayerLevel>();

    for (let week = 1; week <= maxWeek; week++) {
      const weekRatings = new Map<string, PlayerRating>();
      
      playerRows.forEach((row: string[]) => {
        const playerName = row[0];
        const levelIndex = headers.indexOf('CurrentLevel');
        const level = (row[levelIndex] || 'BEG') as PlayerLevel;
        playerLevels.set(playerName, level);

        const weekMuIndex = headers.indexOf(`Week${week}_Mu`);
        const weekSigmaIndex = headers.indexOf(`Week${week}_Sigma`);
        
        if (weekMuIndex >= 0 && row[weekMuIndex]) {
          weekRatings.set(playerName, {
            playerName,
            mu: parseFloat(row[weekMuIndex]),
            sigma: parseFloat(row[weekSigmaIndex]),
            week,
            level
          });
        }
      });
      
      allWeekRatings.set(week, weekRatings);
    }

    // Read matches from all week tabs
    let allMatches: Match[] = [];
    try {
      for (let week = 1; week <= maxWeek; week++) {
        const tabName = `w${week}`;
        try {
          const weekMatches = await readScoresTab(spreadsheetId, tabName);
          if (weekMatches.length > 0) {
            console.log(`✅ Loaded ${weekMatches.length} matches from ${tabName} tab`);
            allMatches = [...allMatches, ...weekMatches];
          }
        } catch (error) {
          console.warn(`⚠️ Could not read from ${tabName} tab:`, error);
        }
      }
      
      console.log(`📊 Total matches loaded: ${allMatches.length} from ${maxWeek} week(s)`);
    } catch (error) {
      console.warn('Error reading matches:', error);
    }

    // Calculate overall statistics
    const overallStats = calculatePlayerOverallStats(allMatches, allWeekRatings, playerLevels);

    return NextResponse.json({
      overallStats,
      totalWeeks: maxWeek,
      totalMatches: allMatches.length
    });

  } catch (error) {
    console.error('Error fetching overall statistics:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    return NextResponse.json({ 
      error: 'Failed to fetch overall statistics',
      details: errorMessage 
    }, { status: 500 });
  }
}
