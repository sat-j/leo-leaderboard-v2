# Implementation Plan

## Purpose

This document turns the roadmap and architecture docs into a practical execution plan so development can start immediately.

It is optimized for:

- fast progress
- low migration risk
- visible milestones
- keeping the existing apps usable while the foundation changes

---

## Outcome We Are Building Toward

We are moving from:

- Google Sheets runtime storage
- week-based leaderboard navigation
- loosely coupled score capture and leaderboard processing

to:

- Supabase as the source of truth
- date-based leaderboard navigation
- server-side validation and processing
- hidden admin/password protection now
- future login and RBAC later

---

## Delivery Strategy

### Recommended approach

Do this as an **incremental re-architecture**, not a rewrite.

That means:

1. stabilize the current app
2. create the Supabase foundation
3. move writes first
4. move reads next
5. switch the UI from weeks to dates
6. add richer stats after the data model is stable

### Why this is the right order

- moving writes first establishes clean data
- moving reads after that reduces migration complexity
- date-based UI should happen only after the backend understands dates cleanly
- narrative features should wait until the processing model is stable

---

## Workstreams

We should treat the implementation as 5 parallel workstreams with clear dependencies.

### Workstream A - Platform foundation

- env config cleanup
- admin auth hardening
- Supabase project setup
- schema migrations

### Workstream B - Data migration

- import scripts
- verification scripts
- Sheets-to-Supabase mapping

### Workstream C - Backend APIs

- public read APIs
- admin write APIs
- processing/rebuild APIs

### Workstream D - Frontend migration

- score-entry app migration
- leaderboard read migration
- date-navigation UX migration

### Workstream E - Derived stats

- ratings
- player summaries
- streaks
- narratives

---

## Immediate Build Order

## Sprint 0 - Prep And Safety

### Goal

Make the current codebase safer before major changes.

### Tasks

- unify env usage around one config module
- add real server-side admin secret validation
- clean up current processing route risks
- fix rating continuity bug
- clean up obvious encoding issues in UI text

### Deliverable

- safer current app
- fewer legacy hazards while migration work begins

### Recommended files to create or change

- `src/lib/config.ts`
- `app/api/process-scores/route.ts`
- `app/leaderboard-admin-xyz789/page.tsx`
- `src/lib/trueskill.ts`
- `src/lib/googleSheets.ts`

---

## Sprint 1 - Supabase Foundation

### Goal

Stand up the new source of truth without breaking the current app.

### Tasks

- create Supabase project
- create SQL schema from `docs/supabase-schema.md`
- create seed data for roles
- decide whether to create `match_participants` immediately or temporarily use 4 player columns
- add server-side Supabase client modules
- add migration folder and first SQL migration

### Deliverable

- live Supabase instance with initial schema

### Recommended repo structure

```text
supabase/
  migrations/
src/
  lib/
    config.ts
    supabase/
      client.ts
      server.ts
      admin.ts
      types.ts
```

### Decision to make now

For speed, I recommend:

- use proper normalized schema now
- keep `match_participants`
- do not compromise the core data model just to save one sprint

---

## Sprint 2 - Admin Session And Write APIs

### Goal

Make the new backend able to accept secure writes.

### Tasks

- implement admin session endpoint
- implement hidden admin password verification
- issue HTTP-only admin session cookie
- create `POST /api/admin/matches`
- create `GET /api/admin/matches`
- add validation layer for new match submissions
- add duplicate detection rules

### Deliverable

- secure admin write flow on top of Supabase

### Recommended files to create

- `app/api/admin/session/route.ts`
- `app/api/admin/matches/route.ts`
- `src/lib/auth/adminSession.ts`
- `src/lib/validation/matches.ts`
- `src/lib/repositories/matches.ts`

### Important note

At this stage, the score-entry app can remain unchanged while we test the new write path manually.

---

## Sprint 3 - Historical Import

### Goal

Bring existing data into Supabase.

### Tasks

- build import script for players
- build import script for raw match history
- build player-name normalization/alias mapping
- generate `play_dates`
- reject or report malformed rows
- compare imported record counts against Sheets

### Deliverable

- historical data loaded into Supabase

### Recommended folder

```text
scripts/
  import_players.ts
  import_matches.ts
  verify_import.ts
  alias_map.json
```

### Rule

Import raw history first. Recompute ratings later.

Do not treat old ratings as the source of truth.

---

## Sprint 4 - Processing Engine In Supabase Flow

### Goal

Move rating and derived-stat generation to the new backend flow.

### Tasks

- build processing service that reads raw matches in chronological order
- generate `rating_snapshots`
- generate `player_date_stats`
- generate `processing_runs`
- create rebuild endpoint
- make processing resumable or at least rerunnable

### Deliverable

- fully working rebuild path on Supabase data

### Recommended files

- `app/api/admin/processing/rebuild/route.ts`
- `app/api/admin/processing/runs/route.ts`
- `src/lib/services/processMatches.ts`
- `src/lib/services/buildRatings.ts`
- `src/lib/services/buildPlayerDateStats.ts`
- `src/lib/repositories/processingRuns.ts`

### Processing strategy

Recommended first version:

- admin-triggered full rebuild
- chronological processing by `play_date`, then `played_at`

Recommended later:

- incremental processing per new date or new match batch

---

## Sprint 5 - Public Read APIs From Supabase

### Goal

Switch the leaderboard backend reads from Sheets to Supabase.

### Tasks

- create `GET /api/public/play-dates`
- create `GET /api/public/leaderboard`
- create `GET /api/public/leaderboard/overall`
- create `GET /api/public/players`
- create `GET /api/public/players/{slug}/stats`
- shape responses to match the frontend needs

### Deliverable

- Supabase-backed public API layer

