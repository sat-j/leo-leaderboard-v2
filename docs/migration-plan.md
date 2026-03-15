# Migration Plan

## Purpose

This document describes how to move the badminton platform from:

- Google Sheets
- week-based navigation
- loosely coupled score capture and leaderboard flows

to:

- Supabase
- date-based navigation
- server-owned validation and processing

The migration strategy is incremental to avoid a risky rewrite.

---

## Migration Goals

- avoid downtime where possible
- preserve historical data
- keep the current apps usable during transition
- move writes first, then reads, then cleanup

---

## Current State

### Score capture

- score-entry app posts to an external endpoint that writes to Google Sheets

### Leaderboard

- leaderboard reads Google Sheets data
- ratings are processed manually
- navigation is week-based

### Risks

- schema is implicit
- processing is partially manual
- current apps are coupled through sheet layout rather than an API contract

---

## Target State

- score-entry app writes to backend APIs
- backend writes to Supabase
- ratings and stats are computed from raw match data
- leaderboard reads derived Supabase-backed data
- users navigate by real play dates, not week numbers

---

## Migration Strategy

## Phase A - Document And Freeze Assumptions

### Tasks

- document current Google Sheets structure
- document all required fields
- identify data quality issues:
  - blank names
  - inconsistent names
  - missing dates
  - invalid scores
  - duplicate rows
- freeze schema changes in the old Sheets flow during migration

### Output

- trusted mapping from Sheets to Supabase tables

---

## Phase B - Build Supabase Foundation

### Tasks

- create Supabase project
- apply initial schema migrations
- seed roles and any required setup data
- build server-side data-access layer
- build import scripts

### Output

- empty but production-ready Supabase environment

---

## Phase C - Import Historical Data

### Source mapping

- `Players` sheet -> `players`
- `Scores` or weekly score tabs -> `matches` + `match_participants`
- `Ratings` -> optional import into `rating_snapshots`

### Recommended rule

Raw match history matters more than importing old derived snapshots.

That means:

- import `players`
- import raw historical matches
- recompute ratings from raw data in Supabase
- keep old `Ratings` sheet mainly as a comparison reference

### Tasks

- normalize player names
- create slugs
- import unique players
- import historical match rows
- infer or assign `play_dates`
- log rejected rows into an import report

### Output

- historical data available in Supabase

---

## Phase D - Verify Imported Data

### Verification checks

- total players imported
- total matches imported
- total play dates created
- invalid row count
- duplicate row count
- unknown player references

### Rating verification

- run a full rebuild in Supabase
- compare sample rating outputs with the old system
- compare top players and common stats for a few dates or legacy weeks

### Output

- migration verification report

---

## Phase E - Move New Writes To Supabase

### Tasks

- update score-entry app to call the new backend API
- stop writing new matches to Google Sheets in normal runtime flow
- ensure admin flow creates matches in Supabase
- add admin session/password protection for write endpoints

### Optional fallback

For a short period:

- write to both systems if needed for confidence

But recommended:

- keep one source of truth as soon as possible

### Output

- all new match submissions land in Supabase

---

## Phase F - Move Public Reads To Supabase

### Tasks

- replace leaderboard API read paths from Sheets to Supabase
- replace player stats read paths from Sheets to Supabase
- replace overall leaderboard read paths from Sheets to Supabase
- add date-based navigation payloads

### Output

- public apps read from Supabase-backed endpoints

---

## Phase G - Replace Week-Based UX

### Tasks

- remove week selectors from UI
- switch leaderboard to play-date navigation
- switch player profile filters to play-date filters
- remove any remaining `WeekNumber` dependency from API and processing logic

### Output

- user-facing app is fully date-based

---

## Phase H - Decommission Google Sheets Runtime Dependency

### Tasks

- remove Google Sheets reads from public APIs
- remove Google Sheets processing from admin APIs
- archive legacy import scripts if still useful
- keep raw export backup of sheets
- update docs and environment config

### Output

- Google Sheets is no longer in the runtime path

---

## Data Cleanup Rules

## Player names

Before import:

- trim whitespace
- normalize duplicate spacing
- identify variant names manually where needed

Recommended:

- build a small alias map during migration

## Scores

Reject rows with:

- missing players
- duplicate players in same match
- negative scores
- invalid numeric fields

Flag rows with:

- suspicious badminton scores
- likely duplicates

---

## Play Date Mapping Rules

Since the product is moving away from week-based structure, historical week-based data needs a rule.

### Preferred rule

If a real timestamp or date exists:

- use the real date

### Fallback rule

If only legacy week grouping exists:

- map each old week bucket to a synthetic historical date
- store the original legacy week in metadata if needed

Recommended metadata fields:

- `legacy_source`
- `legacy_week_label`
- `legacy_row_number`

This preserves traceability without keeping weeks as a product concept.

---

## Rollback Plan

If migration problems occur:

- keep the current Google Sheets flow operational until Supabase reads are verified
- do not remove Sheets code until:
  - imports are verified
  - new writes are stable
  - public reads are stable

Rollback path:

1. stop new Supabase writes
2. point read APIs back to legacy sources if absolutely needed
3. investigate using import and processing logs

---

## Migration Deliverables

- import script
- verification script
- alias/cleanup mapping file
- migration report
- rebuild comparison report
- final cutover checklist

---

## Cutover Checklist

- [ ] Supabase schema deployed
- [ ] historical players imported
- [ ] historical matches imported
- [ ] rebuild completes successfully
- [ ] ratings verified against sample legacy outputs
- [ ] score-entry app writes to new API
- [ ] leaderboard reads from Supabase-backed API
- [ ] date navigation works
- [ ] hidden admin password flow works
- [ ] docs updated
- [ ] Sheets archived as backup

---

## Recommendation

The safest migration path is:

1. import and verify historical data
2. move new writes to Supabase
3. move public reads to Supabase
4. switch the UI from week-based to date-based
5. remove Google Sheets from runtime

This keeps the system usable while foundation changes happen underneath it.

