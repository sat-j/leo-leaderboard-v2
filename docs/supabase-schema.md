# Supabase Schema Proposal

## Purpose

This document defines a practical Supabase schema for the badminton platform.

It is designed for two stages:

- **Stage 1**
  - hidden admin URL
  - password-protected admin actions
  - no full login system for regular users yet
- **Stage 2**
  - authenticated users
  - RBAC
  - role-aware writes, approvals, and admin tools

The goal is to build a schema that works now without painting us into a corner later.

---

## Design Principles

### 1. Raw data and derived data must be separate

- raw matches are the source of truth
- ratings, streaks, and leaderboard summaries are derived outputs

### 2. Date-driven, not week-driven

- no `week_number`
- all timeline logic is based on `played_at`, `play_date`, or session grouping

### 3. IDs over names

- player names can change
- relationships should use stable UUIDs

### 4. Auth-ready from day one

- even if we start with hidden admin + password, the schema should support future RBAC cleanly

### 5. Support rebuilds

- the system must be able to recompute ratings and narratives from raw history

---

## Recommended Schema Overview

### Core tables

- `profiles`
- `roles`
- `user_roles`
- `players`
- `play_dates`
- `matches`
- `match_participants`
- `processing_runs`
- `rating_snapshots`
- `player_date_stats`
- `player_narratives`
- `partnership_summaries`
- `rivalry_summaries`

### Optional later tables

- `attendance`
- `courts`
- `sessions`
- `match_audit_log`
- `admin_secrets`

---

## Auth And Access Model

## Stage 1 - Hidden admin + password

Current desired behavior:

- public leaderboard remains open
- admin tools live under a hidden URL
- admin actions are password-protected
- no general user login required yet

Recommended implementation:

- Keep password verification in server-side code, not the client.
- Store the admin password as an environment variable, not in Supabase.
- Use Supabase with a server-side secret key for admin-only write actions.
- Public reads should use anonymous/public-safe queries or server-side read APIs.

This means:

- we do **not** need full user auth to launch the first Supabase version
- we should still make the schema compatible with future auth

## Stage 2 - Login + RBAC

Future desired behavior:

- users can log in
- certain users can submit scores
- certain users can manage players
- only admins can rebuild ratings or edit protected data

Recommended model:

- use `auth.users` from Supabase Auth
- extend users with a `profiles` table
- assign permissions via `roles` and `user_roles`

Suggested roles:

- `admin`
- `scorekeeper`
- `member`
- `viewer`

---

## Table Definitions

## 1. `profiles`

Purpose:

- app-level user profile linked to Supabase Auth

Columns:

- `id uuid primary key`
  - references `auth.users.id`
- `display_name text not null`
- `email text`
- `created_at timestamptz not null default now()`
- `updated_at timestamptz not null default now()`

Notes:

- not needed for Stage 1 public-only use
- should still be created early because RBAC will depend on it later

---

## 2. `roles`

Purpose:

- list of supported application roles

Columns:

- `id uuid primary key default gen_random_uuid()`
- `code text unique not null`
  - examples: `admin`, `scorekeeper`, `member`, `viewer`
- `name text not null`
- `description text`

Seed data:

- `admin`
- `scorekeeper`
- `member`
- `viewer`

---

## 3. `user_roles`

Purpose:

- many-to-many mapping between users and roles

Columns:

- `id uuid primary key default gen_random_uuid()`
- `user_id uuid not null`
  - references `profiles.id`
- `role_id uuid not null`
  - references `roles.id`
- `created_at timestamptz not null default now()`
- unique constraint on `user_id, role_id`

Notes:

- this gives flexibility for future RBAC without schema changes

---

## 4. `players`

Purpose:

- canonical player records used throughout the platform

Columns:

- `id uuid primary key default gen_random_uuid()`
- `display_name text not null`
- `slug text unique not null`
- `level text not null`
  - allowed values for now: `PLUS`, `INT`, `ADV`
