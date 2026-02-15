import { NextRequest, NextResponse } from 'next/server';
import { readPlayersTab, readScoresTab, readRatingsTab } from '@/lib/googleSheets';
import { 
  calculateTopPlayersByGain, 
  calculateMostGamesPlayed, 
  calculateBestWinPercentage,
  calculateMostImproved,
  calculateCloseBuddies,
  calculateRivalries,
  getLevelLeaderboards,
  calculatePlayerWeekStats
} from '@/lib/calculations';
import { Match, PlayerRating, PlayerLevel, LeaderboardData } from '@/types';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const weekParam = searchParams.get('week');

    const spreadsheetId = process.env.GOOGLE_SHEET_ID;
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

    // Parse ratings data - readRatingsTab returns array of objects
    // Extract headers from the first object's keys
    const headers = Object.keys(ratingsData[0]);
    // Convert objects to rows for backward compatibility
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

    const currentWeek = weekParam ? parseInt(weekParam) : maxWeek;

    if (currentWeek < 1 || currentWeek > maxWeek) {
      return NextResponse.json({ 
        error: `Invalid week. Must be between 1 and ${maxWeek}` 
      }, { status: 400 });
    }

    // Parse player ratings for the requested week
    const weekRatings = new Map<string, PlayerRating>();
    const week1Ratings = new Map<string, PlayerRating>();
    const playerLevels = new Map<string, PlayerLevel>();

    playerRows.forEach((row: string[]) => {
      const playerName = row[0];
      const levelIndex = headers.indexOf('CurrentLevel');
      const level = (row[levelIndex] || 'BEG') as PlayerLevel;
      playerLevels.set(playerName, level);

      // Get week 1 ratings
      const week1MuIndex = headers.indexOf('Week1_Mu');
      const week1SigmaIndex = headers.indexOf('Week1_Sigma');
      if (week1MuIndex >= 0 && row[week1MuIndex]) {
        week1Ratings.set(playerName, {
          playerName,
          mu: parseFloat(row[week1MuIndex]),
          sigma: parseFloat(row[week1SigmaIndex]),
          week: 1,
          level
        });
      }

      // Get current week ratings
      const weekMuIndex = headers.indexOf(`Week${currentWeek}_Mu`);
      const weekSigmaIndex = headers.indexOf(`Week${currentWeek}_Sigma`);
      
      if (weekMuIndex >= 0 && row[weekMuIndex]) {
        weekRatings.set(playerName, {
          playerName,
          mu: parseFloat(row[weekMuIndex]),
          sigma: parseFloat(row[weekSigmaIndex]),
          week: currentWeek,
          level
        });
      }
    });

    // Get previous week ratings for gain calculation
    const previousWeek = currentWeek - 1;
    const previousWeekRatings = new Map<string, PlayerRating>();
    
    if (previousWeek > 0) {
      playerRows.forEach((row: string[]) => {
        const playerName = row[0];
        const levelIndex = headers.indexOf('CurrentLevel');
        const level = (row[levelIndex] || 'BEG') as PlayerLevel;
        const weekMuIndex = headers.indexOf(`Week${previousWeek}_Mu`);
        const weekSigmaIndex = headers.indexOf(`Week${previousWeek}_Sigma`);
        
        if (weekMuIndex >= 0 && row[weekMuIndex]) {
          previousWeekRatings.set(playerName, {
            playerName,
            mu: parseFloat(row[weekMuIndex]),
            sigma: parseFloat(row[weekSigmaIndex]),
            week: previousWeek,
            level
          });
        }
      });
    } else {
      // Use initial ratings for week 1
      players.forEach(player => {
        previousWeekRatings.set(player.name, {
          playerName: player.name,
          mu: player.initialMu,
          sigma: player.initialSigma,
          week: 0,
          level: player.level
        });
      });
    }

    // Read matches from all week tabs (w1, w2, w3, etc.)
    let allMatches: Match[] = [];
    try {
      // Read from all weeks up to current week
      for (let week = 1; week <= currentWeek; week++) {
        const tabName = `w${week}`;
        try {
          const weekMatches = await readScoresTab(spreadsheetId, tabName);
          if (weekMatches.length > 0) {
            console.log(`✅ Loaded ${weekMatches.length} matches from ${tabName} tab`);
            allMatches = [...allMatches, ...weekMatches];
          }
        } catch (error) {
          console.warn(`⚠️ Could not read from ${tabName} tab:`, error);
          // Continue to next week even if this one fails
        }
      }
      
      console.log(`📊 Total matches loaded: ${allMatches.length} from ${currentWeek} week(s)`);
    } catch (error) {
      // Could not read matches - continue without match data
      console.warn('Error reading matches:', error);
    }

    // Calculate statistics
    const topPlayers = allMatches.length > 0 
      ? calculateTopPlayersByGain(allMatches, currentWeek, previousWeekRatings, weekRatings)
      : [];
    
    const mostGamesPlayed = allMatches.length > 0
      ? calculateMostGamesPlayed(allMatches, currentWeek)
      : [];
    
    const bestWinPercentage = allMatches.length > 0
      ? calculateBestWinPercentage(allMatches, currentWeek)
      : [];

    const rockstars = calculateMostImproved(week1Ratings, weekRatings);
    const closeBuddies = allMatches.length > 0
      ? calculateCloseBuddies(allMatches, currentWeek)
      : [];
    
    const rivalries = allMatches.length > 0
      ? calculateRivalries(allMatches, currentWeek)
      : [];

    const levelLeaderboards = getLevelLeaderboards(weekRatings, playerLevels, allMatches, currentWeek);

    const weekMatches = allMatches.filter(m => m.weekNumber === currentWeek);

    // Calculate player week stats
    const playerWeekStats = allMatches.length > 0
      ? calculatePlayerWeekStats(allMatches, currentWeek, weekRatings, previousWeekRatings, playerLevels)
      : [];

    const leaderboardData: LeaderboardData = {
      currentWeek,
      weekStats: {
        week: currentWeek,
        gamesPlayed: weekMatches.length,
        topPlayers,
        mostGamesPlayed,
        bestWinPercentage
      },
      levelLeaderboards,
      rockstars,
      closeBuddies,
      rivalries,
      matches: weekMatches,
      playerWeekStats
    };

    return NextResponse.json({
      ...leaderboardData,
      maxWeek
    });

  } catch (error) {
    console.error('Error fetching leaderboard:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    return NextResponse.json({ 
      error: 'Failed to fetch leaderboard data',
      details: errorMessage 
    }, { status: 500 });
  }
}
