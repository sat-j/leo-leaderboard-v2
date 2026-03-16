import { createHash } from 'crypto';
import type { NextRequest } from 'next/server';
import { createSupabaseAdminClient } from '@/lib/supabase/admin';
import { createMatch } from '@/lib/repositories/matches';
import type { MatchInput, MatchValidationIssue } from '@/lib/validation/matches';
import { validateMatchInput } from '@/lib/validation/matches';

const RATE_LIMIT_WINDOW_MINUTES = 10;
const RATE_LIMIT_MAX_SUBMISSIONS = 8;
const DUPLICATE_WINDOW_MINUTES = 15;

export interface PublicSubmissionError {
  status: number;
  code: 'VALIDATION_ERROR' | 'RATE_LIMITED' | 'DUPLICATE_MATCH' | 'PLAYER_NOT_FOUND' | 'INTERNAL_ERROR';
  message: string;
  details?: unknown;
}

export interface PublicSubmissionResult {
  submissionId: string;
  matchId: string;
  playDate: string;
  status: string;
  warnings: string[];
}

function hashValue(value: string) {
  return createHash('sha256').update(value).digest('hex');
}

function getClientIp(request: NextRequest) {
  const forwarded = request.headers.get('x-forwarded-for');
  if (forwarded) {
    return forwarded.split(',')[0]?.trim() || 'unknown';
  }

  return request.headers.get('x-real-ip')?.trim() || 'unknown';
}

function buildSubmissionFingerprint(input: MatchInput) {
  const normalizedPlayers = [...input.players]
    .sort((a, b) => {
      if (a.team !== b.team) {
        return a.team - b.team;
      }
      if (a.seat !== b.seat) {
        return a.seat - b.seat;
      }
      return a.playerId.localeCompare(b.playerId);
    })
    .map((player) => `${player.playerId}:${player.team}:${player.seat}`);

  return hashValue(
    JSON.stringify({
      playedAt: input.playedAt,
      score1: input.score1,
      score2: input.score2,
      players: normalizedPlayers,
    })
  );
}

async function createSubmissionLog(params: {
  ipHash: string;
  fingerprintHash: string;
  source: string;
  status: string;
  payload: MatchInput;
  reasonCode?: string | null;
  matchId?: string | null;
}) {
  const supabase = createSupabaseAdminClient();
  const { data, error } = await supabase
    .from('public_submission_logs')
    .insert({
      ip_hash: params.ipHash,
      fingerprint_hash: params.fingerprintHash,
      source: params.source,
      status: params.status,
      reason_code: params.reasonCode ?? null,
      request_payload: params.payload as unknown as Record<string, unknown>,
      match_id: params.matchId ?? null,
    })
    .select('id')
    .single();

  if (error || !data) {
    throw error ?? new Error('Failed to create submission log');
  }

  return data.id;
}

async function checkRateLimit(ipHash: string) {
  const supabase = createSupabaseAdminClient();
  const windowStart = new Date(Date.now() - RATE_LIMIT_WINDOW_MINUTES * 60_000).toISOString();
  const { count, error } = await supabase
    .from('public_submission_logs')
    .select('id', { count: 'exact', head: true })
    .eq('ip_hash', ipHash)
    .gte('created_at', windowStart);

  if (error) {
    throw error;
  }

  return (count ?? 0) < RATE_LIMIT_MAX_SUBMISSIONS;
}

async function checkDuplicateFingerprint(fingerprintHash: string) {
  const supabase = createSupabaseAdminClient();
  const windowStart = new Date(Date.now() - DUPLICATE_WINDOW_MINUTES * 60_000).toISOString();
  const { count, error } = await supabase
    .from('public_submission_logs')
    .select('id', { count: 'exact', head: true })
    .eq('fingerprint_hash', fingerprintHash)
    .in('status', ['accepted', 'duplicate'])
    .gte('created_at', windowStart);

  if (error) {
    throw error;
  }

  return (count ?? 0) > 0;
}

function toValidationError(issues: MatchValidationIssue[]): PublicSubmissionError {
  return {
    status: 400,
    code: 'VALIDATION_ERROR',
    message: 'Validation failed',
    details: issues,
  };
}

export async function submitPublicScore(request: NextRequest, payload: MatchInput): Promise<PublicSubmissionResult> {
  const issues = validateMatchInput(payload);
  if (issues.length > 0) {
    throw toValidationError(issues);
  }

  const ipHash = hashValue(getClientIp(request));
  const source = payload.source ?? 'homepage-score-entry';
  const fingerprintHash = buildSubmissionFingerprint(payload);

  const allowed = await checkRateLimit(ipHash);
  if (!allowed) {
    await createSubmissionLog({
      ipHash,
      fingerprintHash,
      source,
      status: 'rate_limited',
      reasonCode: 'RATE_LIMITED',
      payload,
    });

    throw {
      status: 429,
      code: 'RATE_LIMITED',
      message: 'Too many score submissions from this client. Please wait a few minutes and try again.',
    } satisfies PublicSubmissionError;
  }

  const isDuplicate = await checkDuplicateFingerprint(fingerprintHash);
  if (isDuplicate) {
    await createSubmissionLog({
      ipHash,
      fingerprintHash,
      source,
      status: 'duplicate',
      reasonCode: 'DUPLICATE_MATCH',
      payload,
    });

    throw {
      status: 409,
      code: 'DUPLICATE_MATCH',
      message: 'This score looks like a recent duplicate submission.',
    } satisfies PublicSubmissionError;
  }

  let match;
  try {
    match = await createMatch({
      ...payload,
      submittedVia: payload.submittedVia ?? 'public-score-entry',
      source,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Failed to create match';
    const isMissingPlayerError = message.startsWith('Unknown players:');

    await createSubmissionLog({
      ipHash,
      fingerprintHash,
      source,
      status: 'rejected',
      reasonCode: isMissingPlayerError ? 'PLAYER_NOT_FOUND' : 'INTERNAL_ERROR',
      payload,
    });

    if (isMissingPlayerError) {
      throw {
        status: 400,
        code: 'PLAYER_NOT_FOUND',
        message,
      } satisfies PublicSubmissionError;
    }

    throw error;
  }

  const submissionId = await createSubmissionLog({
    ipHash,
    fingerprintHash,
    source,
    status: 'accepted',
    reasonCode: null,
    payload,
    matchId: match.matchId,
  });

  return {
    submissionId,
    matchId: match.matchId,
    playDate: match.playDate,
    status: match.status,
    warnings: [],
  };
}
