import { createSupabaseAdminClient } from '@/lib/supabase/admin';

export interface ProcessingRunSummary {
  matchesProcessed: number;
  playDatesProcessed: number;
  snapshotsWritten: number;
  playerDateStatsWritten: number;
  warnings: string[];
}

export async function createProcessingRun(params: {
  triggerType: string;
  scope: string;
  triggeredByUserId?: string | null;
}) {
  const supabase = createSupabaseAdminClient();
  const { data, error } = await supabase
    .from('processing_runs')
    .insert({
      trigger_type: params.triggerType,
      scope: params.scope,
      status: 'running',
      triggered_by_user_id: params.triggeredByUserId ?? null,
    })
    .select('id, status, started_at')
    .single();

  if (error || !data) {
    throw error ?? new Error('Failed to create processing run');
  }

  return data;
}

export async function completeProcessingRun(runId: string, summary: ProcessingRunSummary) {
  const supabase = createSupabaseAdminClient();
  const { error } = await supabase
    .from('processing_runs')
    .update({
      status: 'completed',
      finished_at: new Date().toISOString(),
      summary: summary as unknown as Record<string, unknown>,
      error_message: null,
    })
    .eq('id', runId);

  if (error) {
    throw error;
  }
}

export async function failProcessingRun(runId: string, errorMessage: string, summary?: Partial<ProcessingRunSummary>) {
  const supabase = createSupabaseAdminClient();
  const { error } = await supabase
    .from('processing_runs')
    .update({
      status: 'failed',
      finished_at: new Date().toISOString(),
      summary: (summary ?? {}) as Record<string, unknown>,
      error_message: errorMessage,
    })
    .eq('id', runId);

  if (error) {
    throw error;
  }
}

export async function listProcessingRuns(limit = 20) {
  const supabase = createSupabaseAdminClient();
  const { data, error } = await supabase
    .from('processing_runs')
    .select('id, trigger_type, scope, status, started_at, finished_at, summary, error_message')
    .order('started_at', { ascending: false })
    .limit(limit);

  if (error) {
    throw error;
  }

  return data ?? [];
}
