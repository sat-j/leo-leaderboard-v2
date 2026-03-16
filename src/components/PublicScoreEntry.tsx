'use client';

import Link from 'next/link';
import { useEffect, useMemo, useRef, useState } from 'react';
import styles from './PublicScoreEntry.module.css';

type SubmitState = 'idle' | 'submitting' | 'success' | 'error';

interface PlayerOption {
  id: string;
  displayName: string;
  slug: string;
  level: 'PLUS' | 'INT' | 'ADV';
  isActive: boolean;
}

interface RecentMatch {
  id: string;
  playedAt: string;
  date: string | null;
  score1: number;
  score2: number;
  status: string;
  team1: string[];
  team2: string[];
}

interface PlayerPickerProps {
  label: string;
  value: PlayerOption | null;
  onChange: (value: PlayerOption | null) => void;
  allPlayers: PlayerOption[];
}

function PlayerPicker({ label, value, onChange, allPlayers }: PlayerPickerProps) {
  const [query, setQuery] = useState('');
  const [open, setOpen] = useState(false);
  const wrapperRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (wrapperRef.current && !wrapperRef.current.contains(event.target as Node)) {
        setOpen(false);
      }
    }

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const filtered = useMemo(() => {
    const normalizedQuery = query.trim().toLowerCase();

    if (!normalizedQuery) {
      return allPlayers.slice(0, 24);
    }

    return allPlayers
      .filter((player) => player.displayName.toLowerCase().includes(normalizedQuery))
      .slice(0, 24);
  }, [allPlayers, query]);

  const display = value?.displayName ?? query;

  return (
    <div className={styles.field} ref={wrapperRef}>
      <div className={styles.label}>{label}</div>
      <div className={styles.searchDropdown}>
        <div className={styles.inputShell}>
          <input
            className={styles.input}
            type="text"
            inputMode="search"
            autoComplete="off"
            placeholder="Search player"
            value={display}
            onFocus={() => setOpen(true)}
            onChange={(event) => {
              setQuery(event.target.value);
              onChange(null);
              setOpen(true);
            }}
          />
          {display ? (
            <button
              type="button"
              className={styles.inputClear}
              onClick={() => {
                setQuery('');
                onChange(null);
                setOpen(false);
              }}
              aria-label={`Clear ${label}`}
            >
              x
            </button>
          ) : null}
        </div>

        {open && filtered.length > 0 ? (
          <div className={styles.list}>
            {filtered.map((player) => {
              const selected = player.id === value?.id;
              return (
                <div
                  key={player.id}
                  className={`${styles.listItem} ${selected ? styles.listItemSelected : ''}`.trim()}
                  onMouseDown={(event) => {
                    event.preventDefault();
                    onChange(player);
                    setQuery('');
                    setOpen(false);
                  }}
                >
                  {player.displayName}
                </div>
              );
            })}
          </div>
        ) : null}
      </div>
    </div>
  );
}

