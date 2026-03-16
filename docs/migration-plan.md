# Historical Migration Notes

## Purpose

This document now exists as a historical reference for how the platform moved from the original Google Sheets and week-based model to the current Supabase-first architecture.

The migration itself is complete for the active runtime.

## Current State

The live platform now uses:

- Supabase as the source of truth
- public score submission from the main site
- date-based play navigation
- server-side rebuild processing
- a hidden admin workspace for correction and player management

Google Sheets is no longer in the runtime path.

## What Changed

The completed migration replaced:

- spreadsheet-backed runtime reads
- week-based navigation and processing
- loosely coupled score capture and leaderboard flows

with:

- structured Supabase tables
- public and admin API boundaries
- processed rating snapshots and player-date summaries
- date-based public reads

## Historical Data Import

Historical CSV and SQL helpers used during migration are archived under `scripts/archive/legacy-import`.

Those artifacts are retained for reference and repeatable re-import work, but they are not part of the active application runtime.

## Where To Look Now

- [master-plan.md](./master-plan.md)
  - single source of truth for roadmap, execution order, and backlog
- [supabase-schema.md](./supabase-schema.md)
  - active data model
- [api-contract.md](./api-contract.md)
  - active route contracts
- [operations-runbook.md](./operations-runbook.md)
  - operational guidance for the current system
