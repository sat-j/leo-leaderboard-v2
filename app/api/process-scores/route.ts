import { NextRequest, NextResponse } from 'next/server';
import { readScoresTab, readPlayersTab, readRatingsTab, writeRatingsTab } from '@/lib/googleSheets';
import { calculateWeekRatings } from '@/lib/trueskill';
import { Rating } from 'ts-trueskill';

interface PlayerRatingMap {
  [playerName: string]: Rating;
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { scoresTabName } = body;

    if (!scoresTabName) {
      return NextResponse.json({ error: 'Scores tab name is required' }, { status: 400 });
    }

    // Get spreadsheet ID from environment
    const spreadsheetId = process.env.GOOGLE_SHEETS_ID;
    
    if (!spreadsheetId) {
      return NextResponse.json({ 
        error: 'Google Sheets ID not configured. Add GOOGLE_SHEETS_ID to .env.local' 
      }, { status: 500 });
    }

    console.log('📝 Processing scores from tab:', scoresTabName);

    // Read data - Pass spreadsheetId as first argument
    const scores = await readScoresTab(spreadsheetId, scoresTabName);
    console.log('📊 Scores read:', scores?.length || 0);
    
    const players = await readPlayersTab(spreadsheetId);
    console.log('👥 Players read:', players?.length || 0);

    if (!scores || scores.length === 0) {
      return NextResponse.json({ error: 'No scores found' }, { status: 400 });
    }

    // Get week numbers - handle both WeekNumber and weekNumber
    const weekNumbers = [...new Set(scores.map((s: any) => {
      const weekNum = s.WeekNumber || s.weekNumber;
      return parseInt(String(weekNum));
    }))].filter(w => !isNaN(w));
    
    console.log('📅 Week numbers found:', weekNumbers);

    if (weekNumbers.length === 0) {
      return NextResponse.json({ 
        error: 'No valid week numbers found in WeekNumber column' 
      }, { status: 400 });
    }

    // Read existing ratings
    const existingRatings = await readRatingsTab(spreadsheetId);
    console.log('⭐ Existing ratings:', existingRatings?.length || 0);

    // Build initial ratings map for EACH player from Players tab
    const initialRatingsMap: PlayerRatingMap = {};
    
    const INITIAL_RATINGS = {
      BEG: { mu: 10, sigma: 8.33 },
      PLUS: { mu: 20, sigma: 8.33 },
      INT: { mu: 25, sigma: 8.33 },
      ADV: { mu: 35, sigma: 8.33 }
    };

    for (const player of players as any[]) {
      // readPlayersTab returns lowercase 'name' property
      const playerName = player.name || player.PlayerName || player.playerName;
      if (!playerName) {
        console.log('⚠️ Skipping player with missing name:', player);
        continue;
      }

      // readPlayersTab returns lowercase 'level' property
      const level = (player.level || player.Level || 'BEG') as string;
      const initialRating = INITIAL_RATINGS[level as keyof typeof INITIAL_RATINGS] || INITIAL_RATINGS.BEG;
      
      initialRatingsMap[playerName] = new Rating(initialRating.mu, initialRating.sigma);
    }

    console.log(`✅ Built initial ratings for ${Object.keys(initialRatingsMap).length} players`);
    console.log('Sample initial rating:', Object.entries(initialRatingsMap)[0]);

    // Process each week
    let allUpdatedRatings: any[] = existingRatings || [];

