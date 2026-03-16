export interface MatchParticipantInput {
  playerId: string;
  team: number;
  seat: number;
}

export interface MatchInput {
  playedAt: string;
  score1: number;
  score2: number;
  source?: string;
  submittedVia?: string;
  externalSourceId?: string;
  players: MatchParticipantInput[];
}

export interface MatchValidationIssue {
  field: string;
  message: string;
}

export interface MatchUpdateInput {
  playedAt?: string;
  score1?: number;
  score2?: number;
  status?: string;
  players?: MatchParticipantInput[];
}

function validateParticipants(players: MatchParticipantInput[], issues: MatchValidationIssue[]) {
  if (!Array.isArray(players) || players.length !== 4) {
    issues.push({ field: 'players', message: 'Exactly four players are required.' });
    return;
  }

  const playerIds = players.map((player) => player.playerId);
  if (new Set(playerIds).size !== playerIds.length) {
    issues.push({ field: 'players', message: 'Duplicate players are not allowed in a single match.' });
  }

  const teamSeatPairs = players.map((player) => `${player.team}:${player.seat}`);
  if (new Set(teamSeatPairs).size !== teamSeatPairs.length) {
    issues.push({ field: 'players', message: 'Team and seat assignments must be unique.' });
  }

  const teamCounts = players.reduce<Record<number, number>>((counts, player) => {
    counts[player.team] = (counts[player.team] ?? 0) + 1;
    return counts;
  }, {});

  if (teamCounts[1] !== 2 || teamCounts[2] !== 2) {
    issues.push({ field: 'players', message: 'Each team must have exactly two players.' });
  }

  for (const player of players) {
    if (!player.playerId) {
      issues.push({ field: 'players', message: 'Each participant must include a playerId.' });
    }
    if (![1, 2].includes(player.team)) {
      issues.push({ field: 'players', message: 'team must be 1 or 2.' });
    }
    if (![1, 2].includes(player.seat)) {
      issues.push({ field: 'players', message: 'seat must be 1 or 2.' });
    }
  }
}

function isPositiveInteger(value: unknown): value is number {
  return typeof value === 'number' && Number.isInteger(value) && value >= 0;
}

export function validateMatchInput(input: MatchInput): MatchValidationIssue[] {
  const issues: MatchValidationIssue[] = [];

  if (!input.playedAt || Number.isNaN(Date.parse(input.playedAt))) {
    issues.push({ field: 'playedAt', message: 'playedAt must be a valid ISO timestamp.' });
  }

  if (!isPositiveInteger(input.score1)) {
    issues.push({ field: 'score1', message: 'score1 must be a non-negative integer.' });
  }

  if (!isPositiveInteger(input.score2)) {
    issues.push({ field: 'score2', message: 'score2 must be a non-negative integer.' });
  }

  if (input.score1 === input.score2) {
    issues.push({ field: 'score', message: 'Tied scores are not supported.' });
  }

  validateParticipants(input.players, issues);

  return issues;
}

export function validateMatchUpdateInput(input: MatchUpdateInput): MatchValidationIssue[] {
  const issues: MatchValidationIssue[] = [];

  if (input.playedAt !== undefined && Number.isNaN(Date.parse(input.playedAt))) {
    issues.push({ field: 'playedAt', message: 'playedAt must be a valid ISO timestamp.' });
  }

  if (input.score1 !== undefined && !isPositiveInteger(input.score1)) {
    issues.push({ field: 'score1', message: 'score1 must be a non-negative integer.' });
  }

  if (input.score2 !== undefined && !isPositiveInteger(input.score2)) {
    issues.push({ field: 'score2', message: 'score2 must be a non-negative integer.' });
  }

  if (
    typeof input.score1 === 'number' &&
    typeof input.score2 === 'number' &&
    input.score1 === input.score2
  ) {
    issues.push({ field: 'score', message: 'Tied scores are not supported.' });
  }

  if (
    input.status !== undefined &&
    !['pending', 'validated', 'processed', 'rejected'].includes(input.status)
  ) {
    issues.push({
      field: 'status',
      message: 'status must be one of pending, validated, processed, or rejected.',
    });
  }

  if (input.players !== undefined) {
    validateParticipants(input.players, issues);
  }

  return issues;
}
