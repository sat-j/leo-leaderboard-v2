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

export async function readRatingsTab(spreadsheetId: string): Promise<any[]> {
  try {
    const data = await getSheetData(spreadsheetId, 'Ratings!A1:ZZ');
    
    if (data.length === 0) return [];
    
    // First row is headers
    const headers = data[0] as string[];
    const rows = data.slice(1);
    
    // Convert to array of objects
    return rows.map(row => {
      const obj: any = {};
      headers.forEach((header, index) => {
        const value = row[index];
        // Convert numeric strings to numbers for Mu and Sigma columns
        if (header.endsWith('_Mu') || header.endsWith('_Sigma')) {
          if (value !== undefined && value !== '') {
            const numValue = parseFloat(String(value));
            obj[header] = !isNaN(numValue) ? numValue : undefined;
          } else {
            obj[header] = undefined;
          }
        } else {
          obj[header] = value;
        }
      });
      return obj;
    });
  } catch (error) {
    // Ratings tab might not exist yet on first run
    console.warn('Ratings tab not found or error reading it:', error);
    return [];
  }
}

export async function writeRatingsTab(
  spreadsheetId: string,
  ratingsData: any[]
): Promise<void> {
  // Convert array of objects to 2D array format for sheets
  if (ratingsData.length === 0) {
    await updateSheetData(spreadsheetId, 'Ratings!A1', []);
    return;
  }
  
  // Get all unique keys (headers) from all objects
  const headersSet = new Set<string>();
  ratingsData.forEach(obj => {
    Object.keys(obj).forEach(key => headersSet.add(key));
  });
  
  // Sort headers: PlayerName, CurrentLevel, then Week columns in order
  const headers = Array.from(headersSet).sort((a, b) => {
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
  
  // Build 2D array with headers as first row
  const rows: (string | number)[][] = [headers];
  
  // Add data rows
  ratingsData.forEach(obj => {
    const row = headers.map(header => {
      const value = obj[header];
      return value !== undefined ? value : '';
    });
    rows.push(row);
  });
  
  await updateSheetData(spreadsheetId, 'Ratings!A1', rows);
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