- `initial_mu numeric(8,3) not null`
- `initial_sigma numeric(8,3) not null`
- `is_active boolean not null default true`
- `joined_on date`
- `notes text`
- `created_at timestamptz not null default now()`
- `updated_at timestamptz not null default now()`

Recommended constraints:

- check constraint on `level`
- unique index on normalized player name if needed

Why keep `initial_mu` and `initial_sigma`:

- useful for rebuilds
- useful when adding new players mid-season

---

## 5. `play_dates`

Purpose:

- compact date navigation source
- one row per distinct date on which matches were played

Columns:

- `id uuid primary key default gen_random_uuid()`
- `play_date date unique not null`
- `label_short text`
  - example: `Sun Mar 15`
- `label_long text`
  - example: `Sunday, March 15, 2026`
- `match_count integer not null default 0`
- `is_processed boolean not null default false`
- `last_processed_at timestamptz`
- `created_at timestamptz not null default now()`

Notes:

- this replaces week navigation
- it should drive previous/next date controls in the UI

---

## 6. `matches`

Purpose:

- raw match records
- source of truth for rating rebuilds

Columns:

- `id uuid primary key default gen_random_uuid()`
- `play_date_id uuid not null`
  - references `play_dates.id`
- `played_at timestamptz not null`
- `score1 integer not null`
- `score2 integer not null`
- `submitted_by_user_id uuid`
  - references `profiles.id`
- `submitted_via text not null default 'admin'`
  - examples: `admin`, `score-form`, `import`, `system`
- `source text not null default 'manual'`
  - examples: `manual`, `import`, `migration`
- `status text not null default 'pending'`
  - examples: `pending`, `validated`, `processed`, `rejected`
- `validation_notes jsonb`
- `external_source_id text`
- `created_at timestamptz not null default now()`
- `updated_at timestamptz not null default now()`

Recommended constraints:

- check `score1 >= 0`
- check `score2 >= 0`
- optional check `score1 <> score2` if ties are not allowed

Notes:

- `matches` should not store `week_number`
- `external_source_id` helps if a future external app or import process needs dedupe tracking

---

## 7. `match_participants`

Purpose:

- normalize the four player slots in a match
- support future flexibility and clean analytics queries

Columns:

- `id uuid primary key default gen_random_uuid()`
- `match_id uuid not null`
  - references `matches.id`
- `player_id uuid not null`
  - references `players.id`
- `team_number smallint not null`
  - `1` or `2`
- `seat_number smallint not null`
  - `1` or `2`
- `created_at timestamptz not null default now()`

Recommended constraints:

- unique on `match_id, player_id`
- unique on `match_id, team_number, seat_number`
- check `team_number in (1, 2)`
- check `seat_number in (1, 2)`

Why use this instead of storing `player1_id ... player4_id` in `matches`:

- cleaner analytics
- fewer awkward queries
- easier future changes
- easier dedupe and validation

If you want simpler implementation initially, you can start with four player columns in `matches` and migrate later, but `match_participants` is the stronger design.

---

## 8. `processing_runs`

Purpose:

- audit trail for rebuilds and processing jobs

Columns:

- `id uuid primary key default gen_random_uuid()`
- `triggered_by_user_id uuid`
  - references `profiles.id`
- `trigger_type text not null`
  - examples: `admin`, `auto`, `migration`
- `scope text not null`
  - examples: `full_rebuild`, `single_date`, `incremental`
- `status text not null`
  - examples: `running`, `completed`, `failed`
- `started_at timestamptz not null default now()`
- `finished_at timestamptz`
- `summary jsonb`
- `error_message text`

Why this matters:

- required for debugging
- useful during migration
- useful for future admin tooling

---

## 9. `rating_snapshots`

Purpose:

- store player ratings after a given play date or processing run

Columns:

- `id uuid primary key default gen_random_uuid()`
- `player_id uuid not null`
  - references `players.id`
