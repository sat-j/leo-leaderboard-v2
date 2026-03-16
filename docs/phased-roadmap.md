# Badminton Platform Phased Roadmap

## Goal

Evolve the current badminton platform from:

- a Google Sheets based score-entry and weekly leaderboard workflow

into:

- a Supabase-backed badminton platform
- date-based match history instead of week-based navigation
- reliable server-side validation and processing
- richer player stories, streaks, and engagement stats

This roadmap assumes we **reuse the existing apps where practical** and **replace the underlying data model and processing flow incrementally**, rather than doing a risky full rewrite.

---

## Product Direction

### What changes

- Remove the manual week structure.
- Every match is tied to a real match date and timestamp.
- The leaderboard navigation shows compact date labels such as:
  - `Sun Mar 15`
  - `Tue Mar 17`
- Navigation moves by available play dates, not by `Week 1`, `Week 2`, `Week 3`.
- Score entry no longer depends on human-maintained week tabs or manual week assignment.
- Score entry becomes a public-facing experience from the main site.
- The homepage gets a prominent `Enter Score` call to action.
- Score entry opens in a full-screen mobile-first view that reuses the existing score-entry UI.
- On desktop, the leaderboard may remain visible underneath only if score entry is presented as a drawer or sheet.
- Storage moves from Google Sheets to Supabase.
- Stats become more narrative and engaging, not just tables.

### What stays

- Existing leaderboard UI patterns can be reused and improved.
- Existing TrueSkill/stat logic can be retained where still valid.
- Existing score-entry experience can be kept as the starting mobile-first capture flow.

---

## Architectural End State

### Core shape

- `score-entry app`
  - submits matches to a backend API
- `leaderboard app`
  - reads processed data from Supabase-backed APIs
- `server-side processing layer`
  - validates submissions
  - computes ratings
  - computes derived aggregates and narrative stats
- `Supabase`
  - source of truth for players, matches, ratings snapshots, streaks, and derived stats

### Key design decisions

- Use **date/session-based navigation**, not week-based navigation.
- Use **server-owned validation**, not frontend-only validation.
- Allow **public score submission**, but protect quality with validation and anti-abuse controls.
- Use **incremental processing** where possible.
- Keep heavy recompute jobs out of page-load requests.
- Treat raw match data and derived leaderboard data as separate layers.

---

## Phase 1: Stabilize The Current System

### Objective

Reduce risk in the current platform before changing foundations.

### Scope

- Add server-side admin validation for score processing.
- Fix rating continuity bugs so players do not reset after skipping a period.
- Normalize environment variables and configuration.
- Remove silent success patterns where a failed operation is shown as successful.
- Add basic validation reporting for bad rows, unknown players, duplicate-ish submissions, and invalid scores.
- Document the current Google Sheets schema and migration assumptions.

### Why this phase matters

This gives us a safer base before we migrate storage or change time navigation.

### Deliverables

- secure processing route
- processing audit summary
- data quality warnings surfaced in admin flow
- documented current-state schema and migration rules

---

## Phase 2: Introduce Supabase As The New Source Of Truth

### Objective

Move away from Google Sheets without forcing a big-bang rewrite.

### Scope

- Create Supabase schema for:
  - `players`
  - `matches`
  - `sessions` or `play_dates`
  - `rating_snapshots`
  - `player_daily_stats`
  - `player_narratives`
- Build backend APIs for:
  - creating matches
  - listing recent matches
  - listing players
  - retrieving leaderboard data
- Integrate the score-entry experience into the main app as a public-facing flow.
- Keep Google Sheets optionally available only as a temporary import source.
- Add one-way migration/import script from Sheets to Supabase.
- Refactor the score-entry app to submit to the new backend instead of writing to Sheets through an external endpoint.

### Recommended data model

- `matches`
  - `id`
  - `played_at`
  - `play_date`
  - `player1_id`
  - `player2_id`
  - `player3_id`
  - `player4_id`
  - `score1`
  - `score2`
  - `submitted_by`
  - `source`
  - `status`
- `play_dates`
  - one row per date with matches
  - used to drive compact leaderboard navigation
- `rating_snapshots`
  - snapshot per player after each play date or processing run

### Why this phase matters

It removes the biggest architectural bottleneck: sheet-shaped logic spread across both apps.

### Deliverables

- Supabase schema
- migration scripts
- new backend API contract
- score-entry app connected to Supabase-backed APIs

---

## Phase 3: Replace Week-Based UX With Date-Based UX

### Objective

Switch the product from manual week buckets to natural date-based usage.

### Scope

- Remove all `WeekNumber`, `Week N`, and `w1/w2/w3` assumptions.
- Replace the leaderboard selector with compact date navigation:
  - `Sun Mar 15`
  - `Wed Mar 18`
- Next/previous controls move across actual available play dates.
- Default view shows the latest play date automatically.
- Add support for:
  - `Latest`
  - specific play date
  - optional range views later
