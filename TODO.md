# TODO

This file turns the roadmap into practical action steps we can execute phase by phase.

Reference: [docs/phased-roadmap.md](c:/Sathish/workspace/club/leo-leaderboard-v2/docs/phased-roadmap.md)

---

## Phase 1 - Stabilize The Current System

### Goals

- reduce current production risk
- make score processing safer
- prepare for migration

### Action steps

- [ ] Audit all current environment variables and remove inconsistencies between `GOOGLE_SHEET_ID` and `GOOGLE_SHEETS_ID`.
- [ ] Add a single config module that validates required env vars at startup.
- [ ] Add real server-side admin secret validation to `/api/process-scores`.
- [ ] Update the admin UI to pass the secret securely to the backend or use a real auth/session approach.
- [ ] Fix rating continuity so players who skip a period resume from their latest prior rating instead of resetting to initial values.
- [ ] Add validation for duplicate players in a single match.
- [ ] Add validation for invalid scores and ties.
- [ ] Surface processing warnings in the admin response:
  - unknown players
  - invalid rows
  - skipped matches
  - duplicate-like rows
- [ ] Add a processing summary UI in the admin page.
- [ ] Document the current Google Sheets schema and current flow assumptions.
- [ ] Add a migration-readiness note describing which sheet fields map to future Supabase fields.
- [ ] Clean up corrupted text encoding in visible UI strings and docs where needed.

### Exit criteria

- processing is authenticated
- processing results are explainable
- rating continuity is correct
- current Google Sheets flow is fully documented

---

## Phase 2 - Introduce Supabase As The New Source Of Truth

### Goals

- stop depending on Google Sheets as the runtime database
- create a proper backend contract

### Action steps

- [ ] Create a Supabase project for the badminton platform.
- [ ] Define the initial schema for:
  - `players`
  - `matches`
  - `play_dates`
  - `rating_snapshots`
  - `player_daily_stats`
  - `player_narratives`
- [ ] Decide primary keys and foreign key relationships for all major tables.
- [ ] Define how player names are normalized and stored.
- [ ] Decide whether `matches` store raw player names, player IDs, or both.
- [ ] Create SQL migrations for the initial schema.
- [ ] Create a backend data-access layer in the leaderboard app or a shared backend package.
- [ ] Build a one-time Google Sheets import script to populate Supabase.
- [ ] Build a verification script to compare imported counts against the existing sheet data.
- [ ] Create API endpoints for:
  - listing players
  - public score submission
  - listing recent matches
  - retrieving leaderboard data
  - retrieving player stats
- [ ] Refactor the score-entry UI to read players from the new backend.
- [ ] Refactor the score-entry UI to submit matches to the new backend instead of the current external Google Sheets writer.
- [ ] Keep Google Sheets import available only as a temporary fallback during migration.
- [ ] Add basic row-level security or service-role boundaries for write operations.
- [ ] Add server-side rate limiting for public score submission.
- [ ] Add duplicate-submission detection for public score submission.
- [ ] Add suspicious-submission logging for admin review.

### Exit criteria

- Supabase is the main source of truth
- score entry no longer depends on Google Sheets
- the app has a stable backend contract

---

## Phase 3 - Replace Week-Based UX With Date-Based UX

### Goals

- remove manual week concepts
- make navigation reflect real match dates

### Action steps

- [ ] Remove `WeekNumber` as a required product concept from the UI and API layer.
- [ ] Define the canonical meaning of a `play_date`.
- [ ] Decide whether `play_date` comes from:
  - submission date
  - explicit session date
  - a configurable club-night date
- [ ] Create a backend query that returns all available play dates in descending order.
- [ ] Replace the weekly selector with compact date navigation:
  - short day label
  - short date label
  - previous/next controls
- [ ] Add a prominent `Enter Score` CTA on the homepage without crowding the date navigation controls.
- [ ] Update the home page to default to the latest available play date.
- [ ] Update all leaderboard endpoints to accept `date` or `playDateId` instead of `week`.
- [ ] Update player profile filters to use date-based selection instead of week-based selection.
- [ ] Update labels like `Player of the Week`, `This Week`, and `Week 3` to date/session language.
- [ ] Remove week-tab assumptions from processing logic.
- [ ] Convert any remaining week-oriented calculations into date-oriented calculations.
- [ ] Decide how to handle multiple club sessions on the same day if that becomes necessary.
- [ ] Decide whether desktop uses a drawer or sheet so the leaderboard can remain visible underneath while score entry is open.

### Exit criteria

- no manual week input anywhere
- users navigate by real dates
- APIs and UI are aligned around play dates

---

## Phase 4 - Add Proper Server-Side Processing

### Goals

- move business rules into the backend
- make reads fast and reliable