function getTodayDateString() {
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, '0');
  const day = String(now.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

interface PublicScoreEntryProps {
  mode?: 'page' | 'drawer';
}

export default function PublicScoreEntry({ mode = 'page' }: PublicScoreEntryProps) {
  const [players, setPlayers] = useState<PlayerOption[]>([]);
  const [loadingPlayers, setLoadingPlayers] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [recentMatches, setRecentMatches] = useState<RecentMatch[]>([]);
  const [loadingRecentMatches, setLoadingRecentMatches] = useState(false);
  const [matchSearchQuery, setMatchSearchQuery] = useState('');

  const [p1, setP1] = useState<PlayerOption | null>(null);
  const [p2, setP2] = useState<PlayerOption | null>(null);
  const [p3, setP3] = useState<PlayerOption | null>(null);
  const [p4, setP4] = useState<PlayerOption | null>(null);
  const [score1, setScore1] = useState('');
  const [score2, setScore2] = useState('');

  const [submitState, setSubmitState] = useState<SubmitState>('idle');
  const [submitMessage, setSubmitMessage] = useState<string | null>(null);

  const selectedIds = [p1?.id, p2?.id, p3?.id, p4?.id].filter(Boolean) as string[];
  const availablePlayers = useMemo(
    () => players.filter((player) => !selectedIds.includes(player.id)),
    [players, selectedIds]
  );
  const filteredRecentMatches = useMemo(() => {
    const query = matchSearchQuery.trim().toLowerCase();
    if (!query) {
      return recentMatches;
    }

    return recentMatches.filter((match) => {
      const haystack = [...match.team1, ...match.team2, `${match.score1}-${match.score2}`]
        .join(' ')
        .toLowerCase();
      return haystack.includes(query);
    });
  }, [matchSearchQuery, recentMatches]);

  const canSubmit =
    p1 &&
    p2 &&
    p3 &&
    p4 &&
    score1 !== '' &&
    score2 !== '' &&
    Number(score1) >= 0 &&
    Number(score2) >= 0 &&
    Number.isInteger(Number(score1)) &&
    Number.isInteger(Number(score2)) &&
    Number(score1) !== Number(score2);

  async function loadPlayers() {
    try {
      setLoadingPlayers(true);
      const response = await fetch('/api/public/players');
      const result = await response.json();

      if (!response.ok || !result.success) {
        throw new Error(result.error?.message || 'Failed to load players');
      }

      setPlayers(result.data.players);
      setLoadError(null);
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Failed to load players';
      setLoadError(message);
    } finally {
      setLoadingPlayers(false);
    }
  }

  async function loadRecentMatches() {
    try {
      setLoadingRecentMatches(true);
      const today = getTodayDateString();
      const response = await fetch(`/api/public/matches/recent?date=${today}&limit=100`);
      const result = await response.json();

      if (!response.ok || !result.success) {
        throw new Error(result.error?.message || 'Failed to load recent matches');
      }

      setRecentMatches(result.data.matches);
    } catch {
      setRecentMatches([]);
    } finally {
      setLoadingRecentMatches(false);
    }
  }

  useEffect(() => {
    loadPlayers();
    loadRecentMatches();
  }, []);

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!canSubmit || !p1 || !p2 || !p3 || !p4) {
      return;
    }

    setSubmitState('submitting');
    setSubmitMessage(null);

    try {
      const playedAt = new Date().toISOString();
      const response = await fetch('/api/public/score-submissions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          playedAt,
          score1: Number(score1),
          score2: Number(score2),
          source: 'homepage-score-entry',
          players: [
            { playerId: p1.id, team: 1, seat: 1 },
            { playerId: p2.id, team: 1, seat: 2 },
            { playerId: p3.id, team: 2, seat: 1 },
            { playerId: p4.id, team: 2, seat: 2 },
          ],
        }),
      });

      const result = await response.json();

      if (!response.ok || !result.success) {
        throw new Error(result.error?.message || 'Failed to submit score');
      }

      setSubmitState('success');
      setSubmitMessage(`Score saved for ${result.data.playDate}.`);
      setP1(null);
      setP2(null);
      setP3(null);
      setP4(null);
      setScore1('');
      setScore2('');
      loadRecentMatches();
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Failed to submit score';
      setSubmitState('error');
      setSubmitMessage(message);
    }
  }

  const content = (
    <>
      {mode === 'page' ? (
        <Link href="/" className={styles.backLink}>
          <span>&larr;</span>
          <span>Back to leaderboard</span>
        </Link>
      ) : null}

      <div className={styles.hero}>
        <div className={styles.eyebrow}>Enter Score</div>
        <h1 className={styles.title}>Quick score entry.</h1>
        <p className={styles.subtitle}>
          Pick four players, enter the final score, submit, and get back to the next game.
        </p>
      </div>

      <div className={styles.card}>
        <div className={styles.cardHeader}>
          <div>
            <div className={styles.cardTitle}>Live score entry</div>
            <div className={styles.cardSubtitle}>No extra clutter. Just players, score, and submit.</div>
          </div>
          <span className={styles.pill}>Public</span>
        </div>

        {loadingPlayers ? <div className={styles.statusBox}>Loading players...</div> : null}
        {loadError ? <div className={`${styles.statusBox} ${styles.statusError}`}>{loadError}</div> : null}
        {submitMessage ? (
          <div
            className={`${styles.statusBox} ${
              submitState === 'success' ? styles.statusSuccess : styles.statusError
            }`}
          >
            {submitMessage}
          </div>
        ) : null}

        <form onSubmit={handleSubmit}>
          <div className={styles.teamsContainer}>
            <div className={`${styles.teamBox} ${styles.teamOne}`}>
              <div className={styles.teamHeader}>Team 1</div>
              <PlayerPicker label="Player 1" value={p1} onChange={setP1} allPlayers={availablePlayers} />
              <PlayerPicker label="Player 2" value={p2} onChange={setP2} allPlayers={availablePlayers} />
              <div className={styles.field}>
                <div className={styles.label}>Score</div>
                <input
                  className={`${styles.input} ${styles.scoreInput}`}
                  type="number"
                  min="0"
                  max="30"
                  value={score1}
                  onChange={(event) => setScore1(event.target.value)}
                />
              </div>
            </div>

            <div className={`${styles.teamBox} ${styles.teamTwo}`}>
              <div className={styles.teamHeader}>Team 2</div>
              <PlayerPicker label="Player 3" value={p3} onChange={setP3} allPlayers={availablePlayers} />
              <PlayerPicker label="Player 4" value={p4} onChange={setP4} allPlayers={availablePlayers} />
              <div className={styles.field}>
                <div className={styles.label}>Score</div>
                <input
                  className={`${styles.input} ${styles.scoreInput}`}
                  type="number"
                  min="0"
                  max="30"
                  value={score2}
                  onChange={(event) => setScore2(event.target.value)}
                />
              </div>
            </div>
          </div>

          <button className={styles.submitButton} type="submit" disabled={!canSubmit || submitState === 'submitting'}>
            {submitState === 'submitting' ? 'Submitting...' : 'Submit score'}
          </button>
        </form>
      </div>

      <section className={styles.recentSection}>
        <div className={styles.recentSectionHeader}>
          <div className={styles.recentTitleBlock}>
            <div className={styles.recentTitle}>Today&apos;s matches</div>
            <div className={styles.recentSubtitle}>Check correctness here if needed.</div>
          </div>
          <button
            type="button"
            className={styles.refreshButton}
            onClick={loadRecentMatches}
            disabled={loadingRecentMatches}
          >
            {loadingRecentMatches ? 'Refreshing...' : 'Refresh'}
          </button>
        </div>

        <div className={styles.controlsRow}>
          <input
            className={styles.input}
            type="text"
            placeholder="Search player or score"
            value={matchSearchQuery}
            onChange={(event) => setMatchSearchQuery(event.target.value)}
          />
          <div className={styles.todayPill}>Today only</div>
          <button
            type="button"
            className={styles.refreshButton}
            onClick={loadRecentMatches}
            disabled={loadingRecentMatches}
          >
            Refresh
          </button>
        </div>

        <div className={styles.matchList}>
          {filteredRecentMatches.map((match) => (
            <div className={styles.matchCard} key={match.id}>
              <div className={styles.teamsRow}>
                <div className={styles.teamText}>{match.team1.join(' / ')}</div>
                <div className={styles.scoreText}>
                  {match.score1} - {match.score2}
                </div>
                <div className={styles.teamText}>{match.team2.join(' / ')}</div>
              </div>
            </div>
          ))}

          {!loadingRecentMatches && recentMatches.length === 0 ? (
            <div className={styles.statusBox}>No scores submitted yet for today.</div>
          ) : null}

          {!loadingRecentMatches && recentMatches.length > 0 && filteredRecentMatches.length === 0 ? (
            <div className={styles.statusBox}>No matches found for that search.</div>
          ) : null}
        </div>
      </section>
    </>
  );

  if (mode === 'drawer') {
    return <div className={styles.drawerContent}>{content}</div>;
  }

  return (
    <div className={styles.pageShell}>
      <div className={styles.pageInner}>{content}</div>
    </div>
  );
}
