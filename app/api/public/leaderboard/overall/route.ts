import { NextRequest, NextResponse } from 'next/server';
import { getErrorMessage } from '@/lib/errors';
import { getOverallStats } from '@/lib/repositories/playerStats';

export async function GET(_request: NextRequest) {
  try {
    const data = await getOverallStats();
    return NextResponse.json({
      success: true,
      data,
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
