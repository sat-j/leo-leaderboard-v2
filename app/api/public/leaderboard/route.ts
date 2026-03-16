import { NextRequest, NextResponse } from 'next/server';
import { getErrorMessage } from '@/lib/errors';
import { getPublicLeaderboard } from '@/lib/repositories/leaderboard';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const date = searchParams.get('date') ?? undefined;
    const data = await getPublicLeaderboard(date);

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
