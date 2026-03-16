'use client';

import { useEffect, useState } from 'react';

interface AdminMatch {
  id: string;
  playedAt: string;
  playDate: string | null;
  score1: number;
  score2: number;
  status: string;
  participants: Array<{
    playerId: string;
    displayName: string;
    team: number;
    seat: number;
  }>;
  team1: string[];
  team2: string[];
}

interface ProcessingRun {
  id: string;
  trigger_type: string;
  scope: string;
  status: string;
  started_at: string;
  finished_at: string | null;
  summary: Record<string, unknown>;
  error_message: string | null;
}

interface EditableMatchState {
  score1: string;
  score2: string;
  playedAtLocal: string;
  status: string;
  participantIds: Record<string, string>;
}

interface AdminPlayer {
  id: string;
  displayName: string;
  slug: string;
  level: 'INT' | 'PLUS' | 'ADV';
  isActive: boolean;
}

interface EditablePlayerState {
  displayName: string;
  level: 'INT' | 'PLUS' | 'ADV';
  isActive: boolean;
}

const MATCH_PAGE_SIZE = 20;

function toLocalDatetimeInputValue(isoTimestamp: string): string {
  const date = new Date(isoTimestamp);
  const offsetDate = new Date(date.getTime() - date.getTimezoneOffset() * 60000);
  return offsetDate.toISOString().slice(0, 16);
}

function toIsoFromLocalDatetime(localValue: string): string {
  return new Date(localValue).toISOString();
}

function formatTimestamp(value: string | null): string {
  if (!value) {
    return 'In progress';
  }

  return new Date(value).toLocaleString();
}

function summarizeRun(run: ProcessingRun): string {
  const summary = run.summary ?? {};
  const matchesProcessed =
    typeof summary.matchesProcessed === 'number' ? summary.matchesProcessed : null;
  const playDatesProcessed =
    typeof summary.playDatesProcessed === 'number' ? summary.playDatesProcessed : null;

  if (matchesProcessed === null && playDatesProcessed === null) {
    return run.error_message ?? 'No summary available yet';
  }

  const parts: string[] = [];
  if (matchesProcessed !== null) {
    parts.push(`${matchesProcessed} matches`);
  }
  if (playDatesProcessed !== null) {
    parts.push(`${playDatesProcessed} play dates`);
  }

  return parts.join(' - ');
}

function createParticipantIdMap(match: AdminMatch) {
  return Object.fromEntries(
    match.participants.map((participant) => [`${participant.team}-${participant.seat}`, participant.playerId])
  );
}

function isPlayerTakenInMatch(
  participantIds: Record<string, string>,
  currentKey: string,
  playerId: string
) {
  return Object.entries(participantIds).some(
    ([key, selectedPlayerId]) => key !== currentKey && selectedPlayerId === playerId
  );
}

