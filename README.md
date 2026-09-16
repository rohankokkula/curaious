# 10p — a small AI learning circle in hyderabad

Production-ready website for cohort 01 of a 10-person AI learning circle. Built with Next.js, TypeScript, Tailwind CSS, and a secure Google Sheets submission pipeline.

## local development

```bash
npm install
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

Other commands:

```bash
npm run build
npm run start
npm run lint
```

## environment variables

Create `.env.local` in the project root:

```bash
GOOGLE_SHEETS_WEBHOOK_URL=
GOOGLE_SHEETS_WEBHOOK_SECRET=
```

Example:

```bash
GOOGLE_SHEETS_WEBHOOK_URL=https://script.google.com/macros/s/YOUR_DEPLOYMENT_ID/exec
GOOGLE_SHEETS_WEBHOOK_SECRET=choose-a-long-random-secret
```

The frontend never sees the secret. Submissions go:

Next.js frontend → `/api/submit` → Google Apps Script Web App → Google Sheet

## Google Sheets setup

### step 1

Create a new Google Sheet.

### step 2

Create a tab named:

`Applications`

### step 3

Open **Extensions → Apps Script**.

### step 4

Paste the code from [`docs/google-apps-script.js`](docs/google-apps-script.js).

### step 5

Configure the script:

- replace `YOUR_GOOGLE_SHEET_ID` with your sheet ID from the URL
- replace `YOUR_SHARED_SECRET` with a long random secret

Use the same secret in `.env.local` as `GOOGLE_SHEETS_WEBHOOK_SECRET`.

### step 6

Deploy as a Web App:

1. Click **Deploy → New deployment**
2. Type: **Web app**
3. Execute as: **Me**
4. Who has access: **Anyone**

### step 7

Authorize the script when prompted.

### step 8

Copy the deployment URL.

### step 9

Add it to `.env.local`:

```bash
GOOGLE_SHEETS_WEBHOOK_URL=<deployment-url>
GOOGLE_SHEETS_WEBHOOK_SECRET=<same-secret-as-script>
```

Restart the dev server after changing env vars.

## redeploying Apps Script changes

If you edit the Apps Script code:

1. Save the script
2. Deploy → **Manage deployments**
3. Edit the active deployment
4. Choose **New version**
5. Deploy

The deployment URL usually stays the same.

## sheet columns

Each submission creates one row with:

- `application_id`
- `submitted_at`
- `full_name`
- `email`
- `linkedin_url`
- `current_location`
- `hyderabad_availability`
- `current_stage`
- `current_work`
- `ai_journey`
- `currently_learning_or_building`
- `presentation_topic`
- `topic_to_learn`
- `why_join`
- `contribution`
- `weekend_commitment`
- `portfolio_or_project_links`
- `agreement`
- `raw_payload_json`

## troubleshooting

### `server_not_configured`

The Next.js API route is missing `GOOGLE_SHEETS_WEBHOOK_URL` or `GOOGLE_SHEETS_WEBHOOK_SECRET`.

### `unauthorized` from Apps Script

The secret in `.env.local` does not match `SHARED_SECRET` in Apps Script.

### `submission_failed` / 502 from API route

Common causes:

- Web App not deployed with **Anyone** access
- Wrong deployment URL
- Sheet ID is incorrect
- Apps Script threw an error — check **Executions** in Apps Script

### CORS or fetch errors locally

The browser only talks to `/api/submit`. If local submission fails, inspect the terminal/server logs for the upstream Apps Script response.

### LinkedIn URL validation errors

Applicants must submit a full LinkedIn profile URL containing `linkedin.com/in/` or `linkedin.com/pub/`.

### Empty sheet after successful response

Confirm the tab is named exactly `Applications`. The script creates it if missing, but a typo in `SHEET_NAME` will write elsewhere.

## project structure

```text
src/
  app/
    api/submit/route.ts
    page.tsx
    layout.tsx
  components/
    application/
    sections/
  lib/
    types.ts
    validation.ts
    storage.ts
    utils.ts
docs/
  google-apps-script.js
```

## features

- editorial landing page with all content sections
- immersive multi-step application flow
- local draft persistence via `localStorage`
- table-based progress indicator
- review screen with inline editing
- secure server-side Google Sheets forwarding
- accessible keyboard navigation and reduced-motion support
