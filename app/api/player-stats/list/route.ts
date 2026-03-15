import { NextResponse } from 'next/server';
import { readPlayersTab } from '@/lib/googleSheets';
import { getSpreadsheetId } from '@/lib/config';

export async function GET() {
  try {
    const spreadsheetId = getSpreadsheetId();
    if (!spreadsheetId) {
      return NextResponse.json({ error: 'Google Sheet ID not configured' }, { status: 500 });
    }

    const players = await readPlayersTab(spreadsheetId);
    const playerNames = players.map(p => p.name).filter(Boolean).sort();

    return NextResponse.json({ playerNames });
  } catch (error) {
    console.error('Error fetching player names:', error);
    return NextResponse.json({ playerNames: [] });
  }
}
