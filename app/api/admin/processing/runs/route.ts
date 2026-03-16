import { NextRequest, NextResponse } from 'next/server';
import { isAdminRequest } from '@/lib/auth/adminSession';
import { getErrorMessage } from '@/lib/errors';
import { listProcessingRuns } from '@/lib/repositories/processingRuns';

export async function GET(request: NextRequest) {
  if (!isAdminRequest(request)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const { searchParams } = new URL(request.url);
    const limitParam = Number.parseInt(searchParams.get('limit') || '20', 10);
    const limit = Number.isNaN(limitParam) ? 20 : Math.min(Math.max(limitParam, 1), 100);
    const runs = await listProcessingRuns(limit);

    return NextResponse.json({
      success: true,
      data: {
        runs,
      },
    });
  } catch (error) {
    const message = getErrorMessage(error);
    return NextResponse.json(
      {
        success: false,
        error: {
          code: 'INTERNAL_ERROR',
          message,
        },
      },
      { status: 500 }
    );
  }
}