    for (const weekNumber of weekNumbers.sort((a, b) => a - b)) {
      console.log(`\n📅 Processing Week ${weekNumber}...`);
      
      // Get current ratings (either from previous week or initial)
      let currentRatingsMap: PlayerRatingMap = {};
      
      if (weekNumber === 1) {
        // Week 1: Use initial ratings
        currentRatingsMap = { ...initialRatingsMap };
        console.log(`  ✅ Using initial ratings for Week 1 (${Object.keys(currentRatingsMap).length} players)`);
      } else {
        // Week 2+: Use previous week's final ratings as baseline
        if (allUpdatedRatings.length > 0) {
          console.log(`  ✅ Using Week ${weekNumber - 1} ratings as baseline`);
          
          // Start with all players from initial ratings
          for (const [playerName, initialRating] of Object.entries(initialRatingsMap)) {
            // Check if player has rating from previous week
            const playerRating = allUpdatedRatings.find((r: any) => r.PlayerName === playerName);
            
            if (playerRating) {
              const prevMu = playerRating[`Week${weekNumber - 1}_Mu`];
              const prevSigma = playerRating[`Week${weekNumber - 1}_Sigma`];
              
              if (prevMu !== undefined && prevSigma !== undefined) {
                currentRatingsMap[playerName] = new Rating(prevMu, prevSigma);
              } else {
                // Player didn't play in previous week, use their initial rating
                currentRatingsMap[playerName] = initialRating;
              }
            } else {
              // New player or no previous data, use initial rating
              currentRatingsMap[playerName] = initialRating;
            }
          }
          
          console.log(`  ✅ Loaded ratings for ${Object.keys(currentRatingsMap).length} players`);
        } else {
          // No previous ratings found, use initial
          currentRatingsMap = { ...initialRatingsMap };
          console.log(`  ⚠️ No previous ratings found, using initial ratings`);
        }
      }

      // Filter matches for this week
      const weekMatches = scores.filter((s: any) => {
        const weekNum = s.WeekNumber || s.weekNumber;
        return parseInt(String(weekNum)) === weekNumber;
      });
      console.log(`🏸 Matches for week ${weekNumber}:`, weekMatches.length);

      // Calculate new ratings
      const updatedRatings = calculateWeekRatings(weekMatches, currentRatingsMap);
      console.log(`✅ Calculated ratings for ${Object.keys(updatedRatings).length} players`);

      // Convert to array format for sheet writing
      const ratingsArray = Object.entries(updatedRatings).map(([playerName, rating]) => {
        const player = (players as any[]).find((p: any) => {
          const pName = p.name || p.PlayerName || p.playerName;
          return pName === playerName;
        });
        
        const existingData = allUpdatedRatings.find((r: any) => {
          const rName = r.PlayerName || r.playerName;
          return rName === playerName;
        }) || {};
        
        return {
          ...existingData,
          PlayerName: playerName,
          CurrentLevel: player?.level || player?.Level || 'BEG',
          [`Week${weekNumber}_Mu`]: rating.mu,
          [`Week${weekNumber}_Sigma`]: rating.sigma,
        };
      });

      // Update the all ratings array
      for (const rating of ratingsArray) {
        const index = allUpdatedRatings.findIndex((r: any) => {
          const rName = r.PlayerName || r.playerName;
          return rName === rating.PlayerName;
        });
        
        if (index >= 0) {
          allUpdatedRatings[index] = rating;
        } else {
          allUpdatedRatings.push(rating);
        }
      }

      // Convert objects to 2D array for sheet writing
      // Get all unique column names
      const allColumns = new Set<string>();
      for (const rating of allUpdatedRatings) {
        Object.keys(rating).forEach(key => allColumns.add(key));
      }

      // Sort columns: PlayerName, CurrentLevel, then Week columns sorted
      const sortedColumns = Array.from(allColumns).sort((a, b) => {
        if (a === 'PlayerName') return -1;
        if (b === 'PlayerName') return 1;
        if (a === 'CurrentLevel') return -1;
        if (b === 'CurrentLevel') return 1;
        
        // Extract week numbers for Week*_Mu and Week*_Sigma columns
        const weekRegex = /Week(\d+)_(Mu|Sigma)/;
        const matchA = a.match(weekRegex);
        const matchB = b.match(weekRegex);
        
        if (matchA && matchB) {
          const weekA = parseInt(matchA[1]);
          const weekB = parseInt(matchB[1]);
          if (weekA !== weekB) return weekA - weekB;
          // If same week, Mu comes before Sigma
          return matchA[2] === 'Mu' ? -1 : 1;
        }
        
        return a.localeCompare(b);
      });

      // Create header row
      const headerRow = sortedColumns;

      // Create data rows
      const dataRows = allUpdatedRatings.map((rating: any) => {
        return sortedColumns.map(col => rating[col] ?? '');
      });

      // Combine header and data
      const sheetData = [headerRow, ...dataRows];

      // Write to sheet
      await writeRatingsTab(spreadsheetId, sheetData);
      console.log(`✅ Week ${weekNumber} written to Ratings tab with ${sheetData.length - 1} players`);
    }

    return NextResponse.json({ 
      success: true,
      message: `Processed ${scores.length} matches across ${weekNumbers.length} week(s) for ${players.length} players`,
    });

  } catch (error: any) {
    console.error('❌ Error:', error);
    return NextResponse.json({ 
      error: error.message || 'Failed to process scores',
      details: error.toString()
    }, { status: 500 });
  }
}