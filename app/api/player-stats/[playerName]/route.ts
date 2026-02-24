import { NextResponse } from 'next/server';
import { readPlayersTab, readScoresTab, readRatingsTab } from '@/lib/googleSheets';
import { calculatePlayerAnalytics } from '@/lib/playerAnalytics';

export async function GET(
  request: Request,
  { params }: { params: Promise<{ playerName: string }> }
) {
  try {
    const spreadsheetId = process.env.GOOGLE_SHEET_ID;
    if (!spreadsheetId) {
      return NextResponse.json({ error: 'Google Sheet ID not configured' }, { status: 500 });
    }

    const { playerName: encodedPlayerName } = await params;
    const playerName = decodeURIComponent(encodedPlayerName);

    // Read ratings to determine max week
    const ratingsData = await readRatingsTab(spreadsheetId);
    if (ratingsData.length === 0) {
      return NextResponse.json({ error: 'No ratings data found. Please process scores first.' }, { status: 404 });
    }

    const headers = Object.keys(ratingsData[0]);
    const weekColumns = headers.filter((h: string) => h.includes('Week') && h.includes('_Mu'));
    const maxWeek = weekColumns.length;

    // Parse optional week filter from query string
    const url = new URL(request.url);
    const weekParam = url.searchParams.get('week');
    const selectedWeek = weekParam ? parseInt(weekParam, 10) : null;

    // Read all matches (or just the selected week's matches)
    let allMatches: import('@/types').Match[] = [];
    for (let week = 1; week <= maxWeek; week++) {
      if (selectedWeek !== null && week !== selectedWeek) continue;
      try {
        const weekMatches = await readScoresTab(spreadsheetId, `w${week}`);
        allMatches = [...allMatches, ...weekMatches];
      } catch {
        // tab may not exist
      }
    }

    // Read players list
    const players = await readPlayersTab(spreadsheetId);
    const playerNames = players.map(p => p.name);

    // Validate player exists
    if (!playerNames.includes(playerName)) {
      return NextResponse.json({ error: `Player "${playerName}" not found` }, { status: 404 });
    }

    const analytics = calculatePlayerAnalytics(playerName, allMatches);

    return NextResponse.json({ analytics, playerNames, maxWeek, selectedWeek });
  } catch (error) {
    console.error('Error fetching player stats:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    return NextResponse.json(
      { error: 'Failed to fetch player statistics', details: errorMessage },
      { status: 500 }
    );
  }
}
