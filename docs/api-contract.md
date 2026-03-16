# API Contract

## Purpose

This document defines the active API contract for the badminton platform on Supabase and date-based navigation.

It is designed to support:

- the score-entry app
- the public leaderboard app
- the hidden admin flow
- future login and RBAC

The API should be treated as the boundary between frontend apps and platform data logic.

---

## Design Principles

- all writes go through server-side APIs
- public pages should not depend on raw table structure
- date-based navigation replaces week-based navigation
- admin-only actions stay server-owned
- public score submission should be easy to use on mobile and safe to operate at low trust
- responses should be shaped for the UI, not just mirror the database

---

## Authentication Model

## Stage 1

- public read endpoints: open
- admin endpoints: protected by hidden admin URL plus password checked server-side
- public score submission is allowed from the main site
- public score submission must still go through server-side validation and anti-abuse controls

## Stage 2

- Supabase Auth login
- RBAC-based access:
  - `viewer`
  - `member`
  - `scorekeeper`
  - `admin`

---

## Conventions

### Base paths

Suggested route grouping:

- `/api/public/*`
- `/api/admin/*`
- `/api/auth/*`

### Date handling

- use ISO dates: `YYYY-MM-DD`
- use ISO timestamps for precise event times

### Response shape

Standard success:

```json
{
  "success": true,
  "data": {}
}
```

Standard error:

```json
{
  "success": false,
  "error": {
    "code": "VALIDATION_ERROR",
    "message": "Score is invalid",
    "details": {}
  }
}
```

### Pagination

For list endpoints:

- `limit`
- `cursor` or `offset`

For launch, `limit + offset` is acceptable.

---

## Public Endpoints

## 1. `GET /api/public/players`

Purpose:

- list active players for dropdowns and profiles

Query params:

- `active=true|false` optional
- `search=...` optional

Response:

```json
{
  "success": true,
  "data": {
    "players": [
      {
        "id": "uuid",
        "displayName": "John",
        "slug": "john",
        "level": "INT",
        "isActive": true
      }
    ]
  }
}
```

Used by:

- score-entry player pickers
- player profile navigation

---

## 2. `POST /api/public/score-submissions`

Purpose:

- let anyone submit a match from the main site score-entry flow

Request:

```json
{
  "playedAt": "2026-03-15T19:24:00Z",
  "players": [
    { "playerId": "uuid-1", "team": 1, "seat": 1 },
    { "playerId": "uuid-2", "team": 1, "seat": 2 },
    { "playerId": "uuid-3", "team": 2, "seat": 1 },
    { "playerId": "uuid-4", "team": 2, "seat": 2 }
  ],
  "score1": 21,
  "score2": 17,
  "source": "homepage-score-entry"
}
```

Response:

```json
{
  "success": true,
  "data": {
    "submissionId": "uuid",
    "matchId": "uuid",
    "playDate": "2026-03-15",
    "status": "validated",
    "warnings": []
  }
}
```

Validation and anti-abuse rules:

- all four players must exist
- no duplicated player in the same match
- score rules must pass
- ties rejected unless explicitly supported
- rate limit repeated submissions from the same client
- detect likely duplicate match submissions in a short time window
- log suspicious submission patterns for admin review

Used by:

- homepage `Enter Score` CTA flow
- full-screen mobile-first score-entry view

---

## 3. `GET /api/public/play-dates`

Purpose:

- drive compact date navigation in the leaderboard UI

Response:

```json
{
  "success": true,
  "data": {
    "playDates": [
      {
        "id": "uuid",
        "date": "2026-03-15",
        "labelShort": "Sun Mar 15",
        "labelLong": "Sunday, March 15, 2026",
        "matchCount": 18
      }
    ],
    "latestDate": "2026-03-15"
  }
}
```

---

## 4. `GET /api/public/leaderboard`

Purpose:

- return the main leaderboard payload for a selected play date

Query params:

- `date=YYYY-MM-DD` optional
- if omitted, return latest available date

Response:

