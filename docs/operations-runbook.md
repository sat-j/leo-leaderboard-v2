# Operations Runbook

## Purpose

This runbook describes how to operate the badminton platform in its current Supabase-first architecture.

It focuses on:

- hidden admin access
- score submission operations
- rebuild operations
- data validation
- incident handling

---

## Operating Modes

## Stage 1 - Hidden admin mode

Current operating model:

- public leaderboard is open
- admin tools live at a hidden URL
- admin actions require password verification
- no user login for normal members yet

### Required rules

- the admin password must be checked server-side
- the password must never be trusted from client-only state
- the Supabase secret key must never be exposed to the browser
- all privileged writes must go through server-side routes

---

## Core Operational Flows

## 1. Admin access

### Goal

Access hidden admin functionality safely.

### Steps

1. Open the hidden admin URL.
2. Enter the admin password.
3. Backend validates the password.
4. Backend issues an HTTP-only session cookie.
5. Admin-only routes accept the session for the configured duration.

### Expected result

- admin can submit, edit, and rebuild safely

### Failure cases

- bad password
- missing session
- expired session

### Recovery

- re-authenticate

---

## 2. Submit a match

### Goal

Record a valid match in the platform.

### Steps

1. Open the homepage and use the prominent `Enter Score` CTA.
2. Select four players.
3. Enter scores.
4. Submit to `POST /api/public/score-submissions`.
5. Backend validates the payload.
6. If valid:
   - create or resolve the `play_date`
   - insert the match
   - insert participants
   - optionally trigger downstream processing
7. Return success response.

### Validation checklist

- all four players exist
- no duplicated player in same match
- scores are numeric and non-negative
- ties rejected unless explicitly allowed
- optional badminton rules enforced

### Failure cases

- invalid score
- unknown player
- duplicate match suspicion
- rate-limited request
- suspicious submission held for review

### Recovery

- correct data and resubmit
- wait for cooldown if rate-limited
- inspect admin logs or validation errors

---

## 3. Run rebuild processing

### Goal

Recompute ratings and derived data from raw matches.

### When to use

- after migration import
- after fixing bad historical data
- after changing rating logic
- after large batch imports

### Steps

1. Open admin tools.
2. Trigger rebuild using `POST /api/admin/processing/rebuild`.
3. Choose scope:
   - full rebuild
   - single date
   - date range
4. Backend creates a `processing_run`.
5. Processing computes:
   - rating snapshots
   - player date stats
   - narratives
   - partnership/rivalry summaries
6. Backend marks run complete or failed.

### Success checks

- run status is `completed`
- no unexpected rejections
- play-date summaries updated
- leaderboard loads correctly

### Failure checks

- run status is `failed`
- summary contains rejected rows
- error message contains stack or validation info

---

## 4. Review failed or rejected matches

### Goal

Resolve match records that could not be processed.

### Typical causes

- player name mismatch during migration
- duplicate player in same match
- invalid score
- malformed imported row

### Steps

1. Open admin match list.
2. Filter by `status=rejected`.
3. Inspect validation notes.
4. Correct the row or mark it intentionally invalid.
5. Re-run processing for affected scope.

---

## Routine Admin Tasks

## Daily or session-level

- review newly submitted matches
- check for obvious duplicates
- confirm the latest play date looks correct
- confirm leaderboard renders the latest date

## Weekly

- review processing logs
- review rejected match count
- review suspicious score patterns

## Release-time

- run a rebuild after rating logic changes
- verify top leaderboard outputs
- verify player profiles and narratives

---

## Incident Response

## Incident: score submission fails

### Symptoms

- users cannot submit scores
- form shows error
- no new recent matches appear

### Checks

- verify public submission API health
- verify server logs
- verify Supabase availability
- verify environment variables

### Recovery

- fix auth or API issue
- retry submission
- if needed, manually insert via admin tooling

---

## Incident: leaderboard shows stale data

### Symptoms

- new matches exist but leaderboard did not change

### Checks

- confirm matches were inserted
- confirm play date exists
- confirm processing ran
- confirm derived tables updated

### Recovery

- trigger scoped rebuild
- inspect processing run summary

---

## Incident: rebuild fails

### Symptoms

- `processing_run` marked `failed`

### Checks

- inspect run summary and error message
- inspect the first rejected or invalid match
- verify schema consistency after recent deploys

### Recovery

- fix bad data or code
- rerun rebuild
- if needed, rollback to previous deployment while keeping raw matches intact

---

## Incident: admin access broken

### Symptoms

- hidden admin URL loads but password flow fails

### Checks

- verify password env var
- verify cookie/session setup
- verify route protection logic

### Recovery

- redeploy env fix
- invalidate bad session logic if necessary

---

## Data Quality Rules

The system should never silently pretend success when data integrity is uncertain.

### Must reject

- unknown players
- duplicate player in same match
- invalid numeric scores
- malformed payloads

### Should warn

- suspicious score patterns
- likely duplicate matches
- unusual timestamps

### Should log

- every admin-triggered rebuild
- every rejected match
- every edited match

---

## Environment Checklist

Expected secure environment values:

- `SUPABASE_URL`
- `SUPABASE_PUBLISHABLE_KEY`
- `SUPABASE_SECRET_KEY`
- `NEXT_PUBLIC_SUPABASE_URL`
- `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY`
- `ADMIN_SECRET`
- optional session secret if custom session signing is used

Rules:

- `SUPABASE_SECRET_KEY` is server-only
- `ADMIN_SECRET` is server-only
- public clients must only use safe keys and public-safe endpoints

---

## Deployment Notes

### Vercel

Recommended split:

- public reads: normal route handlers
- admin writes: authenticated server routes
- rebuilds: admin-triggered server jobs

Rules:

- do not run heavy full-history rebuilds inside public page loads
- keep long-running jobs isolated from user-facing request paths
- prefer explicit rebuild actions for expensive processing

---

## Access Control Progression

## Now

- hidden admin URL
- password-protected admin session

## Later

- Supabase Auth login
- role-based access:
  - admin
  - scorekeeper
  - member
  - viewer

Operational rule:

- even after login is added, privileged writes should still be mediated by server-side routes for safety and auditability

---

## Manual Verification Checklist

After major changes:

- [ ] admin login/session works
- [ ] match submission works
- [ ] latest match appears in recent feed
- [ ] leaderboard latest date renders
- [ ] player profile renders
- [ ] rebuild endpoint works
- [ ] rebuild run is logged
- [ ] no service-role secrets are exposed client-side

---

## Recommended Admin UX Features

To make operations smoother, the admin panel should eventually show:

- recent match submissions
- pending vs processed status
- rejected rows
- latest rebuild summary
- last processed date
- duplicate warnings
- manual correction tools

---

## Recovery Philosophy

When in doubt:

1. keep raw matches intact
2. fix validation or processing logic
3. rerun derived-data rebuilds

Raw match history is the source of truth.
Derived data should be replaceable.