- Restructure stats from “this week” to “this date” or “this session”.

### UI direction

Use a compact date chip/dropdown pattern:

- current selection shown as `Sun Mar 15`
- left/right arrows move across available dates
- no manual week creation
- no human week input anywhere in admin or score entry

### Processing rule

- match date is captured automatically from submission timestamp or explicit session date
- play dates are generated by the system
- ratings advance across play dates in chronological order

### Why this phase matters

This aligns the product with how your club actually operates: matches happen on real days, not artificial weeks.

### Deliverables

- date-based leaderboard navigation
- date-driven APIs
- removal of week tabs and week-based processing

---

## Phase 4: Add Proper Server-Side Processing

### Objective

Move business logic into the backend so the apps become simpler and more reliable.

### Scope

- Validate every match on the server:
  - players must exist
  - no duplicate players in the same match
  - no impossible scores
  - optional badminton scoring rules
- Trigger processing on:
  - match submission
  - admin rebuild
  - scheduled maintenance job if needed
- Store derived outputs separately from raw matches:
  - ratings by date
  - leaderboard rows
  - player summaries
  - streak counters
  - narrative badges
- Add rebuild tooling for full-history recalculation.

### Vercel fit

This phase is still compatible with Vercel.

- lightweight submission validation: good fit
- standard leaderboard reads: good fit
- moderate incremental recompute: good fit
- heavy full-history rebuilds: run as admin/background jobs, not inline in page loads

### Deliverables

- processing service layer
- async/admin rebuild path
- derived tables or materialized read models

---

## Phase 5: Streaks, Narrative Stats, And Engagement Features

### Objective

Make the product feel alive, memorable, and fun for players.

### Scope

Build a narrative stats layer on top of the stable match and ratings model.

### Streaks

- current win streak
- longest win streak
- current losing streak
- unbeaten with partner streak
- head-to-head streak against a rival
- scoring streak
  - most consecutive matches scoring 21+
- attendance streak
  - most consecutive play dates attended

### Narrative stats

- giant killer
  - most wins over higher-rated opponents
- comeback artist
  - wins after recent losses or tough rival records
- iron duo
  - best active partnership over time
- hot hand
  - highest gain over the last 3 play dates
- cold spell
  - biggest recent drop
- court grinder
  - most matches played in a session/date range
- rivalry of the month
  - most compelling balanced head-to-head
- king of the day
  - best performer on a specific play date
- consistency badge
  - stable positive performance across recent dates
- upset alert
  - biggest single-match rating upset

### Presentation ideas

- player profile story cards
- “Tonight’s headlines”
- “Trending up / trending down”
- rivalry cards
- partner chemistry cards
- streak banners on the leaderboard

### Why this phase matters

This is where the platform stops being just a ranking tool and becomes something players actively enjoy checking.

### Deliverables

- streak engine
- narrative stat engine
- new UI cards and profile sections

---

## Phase 6: Club Night Experience

### Objective

Turn the platform into a live club-night system, not just a reporting tool.

### Scope

- live recent match feed
- latest movers on the ladder
- session summary view
- “who is hot tonight”
- score-entry confirmation history
- duplicate submission alerts
- optional court tagging
- optional submitted-by tracking

### Optional advanced ideas

- QR-based score entry
- check-in / attendance tracking
- session leaderboards
- balanced pairing suggestions
- match-quality recommendations

---

## Recommended Build Order

### First

- Phase 1
- Phase 2

These create safety and the new foundation.

### Next

- Phase 3
- Phase 4

These change the operating model from week-based Sheets to date-based server-owned processing.

### Then

- Phase 5
- Phase 6

These add the fun, sticky, differentiating features.

---

## Rewrite Strategy

### Recommended approach

Do **not** rewrite everything from scratch.

Do this instead:

1. Keep the existing apps.
2. Replace the backend contract and storage first.
3. Migrate the UI off week concepts once the new APIs exist.
4. Move stats incrementally into the new architecture.
5. Remove Google Sheets code after parity is reached.

### Why

- lower delivery risk
- faster visible progress
- easier rollback
- preserves working UI and proven logic

---

## Immediate Next Steps

1. Define the Supabase schema.
2. Define the new API contract for score submission and leaderboard reads.
3. Map current week-based calculations to date-based equivalents.
4. Decide whether ratings should snapshot by:
   - match
   - play date
   - session
5. Build migration scripts from Google Sheets to Supabase.
6. Refactor the score-entry app to use the new backend first.
7. Refactor the leaderboard app to consume date-based APIs.

---

## Success Criteria

- No manual week management anywhere.
- No Google Sheets dependency in core runtime flow.
- Score submission success is reliable and verifiable.
- Leaderboard navigation is date-based and compact.
- Ratings and stats are reproducible from raw match history.
- Players get richer, more fun reasons to revisit the app.