```json
{
  "success": true,
  "data": {
    "selectedDate": "2026-03-15",
    "selectedDateLabel": "Sun Mar 15",
    "previousDate": "2026-03-12",
    "nextDate": null,
    "summary": {
      "matchesPlayed": 18,
      "topMovers": [],
      "mostActive": [],
      "bestWinRate": []
    },
    "levelLeaderboards": {
      "ADV": [],
      "INT": [],
      "PLUS": []
    },
    "highlights": {
      "rockstars": [],
      "closeBuddies": [],
      "rivalries": [],
      "headlines": []
    },
    "playerStats": [],
    "matches": []
  }
}
```

Notes:

- this replaces the current week-based leaderboard endpoint
- on desktop, the leaderboard may remain visible underneath a score-entry drawer or sheet

---

## 5. `GET /api/public/leaderboard/overall`

Purpose:

- return overall season/career leaderboard data

Response:

```json
{
  "success": true,
  "data": {
    "overallStats": [],
    "totalPlayDates": 12,
    "totalMatches": 145
  }
}
```

---

## 6. `GET /api/public/players/{playerSlug}`

Purpose:

- return summary profile information for a single player

Response:

```json
{
  "success": true,
  "data": {
    "player": {
      "id": "uuid",
      "displayName": "John",
      "slug": "john",
      "level": "INT"
    },
    "summary": {
      "currentRating": 12.34,
      "currentWinRate": 58.2,
      "matchesPlayed": 42
    }
  }
}
```

---

## 7. `GET /api/public/players/{playerSlug}/stats`

Purpose:

- return player profile analytics

Query params:

- `date=YYYY-MM-DD` optional
- if omitted, return overall data

Response:

```json
{
  "success": true,
  "data": {
    "selectedDate": null,
    "availableDates": [],
    "analytics": {
      "totalMatches": 42,
      "wins": 24,
      "losses": 18,
      "winRate": 57.14,
      "overallAverageWinRate": 49.80,
      "partnerships": [],
      "opponents": [],
      "narratives": [],
      "streaks": []
    }
  }
}
```

---

## 8. `GET /api/public/matches/recent`

Purpose:

- power the live or recent match feed

Query params:

- `date=YYYY-MM-DD` optional
- `limit=50` optional

Response:

```json
{
  "success": true,
  "data": {
    "matches": [
      {
        "id": "uuid",
        "playedAt": "2026-03-15T19:24:00Z",
        "date": "2026-03-15",
        "team1": ["A", "B"],
        "team2": ["C", "D"],
        "score1": 21,
        "score2": 17,
        "winner": 1
      }
    ]
  }
}
```

---

## Admin Endpoints

## 9. `POST /api/admin/session`

Purpose:

- verify hidden admin password and establish a temporary admin session

Request:

```json
{
  "password": "secret"
}
```

Response:

```json
{
  "success": true,
  "data": {
    "authenticated": true
  }
}
```

Notes:

- implement as secure HTTP-only cookie session
- do not keep password validation on the client

---

## 10. `POST /api/admin/matches`

Purpose:

- create a single match from admin tools for correction, manual entry, or backfill

Request:

```json
{
  "playedAt": "2026-03-15T19:24:00Z",
  "players": [
    { "playerId": "uuid-1", "team": 1, "seat": 1 },
    { "playerId": "uuid-2", "team": 1, "seat": 2 },
    { "playerId": "uuid-3", "team": 2, "seat": 1 },
    { "playerId": "uuid-4", "team": 2, "seat": 2 }
  ],
  "score1": 21,
  "score2": 17,
  "source": "score-form"
}
```

Response:

```json
{
  "success": true,
  "data": {
    "matchId": "uuid",
    "playDate": "2026-03-15",
    "status": "validated"
  }
}
```

Validation rules:

- all four players must exist
- no duplicated player in the same match
- score rules must pass
- ties rejected unless explicitly supported

---

## 11. `POST /api/admin/matches/bulk`

Purpose:

- support imports, batch uploads, and legacy migration loads

