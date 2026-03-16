import { NextRequest, NextResponse } from 'next/server';
import { listProcessedPlayDates } from '@/lib/repositories/leaderboard';

export async function GET(_request: NextRequest) {
  try {
    const playDates = await listProcessedPlayDates();

    return NextResponse.json({
      success: true,
      data: {
        playDates,
        latestDate: playDates.length > 0 ? playDates[playDates.length - 1].date : null,
      },
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Failed to load play dates';
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
