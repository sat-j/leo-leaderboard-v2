# Master Plan

This is the single source of truth for product direction, execution sequencing, and actionable work tracking.

It replaces the old split between:

- `docs/phased-roadmap.md`
- `docs/implementation-plan.md`
- `TODO.md`

## Why One Plan

The project has reached the point where roadmap, implementation order, and backlog are tightly coupled.

Keeping those in separate files now creates drift:

- roadmap says what we want
- implementation plan says how we build it
- TODO says what is left

One living plan is the better tradeoff now.

## Product Goal

Move from:

- Google Sheets runtime storage
- week-based navigation
- loosely coupled score entry and leaderboard processing

to:

- Supabase as the source of truth
- date-based navigation
- public score entry from the main site
- server-side validation and processing
- hidden admin/password protection now
- future RBAC later
- richer streaks and narrative stats

## Delivery Strategy

Use an incremental re-architecture, not a rewrite.

That means:

1. keep the working app
2. replace storage and backend boundaries first
3. move writes first
4. move reads next
5. remove week-based assumptions
6. add richer stats after the foundation is stable

## Target Architecture

### Runtime shape

- public score entry
  - submits validated matches to backend APIs
- leaderboard app
  - reads processed data from Supabase-backed APIs
- admin workspace
  - rebuilds processed data
  - corrects matches
  - manages players
- server-side processing layer
  - validates matches
  - computes ratings
  - computes derived stats and narratives
- Supabase
  - source of truth for players, matches, play dates, snapshots, summaries, and logs

### Key decisions

- no more manual week structure
- navigation is based on real play dates
- score entry is public-facing
- admin is for correction, moderation, and rebuilds
- raw match data and derived stats are separate layers
- heavy rebuilds stay off user-facing page loads

## Current Status

### Completed

- Supabase foundation is in place
- public score entry is integrated into the main app
- homepage CTA and mobile-first submit flow are working
- desktop score-entry drawer is working
- historical player and match import scripts were built
- historical data was loaded
- processed-data rebuild pipeline is working
- homepage reads are Supabase-backed and date-based
- overall page is Supabase-backed
- player stats page is Supabase-backed
- hidden admin session flow is working
- admin can:
  - rebuild processed data
  - edit/delete matches
  - edit players
  - change match participants
- admin match list now has:
  - 20-row pagination
  - search
  - status filter
  - clear filter button
  - compact layout improvements
- duplicate-player prevention exists in admin match editing

### In Progress

- admin mobile compactness polish

### Not Started

- streaks and narrative stats
- moderation queue / suspicious submission review
- audit trail for admin edits
- future RBAC/login path

## Phase Plan

## Phase 1 - Stabilize And Secure

### Goal

Make the existing system safe enough to migrate and operate.

### Status

Mostly complete.

### Remaining

- remove any now-dead legacy admin references

## Phase 2 - Supabase Foundation

### Goal

Move runtime storage and APIs to Supabase.

### Status

Complete for the initial platform foundation.

### Remaining

- tidy migrations and import docs for repeatability

## Phase 3 - Public Score Entry

### Goal

Make score submission a first-class public experience.

### Status

Complete for V1.

### Remaining

- stronger badminton-specific validation
- stronger anti-abuse messaging and review tooling

## Phase 4 - Date-Based Navigation And Supabase Reads

### Goal

Replace week-based reads and navigation with date-based behavior.

### Status

Complete for the main user-facing flows.

### Remaining

- final copy cleanup from week-language to date-language everywhere

## Phase 5 - Processing And Admin Operations

### Goal

Own the processing model on the server and support admin correction workflows.

### Status

Complete for V1, with polish still available.

### Remaining

- audit trail for admin edits
- optional soft-delete instead of hard-delete
- moderation queue for suspicious public submissions
- optional unsaved-changes warning

## Phase 6 - Streaks And Narrative Stats

### Goal

Make the product more engaging and story-driven.

### Status

Not started.

### Recommended V1 scope

- current win streak
- longest win streak
- hot right now
- giant killer

### Recommended V2 scope

- iron duo
- clutch player
- most active
- comeback artist
- rivalry of the month

## Phase 7 - Polish And Operations

### Goal

Tighten the product and reduce long-term maintenance friction.

### Status

Not started.

### Scope

- admin mobile polish
- audit logging
- backup/export routine
- suspicious-submission review tools
- doc cleanup

## Active Backlog

### Next Up

- [ ] Start streaks and narrative stats V1
- [ ] Final admin mobile compactness pass
- [ ] Add rebuild-needed toast/banner polish
- [ ] Add stronger badminton score-rule validation
- [ ] Add suspicious-submission review tooling

### Admin Hardening

- [ ] Add optional unsaved-changes warning before leaving admin page
- [ ] Add page jump or better pagination controls
- [ ] Add soft-delete decision for matches
- [ ] Add audit trail for match and player edits

### Player Management

- [ ] Add filters for active/inactive in player manager
- [ ] Add filters by level
- [ ] Decide whether player delete should exist or remain deactivate-only

### Public Submission Safety

- [ ] Tighten duplicate-submission suppression
- [ ] Improve rate-limit feedback to users
- [ ] Flag suspicious patterns for admin review

### Stats Backlog

- [ ] current win streak
- [ ] longest win streak
- [ ] hot right now
- [ ] giant killer
- [ ] iron duo
- [ ] clutch player
- [ ] most active
- [ ] comeback artist

### Cleanup

- [x] remove or archive remaining Google Sheets runtime code
- [x] clean README to match Supabase-first flow
- [x] move historical import artifacts into `scripts/archive`

## Execution Order From Here

1. streaks and narrative stats V1
2. final admin/mobile polish
3. submission safety and moderation trail
4. submission safety and operations polish

## Success Criteria

- no manual week management anywhere in active UX
- no Google Sheets dependency in runtime flow
- public score entry is reliable and verifiable
- admin correction flow is practical on desktop and acceptable on mobile
- ratings and summaries are reproducible from raw match history
- the product gives players interesting reasons to come back
