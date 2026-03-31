const GOOGLE_SHEET_URL_ENV_NAME = 'GOOGLE_SHEET_URL';

function extractGoogleSheetId(sheetUrl: string): string {
  const trimmedUrl = sheetUrl.trim();

  try {
    const url = new URL(trimmedUrl);
    const match = url.pathname.match(/\/spreadsheets\/d\/([a-zA-Z0-9-_]+)/);
    if (match?.[1]) {
      return match[1];
    }
  } catch {
    const match = trimmedUrl.match(/\/spreadsheets\/d\/([a-zA-Z0-9-_]+)/);
    if (match?.[1]) {
      return match[1];
    }
  }

  throw new Error('Invalid Google Sheet URL.');
}

export function getConfiguredGoogleSheetUrl(): string {
  const sheetUrl = process.env[GOOGLE_SHEET_URL_ENV_NAME]?.trim();

  if (!sheetUrl) {
    throw new Error(`Missing ${GOOGLE_SHEET_URL_ENV_NAME} environment variable.`);
  }

  return sheetUrl;
}

export function getGoogleSheetCsvUrl(sheetUrl = getConfiguredGoogleSheetUrl()): string {
  const sheetId = extractGoogleSheetId(sheetUrl);
  return `https://docs.google.com/spreadsheets/d/${sheetId}/export?format=csv`;
}

export async function fetchGoogleSheetCsv(sheetUrl = getConfiguredGoogleSheetUrl()): Promise<string> {
  const response = await fetch(getGoogleSheetCsvUrl(sheetUrl), {
    method: 'GET',
    redirect: 'follow'
  });

  if (!response.ok) {
    throw new Error(`Unable to fetch Google Sheet data (${response.status}).`);
  }

  const csv = await response.text();
  if (!csv.trim()) {
    throw new Error('Google Sheet returned empty CSV data.');
  }

  return csv;
}

export { GOOGLE_SHEET_URL_ENV_NAME };