- `play_date_id uuid not null`
  - references `play_dates.id`
- `processing_run_id uuid`
  - references `processing_runs.id`
- `mu numeric(8,3) not null`
- `sigma numeric(8,3) not null`
- `skill_rating numeric(8,3) not null`
  - `mu - 3*sigma`
- `rating_change numeric(8,3)`
- `rank_overall integer`
- `created_at timestamptz not null default now()`

Recommended constraints:

- unique on `player_id, play_date_id`

Notes:

- this table replaces the old `Ratings` sheet
- it should represent the canonical rating state after each play date

---

## 10. `player_date_stats`

Purpose:

- store per-player stats for a specific play date

Columns:

- `id uuid primary key default gen_random_uuid()`
- `player_id uuid not null`
  - references `players.id`
- `play_date_id uuid not null`
  - references `play_dates.id`
- `matches_played integer not null default 0`
- `matches_won integer not null default 0`
- `win_rate numeric(5,2) not null default 0`
- `points_scored integer not null default 0`
- `points_conceded integer not null default 0`
- `points_difference integer not null default 0`
- `rating_change numeric(8,3) not null default 0`
- `created_at timestamptz not null default now()`

Recommended constraints:

- unique on `player_id, play_date_id`

Notes:

- makes date leaderboard reads cheap
- lets the UI show “best of the day” without recomputing raw data every request

---

## 11. `player_narratives`

Purpose:

- store fun, user-facing story stats and badges

Columns:

- `id uuid primary key default gen_random_uuid()`
- `player_id uuid not null`
  - references `players.id`
- `code text not null`
  - examples: `hot_hand`, `giant_killer`, `comeback_artist`
- `scope text not null`
  - examples: `current`, `season`, `recent_30d`, `play_date`
- `play_date_id uuid`
  - references `play_dates.id`
- `title text not null`
- `description text not null`
- `value_numeric numeric(10,3)`
- `value_text text`
- `metadata jsonb`
- `computed_at timestamptz not null default now()`

Recommended constraints:

- index on `player_id`
- index on `code`

Notes:

- very useful for profile cards and home page highlights
- flexible enough for evolving product ideas

---

## 12. `partnership_summaries`

Purpose:

- precomputed partner analytics

Columns:

- `id uuid primary key default gen_random_uuid()`
- `player_a_id uuid not null`
- `player_b_id uuid not null`
- `matches_played integer not null default 0`
- `wins integer not null default 0`
- `losses integer not null default 0`
- `win_rate numeric(5,2) not null default 0`
- `last_played_at timestamptz`
- `updated_at timestamptz not null default now()`

Recommended constraints:

- unique on normalized pair `(player_a_id, player_b_id)` where `player_a_id < player_b_id`

---

## 13. `rivalry_summaries`

Purpose:

- precomputed head-to-head analytics

Columns:

- `id uuid primary key default gen_random_uuid()`
- `player_a_id uuid not null`
- `player_b_id uuid not null`
- `matches_against integer not null default 0`
- `player_a_wins integer not null default 0`
- `player_b_wins integer not null default 0`
- `last_played_at timestamptz`
- `updated_at timestamptz not null default now()`

Recommended constraints:

- unique on normalized pair `(player_a_id, player_b_id)` where `player_a_id < player_b_id`

---

## Optional Tables For Later

## `attendance`

Use if you want:

- attendance streaks
- who came on which date
- no-match attendance tracking

Suggested columns:

- `id uuid`
- `player_id uuid`
- `play_date_id uuid`
- `status text`
  - `present`, `absent`, `late`

## `sessions`

Use if you later need:

- multiple sessions on the same day
- morning/evening splits
- tournament rounds

For now, `play_dates` is enough unless same-day multi-session support is important immediately.

## `courts`

Use if you later want:

- court-level analytics
- live club-night dashboards

---

## Recommended Initial Constraints

At minimum:

