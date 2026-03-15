<div align="center">
  <img src="https://github.com/user-attachments/assets/35e65497-73e9-4644-b9f9-44432a133c81" alt="LEO Badminton Club" width="180" />

  # LEO Badminton Club — Leaderboard

  *Smash Your Limits · Est. 2024*

  A full-stack leaderboard platform for LEO Badminton Club, featuring skill-based rankings powered by the **TrueSkill** rating algorithm, Google Sheets as the data backend, and an admin panel for weekly score processing.
</div>

---

## ✨ Features

| Feature | Description |
|---|---|
| **TrueSkill Rating System** | Bayesian skill-based rankings designed for 2v2 matches |
| **Google Sheets Integration** | Spreadsheet-driven data pipeline — no separate database required |
| **Admin Dashboard** | Secure admin panel for processing weekly scores and updating ratings |
| **Weekly Leaderboard** | Navigable week-by-week view of all stats and match results |
| **Overall Leaderboard** | Cumulative rankings and career statistics across all weeks |
| **Level-Based Rankings** | Separate leaderboards for ADV, INT, PLUS, and BEG skill tiers |
| **Player Profiles** | Per-player analytics: win rates, partnerships, and opponent records |
| **Fun Statistics** | 🌟 Rockstars (most improved), 👥 Close Buddies (best partner pair), ⚔️ Rivalries (most frequent opponents) |
| **Responsive Design** | Mobile-first layout, works on all screen sizes |

---

## 🛠 Tech Stack

| Layer | Technology | Version |
|---|---|---|
| Framework | Next.js (App Router) | 16.x |
| Language | TypeScript | 5.3 |
| Styling | Tailwind CSS | 3.4 |
| Rating Algorithm | ts-trueskill | 5.1 |
| Data Source | Google Sheets API (googleapis) | 128.x |
| Icons | Lucide React | 0.320 |
| Date Utilities | date-fns | 3.3 |
| Runtime | Node.js | 18+ |

## Prerequisites

- Node.js 18 or higher
- A Google Cloud Project with Sheets API enabled
- A Google Service Account with access to your spreadsheet

---

## 🏗 Architecture

### High-Level System Design

```
┌──────────────────────────────────────────────────────────────────────┐
│                        BROWSER (Client)                              │
│                                                                      │
│   /              /overall      /player-stats/[name]                  │
│   Weekly LB      Overall LB    Player Profile                        │
│   (Client Comp.) (Client Comp.)(Client Comp.)                        │
└─────────────────────────┬────────────────────────────────────────────┘
                          │ fetch()
                          ▼
┌──────────────────────────────────────────────────────────────────────┐
│                        NEXT.JS SERVER (API Routes)                   │
│                                                                      │
│  GET /api/leaderboard?week=N    ← Weekly stats & rankings            │
│  GET /api/overall               ← Career stats for all players       │
│  GET /api/player-stats/list     ← Returns sorted player name list    │
│  GET /api/player-stats/[name]   ← Individual player analytics        │
│  POST /api/process-scores       ← Admin: recalculate all ratings     │
└─────────────────────────┬────────────────────────────────────────────┘
                          │ googleapis (service account auth)
                          ▼
┌──────────────────────────────────────────────────────────────────────┐
│                        GOOGLE SHEETS (Data Store)                    │
│                                                                      │
│  Players tab     — player roster with levels & initial ratings       │
│  w1, w2, w3…     — one tab per week, match results                   │
│  Scores tab      — used by admin panel for bulk score import         │
│  Ratings tab     — auto-generated; per-player, per-week Mu & Sigma   │
└──────────────────────────────────────────────────────────────────────┘
```

### Page & Component Map