Request:

```json
{
  "matches": []
}
```

Response:

```json
{
  "success": true,
  "data": {
    "inserted": 24,
    "rejected": 2,
    "warnings": []
  }
}
```

---

## 12. `GET /api/admin/matches`

Purpose:

- view submitted matches with validation or processing status

Query params:

- `date=YYYY-MM-DD`
- `status=pending|validated|processed|rejected`
- `limit`
- `offset`

Response:

```json
{
  "success": true,
  "data": {
    "matches": [],
    "total": 0
  }
}
```

---

## 13. `PATCH /api/admin/matches/{matchId}`

Purpose:

- correct or update a match before or after processing

Allowed updates:

- score correction
- played-at correction
- participant correction
- status correction

Response:

```json
{
  "success": true,
  "data": {
    "matchId": "uuid",
    "updated": true
  }
}
```

Notes:

- edits should trigger either reprocessing or a pending-rebuild state

---

## 14. `POST /api/admin/processing/rebuild`

Purpose:

- run a full or scoped rating/stat rebuild

Request:

```json
{
  "scope": "full_rebuild",
  "fromDate": null,
  "toDate": null
}
```

Response:

```json
{
  "success": true,
  "data": {
    "processingRunId": "uuid",
    "status": "running"
  }
}
```

Notes:

- long-running jobs should not block page loads
- can be synchronous early on if data is small, but should be designed for async evolution

---

## 15. `GET /api/admin/processing/runs`

Purpose:

- list rebuild history

Response:

```json
{
  "success": true,
  "data": {
    "runs": []
  }
}
```

---

## 16. `GET /api/admin/processing/runs/{runId}`

Purpose:

- inspect a specific rebuild result

Response:

```json
{
  "success": true,
  "data": {
    "run": {
      "id": "uuid",
      "status": "completed",
      "summary": {
        "matchesProcessed": 145,
        "matchesRejected": 3,
        "playDatesProcessed": 12
      },
      "errorMessage": null
    }
  }
}
```

---

## 17. `POST /api/admin/players`

Purpose:

- create new players

Request:

```json
{
  "displayName": "Jane",
  "level": "PLUS",
  "initialMu": 20,
  "initialSigma": 8.33
}
```

---

## 18. `PATCH /api/admin/players/{playerId}`

Purpose:

- update player profile data

Allowed changes:

- display name
- active flag
- level
- notes

Notes:

- changing level should not retroactively mutate historical ratings without an explicit rebuild decision

---

## Future Auth Endpoints

These are not required for Stage 1, but the API should be ready to evolve toward them.

- `POST /api/auth/login`
- `POST /api/auth/logout`
- `GET /api/auth/me`
- `GET /api/admin/users`
- `PATCH /api/admin/users/{userId}/roles`

---

## Error Codes

Suggested standard codes:

- `UNAUTHORIZED`
- `FORBIDDEN`
- `NOT_FOUND`
- `VALIDATION_ERROR`
- `DUPLICATE_MATCH`
- `RATE_LIMITED`
- `INVALID_SCORE`
- `PLAYER_NOT_FOUND`
- `PROCESSING_FAILED`
- `CONFIG_ERROR`
- `INTERNAL_ERROR`

---

## Versioning Strategy

For now:

- keep routes under a stable internal contract

If the platform grows:

- introduce `/api/v1/...`

---

## Recommended Initial Implementation

Build first:

- `GET /api/public/players`
- `POST /api/public/score-submissions`
- `GET /api/public/play-dates`
- `GET /api/public/leaderboard`
- `GET /api/public/leaderboard/overall`
- `GET /api/public/players/{playerSlug}/stats`
- `POST /api/admin/session`
- `POST /api/admin/matches`
- `GET /api/admin/matches`
- `POST /api/admin/processing/rebuild`
- `GET /api/admin/processing/runs`

This is enough to support:

- public score entry from the homepage
- public leaderboard
- hidden admin flow
- rebuild operations
- future RBAC and richer workflow extensions
