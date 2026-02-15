import { NextRequest, NextResponse } from 'next/server';
import { readScoresTab, readPlayersTab, readRatingsTab, writeRatingsTab } from '@/lib/googleSheets';
import { calculateWeekRatings } from '@/lib/trueskill';

interface PlayerRating {
  mu: number;
  sigma: number;
}

interface PlayerRatingMap {
  [playerName: string]: PlayerRating;
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
      const playerName = player.PlayerName || player.playerName;
      if (!playerName) continue;

      // Use initial rating based on level
      const level = (player.Level || player.level || 'BEG') as string;
      const initialRating = INITIAL_RATINGS[level as keyof typeof INITIAL_RATINGS] || INITIAL_RATINGS.BEG;
      
      initialRatingsMap[playerName] = {
        mu: initialRating.mu,
        sigma: initialRating.sigma
      };
    }

    console.log(`✅ Built initial ratings for ${Object.keys(initialRatingsMap).length} players`);
    console.log('Sample initial rating:', Object.entries(initialRatingsMap)[0]);

    // Process each week
    let allUpdatedRatings: any[] = existingRatings || [];

    for (const weekNumber of weekNumbers.sort((a, b) => a - b)) {
      console.log(`\n📅 Processing Week ${weekNumber}...`);
      
      // Get current ratings (either from previous week or initial)
      let currentRatingsMap = { ...initialRatingsMap };
      
      if (weekNumber > 1 && allUpdatedRatings.length > 0) {
        // Use previous week's ratings as starting point
        for (const playerRating of allUpdatedRatings) {
          const playerName = playerRating.PlayerName || playerRating.playerName;
          if (!playerName) continue;
          
          const prevMu = playerRating[`Week${weekNumber - 1}_Mu`];
          const prevSigma = playerRating[`Week${weekNumber - 1}_Sigma`];
          
          if (prevMu !== undefined && prevSigma !== undefined) {
            currentRatingsMap[playerName] = {
              mu: prevMu,
              sigma: prevSigma
            };
          }
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
          const pName = p.PlayerName || p.playerName;
          return pName === playerName;
        });
        
        const existingData = allUpdatedRatings.find((r: any) => {
          const rName = r.PlayerName || r.playerName;
          return rName === playerName;
        }) || {};
        
        return {
          ...existingData,
          PlayerName: playerName,
          CurrentLevel: player?.Level || player?.level || 'BEG',
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

      // Write to sheet
      await writeRatingsTab(spreadsheetId, allUpdatedRatings);
      console.log(`✅ Week ${weekNumber} written to Ratings tab`);
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