```
app/
├── layout.tsx                    Root layout: navbar (logo + nav links)
├── page.tsx                      Weekly leaderboard (client component)
│   ├── WeekNavigation            ← / > arrows to change selected week
│   ├── StatsGrid                 ← Top 3 players / most games / best win %
│   ├── LevelLeaderboards         ← ADV / INT / PLUS / BEG ranking cards
│   ├── FunStats                  ← Rockstars / Close Buddies / Rivalries
│   ├── PlayerStatsTable          ← Full weekly stats table (sortable)
│   └── GamesTable                ← All match results for the week
├── overall/page.tsx              Overall leaderboard (client component)
│   └── PlayerStatsTable          ← Career stats table
├── player-stats/[playerName]/    Individual player profile (client component)
│   └── PlayerStatsReport         ← Win rates, partnerships, opponents
└── leaderboard-admin-xyz789/     Admin dashboard (client component)
    └── (inline form)             ← Scores tab input + process button

src/
├── components/                   Shared React components (see above)
├── lib/
│   ├── googleSheets.ts           Google Sheets read/write helpers
│   ├── trueskill.ts              TrueSkill calculation engine
│   ├── calculations.ts           Leaderboard stat calculations
│   └── playerAnalytics.ts        Per-player analytics (partnerships, opponents)
└── types/index.ts                Canonical TypeScript interfaces
```

### Data Flow: Admin Score Processing

```
Admin submits form
       │
       ▼
POST /api/process-scores
       │
       ├─► readPlayersTab()         Players!A2:D
       │       └─► Build initial rating map (mu by level)
       │
       ├─► readScoresTab(tabName)   {Scores}!A2:G
       │       └─► Parse matches, group by WeekNumber
       │
       ├─► readRatingsTab()         Ratings!A1:ZZ
       │       └─► Load any existing week ratings
       │
       └─► For each week (ascending):
               │
               ├─► Resolve starting ratings
               │       ├─ Week 1: use level-based initial ratings
               │       └─ Week N: use Week(N-1) final ratings
               │
               ├─► calculateWeekRatings(weekMatches, startingRatings)
               │       └─► ts-trueskill rate() per match
               │
               └─► writeRatingsTab()
                       └─► Ratings tab: PlayerName | CurrentLevel | Week1_Mu | Week1_Sigma | …
```

### Data Flow: Public Leaderboard Render

```
Browser loads /
       │
       ▼
GET /api/leaderboard?week=N
       │
       ├─► readPlayersTab()         → player roster
       ├─► readRatingsTab()         → Mu/Sigma per player per week
       └─► readScoresTab(w1…wN)     → match results per week tab
               │
               ▼
       calculations.ts
       ├─► calculateTopPlayersByGain()     (Δmu this week, top 3)
       ├─► calculateMostGamesPlayed()      (match count, top 3)
       ├─► calculateBestWinPercentage()    (≥3 games, top 3)
       ├─► calculateMostImproved()         (Δmu since week 1, top 3)
       ├─► calculateCloseBuddies()         (most frequent teammates, top 3)
       ├─► calculateRivalries()            (most frequent opponents, top 3)
       ├─► getLevelLeaderboards()          (top 5 per level by Δmu)
       └─► calculatePlayerWeekStats()      (full per-player table)
               │
               ▼
       JSON → LeaderboardData → React components
```

---

## ⚙️ Technical Implementation

### 1. TrueSkill Rating Algorithm

