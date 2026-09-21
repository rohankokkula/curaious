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

Copy [`.env.example`](.env.example) to `.env.local` and fill it in:

```bash
cp .env.example .env.local
```

The application-form pipeline needs:

```bash
GOOGLE_SHEETS_WEBHOOK_URL=
GOOGLE_SHEETS_WEBHOOK_SECRET=
```

Season 1 (login, dashboard, admin) additionally needs:

```bash
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_ANON_KEY=
SUPABASE_SERVICE_ROLE_KEY=
NEXT_PUBLIC_SITE_URL=http://localhost:3000
SUPABASE_STORAGE_DECKS_BUCKET=decks
```

`SUPABASE_SERVICE_ROLE_KEY` bypasses row level security. It is only ever read
inside route handlers — never prefix it with `NEXT_PUBLIC_`.

Without the Supabase variables the site still builds and the public pages still
work; `/login`, `/dashboard` and `/admin` report that season 1 isn't connected
yet.

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

## Season 1 setup

Season 1 is the live cohort: invited members sign in with a magic link, see the
fixed October 2026 calendar, claim one of six talk slots, submit a title,
description and PDF deck, get approved by an admin, present the deck fullscreen
in-browser (screen-shared into Google Meet — Meet itself isn't integrated), and
get rated by the other nine on five parameters, 1–10 each.

These steps have to be done by hand, once.

### step 1 — create the Supabase project

Create a project at [supabase.com](https://supabase.com). Note the project URL,
the `anon` key and the `service_role` key from **Project Settings → API**.

### step 2 — enable magic-link auth

**Authentication → Providers → Email**: enable it, and enable **Email OTP /
Magic Link**. There are no passwords in this app.

### step 3 — set the auth URLs

**Authentication → URL Configuration**:

- **Site URL**: your site's origin (e.g. `http://localhost:3000` locally, your
  real domain in production)
- **Redirect URLs**: add `{SITE_URL}/auth/callback`

This must match `NEXT_PUBLIC_SITE_URL` in `.env.local`, or the magic link will
bounce.

### step 4 — create the decks bucket

**Storage → New bucket**: name it exactly `decks` and leave it **private**
(public access off). Decks are only ever served through signed URLs minted by
`/api/talks/[id]/deck/view`, which checks who is asking first.

### step 5 — run the migration

Open [`supabase/migrations/0001_init.sql`](supabase/migrations/0001_init.sql)
and **edit the placeholder admin email at the bottom of the file** before
running it:

```sql
INSERT INTO invites (name, email, role) VALUES ('Admin', 'you@example.com', 'admin');
```

That row is the only way to get an admin account — sign-in is gated on the
`invites` table and the role comes from the invite. Then paste the whole file
into **SQL Editor** and run it. It creates the tables, row level security
policies, the `is_admin()` helper, Season 1, and the eight fixed dates:

| date | slot |
| --- | --- |
| 2026-10-04 | kickoff |
| 2026-10-10 / 10-11 | talk 1a / 1b |
| 2026-10-17 / 10-18 | talk 2a / 2b |
| 2026-10-24 / 10-25 | talk 3a / 3b |
| 2026-10-31 | recognitions |

### step 6 — fill in `.env.local`

Copy `.env.example` to `.env.local` and paste in the four Supabase values.
Restart the dev server.

### step 7 — sign in and invite the cohort

Go to `/login`, enter the admin email from step 5, click the link in the email,
and you land on `/dashboard` with an **admin** link in the header. Add the ten
members at `/admin/invites` (name + email). Adding someone does **not** email
them — send them the `/login` link yourself.

### notes

- **Email rate limits.** Supabase's default hosted SMTP has a low send-rate cap.
  That's fine for ~11 people, but if magic links start arriving late or not at
  all, configure custom SMTP (Resend, Postmark, SES) under
  **Authentication → SMTP Settings**.
- **Upload size.** Decks are capped at 25MB, enforced client-side and in
  `/api/talks`. If you deploy to a serverless platform with a request body limit
  below that (Vercel functions cap request bodies at ~4.5MB), either keep decks
  small or switch `/api/talks` to a direct-to-storage signed upload.
- **Anonymity.** While a submission is pending, the calendar shows the slot as
  claimed with no name attached; the presenter's name and title appear only once
  an admin approves. Peer feedback is always shown without rater identity — the
  `ratings` table is readable only by its own author and admins, and the
  averages/comments come from `/api/talks/[id]/ratings`, which strips identity
  before responding.
- **One at a time.** A presenter can hold one pending-or-approved talk per
  season, and a slot can hold one. Rejecting a talk frees both back up.

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
