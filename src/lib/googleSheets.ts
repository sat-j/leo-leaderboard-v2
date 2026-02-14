import { google } from 'googleapis';
import { Player, Match, PlayerLevel } from '@/types';

function getAuth() {
  return new google.auth.GoogleAuth({
    credentials: JSON.parse(process.env.GOOGLE_CREDENTIALS || '{}'),
    scopes: ['https://www.googleapis.com/auth/spreadsheets'],
  });
}

export async function getSheetData(spreadsheetId: string, range: string) {
  try {
    const auth = getAuth();
    const sheets = google.sheets({ version: 'v4', auth });
    
    const response = await sheets.spreadsheets.values.get({
      spreadsheetId,
      range,
    });

    return response.data.values || [];
  } catch (error) {
    console.error('Error fetching sheet data:', error);
    throw error;
  }
}

export async function updateSheetData(
  spreadsheetId: string,
  range: string,
  values: (string | number)[][]
) {
  try {
    const auth = getAuth();
    const sheets = google.sheets({ version: 'v4', auth });
    
    await sheets.spreadsheets.values.update({
      spreadsheetId,
      range,
      valueInputOption: 'USER_ENTERED',
      requestBody: { values },
    });
  } catch (error) {
    console.error('Error updating sheet data:', error);
    throw error;
  }
}

export async function readPlayersTab(spreadsheetId: string): Promise<Player[]> {
  const data = await getSheetData(spreadsheetId, 'Players!A2:D');
  
  return data.map(row => ({
    name: row[0] || '',
    level: (row[1] || 'BEG') as PlayerLevel,
    initialMu: parseFloat(row[2] || '25'),
    initialSigma: parseFloat(row[3] || '8.33')
  }));
}

export async function readScoresTab(spreadsheetId: string, tabName: string): Promise<Match[]> {
  const data = await getSheetData(spreadsheetId, `${tabName}!A2:G`);
  
  return data.map(row => ({
    weekNumber: parseInt(row[0] || '1'),
    player1: row[1] || '',
    player2: row[2] || '',
    player3: row[3] || '',
    player4: row[4] || '',
    score1: parseInt(row[5] || '0'),
    score2: parseInt(row[6] || '0')
  }));
}

export async function readRatingsTab(spreadsheetId: string): Promise<(string | number)[][]> {
  try {
    const data = await getSheetData(spreadsheetId, 'Ratings!A1:ZZ');
    return data as (string | number)[][];
  } catch {
    // Ratings tab might not exist yet
    return [];
  }
}

export async function writeRatingsTab(
  spreadsheetId: string,
  ratingsData: (string | number)[][]
): Promise<void> {
  await updateSheetData(spreadsheetId, 'Ratings!A1', ratingsData);
}

export async function clearRatingsTab(spreadsheetId: string): Promise<void> {
  try {
    const auth = getAuth();
    const sheets = google.sheets({ version: 'v4', auth });
    
    await sheets.spreadsheets.values.clear({
      spreadsheetId,
      range: 'Ratings!A1:ZZ',
    });
  } catch (error) {
    console.error('Error clearing ratings tab:', error);
    throw error;
  }
}