[TrueSkill](https://www.microsoft.com/en-us/research/project/trueskill-ranking-system/) is a Bayesian skill-rating system developed by Microsoft Research. Each player's skill is modelled as a **Gaussian distribution** with two parameters:

| Parameter | Symbol | Meaning |
|---|---|---|
| Mean | `mu` (μ) | Best estimate of the player's true skill |
| Uncertainty | `sigma` (σ) | Confidence interval — decreases as more games are played |

The **conservative skill estimate** (used for leaderboard ranking) is:

```
skillRating = μ - 3σ
```

This penalises high uncertainty, ensuring new players don't rank above established players on limited data.

#### System Parameters

```typescript
// src/lib/trueskill.ts
const TRUESKILL_CONFIG = {
  mu:    25,     // Global default mean
  sigma: 8.33,   // Initial uncertainty (≈ mu/3)
  beta:  4.17,   // Performance noise (≈ sigma/2) — controls how much a single game affects ratings
  tau:   0.083,  // Dynamic factor — slight sigma increase each game to prevent stagnation
};
```

#### Initial Ratings by Skill Level

Players begin with a level-appropriate starting mean, reflecting prior knowledge of their ability:

| Level | Initial μ | Initial σ | Conservative Rating |
|---|---|---|---|
| `BEG` (Beginner) | 10 | 8.33 | −14.99 |
| `PLUS` (Plus) | 20 | 8.33 | −4.99 |
| `INT` (Intermediate) | 25 | 8.33 | 0.01 |
| `ADV` (Advanced) | 35 | 8.33 | 10.01 |

#### Per-Match Calculation

For each 2v2 match the algorithm:
1. Constructs two `Rating` objects per team.
2. Calls `ts-trueskill`'s `rate([[team1], [team2]], ranks)` where `ranks = [1,2]` (team1 wins) or `[2,1]` (team2 wins).
3. Updates all four players' μ and σ in the running ratings map.
4. Ratings carry forward week-to-week: Week N starts from Week N-1's final ratings.

```typescript
const ranks = score1 > score2 ? [1, 2] : [2, 1];
const [[newR1, newR2], [newR3, newR4]] = rate([team1, team2], ranks);
```

#### Robustness Handling

- Player names are normalised (`.trim()`) to prevent whitespace mismatches.
- Matches referencing unknown players are **skipped with a warning** rather than throwing.
- Invalid scores (non-numeric) are also skipped gracefully.

---

### 2. Google Sheets as the Data Layer

The application uses Google Sheets as its sole persistence layer via the **Google Sheets API v4** (`googleapis` package) authenticated with a **Service Account**.

#### Authentication

```typescript
// src/lib/googleSheets.ts
function getAuth() {
  return new google.auth.GoogleAuth({
    credentials: JSON.parse(process.env.GOOGLE_CREDENTIALS || '{}'),
    scopes: ['https://www.googleapis.com/auth/spreadsheets'],
  });
}
```

#### Sheet Schema

**`Players` tab** (`Players!A2:D`) — static roster:

| Column | Field | Type | Notes |
|---|---|---|---|
| A | `PlayerName` | string | Unique player identifier |
| B | `Level` | `ADV \| INT \| PLUS \| BEG` | Skill tier |
| C | `InitialMu` | number | Starting mean (optional override) |
| D | `InitialSigma` | number | Starting sigma (optional override) |

**`Scores` tab** (`{tabName}!A2:G`) — bulk match import for admin processing:

| Column | Field | Type |
|---|---|---|
| A | `WeekNumber` | number |
| B | `Player1` | string |
| C | `Player2` | string |
| D | `Player3` | string |
| E | `Player4` | string |
| F | `Score1` | number (Team 1 score) |
| G | `Score2` | number (Team 2 score) |

**`w1`, `w2`, `w3`… tabs** — per-week match data (same columns as Scores tab, read by the public leaderboard API):

**`Ratings` tab** (`Ratings!A1:ZZ`) — auto-generated by `POST /api/process-scores`:

| Column | Content |
|---|---|
| `PlayerName` | Player identifier |
| `CurrentLevel` | Skill tier |
| `Week1_Mu` | μ after all Week 1 matches |
| `Week1_Sigma` | σ after all Week 1 matches |
| `Week2_Mu` | μ after all Week 2 matches |
| `Week2_Sigma` | σ after all Week 2 matches |
| … | (one pair of columns per week) |

Columns are sorted deterministically: `PlayerName`, `CurrentLevel`, then `WeekN_Mu`, `WeekN_Sigma` in ascending week order.

---

### 3. API Routes

All routes are Next.js **Route Handlers** in `app/api/`.

#### `GET /api/leaderboard?week=N`

Returns the full `LeaderboardData` payload for a given week (defaults to the latest week if `week` is omitted).

**Response shape:**
```typescript
{
  currentWeek:      number;
  maxWeek:          number;
  weekStats:        WeekStats;         // top players, games played, win rates
  levelLeaderboards: Record<PlayerLevel, PlayerRating[]>;
  rockstars:        RockstarPlayer[];
  closeBuddies:     PlayerPair[];
  rivalries:        PlayerPair[];
  matches:          Match[];           // this week's match results
  playerWeekStats:  PlayerWeekStat[];  // full weekly stat table
}
```

#### `GET /api/overall`

Returns cumulative career statistics for every player across all weeks.

**Response shape:**
```typescript
{
  overallStats:  PlayerOverallStat[];
  totalWeeks:    number;
  totalMatches:  number;
}
```

#### `GET /api/player-stats/list`

Returns an alphabetically sorted list of all player names (used to populate the navbar dropdown).

**Response shape:** `{ playerNames: string[] }`

#### `GET /api/player-stats/[playerName]?week=N`

Returns detailed analytics for a single player. The optional `week` query parameter filters results to a specific week.

**Response shape:**
```typescript
{
  analytics:    PlayerAnalytics;  // partnerships, opponents, win rates
  playerNames:  string[];         // full roster (for nav dropdown)
  maxWeek:      number;
  selectedWeek: number | null;
}
```

#### `POST /api/process-scores`

Admin-only endpoint (protected by `ADMIN_SECRET`). Reads scores, runs TrueSkill, and writes the `Ratings` tab.

**Request body:** `{ scoresTabName: string }`  
**Response:** `{ success: true, message: string }` or error JSON.

---

### 4. TypeScript Type System

All shared types are defined in `src/types/index.ts`:

```typescript
type PlayerLevel = 'BEG' | 'PLUS' | 'INT' | 'ADV';

interface Player       { name, level, initialMu, initialSigma }
interface Match        { weekNumber, player1, player2, player3, player4, score1, score2 }
interface PlayerRating { playerName, mu, sigma, week, level, ratingGain? }
interface WeekStats    { week, gamesPlayed, topPlayers, mostGamesPlayed, bestWinPercentage }
interface LeaderboardData { currentWeek, weekStats, levelLeaderboards, rockstars,
                            closeBuddies, rivalries, matches, playerWeekStats? }
interface PlayerWeekStat  { playerName, level, skillRating, totalMatches, matchesWon,
                            winRate, totalPointsScored, pointsDifference, ratingChange }
interface PlayerOverallStat { playerName, level, currentRating, totalMatches, matchesWon,
                              winRate, totalPointsScored, pointsDifference,
                              totalRatingChange, weeksPlayed }
```

---

### 5. Statistics Calculations

All stat logic lives in `src/lib/calculations.ts`.

| Function | Input | Output | Notes |
|---|---|---|---|
| `calculateTopPlayersByGain` | matches, week, prevRatings, currRatings | `TopPlayer[]` | Δμ for each player this week, top 3 |
| `calculateMostGamesPlayed` | matches, week | `PlayerGameCount[]` | Match count per player, top 3 |
| `calculateBestWinPercentage` | matches, week | `PlayerWinRate[]` | Win % (min 3 games), top 3 |
| `calculateMostImproved` | week1Ratings, currRatings | `RockstarPlayer[]` | μ gain since Week 1, top 3 |
| `calculateCloseBuddies` | matches, upToWeek | `PlayerPair[]` | Most frequent teammate pairs, top 3 |
| `calculateRivalries` | matches, upToWeek | `PlayerPair[]` | Most frequent opponent pairs, top 3 |
| `getLevelLeaderboards` | ratings, prevRatings, levels, matches, week | `Record<PlayerLevel, PlayerRating[]>` | Top 5 per level by Δμ, active players only |
| `calculatePlayerWeekStats` | matches, week, ratings, prevRatings, levels | `PlayerWeekStat[]` | Full per-player table sorted by skill rating |
| `calculatePlayerOverallStats` | allMatches, allWeekRatings, levels | `PlayerOverallStat[]` | Career stats sorted by current skill rating |

**Level leaderboard ranking rule:** Only players who participated in at least one match in the selected week are shown. Rankings are ordered by **rating gain (Δμ)** this week, not absolute rating.

---

### 6. Player Analytics (`src/lib/playerAnalytics.ts`)

The player profile page is powered by `calculatePlayerAnalytics(playerName, allMatches)`:

- **Partnership stats** — for every teammate the player has partnered with, records wins, losses, win rate, and an auto-generated verdict:
  - `🔥 Unbeatable combo!` — ≥5 wins, 0 losses
  - `💪 Very strong pair` — ≥4 wins, ≤1 loss
  - `✅ Solid` — ≥2 wins, 0 losses
  - `👀 Needs more sync.` — 0 wins, ≥3 losses
- **Opponent stats** — win/loss record against every player faced.
- **Context**: each player's win rate is shown relative to the overall average win rate across all players.

---

### 7. Tailwind CSS Theme

Custom colour palette defined in `tailwind.config.ts`:

| Token | Hex | Usage |
|---|---|---|
| `electric-800` | `#002966` | Navbar background |
| `electric-700` | `#003d99` | Page gradient end |
| `electric-900` | `#001433` | Page gradient start |
| `electric-600` | `#0052cc` | Borders, button hover |
| `electric-300` | `#66a3ff` | Placeholder text |
| `coral-400` | `#ff9f7f` | Nav link hover, accent |
| `coral-500` | `#ff8c42` | Loading spinner, highlights |

---

### 8. Server vs Client Component Strategy

| Component / Route | Type | Reason |
|---|---|---|
| `app/layout.tsx` | Server | No `'use client'` directive; renders Client Components (`NavPlayerStats`) as children — this is valid in Next.js App Router |
| `app/page.tsx` | Client | Week navigation state, `useEffect` data fetching |
| `app/overall/page.tsx` | Client | `useEffect` data fetching |
| `app/player-stats/[name]/page.tsx` | Client | Week filter state, data fetching |
| `app/leaderboard-admin-xyz789/page.tsx` | Client | Form state, submit handler |
| `src/components/NavPlayerStats.tsx` | Client | `useEffect` to fetch player list |
| `src/components/PlayerDropdown.tsx` | Client | Dropdown open/close state, search filter |
| All other components | Server-compatible | Pure rendering, no browser APIs |
| `app/api/**` | Server (Route Handlers) | Google Sheets API access (server-only) |

---

### 9. Environment Variables

| Variable | Used By | Purpose |
|---|---|---|
| `GOOGLE_CREDENTIALS` | `src/lib/googleSheets.ts` | Full service account JSON (single-line string) |
| `GOOGLE_SHEET_ID` | `/api/leaderboard`, `/api/overall`, `/api/player-stats/*` | Target spreadsheet ID |
| `GOOGLE_SHEETS_ID` | `/api/process-scores` | Target spreadsheet ID (admin route) |
| `ADMIN_SECRET` | `/leaderboard-admin-xyz789` | Admin panel authentication secret |

> **Note:** `GOOGLE_SHEET_ID` and `GOOGLE_SHEETS_ID` must both be set to the same spreadsheet ID.

## Setup Instructions

### 1. Clone the Repository

```bash
git clone <repository-url>
cd leo-leaderboard-v2
npm install
```

### 2. Google Sheets API Setup

#### Create a Google Cloud Project

1. Go to [Google Cloud Console](https://console.cloud.google.com/)
2. Create a new project or select an existing one
3. Enable the Google Sheets API:
   - Navigate to "APIs & Services" > "Library"
   - Search for "Google Sheets API"
   - Click "Enable"

#### Create a Service Account

1. Go to "APIs & Services" > "Credentials"
2. Click "Create Credentials" > "Service Account"
3. Fill in the service account details and click "Create"
4. Click on the created service account
5. Go to "Keys" tab > "Add Key" > "Create New Key"
6. Choose JSON format and download the key file

#### Share Your Google Sheet

1. Open your Google Sheet
2. Click "Share" button
3. Add the service account email (found in the JSON key file) as an editor
4. Copy the spreadsheet ID from the URL (the long string between `/d/` and `/edit`)

### 3. Google Sheet Structure

Create a Google Sheet with the following tabs:

#### Sheet 1: "Players" (Static - You create this)
```
PlayerName | Level | InitialMu | InitialSigma
John       | ADV   | 35        | 8.33
Sarah      | INT   | 25        | 8.33
Mike       | PLUS  | 20        | 8.33
Lisa       | BEG   | 10        | 8.33
```

**Levels:**
- `ADV` - Advanced (Initial Mu: 35)
- `INT` - Intermediate (Initial Mu: 25)
- `PLUS` - Plus (Initial Mu: 20)
- `BEG` - Beginner (Initial Mu: 10)

#### Sheet 2: "Scores" (Dynamic - You input match data)
```
WeekNumber | Player1 | Player2 | Player3 | Player4 | Score1 | Score2
1          | John    | Sarah   | Mike    | Lisa    | 21     | 15
1          | John    | Sarah   | Dave    | Emma    | 18     | 21
2          | Mike    | Lisa    | John    | Sarah   | 21     | 19
```

- Team 1: Player1 + Player2 (Score1)
- Team 2: Player3 + Player4 (Score2)
- Winner is determined by higher score

#### Sheet 3: "Ratings" (Auto-generated by system)

This tab is automatically created/updated when you process scores in the admin panel. Don't create it manually.

### 4. Environment Variables

Create a `.env` file in the root directory:

```env
GOOGLE_CREDENTIALS={"type":"service_account","project_id":"...","private_key_id":"...","private_key":"-----BEGIN PRIVATE KEY-----\n...\n-----END PRIVATE KEY-----\n","client_email":"...","client_id":"...","auth_uri":"https://accounts.google.com/o/oauth2/auth","token_uri":"https://oauth2.googleapis.com/token","auth_provider_x509_cert_url":"https://www.googleapis.com/oauth2/v1/certs","client_x509_cert_url":"..."}
GOOGLE_SHEET_ID=your_spreadsheet_id_here
ADMIN_SECRET=your_secure_secret_key
```

**Important:** 
- Copy the entire contents of your service account JSON file as a single-line string for `GOOGLE_CREDENTIALS`
- Set a strong password for `ADMIN_SECRET`

### 5. Run the Application

#### Development Mode

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) to view the leaderboard.

#### Production Build

```bash
npm run build
npm start
```

## Usage

### Admin Panel

1. Navigate to `/leaderboard-admin-xyz789`
2. Enter your admin secret (from `.env` file)
3. Enter the name of your scores tab (e.g., "Scores")
4. Click "Process Scores"
5. The system will:
   - Read all matches from the scores tab
   - Calculate TrueSkill ratings for each week
   - Update the "Ratings" tab in your Google Sheet

### Public Leaderboard

- Navigate to `/` (home page)
- Use the week navigation arrows to view different weeks
- View statistics, rankings, and match results

## TrueSkill Configuration

The system uses the following TrueSkill parameters:

```typescript
{
  mu: 25,              // Default mean rating
  sigma: 8.33,         // Uncertainty (controls rating jump magnitude)
  beta: 4.17,          // Performance variability
  tau: 0.083,          // Dynamic factor (prevents over-certainty)
  draw_probability: 0  // No draws in badminton
}
```

## Deployment

### Vercel (Recommended)

1. Push your code to GitHub
2. Import your repository in [Vercel](https://vercel.com)
3. Add environment variables in Vercel project settings
4. Deploy

### Other Platforms

The application can be deployed to any platform that supports Next.js:
- Netlify
- Railway
- AWS Amplify
- DigitalOcean App Platform

## Project Structure

```
leo-leaderboard-v2/
├── app/
│   ├── layout.tsx                        # Root layout — navbar with logo
│   ├── page.tsx                          # Weekly leaderboard (Client Component)
│   ├── globals.css                       # Global styles
│   ├── overall/
│   │   └── page.tsx                      # Overall stats leaderboard
│   ├── player-stats/
│   │   └── [playerName]/
│   │       └── page.tsx                  # Individual player profile
│   ├── leaderboard-admin-xyz789/
│   │   └── page.tsx                      # Admin dashboard
│   └── api/
│       ├── leaderboard/route.ts          # GET  – weekly leaderboard data
│       ├── overall/route.ts              # GET  – career stats for all players
│       ├── player-stats/
│       │   ├── list/route.ts             # GET  – all player names
│       │   └── [playerName]/route.ts     # GET  – single player analytics
│       └── process-scores/route.ts       # POST – admin score processing
├── src/
│   ├── components/
│   │   ├── WeekNavigation.tsx            # Week selector (< / > arrows)
│   │   ├── StatsGrid.tsx                 # Top 3 stat tiles
│   │   ├── LevelLeaderboards.tsx         # ADV / INT / PLUS / BEG cards
│   │   ├── FunStats.tsx                  # Rockstars, Buddies, Rivalries
│   │   ├── GamesTable.tsx                # Match results table
│   │   ├── PlayerStatsTable.tsx          # Per-player stats table (weekly & overall)
│   │   ├── PlayerStatsReport.tsx         # Player profile report
│   │   ├── NavPlayerStats.tsx            # Navbar player-stats fetcher
│   │   └── PlayerDropdown.tsx            # Searchable player dropdown
│   ├── lib/
│   │   ├── googleSheets.ts               # Google Sheets API helpers
│   │   ├── trueskill.ts                  # TrueSkill rating engine
│   │   ├── calculations.ts               # Leaderboard stat calculations
│   │   └── playerAnalytics.ts            # Per-player partnership & opponent stats
│   └── types/
│       └── index.ts                      # Shared TypeScript interfaces
├── next.config.js                        # Next.js config (image domains, env)
├── tailwind.config.ts                    # Custom colour palette
├── tsconfig.json                         # TypeScript compiler settings
├── vercel.json                           # Vercel deployment config
└── package.json                          # Dependencies & scripts
```

## Statistics Explained

### Week Statistics (Top Row)

1. **Top 3 Players of the Week**: Players with highest rating gain (mu increase) for the selected week
2. **Most Games Played**: Players who participated in the most matches that week
3. **Best Win Rate**: Players with the highest win percentage (minimum 3 games)

### Level Leaderboards

- **ADV (Advanced)**: Top 5 advanced players by current rating
- **INT (Intermediate)**: Top 5 intermediate players by current rating
- **PLUS**: Top 5 plus-level players by current rating

### Fun Statistics

1. **🌟 Rockstars**: Top 3 players with biggest improvement since Week 1
2. **👥 Close Buddies**: Top 3 player pairs who played most matches together as teammates
3. **⚔️ Rivalries**: Top 3 player matchups who faced each other most as opponents

## Troubleshooting

### "No ratings data found" Error

- Make sure you've run the admin panel to process scores first
- Verify your Google Sheets credentials are correct
- Check that the "Players" and "Scores" tabs exist in your sheet

### Authentication Errors

- Verify your service account email has edit access to the Google Sheet
- Check that your `GOOGLE_CREDENTIALS` is properly formatted (single line, valid JSON)
- Ensure the Google Sheets API is enabled in your Google Cloud project

### Build Errors

- Make sure all dependencies are installed: `npm install`
- Check Node.js version: `node --version` (should be 18+)
- Clear Next.js cache: `rm -rf .next`

## Contributing

Contributions are welcome! Please follow these guidelines:

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Submit a pull request

## License

MIT License - feel free to use this project for your badminton club!

## Support

For issues or questions, please open an issue on GitHub.

---

<div align="center">
  Made with ❤️ for <strong>LEO Badminton Club</strong> — <em>Smash Your Limits</em>
</div>