export default function AdminPage() {
  const [password, setPassword] = useState('');
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [isCheckingSession, setIsCheckingSession] = useState(true);
  const [authError, setAuthError] = useState<string | null>(null);
  const [isLoggingIn, setIsLoggingIn] = useState(false);

  const [matches, setMatches] = useState<AdminMatch[]>([]);
  const [matchTotal, setMatchTotal] = useState(0);
  const [processingRuns, setProcessingRuns] = useState<ProcessingRun[]>([]);
  const [players, setPlayers] = useState<AdminPlayer[]>([]);
  const [matchPlayerOptions, setMatchPlayerOptions] = useState<AdminPlayer[]>([]);
  const [editState, setEditState] = useState<Record<string, EditableMatchState>>({});
  const [playerEditState, setPlayerEditState] = useState<Record<string, EditablePlayerState>>({});
  const [loadingData, setLoadingData] = useState(false);
  const [pageError, setPageError] = useState<string | null>(null);
  const [rebuildMessage, setRebuildMessage] = useState<string | null>(null);
  const [isRebuilding, setIsRebuilding] = useState(false);
  const [activeMatchId, setActiveMatchId] = useState<string | null>(null);
  const [activePlayerId, setActivePlayerId] = useState<string | null>(null);
  const [matchSearchInput, setMatchSearchInput] = useState('');
  const [matchSearch, setMatchSearch] = useState('');
  const [matchStatusFilter, setMatchStatusFilter] = useState('all');
  const [matchPage, setMatchPage] = useState(1);
  const [isPlayersOpen, setIsPlayersOpen] = useState(false);
  const [isLoadingPlayers, setIsLoadingPlayers] = useState(false);
  const [playerSearch, setPlayerSearch] = useState('');
  const [newPlayerName, setNewPlayerName] = useState('');
  const [newPlayerLevel, setNewPlayerLevel] = useState<'INT' | 'PLUS' | 'ADV'>('INT');
  const [needsRebuild, setNeedsRebuild] = useState(false);

  const loadMatches = async (page: number, search: string, statusFilter: string) => {
    const offset = (page - 1) * MATCH_PAGE_SIZE;
    const query = new URLSearchParams({
      limit: String(MATCH_PAGE_SIZE),
      offset: String(offset),
    });

    if (search) {
      query.set('search', search);
    }

    if (statusFilter !== 'all') {
      query.set('status', statusFilter);
    }

    const response = await fetch(`/api/admin/matches?${query.toString()}`, { credentials: 'include' });
    if (response.status === 401) {
      setIsAuthenticated(false);
      return false;
    }

    const result = await response.json();
    if (!response.ok || !result.success) {
      throw new Error(result.error?.message || 'Failed to load matches');
    }

    const nextMatches = result.data.matches as AdminMatch[];
    setMatches(nextMatches);
    setMatchTotal(result.data.total as number);
    setEditState(
      Object.fromEntries(
        nextMatches.map((match) => [
          match.id,
          {
            score1: String(match.score1),
            score2: String(match.score2),
            playedAtLocal: toLocalDatetimeInputValue(match.playedAt),
            status: match.status,
            participantIds: createParticipantIdMap(match),
          },
        ])
      )
    );

    return true;
  };

  const loadPlayers = async () => {
    setIsLoadingPlayers(true);

    try {
      const query = new URLSearchParams({ limit: '150' });
      if (playerSearch.trim()) {
        query.set('search', playerSearch.trim());
      }

      const response = await fetch(`/api/admin/players?${query.toString()}`, {
        credentials: 'include',
      });

      if (response.status === 401) {
        setIsAuthenticated(false);
        return false;
      }

      const result = await response.json();
      if (!response.ok || !result.success) {
        throw new Error(result.error?.message || 'Failed to load players');
      }

      const nextPlayers = result.data.players as AdminPlayer[];
      setPlayers(nextPlayers);
      setPlayerEditState(
        Object.fromEntries(
          nextPlayers.map((player) => [
            player.id,
            {
              displayName: player.displayName,
              level: player.level,
              isActive: player.isActive,
            },
          ])
        )
      );
      return true;
    } finally {
      setIsLoadingPlayers(false);
    }
  };

  const loadMatchPlayerOptions = async () => {
    const response = await fetch('/api/admin/players?active=true&limit=250', {
      credentials: 'include',
    });

    if (response.status === 401) {
      setIsAuthenticated(false);
      return false;
    }

    const result = await response.json();
    if (!response.ok || !result.success) {
      throw new Error(result.error?.message || 'Failed to load player options');
    }

    setMatchPlayerOptions(result.data.players as AdminPlayer[]);
    return true;
  };
  const loadDashboardData = async () => {
    setLoadingData(true);
    setPageError(null);

    try {
      const runsResponse = await fetch('/api/admin/processing/runs?limit=5', { credentials: 'include' });

      if (runsResponse.status === 401) {
        setIsAuthenticated(false);
        return;
      }

      const runsResult = await runsResponse.json();
      if (!runsResponse.ok || !runsResult.success) {
        throw new Error(runsResult.error?.message || 'Failed to load processing runs');
      }

      const [matchesLoaded, optionsLoaded] = await Promise.all([
        loadMatches(matchPage, matchSearch, matchStatusFilter),
        loadMatchPlayerOptions(),
      ]);
      if (!matchesLoaded || !optionsLoaded) {
        return;
      }

      setProcessingRuns(runsResult.data.runs as ProcessingRun[]);
      setIsAuthenticated(true);
    } catch (error) {
      setPageError(error instanceof Error ? error.message : 'Failed to load admin dashboard');
    } finally {
      setLoadingData(false);
      setIsCheckingSession(false);
    }
  };

  useEffect(() => {
    loadDashboardData();
  }, []);

  useEffect(() => {
    if (!isAuthenticated || isCheckingSession) {
      return;
    }

    const refreshMatches = async () => {
      setLoadingData(true);
      setPageError(null);

      try {
        await loadMatches(matchPage, matchSearch, matchStatusFilter);
      } catch (error) {
        setPageError(error instanceof Error ? error.message : 'Failed to load matches');
      } finally {
        setLoadingData(false);
      }
    };

    refreshMatches();
  }, [isAuthenticated, isCheckingSession, matchPage, matchSearch, matchStatusFilter]);

  useEffect(() => {
    if (!isAuthenticated || !isPlayersOpen) {
      return;
    }

    const refreshPlayers = async () => {
      try {
        await loadPlayers();
      } catch (error) {
        setPageError(error instanceof Error ? error.message : 'Failed to load players');
      }
    };

    refreshPlayers();
  }, [isAuthenticated, isPlayersOpen, playerSearch]);

  const handleLogin = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setIsLoggingIn(true);
    setAuthError(null);

    try {
      const response = await fetch('/api/admin/session', {
        method: 'POST',
        credentials: 'include',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ password }),
      });

      const result = await response.json();
      if (!response.ok || !result.success) {
        throw new Error(result.error || 'Invalid admin secret');
      }

      setPassword('');
      setIsAuthenticated(true);
      await loadDashboardData();
    } catch (error) {
      setAuthError(error instanceof Error ? error.message : 'Login failed');
    } finally {
      setIsLoggingIn(false);
    }
  };

  const handleLogout = async () => {
    await fetch('/api/admin/session', {
      method: 'DELETE',
      credentials: 'include',
    });

    setIsAuthenticated(false);
    setMatches([]);
    setMatchTotal(0);
    setProcessingRuns([]);
    setPlayers([]);
    setEditState({});
    setPlayerEditState({});
    setRebuildMessage(null);
    setNeedsRebuild(false);
  };

  const handleRebuild = async () => {
    setIsRebuilding(true);
    setRebuildMessage(null);

    try {
      const response = await fetch('/api/admin/processing/rebuild', {
        method: 'POST',
        credentials: 'include',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({}),
      });
      const result = await response.json();

      if (!response.ok || !result.success) {
        throw new Error(result.error?.message || 'Failed to rebuild processed data');
      }

      const summary = result.data.summary;
      setRebuildMessage(
        `Rebuild completed. ${summary.matchesProcessed} matches across ${summary.playDatesProcessed} play dates.`
      );
      setNeedsRebuild(false);
      await loadDashboardData();
    } catch (error) {
      setRebuildMessage(error instanceof Error ? error.message : 'Rebuild failed');
    } finally {
      setIsRebuilding(false);
    }
  };

  const updateField = (matchId: string, field: keyof EditableMatchState, value: string) => {
    setEditState((current) => ({
      ...current,
      [matchId]: {
        ...current[matchId],
        [field]: value,
      },
    }));
  };


  const updateMatchParticipant = (matchId: string, team: number, seat: number, playerId: string) => {
    const participantKey = `${team}-${seat}`;
    setEditState((current) => ({
      ...current,
      [matchId]: {
        ...current[matchId],
        participantIds: {
          ...current[matchId].participantIds,
          [participantKey]: playerId,
        },
      },
    }));
  };
  const handleSaveMatch = async (matchId: string) => {
    const current = editState[matchId];
    if (!current) {
      return;
    }

    setActiveMatchId(matchId);
    setPageError(null);

    try {
      const response = await fetch(`/api/admin/matches/${matchId}`, {
        method: 'PATCH',
        credentials: 'include',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          score1: Number.parseInt(current.score1, 10),
          score2: Number.parseInt(current.score2, 10),
          playedAt: toIsoFromLocalDatetime(current.playedAtLocal),
          status: current.status,
        }),
      });

      const result = await response.json();
      if (!response.ok || !result.success) {
        throw new Error(result.error?.message || 'Failed to update match');
      }

      setPageError('Match updated. Run rebuild when you are ready to refresh public stats.');
      setNeedsRebuild(true);
      await loadMatches(matchPage, matchSearch, matchStatusFilter);
    } catch (error) {
      setPageError(error instanceof Error ? error.message : 'Failed to update match');
    } finally {
      setActiveMatchId(null);
    }
  };

  const handleDeleteMatch = async (matchId: string) => {
    const confirmed = window.confirm('Delete this match? This cannot be undone.');
    if (!confirmed) {
      return;
    }

    setActiveMatchId(matchId);
    setPageError(null);

    try {
      const response = await fetch(`/api/admin/matches/${matchId}`, {
        method: 'DELETE',
        credentials: 'include',
      });

      const result = await response.json();
      if (!response.ok || !result.success) {
        throw new Error(result.error?.message || 'Failed to delete match');
      }

      setPageError('Match deleted. Run rebuild when you are ready to refresh public stats.');
      setNeedsRebuild(true);
      if (matches.length === 1 && matchPage > 1) {
        setMatchPage((current) => current - 1);
      } else {
        await loadMatches(matchPage, matchSearch, matchStatusFilter);
      }
    } catch (error) {
      setPageError(error instanceof Error ? error.message : 'Failed to delete match');
    } finally {
      setActiveMatchId(null);
    }
  };
  const updatePlayerField = (
    playerId: string,
    field: keyof EditablePlayerState,
    value: string | boolean
  ) => {
    setPlayerEditState((current) => ({
      ...current,
      [playerId]: {
        ...current[playerId],
        [field]: value,
      },
    }));
  };

  const handleSavePlayer = async (playerId: string) => {
    const current = playerEditState[playerId];
    if (!current) {
      return;
    }

    setActivePlayerId(playerId);
    setPageError(null);

    try {
      const response = await fetch(`/api/admin/players/${playerId}`, {
        method: 'PATCH',
        credentials: 'include',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(current),
      });

      const result = await response.json();
      if (!response.ok || !result.success) {
        throw new Error(result.error?.message || 'Failed to update player');
      }

      setPageError('Player updated. Run rebuild if the change should affect public processed stats.');
      setNeedsRebuild(true);
      await loadPlayers();
    } catch (error) {
      setPageError(error instanceof Error ? error.message : 'Failed to update player');
    } finally {
      setActivePlayerId(null);
    }
  };

  const handleCreatePlayer = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setActivePlayerId('new-player');
    setPageError(null);

    try {
      const response = await fetch('/api/admin/players', {
        method: 'POST',
        credentials: 'include',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          displayName: newPlayerName,
          level: newPlayerLevel,
          isActive: true,
        }),
      });

      const result = await response.json();
      if (!response.ok || !result.success) {
        throw new Error(result.error?.message || 'Failed to create player');
      }

      setNewPlayerName('');
      setNewPlayerLevel('INT');
      setPageError('Player created successfully.');
      setNeedsRebuild(true);
      await loadPlayers();
    } catch (error) {
      setPageError(error instanceof Error ? error.message : 'Failed to create player');
    } finally {
      setActivePlayerId(null);
    }
  };

  if (isCheckingSession) {
    return (
      <main className="min-h-screen bg-slate-950 px-4 py-16 text-white">
        <div className="mx-auto max-w-6xl">
          <div className="rounded-3xl border border-slate-800 bg-slate-900/70 p-8 text-slate-300">
            Loading admin workspace...
          </div>
        </div>
      </main>
    );
  }

  if (!isAuthenticated) {
    return (
      <main className="min-h-screen bg-slate-950 px-4 py-16 text-white">
        <div className="mx-auto max-w-md rounded-3xl border border-slate-800 bg-slate-900/80 p-8 shadow-2xl shadow-black/40">
          <p className="mb-3 text-sm uppercase tracking-[0.2em] text-emerald-300">Hidden Admin</p>
          <h1 className="text-3xl font-semibold text-white">Leaderboard Control Room</h1>
          <p className="mt-3 text-sm leading-6 text-slate-300">
            Sign in to run rebuilds and correct match data. Public score entry stays outside admin.
          </p>

          <form className="mt-8 space-y-4" onSubmit={handleLogin}>
            <label className="block">
              <span className="mb-2 block text-sm font-medium text-slate-200">Admin password</span>
              <input
                type="password"
                value={password}
                onChange={(event) => setPassword(event.target.value)}
                className="w-full rounded-2xl border border-slate-700 bg-slate-950 px-4 py-3 text-white outline-none transition focus:border-emerald-400"
                autoComplete="current-password"
              />
            </label>

            {authError ? <p className="text-sm text-rose-300">{authError}</p> : null}

            <button
              type="submit"
              disabled={isLoggingIn}
              className="w-full rounded-2xl bg-emerald-500 px-4 py-3 font-semibold text-slate-950 transition hover:bg-emerald-400 disabled:cursor-not-allowed disabled:opacity-70"
            >
              {isLoggingIn ? 'Signing in...' : 'Enter Admin'}
            </button>
          </form>
        </div>
      </main>
    );
  }

  const totalMatchPages = Math.max(1, Math.ceil(matchTotal / MATCH_PAGE_SIZE));

  return (
    <main className="min-h-screen bg-slate-950 px-3 py-6 text-white sm:px-4 sm:py-10">
      <div className="mx-auto max-w-7xl space-y-5 sm:space-y-8">
        <header className="flex flex-col gap-3 rounded-2xl border border-slate-800 bg-slate-900/80 p-4 shadow-2xl shadow-black/30 lg:flex-row lg:items-end lg:justify-between sm:p-6">
          <div>
            <p className="text-sm uppercase tracking-[0.2em] text-emerald-300">Hidden Admin</p>
            <h1 className="mt-2 text-3xl font-semibold">Leaderboard Operations</h1>
            <p className="mt-3 max-w-3xl text-sm leading-6 text-slate-300">
              Use this area for rebuilds and data correction. Match entry is public now, so this page is
              focused on moderation and recovery.
            </p>
          </div>
          <div className="flex gap-2">
            <button type="button" onClick={loadDashboardData} className="rounded-xl border border-slate-700 px-3 py-2 text-sm font-medium text-slate-100 transition hover:bg-slate-800">Refresh</button>
            <button type="button" onClick={handleLogout} className="rounded-xl border border-slate-700 px-3 py-2 text-sm font-medium text-slate-100 transition hover:bg-slate-800">Sign out</button>
          </div>
        </header>

        {needsRebuild ? (
          <div className="rounded-xl border border-amber-500/30 bg-amber-500/10 px-3 py-2.5 text-sm text-amber-100">
            Rebuild recommended. One or more admin changes have not been pushed into public processed stats yet.
          </div>
        ) : null}

        {pageError ? <div className="rounded-2xl border border-amber-500/30 bg-amber-500/10 px-4 py-3 text-sm text-amber-100">{pageError}</div> : null}

        <section className="grid gap-4 lg:grid-cols-[1.2fr_0.8fr]">
          <div className="rounded-2xl border border-slate-800 bg-slate-900/80 p-4 sm:p-6">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <h2 className="text-xl font-semibold">Rebuild Processed Data</h2>
                <p className="mt-2 text-sm leading-6 text-slate-300">Run this after correcting matches or importing new history so the public leaderboard stays in sync.</p>
              </div>
              <button type="button" onClick={handleRebuild} disabled={isRebuilding} className="rounded-xl bg-cyan-400 px-4 py-2.5 text-sm font-semibold text-slate-950 transition hover:bg-cyan-300 disabled:cursor-not-allowed disabled:opacity-70">{isRebuilding ? 'Rebuilding...' : 'Run Rebuild'}</button>
            </div>
            {rebuildMessage ? <p className="mt-3 rounded-xl border border-cyan-500/30 bg-cyan-500/10 px-3 py-2.5 text-sm text-cyan-100">{rebuildMessage}</p> : null}
          </div>

          <div className="rounded-2xl border border-slate-800 bg-slate-900/80 p-4 sm:p-6">
            <h2 className="text-xl font-semibold">Admin Notes</h2>
            <ul className="mt-4 space-y-3 text-sm leading-6 text-slate-300">
              <li>Public users enter scores. Admin stays focused on correction and recovery.</li>
              <li>After player-level or match corrections, run rebuild to refresh public processed stats.</li>
              <li>Player editor stays hidden until you open it, so the page stays lighter by default.</li>
            </ul>
          </div>
        </section>
        <section className="rounded-2xl border border-slate-800 bg-slate-900/80 p-4 sm:p-6">
          <div className="mb-5 flex items-center justify-between gap-4">
            <div>
              <h2 className="text-xl font-semibold">Recent Processing Runs</h2>
              <p className="mt-2 text-sm text-slate-300">Latest rebuild outcomes for quick sanity checks.</p>
            </div>
          </div>
          <div className="grid gap-4 lg:grid-cols-2">
            {processingRuns.map((run) => (
              <article key={run.id} className="rounded-2xl border border-slate-800 bg-slate-950/60 p-4">
                <div className="flex items-center justify-between gap-3">
                  <p className="text-sm font-semibold text-white">{run.status}</p>
                  <span className="rounded-full border border-slate-700 px-3 py-1 text-xs text-slate-300">{run.scope}</span>
                </div>
                <p className="mt-3 text-sm text-slate-200">{summarizeRun(run)}</p>
                <div className="mt-3 space-y-1 text-xs text-slate-400">
                  <p>Started: {formatTimestamp(run.started_at)}</p>
                  <p>Finished: {formatTimestamp(run.finished_at)}</p>
                  {run.error_message ? <p className="text-rose-300">{run.error_message}</p> : null}
                </div>
              </article>
            ))}
          </div>
        </section>

        <section className="rounded-2xl border border-slate-800 bg-slate-900/80 p-4 sm:p-6">
          <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
            <div>
              <h2 className="text-xl font-semibold">Players</h2>
              <p className="mt-2 text-sm text-slate-300">Open this only when you need to add a player or fix a level.</p>
            </div>
            <button type="button" onClick={() => setIsPlayersOpen((current) => !current)} className="rounded-xl border border-slate-700 px-3 py-2 text-sm font-medium text-slate-100 transition hover:bg-slate-800">{isPlayersOpen ? 'Hide Player Manager' : 'Open Player Manager'}</button>
          </div>

          {isPlayersOpen ? (
            <div className="mt-6 space-y-4">
              <div className="grid gap-3 rounded-2xl border border-slate-800 bg-slate-950/60 p-4 lg:grid-cols-[0.9fr_1.1fr]">
                <div>
                  <label className="mb-2 block text-xs uppercase tracking-[0.18em] text-slate-400">Search players</label>
                  <input type="text" value={playerSearch} onChange={(event) => setPlayerSearch(event.target.value)} placeholder="Find a player" className="w-full rounded-xl border border-slate-700 bg-slate-900 px-3 py-2.5 text-sm text-white outline-none transition focus:border-emerald-400" />
                </div>
                <form onSubmit={handleCreatePlayer} className="grid gap-3 md:grid-cols-[1.3fr_0.7fr_auto]">
                  <div>
                    <label className="mb-2 block text-xs uppercase tracking-[0.18em] text-slate-400">New player</label>
                    <input type="text" value={newPlayerName} onChange={(event) => setNewPlayerName(event.target.value)} placeholder="Player full name" className="w-full rounded-xl border border-slate-700 bg-slate-900 px-3 py-2.5 text-sm text-white outline-none transition focus:border-emerald-400" />
                  </div>
                  <div>
                    <label className="mb-2 block text-xs uppercase tracking-[0.18em] text-slate-400">Level</label>
                    <select value={newPlayerLevel} onChange={(event) => setNewPlayerLevel(event.target.value as 'INT' | 'PLUS' | 'ADV')} className="w-full rounded-xl border border-slate-700 bg-slate-900 px-3 py-2.5 text-sm text-white outline-none transition focus:border-emerald-400">
                      <option value="INT">INT</option>
                      <option value="PLUS">PLUS</option>
                      <option value="ADV">ADV</option>
                    </select>
                  </div>
                  <button type="submit" disabled={activePlayerId === 'new-player'} className="rounded-xl bg-emerald-500 px-4 py-2.5 text-sm font-semibold text-slate-950 transition hover:bg-emerald-400 disabled:cursor-not-allowed disabled:opacity-70">{activePlayerId === 'new-player' ? 'Creating...' : 'Add'}</button>
                </form>
              </div>

              {isLoadingPlayers ? <p className="text-sm text-slate-300">Loading players...</p> : null}

              <div className="space-y-3">
                {players.map((player) => {
                  const formState = playerEditState[player.id];
                  if (!formState) {
                    return null;
                  }

                  return (
                    <article key={player.id} className="grid gap-3 rounded-xl border border-slate-800 bg-slate-950/60 p-3 md:grid-cols-[1.2fr_0.5fr_0.45fr_auto] md:items-end">
                      <div>
                        <label className="mb-1 block text-[11px] uppercase tracking-[0.18em] text-slate-400">Display name</label>
                        <input type="text" value={formState.displayName} onChange={(event) => updatePlayerField(player.id, 'displayName', event.target.value)} className="w-full rounded-xl border border-slate-700 bg-slate-900 px-3 py-2 text-sm text-white outline-none transition focus:border-emerald-400" />
                        <p className="mt-1 text-[11px] text-slate-500">Slug: {player.slug}</p>
                      </div>
                      <div>
                        <label className="mb-1 block text-[11px] uppercase tracking-[0.18em] text-slate-400">Level</label>
                        <select value={formState.level} onChange={(event) => updatePlayerField(player.id, 'level', event.target.value as 'INT' | 'PLUS' | 'ADV')} className="w-full rounded-xl border border-slate-700 bg-slate-900 px-3 py-2 text-sm text-white outline-none transition focus:border-emerald-400">
                          <option value="INT">INT</option>
                          <option value="PLUS">PLUS</option>
                          <option value="ADV">ADV</option>
                        </select>
                      </div>
                      <label className="flex items-center gap-2 rounded-xl border border-slate-800 bg-slate-900 px-3 py-2 text-sm text-slate-200">
                        <input type="checkbox" checked={formState.isActive} onChange={(event) => updatePlayerField(player.id, 'isActive', event.target.checked)} />
                        Active
                      </label>
                      <button type="button" onClick={() => handleSavePlayer(player.id)} disabled={activePlayerId === player.id} className="rounded-xl bg-emerald-500 px-4 py-2 text-sm font-semibold text-slate-950 transition hover:bg-emerald-400 disabled:cursor-not-allowed disabled:opacity-70">Save</button>
                    </article>
                  );
                })}
              </div>
            </div>
          ) : null}
        </section>

        <section className="rounded-2xl border border-slate-800 bg-slate-900/80 p-4 sm:p-6">
          <div className="mb-5 flex flex-col gap-3 lg:flex-row lg:items-end lg:justify-between">
            <div>
              <h2 className="text-xl font-semibold">Recent Matches</h2>
              <p className="mt-2 text-sm text-slate-300">Compact moderation view with search and pagination.</p>
            </div>
            <form className="grid w-full max-w-2xl gap-2 sm:grid-cols-[minmax(0,1fr)_160px_auto_auto]" onSubmit={(event) => { event.preventDefault(); setMatchPage(1); setMatchSearch(matchSearchInput.trim()); }}>
              <input type="text" value={matchSearchInput} onChange={(event) => setMatchSearchInput(event.target.value)} placeholder="Search player, score, date" className="min-w-0 rounded-xl border border-slate-700 bg-slate-900 px-3 py-2 text-sm text-white outline-none transition focus:border-emerald-400" />
              <select value={matchStatusFilter} onChange={(event) => { setMatchPage(1); setMatchStatusFilter(event.target.value); }} className="rounded-xl border border-slate-700 bg-slate-900 px-3 py-2 text-sm text-white outline-none transition focus:border-emerald-400">
                <option value="all">All statuses</option>
                <option value="pending">pending</option>
                <option value="validated">validated</option>
                <option value="processed">processed</option>
                <option value="rejected">rejected</option>
              </select>
              <button type="submit" className="rounded-xl border border-slate-700 px-4 py-2 text-sm font-medium text-slate-100 transition hover:bg-slate-800">Search</button>
              <button type="button" onClick={() => { setMatchSearchInput(''); setMatchSearch(''); setMatchStatusFilter('all'); setMatchPage(1); }} className="rounded-xl border border-slate-700 px-4 py-2 text-sm font-medium text-slate-100 transition hover:bg-slate-800">Clear</button>
            </form>
          </div>

          {loadingData ? <p className="text-sm text-slate-300">Loading matches...</p> : null}

          <div className="mb-4 flex flex-col gap-2 text-sm text-slate-400 sm:flex-row sm:items-center sm:justify-between">
            <p>Showing {matches.length} of {matchTotal} matches{matchSearch ? ` for "${matchSearch}"` : ''}</p>
            <div className="flex items-center gap-2">
              <button type="button" onClick={() => setMatchPage((current) => Math.max(1, current - 1))} disabled={matchPage <= 1} className="rounded-lg border border-slate-700 px-3 py-1.5 disabled:opacity-50">Prev</button>
              <span>Page {matchPage} / {totalMatchPages}</span>
              <button type="button" onClick={() => setMatchPage((current) => Math.min(totalMatchPages, current + 1))} disabled={matchPage >= totalMatchPages} className="rounded-lg border border-slate-700 px-3 py-1.5 disabled:opacity-50">Next</button>
            </div>
          </div>

          <div className="space-y-2.5">
            {matches.map((match) => {
              const formState = editState[match.id];
              if (!formState) {
                return null;
              }

              return (
                <article key={match.id} className="rounded-xl border border-slate-800 bg-slate-950/60 p-2.5 shadow-lg shadow-black/20 sm:p-3">
                  <div className="grid gap-2.5 xl:grid-cols-[1.35fr_0.95fr_auto] xl:items-end">
                    <div className="grid gap-3 sm:grid-cols-2">
                      <div>
                        <p className="text-[11px] uppercase tracking-[0.2em] text-emerald-300">Team 1</p>
                        <div className="mt-1 grid gap-1.5">
                          {[1, 2].map((seat) => (
                            <select
                              key={`team1-${seat}`}
                              value={formState.participantIds[`1-${seat}`] ?? ''}
                              onChange={(event) => updateMatchParticipant(match.id, 1, seat, event.target.value)}
                              className="w-full rounded-xl border border-slate-700 bg-slate-900 px-2.5 py-1.5 text-xs text-white outline-none transition focus:border-emerald-400"
                            >
                              <option value="">Select player</option>
                              {matchPlayerOptions.map((player) => (
                                <option
                                  key={player.id}
                                  value={player.id}
                                  disabled={isPlayerTakenInMatch(formState.participantIds, `1-${seat}`, player.id)}
                                >
                                  {player.displayName}
                                </option>
                              ))}
                            </select>
                          ))}
                        </div>
                      </div>
                      <div>
                        <p className="text-[11px] uppercase tracking-[0.2em] text-cyan-300">Team 2</p>
                        <div className="mt-1 grid gap-1.5">
                          {[1, 2].map((seat) => (
                            <select
                              key={`team2-${seat}`}
                              value={formState.participantIds[`2-${seat}`] ?? ''}
                              onChange={(event) => updateMatchParticipant(match.id, 2, seat, event.target.value)}
                              className="w-full rounded-xl border border-slate-700 bg-slate-900 px-2.5 py-1.5 text-xs text-white outline-none transition focus:border-cyan-400"
                            >
                              <option value="">Select player</option>
                              {matchPlayerOptions.map((player) => (
                                <option
                                  key={player.id}
                                  value={player.id}
                                  disabled={isPlayerTakenInMatch(formState.participantIds, `2-${seat}`, player.id)}
                                >
                                  {player.displayName}
                                </option>
                              ))}
                            </select>
                          ))}
                        </div>
                      </div>
                      <div>
                        <label className="mb-1 block text-[11px] uppercase tracking-[0.18em] text-slate-400">Played At</label>
                        <input type="datetime-local" value={formState.playedAtLocal} onChange={(event) => updateField(match.id, 'playedAtLocal', event.target.value)} className="w-full rounded-xl border border-slate-700 bg-slate-900 px-2.5 py-2 text-sm text-white outline-none transition focus:border-emerald-400" />
                      </div>
                      <div>
                        <label className="mb-1 block text-[11px] uppercase tracking-[0.18em] text-slate-400">Status</label>
                        <select value={formState.status} onChange={(event) => updateField(match.id, 'status', event.target.value)} className="w-full rounded-xl border border-slate-700 bg-slate-900 px-2.5 py-2 text-sm text-white outline-none transition focus:border-emerald-400">
                          <option value="pending">pending</option>
                          <option value="validated">validated</option>
                          <option value="processed">processed</option>
                          <option value="rejected">rejected</option>
                        </select>
                      </div>
                    </div>

                    <div className="grid grid-cols-2 gap-2 sm:max-w-xs">
                      <div>
                        <label className="mb-1 block text-[11px] uppercase tracking-[0.18em] text-slate-400">Score 1</label>
                        <input type="number" min="0" value={formState.score1} onChange={(event) => updateField(match.id, 'score1', event.target.value)} className="w-full rounded-xl border border-slate-700 bg-slate-900 px-2.5 py-2 text-center text-base font-semibold text-white outline-none transition focus:border-emerald-400" />
                      </div>
                      <div>
                        <label className="mb-1 block text-[11px] uppercase tracking-[0.18em] text-slate-400">Score 2</label>
                        <input type="number" min="0" value={formState.score2} onChange={(event) => updateField(match.id, 'score2', event.target.value)} className="w-full rounded-xl border border-slate-700 bg-slate-900 px-2.5 py-2 text-center text-base font-semibold text-white outline-none transition focus:border-emerald-400" />
                      </div>
                      <p className="col-span-2 text-[11px] text-slate-400">{match.playDate ? `Play date: ${match.playDate}` : 'Play date not assigned'}</p>
                    </div>

                    <div className="flex gap-2 xl:flex-col">
                      <button type="button" onClick={() => handleSaveMatch(match.id)} disabled={activeMatchId === match.id} className="flex-1 rounded-xl bg-emerald-500 px-3 py-2 text-sm font-semibold text-slate-950 transition hover:bg-emerald-400 disabled:cursor-not-allowed disabled:opacity-70">Save</button>
                      <button type="button" onClick={() => handleDeleteMatch(match.id)} disabled={activeMatchId === match.id} className="flex-1 rounded-xl border border-rose-500/40 px-3 py-2 text-sm font-semibold text-rose-200 transition hover:bg-rose-500/10 disabled:cursor-not-allowed disabled:opacity-70">Delete</button>
                    </div>
                  </div>
                </article>
              );
            })}
          </div>
        </section>
      </div>
    </main>
  );
}