- player level check constraint
- match score non-negative check
- match participant uniqueness
- rating snapshot uniqueness by player/date
- player-date stats uniqueness by player/date
- normalized pair uniqueness for partnerships and rivalries

---

## Recommended Indexes

### `players`

- unique index on `slug`
- optional index on lowercased `display_name`

### `play_dates`

- unique index on `play_date`
- index on `play_date desc`

### `matches`

- index on `play_date_id`
- index on `played_at desc`
- index on `status`

### `match_participants`

- index on `player_id`
- index on `match_id`
- composite index on `player_id, match_id`

### `rating_snapshots`

- unique index on `player_id, play_date_id`
- index on `play_date_id`
- index on `skill_rating desc`

### `player_date_stats`

- unique index on `player_id, play_date_id`
- index on `play_date_id`

### `player_narratives`

- index on `player_id`
- index on `code`
- index on `play_date_id`

---

## Row Level Security Strategy

## Stage 1

Use a simple model:

- public read access to safe leaderboard views or server-owned read APIs
- admin writes done through server-side code using the Supabase secret key
- no direct client write access to core tables

Recommended:

- enable RLS on all core tables
- do not allow anonymous direct inserts into `matches`
- do not expose the Supabase secret key to the client

## Stage 2

When login is added:

- `viewer`
  - read-only access to public-safe data
- `member`
  - optional read access to private member-only data
- `scorekeeper`
  - create matches
  - possibly update pending submissions
- `admin`
  - manage players
  - rebuild ratings
  - edit/reject bad matches

Recommended enforcement pattern:

- use Postgres RLS policies for direct table access where appropriate
- use server-side route handlers for privileged workflows
- keep rebuild and admin actions server-owned even after login

---

## Suggested Read Models

For performance and simple UI code, avoid reading raw tables directly in every page.

Recommended read models:

- `leaderboard_daily_view`
- `leaderboard_overall_view`
- `player_profile_summary_view`
- `recent_matches_view`
- `session_highlights_view`

These can be:

- SQL views
- materialized views
- derived tables updated by processing jobs

For launch, derived tables are often easier to control than complex live views.

---

## Migration Mapping From Google Sheets

### Current sheets to Supabase

- `Players`
  - maps to `players`
- `Scores`
  - maps to `matches` + `match_participants`
- `Ratings`
  - maps to `rating_snapshots`
- `w1`, `w2`, `w3`
  - replaced by `play_dates` and date-based match queries

### Important migration note

Do not carry forward the old week structure into the new data model.

Instead:

- infer historical dates if available
- if exact historical dates are missing, decide on a migration rule
  - preserve legacy week labels only in metadata
  - or map each historical week to a synthetic date for compatibility

---

## Recommended Launch Scope

## Build now

- `players`
- `play_dates`
- `matches`
- `match_participants`
- `processing_runs`
- `rating_snapshots`
- `player_date_stats`

## Add soon after

- `profiles`
- `roles`
- `user_roles`
- `player_narratives`
- `partnership_summaries`
- `rivalry_summaries`

This gives a realistic path:

- lean enough to implement
- structured enough for future login and RBAC

---

## Open Decisions

These still need a product/engineering decision before implementation:

1. Should a play date be purely calendar-based, or should there be a separate session entity?
2. Should match submission create ratings immediately, or should processing remain an admin-triggered action first?
3. Should public users read directly from Supabase views, or should all reads stay behind Next.js APIs?
4. Will score submission remain admin-only initially, or will trusted scorekeepers get access next?
5. Do we want to support editing/deleting submitted matches, or only append + admin correction?

---

## Recommendation

For your current goals, the strongest first implementation is:

- hidden admin URL remains
- password verification remains server-side
- Supabase stores all core data
- Next.js APIs mediate all writes
- public leaderboard reads use server routes
- RBAC tables exist early, but full login can wait

This gives you a smooth path from:

- hidden admin/password today

to:

- proper authenticated scorekeepers and admins later

without redesigning the database again.