### Action steps

- [ ] Create a server-side validation layer for submitted matches.
- [ ] Enforce match rules:
  - players must exist
  - no duplicate player in one match
  - no tie scores unless explicitly allowed
  - optional badminton scoring constraints
- [ ] Define the lifecycle of a submitted match:
  - `pending`
  - `validated`
  - `processed`
  - `rejected`
- [ ] Decide whether ratings are recomputed:
  - on every match submission
  - per play date
  - by scheduled/admin rebuild
- [ ] Create a processing service that computes ratings in chronological order.
- [ ] Store raw matches separately from derived leaderboard data.
- [ ] Create derived tables or read models for:
  - leaderboard rows
  - player summaries
  - date summaries
  - rivalry summaries
  - partnership summaries
- [ ] Add an admin rebuild endpoint for full-history recalculation.
- [ ] Add logging for each processing run.
- [ ] Add failure reporting for processing jobs.
- [ ] Make public reads depend on precomputed or efficiently queried data, not full-history recalculation during page load.
- [ ] Confirm Vercel runtime boundaries for heavy jobs and keep rebuild paths out of user page loads.

### Exit criteria

- match processing is server-owned
- page loads are fast
- rebuilds are separate from user-facing reads

---

## Phase 5 - Streaks, Narrative Stats, And Engagement Features

### Goals

- make the platform fun and sticky
- add personality beyond rankings

### Action steps

- [ ] Define the first narrative stat set to ship.
- [ ] Add a streak computation module for:
  - current win streak
  - longest win streak
  - current losing streak
  - attendance streak
  - partnership streak
  - rivalry streak
- [ ] Add a narrative stat module for:
  - giant killer
  - comeback artist
  - iron duo
  - hot hand
  - cold spell
  - court grinder
  - rivalry of the month
  - king of the day
  - consistency badge
  - upset alert
- [ ] Define how often narrative stats are recomputed.
- [ ] Create data structures for storing streak snapshots and narrative summaries.
- [ ] Add leaderboard cards for:
  - trending up
  - trending down
  - hottest streak
  - best duo
- [ ] Add player-profile story cards and badges.
- [ ] Add date/session headlines such as:
  - biggest mover
  - toughest rivalry
  - comeback of the day
- [ ] Decide which stats are season-long versus recent-form only.
- [ ] Add thresholds so narrative stats do not overreact to tiny sample sizes.

### Exit criteria

- leaderboard feels engaging
- player profiles tell a story
- stats are explainable and not just decorative

---

## Phase 6 - Club Night Experience

### Goals

- make the platform useful during actual play sessions
- improve live engagement and operational flow

### Action steps

- [ ] Add a live recent-match feed for the latest submissions.
- [ ] Add a session summary panel for the current play date.
- [ ] Add a `who is hot today` or `top movers today` section.
- [ ] Integrate the existing mobile-first score-entry UI into the main app as a full-screen experience on small screens.
- [ ] Add score-entry confirmation history so users can see recently submitted matches.
- [ ] Add duplicate-submission detection and warning.
- [ ] Add optional court number support.
- [ ] Add optional `submitted_by` tracking.
- [ ] Decide whether to add attendance/check-in tracking.
- [ ] Explore QR-based score entry.
- [ ] Explore balanced pairing suggestions based on ratings and partner history.
- [ ] Explore a club-night dashboard screen for display in the venue.

### Exit criteria

- the platform supports live club-night usage
- score capture and leaderboard feel connected in real time

---

## Cross-Phase Work Items

### Testing

- [ ] Add unit tests for rating calculations.
- [ ] Add unit tests for validation rules.
- [ ] Add unit tests for streak and narrative stat logic.
- [ ] Add integration tests for score submission and leaderboard reads.
- [ ] Add migration verification tests for Sheets-to-Supabase import.

### Documentation

- [ ] Keep the roadmap updated when priorities change.
- [ ] Add a Supabase schema document.
- [ ] Add an API contract document.
- [ ] Add an operations runbook for rebuilds and admin tasks.

### Design

- [ ] Define the compact date-navigation UI before implementation.
- [ ] Define the public score-entry CTA, entry route, and mobile full-screen interaction before implementation.
- [ ] Define the narrative card system before building multiple one-off widgets.
- [ ] Align both apps visually once they are on the same backend.

---

## Suggested Execution Order

- [ ] Complete Phase 1 before touching production behavior.
- [ ] Start Phase 2 schema and API design before major UI rewrites.
- [ ] Complete enough of Phase 2 before starting the full Phase 3 date UX migration.
- [ ] Use Phase 4 as the backend hardening pass.
- [ ] Ship Phase 5 narrative features after the data model is stable.
- [ ] Use Phase 6 as the polish and live-operations layer.
