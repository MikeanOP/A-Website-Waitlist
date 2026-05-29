# Google Sheets Waitlist Setup

The landing page is already wired for Google Sheets. You only need to deploy the included Apps Script and paste its web app URL into `alcoholify.html`.

## 1. Create the sheet

1. Open Google Sheets.
2. Create a new spreadsheet, for example `Private Beta Waitlist`.
3. Open `Extensions -> Apps Script`.

## 2. Add the backend

1. Delete the default Apps Script code.
2. Paste the contents of `google-sheets-backend.gs`.
3. Because the script is bound to this spreadsheet, you can leave `SHEET_ID = ""`.
4. Click Save.

The script creates these tabs automatically:

- `Waitlist`
- `Votes`
- `Searches`
- `Events`

## 3. Deploy the web app

1. Click `Deploy -> New deployment`.
2. Select type: `Web app`.
3. Set `Execute as` to `Me`.
4. Set `Who has access` to `Anyone`.
5. Click Deploy.
6. Copy the Web app URL.

## 4. Connect the landing page

Open `alcoholify.html` and replace:

```js
const SHEETS_WEB_APP_URL = "";
```

with:

```js
const SHEETS_WEB_APP_URL = "https://script.google.com/macros/s/YOUR_DEPLOYMENT_ID/exec";
```

## 5. Test before Vercel

Open `alcoholify.html` in your browser and submit a test signup.

Expected result:

- The page says the spot is saved.
- The `Waitlist` tab gets a new row.
- City votes land in `Votes`.
- Manual searches land in `Searches`.
- Problem card clicks land in `Events`.

## Notes

- Duplicate phone numbers are not added twice. The existing position is returned instead.
- The page still works visually if the Sheets URL is missing, but data will not be stored permanently.
- After editing Apps Script later, deploy a new version for changes to go live.
