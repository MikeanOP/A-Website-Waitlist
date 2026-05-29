/*
  Google Sheets backend for the coming-soon waitlist page.

  Setup:
  1. Create a Google Sheet.
  2. Extensions -> Apps Script.
  3. Paste this file into Code.gs.
  4. Set SHEET_ID below, or leave blank if the script is bound to the Sheet.
  5. Deploy -> New deployment -> Web app.
     Execute as: Me
     Who has access: Anyone
  6. Copy the Web app URL into SHEETS_WEB_APP_URL in alcoholify.html.
*/

const SHEET_ID = ""; // Optional when this script is bound to the target spreadsheet.
const LEADERBOARD_CITIES = ["Delhi", "Bangalore", "Mumbai", "Pune", "Chandigarh", "Hyderabad", "Patiala", "Others"];
const STARTING_TOTAL = 8421;

const SHEETS = {
  waitlist: {
    name: "Waitlist",
    headers: ["id", "createdAt", "name", "phone", "normalizedPhone", "city", "drink", "source", "referrer", "userAgent", "position", "status"]
  },
  votes: {
    name: "Votes",
    headers: ["id", "createdAt", "city", "source", "referrer", "userAgent"]
  },
  searches: {
    name: "Searches",
    headers: ["id", "createdAt", "query", "source", "referrer", "userAgent"]
  },
  events: {
    name: "Events",
    headers: ["id", "createdAt", "eventName", "value", "source", "referrer", "userAgent"]
  }
};

function doGet(e) {
  return handleRequest_(e);
}

function doPost(e) {
  return handleRequest_(e);
}

function handleRequest_(e) {
  const params = parseParams_(e);
  const callback = sanitizeCallback_(params.callback);

  try {
    setupSheets_();

    const action = String(params.action || "stats").toLowerCase();
    let data;

    if (action === "signup") data = signup_(params);
    else if (action === "vote") data = vote_(params);
    else if (action === "search") data = search_(params);
    else if (action === "event") data = event_(params);
    else data = stats_();

    return respond_(callback, { ok: true, action, data });
  } catch (error) {
    return respond_(callback, {
      ok: false,
      error: String(error && error.message ? error.message : error)
    });
  }
}

function signup_(params) {
  const lock = LockService.getScriptLock();
  lock.waitLock(10000);

  try {
    const name = clean_(params.name, 80);
    const phone = clean_(params.phone, 30);
    const normalizedPhone = normalizePhone_(phone);
    const city = cleanCity_(params.city);
    const drink = clean_(params.drink, 80);

    if (!name) throw new Error("Name is required.");
    if (!normalizedPhone || normalizedPhone.length < 10) throw new Error("Valid phone number is required.");
    if (!city) throw new Error("Valid city is required.");

    const waitlist = getSheet_("waitlist");
    const rows = getRows_(waitlist);
    const existingIndex = rows.findIndex(row => String(row[4]) === normalizedPhone);

    if (existingIndex >= 0) {
      const existing = rows[existingIndex];
      const existingPosition = Number(existing[10]) || existingIndex + 1;
      return {
        duplicate: true,
        position: STARTING_TOTAL + existingPosition,
        total: STARTING_TOTAL + rows.length,
        stats: stats_()
      };
    }

    const position = rows.length + 1;
    waitlist.appendRow([
      Utilities.getUuid(),
      new Date(),
      name,
      phone,
      normalizedPhone,
      city,
      drink,
      clean_(params.source, 80),
      clean_(params.referrer, 300),
      clean_(params.userAgent, 300),
      position,
      "active"
    ]);

    return {
      duplicate: false,
      position: STARTING_TOTAL + position,
      total: STARTING_TOTAL + position,
      stats: stats_()
    };
  } finally {
    lock.releaseLock();
  }
}

function vote_(params) {
  const city = cleanVoteCity_(params.city);
  if (!city) throw new Error("Valid city is required.");

  getSheet_("votes").appendRow([
    Utilities.getUuid(),
    new Date(),
    city,
    clean_(params.source, 80),
    clean_(params.referrer, 300),
    clean_(params.userAgent, 300)
  ]);

  return stats_();
}

function search_(params) {
  const query = clean_(params.query, 120);
  if (!query) throw new Error("Search query is required.");

  getSheet_("searches").appendRow([
    Utilities.getUuid(),
    new Date(),
    query,
    clean_(params.source, 80),
    clean_(params.referrer, 300),
    clean_(params.userAgent, 300)
  ]);

  return { saved: true };
}

