export interface Env {
    SHEETS_SPREADSHEET_ID: string;
    SHEETS_TAB?: string;
  }
  
  const SHEETS_API = "https://sheets.googleapis.com/v4/spreadsheets";
  
  export async function appendRows(
    access_token: string,
    spreadsheetId: string,
    sheetName: string,
    rows: (string | number | null)[][]
  ) {
    const range = encodeURIComponent(`${sheetName}!A1`);
    const url = `${SHEETS_API}/${spreadsheetId}/values/${range}:append?valueInputOption=USER_ENTERED`;
    const r = await fetch(url, {
      method: "POST",
      headers: {
        "authorization": `Bearer ${access_token}`,
        "content-type": "application/json"
      },
      body: JSON.stringify({ values: rows })
    });
    if (!r.ok) throw new Error(`sheets append failed: ${r.status} ${await r.text()}`);
    return r.json();
  }
  
  // (optional) clear and write headers in one shot
  export async function replaceAll(
    access_token: string,
    spreadsheetId: string,
    sheetName: string,
    rows: (string | number | null)[][]
  ) {
    // Clear
    const clearUrl = `${SHEETS_API}/${spreadsheetId}/values/${encodeURIComponent(sheetName)}!A:Z:clear`;
    let r = await fetch(clearUrl, {
      method: "POST",
      headers: { authorization: `Bearer ${access_token}` }
    });
    if (!r.ok) throw new Error(`sheets clear failed: ${r.status} ${await r.text()}`);
    // Write
    const updateUrl = `${SHEETS_API}/${spreadsheetId}/values/${encodeURIComponent(sheetName)}!A1?valueInputOption=USER_ENTERED`;
    r = await fetch(updateUrl, {
      method: "PUT",
      headers: {
        authorization: `Bearer ${access_token}`,
        "content-type": "application/json"
      },
      body: JSON.stringify({ values: rows })
    });
    if (!r.ok) throw new Error(`sheets update failed: ${r.status} ${await r.text()}`);
    return r.json();
  }
  