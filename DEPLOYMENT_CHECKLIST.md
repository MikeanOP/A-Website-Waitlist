# Deployment Checklist

Follow this in order.

## 1. Create the Google Sheet backend

1. Go to https://sheets.google.com
2. Create a blank spreadsheet.
3. Name it something like `Private Beta Waitlist`.
4. Click `Extensions -> Apps Script`.
5. Delete the default code.
6. Paste all code from `google-sheets-backend.gs`.
7. Click Save.

## 2. Deploy Apps Script

1. Click `Deploy -> New deployment`.
2. Click the gear icon and choose `Web app`.
3. Description: `Waitlist API`.
4. Execute as: `Me`.
5. Who has access: `Anyone`.
6. Click `Deploy`.
7. Approve permissions.
8. Copy the Web app URL. It should look like:

```txt
https://script.google.com/macros/s/AKfycb.../exec
```

If you already deployed before and later changed `google-sheets-backend.gs`, paste the updated code into Apps Script, click Save, then deploy a new version from `Deploy -> Manage deployments -> Edit -> Version -> New version -> Deploy`.

## 3. Connect the page

In `alcoholify.html`, find:

```js
const SHEETS_WEB_APP_URL = "";
```

Paste your Apps Script URL:

```js
const SHEETS_WEB_APP_URL = "https://script.google.com/macros/s/AKfycb.../exec";
```

Save the file.

## 4. Test locally before Vercel

Open `alcoholify.html` in your browser.

Test these:

- Submit the hero waitlist form.
- Submit the bottom waitlist form.
- Vote for a city.
- Search a bottle in the demo.
- Click a problem card.

Then check your Google Sheet. These tabs should appear automatically:

- `Waitlist`
- `Votes`
- `Searches`
- `Events`

If the page says `Spot saved`, the connection is working.

## 5. Deploy on Vercel

Option A, Vercel website:

1. Go to https://vercel.com
2. Click `Add New -> Project`.
3. Import this folder/repository.
4. Framework preset: `Other`.
5. Build command: leave empty.
6. Output directory: leave empty.
7. Click `Deploy`.

Option B, Vercel CLI:

```bash
vercel deploy --prod
```

If Vercel asks questions:

- Set up and deploy: `Y`
- Which scope: choose your account/team
- Link to existing project: `N` unless you already made one
- Project name: choose any teaser-safe name
- Directory: `./`
- Override settings: `N`

## 6. Final live test

Open the Vercel URL and test again:

- Submit waitlist.
- Confirm a new row appears in `Waitlist`.
- Vote and confirm `Votes` updates.
- Search and confirm `Searches` updates.
- Click problem cards and confirm `Events` updates.

## Verified locally

- Inline JavaScript syntax passes.
- `vercel.json` syntax passes.
- The unrevealed product name is not present in the landing page UI.
