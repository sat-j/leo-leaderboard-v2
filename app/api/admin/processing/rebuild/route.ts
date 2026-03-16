import { NextRequest, NextResponse } from 'next/server';
import { isAdminRequest } from '@/lib/auth/adminSession';
import { getErrorMessage } from '@/lib/errors';
import {
  completeProcessingRun,
  createProcessingRun,
  failProcessingRun,
} from '@/lib/repositories/processingRuns';
import { rebuildAllProcessedData } from '@/lib/services/processMatches';

export async function POST(request: NextRequest) {
  if (!isAdminRequest(request)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  let processingRunId: string | null = null;

  try {
    const processingRun = await createProcessingRun({
      triggerType: 'admin_rebuild',
      scope: 'full_rebuild',
    });
    processingRunId = processingRun.id;

    const summary = await rebuildAllProcessedData(processingRun.id);
    await completeProcessingRun(processingRun.id, summary);

    return NextResponse.json({
      success: true,
      data: {
        processingRunId: processingRun.id,
        status: 'completed',
        summary,
      },
    });
  } catch (error) {
    const message = getErrorMessage(error);

    if (processingRunId) {
      await failProcessingRun(processingRunId, message);
    }

    return NextResponse.json(
      {
        success: false,
        error: {
          code: 'PROCESSING_FAILED',
          message,
        },
      },
      { status: 500 }
    );
  }
}