### Recommended files

- `app/api/public/play-dates/route.ts`
- `app/api/public/leaderboard/route.ts`
- `app/api/public/leaderboard/overall/route.ts`
- `app/api/public/players/route.ts`
- `app/api/public/players/[slug]/stats/route.ts`
- `src/lib/repositories/players.ts`
- `src/lib/repositories/leaderboard.ts`
- `src/lib/repositories/playerStats.ts`

---

## Sprint 6 - Migrate Score Entry App

### Goal

Make new score submissions go to the new backend.

### Tasks

- point player loading to new API
- point match submission to `POST /api/admin/matches`
- replace optimistic fake-success behavior with real success/error behavior
- show validation errors clearly
- keep recent matches view using the new backend

### Deliverable

- score-entry app fully using the new API contract

### Recommended follow-up improvements

- add session timeout handling
- add clearer duplicate warnings

### Important UX change

Never report success unless the server actually confirmed it.

---

## Sprint 7 - Migrate Leaderboard Reads

### Goal

Move the public leaderboard app onto the new public APIs while preserving the old UI shape where possible.

### Tasks

- update home page fetches to new public API
- update overall page fetches
- update player profile page fetches
- remove direct dependency on Sheets-specific assumptions

### Deliverable

- leaderboard app reading only from Supabase-backed APIs

---

## Sprint 8 - Date-Based Navigation

### Goal

Replace week navigation with compact date navigation.

### Tasks

- create play-date selector component
- replace `WeekNavigation` with date navigation
- show compact labels like `Sun Mar 15`
- default to latest play date
- update all labels from week-based language to date/session language

### Deliverable

- no more week-based UX

### Recommended files to change

- `src/components/WeekNavigation.tsx` -> replace or rename to `DateNavigation.tsx`
- `app/page.tsx`
- `app/player-stats/[playerName]/page.tsx`
- related types and API client logic

---

## Sprint 9 - Remove Google Sheets Runtime Dependency

### Goal

Finish the migration and simplify the codebase.

### Tasks

- remove Sheets reads from public routes
- remove Sheets processing from admin routes
- archive or delete legacy Google Sheets helpers
- remove unused env vars
- update README and setup docs

### Deliverable

- Supabase-only runtime architecture

### Files likely to retire

- `src/lib/googleSheets.ts`
- old week-based processing code paths
- old admin inputs tied to sheet names

---

## Sprint 10 - Streaks And Narrative Stats

### Goal

Make the product more engaging once the foundation is stable.

### Tasks

- implement streak computation
- implement narrative stat generation
- create summary cards for home page
- add story cards to player profiles
- add thresholds to avoid silly outputs on tiny samples

### Deliverable

- richer, more fun leaderboard and player profile experience

### First recommended narrative set

- current win streak
- longest win streak
- hot hand
- giant killer
- iron duo
- rivalry of the month
- king of the day

---

## Recommended Technical Structure

## App layer

```text
app/
  api/
    admin/
    public/
```

## Lib layer

```text
src/lib/
  config.ts
  auth/
  supabase/
  validation/
  repositories/
  services/
  stats/
```

## Responsibilities

### `validation`

- request validation
- business rule checks

### `repositories`

- database access only
- no business logic

### `services`

- orchestration
- processing
- rebuild flows

### `stats`

- rating calculations
- narratives
- streak computations

---

## First Files To Build

If the goal is to start ASAP, build these first:

1. `src/lib/config.ts`
2. `src/lib/supabase/server.ts`
3. `src/lib/supabase/admin.ts`
4. `src/lib/auth/adminSession.ts`
5. `src/lib/validation/matches.ts`
6. `app/api/admin/session/route.ts`
7. `app/api/admin/matches/route.ts`
8. `supabase/migrations/0001_initial_schema.sql`
9. `scripts/import_players.ts`
10. `scripts/import_matches.ts`

This is the minimum set that unlocks real progress.

---

## Dependencies And Sequencing

### Must happen first

- config cleanup
- Supabase schema
- admin session flow

### Then

- write APIs
- import scripts
- rebuild processing

### Then

- public read APIs
- score-entry migration
- leaderboard migration

### Then

- date-navigation UI
- streaks and narratives

---

## Testing Plan

## Minimum tests to add early

- validation unit tests for match submission
- processing unit tests for rating continuity
- repository integration tests for match insert flow
- import verification tests

## Later tests

- play-date leaderboard response tests
- player profile response tests
- narrative stat tests

---

## Risks And Mitigations

## Risk: historical data is messy

Mitigation:

- use alias maps
- keep import reports
- reject bad rows explicitly

## Risk: rebuild logic becomes slow

Mitigation:

- start with full rebuild
- design for future incremental processing
- keep rebuild off public request paths

## Risk: frontend migration stalls

Mitigation:

- preserve old UI as much as possible
- swap backend contracts underneath first

## Risk: auth gets overbuilt too early

Mitigation:

- keep Stage 1 auth simple
- hidden admin URL + password + server session
- defer full RBAC UI until later

---

## Ready-To-Start Checklist

- [ ] create Supabase project
- [ ] add local env values
- [ ] create `supabase/migrations/0001_initial_schema.sql`
- [ ] create server-side Supabase helpers
- [ ] create admin session route
- [ ] create admin match submission route
- [ ] create import scripts
- [ ] test inserting one player and one match into Supabase

---

## Recommendation

If you want the fastest path to momentum, start with this exact sequence:

1. build Supabase schema
2. build admin password session flow
3. build `POST /api/admin/matches`
4. test manual match insertion end to end
5. import historical data
6. build rebuild processing
7. switch score-entry app
8. switch leaderboard reads
9. replace weeks with dates

That path gives the best balance of speed, safety, and visible progress.
