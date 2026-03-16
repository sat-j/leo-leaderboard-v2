# LEO Badminton Club Leaderboard

Supabase-first badminton leaderboard and score-entry platform for LEO Badminton Club.

The app now uses:

- public score submission from the main site
- Supabase as the source of truth
- date-based navigation instead of weekly tabs
- server-side processing for ratings and derived stats
- a hidden admin workspace for rebuilds, match correction, and player management

## Docs Index

- Start with [docs/master-plan.md](./docs/master-plan.md) for the current product direction, execution order, and backlog.
- API details live in [docs/api-contract.md](./docs/api-contract.md).
- Data model details live in [docs/supabase-schema.md](./docs/supabase-schema.md).
- Operations guidance lives in [docs/operations-runbook.md](./docs/operations-runbook.md).
- Historical migration notes live in [docs/migration-plan.md](./docs/migration-plan.md).

## Current Runtime Architecture

- Public UI
  - homepage leaderboard
  - overall rankings
  - player stats
  - public `Enter Score` flow
- Admin UI
  - hidden admin route with password-protected session
  - match edit/delete
  - player create/update
  - rebuild processing
- Backend
  - Next.js route handlers for public and admin APIs
  - processing services for ratings and player-date summaries
- Data
  - Supabase tables for players, matches, participants, play dates, snapshots, summaries, and logs

## Main Routes

- `/`
  - public homepage with date-based leaderboard and score-entry CTA
- `/submit-score`
  - mobile-first public score entry
- `/overall`
  - overall leaderboard and career stats
- `/player-stats/[playerName]`
  - player-level stats view
- hidden admin route
  - rebuilds
  - match moderation
  - player management

## Environment Variables

Required:

```env
ADMIN_SECRET=your_secure_secret_key
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_PUBLISHABLE_KEY=sb_publishable_your_supabase_publishable_key
SUPABASE_SECRET_KEY=sb_secret_your_supabase_secret_key
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY=sb_publishable_your_supabase_publishable_key
```

## Local Development

```bash
npm install
npm run dev
```

Open `http://localhost:3000`.

## Data And Imports

Historical CSV/SQL import helpers are archived under [`scripts/archive`](./scripts/archive).

The active runtime no longer depends on Google Sheets.

## Repository Landmarks

```text
app/
  api/
    admin/           admin-only APIs
    public/          public-facing APIs
  overall/           overall leaderboard page
  player-stats/      player stats page
  submit-score/      public score-entry page

src/
  components/        UI building blocks
  lib/
    auth/            admin session helpers
    repositories/    Supabase data access
    services/        processing and submission workflows
    supabase/        Supabase clients and generated types
    validation/      match and player validation

supabase/
  migrations/        schema changes

scripts/archive/
  legacy-import/     historical import helpers and generated artifacts
```

## Status

Completed:

- Supabase-backed reads and writes
- public score entry
- date-based leaderboard navigation
- rebuild processing
- hidden admin flow
- match moderation
- player management

Next major feature area:

- streaks and narrative stats