function event_(params) {
  getSheet_("events").appendRow([
    Utilities.getUuid(),
    new Date(),
    clean_(params.eventName, 80),
    clean_(params.value, 160),
    clean_(params.source, 80),
    clean_(params.referrer, 300),
    clean_(params.userAgent, 300)
  ]);

  return { saved: true };
}

function stats_() {
  const waitlistRows = getRows_(getSheet_("waitlist"));
  const voteRows = getRows_(getSheet_("votes"));

  const cityCounts = {};
  LEADERBOARD_CITIES.forEach(city => cityCounts[city] = 0);

  waitlistRows.forEach(row => {
    const city = leaderboardCity_(row[5]);
    cityCounts[city] += 1;
  });

  voteRows.forEach(row => {
    const city = leaderboardCity_(row[2]);
    cityCounts[city] += 1;
  });

  const max = Math.max(100, ...Object.values(cityCounts));
  const cities = LEADERBOARD_CITIES.map(city => ({
    city,
    count: cityCounts[city],
    score: Math.min(99, Math.max(12, Math.round((cityCounts[city] / max) * 99)))
  }));

  const recent = waitlistRows.slice(-8).reverse().map(row => ({
    name: firstName_(row[2]),
    city: row[5] || "your city",
    action: "joined"
  }));

  return {
    total: STARTING_TOTAL + waitlistRows.length,
    realSignups: waitlistRows.length,
    realVotes: voteRows.length,
    cities,
    recent
  };
}

function setupSheets_() {
  Object.keys(SHEETS).forEach(key => getSheet_(key));
}

function getSpreadsheet_() {
  if (SHEET_ID) return SpreadsheetApp.openById(SHEET_ID);
  const active = SpreadsheetApp.getActiveSpreadsheet();
  if (!active) throw new Error("Set SHEET_ID or bind this Apps Script to a Google Sheet.");
  return active;
}

function getSheet_(key) {
  const config = SHEETS[key];
  const spreadsheet = getSpreadsheet_();
  let sheet = spreadsheet.getSheetByName(config.name);

  if (!sheet) sheet = spreadsheet.insertSheet(config.name);

  const firstRow = sheet.getRange(1, 1, 1, config.headers.length).getValues()[0];
  const needsHeaders = firstRow.every(cell => !cell);

  if (needsHeaders) {
    sheet.getRange(1, 1, 1, config.headers.length).setValues([config.headers]);
    sheet.setFrozenRows(1);
  }

  return sheet;
}

function getRows_(sheet) {
  const lastRow = sheet.getLastRow();
  const lastCol = sheet.getLastColumn();
  if (lastRow < 2) return [];
  return sheet.getRange(2, 1, lastRow - 1, lastCol).getValues();
}

function parseParams_(e) {
  const params = Object.assign({}, e && e.parameter ? e.parameter : {});

  if (e && e.postData && e.postData.contents) {
    try {
      const body = JSON.parse(e.postData.contents);
      Object.keys(body).forEach(key => params[key] = body[key]);
    } catch (error) {
      // Ignore non-JSON bodies. Query parameters still work.
    }
  }

  return params;
}

function respond_(callback, payload) {
  const json = JSON.stringify(payload);

  if (callback) {
    return ContentService
      .createTextOutput(`${callback}(${json});`)
      .setMimeType(ContentService.MimeType.JAVASCRIPT);
  }

  return ContentService
    .createTextOutput(json)
    .setMimeType(ContentService.MimeType.JSON);
}

function clean_(value, maxLength) {
  return String(value || "")
    .replace(/[<>]/g, "")
    .replace(/\s+/g, " ")
    .trim()
    .slice(0, maxLength);
}

function cleanCity_(value) {
  return clean_(value, 60);
}

function cleanVoteCity_(value) {
  const city = clean_(value, 60);
  return LEADERBOARD_CITIES.indexOf(city) >= 0 ? city : "";
}

function leaderboardCity_(value) {
  const city = clean_(value, 60);
  return LEADERBOARD_CITIES.indexOf(city) >= 0 ? city : "Others";
}

function normalizePhone_(value) {
  return String(value || "").replace(/[^\d+]/g, "").replace(/^00/, "+").slice(0, 18);
}

function sanitizeCallback_(value) {
  const callback = String(value || "");
  return /^[a-zA-Z_$][\w$]*(\.[a-zA-Z_$][\w$]*)?$/.test(callback) ? callback : "";
}

function firstName_(value) {
  const name = clean_(value, 60);
  return name ? name.split(" ")[0] : "Someone";
}
