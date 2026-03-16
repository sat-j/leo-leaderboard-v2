import { NextRequest, NextResponse } from 'next/server';
import { listPlayers } from '@/lib/repositories/players';

function parseActiveFilter(rawValue: string | null) {
  if (rawValue === null) {
    return true;
  }

  if (rawValue === 'true') {
    return true;
  }

  if (rawValue === 'false') {
    return false;
  }

  return undefined;
}

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const active = parseActiveFilter(searchParams.get('active'));
    const search = searchParams.get('search')?.trim() || undefined;
    const limitParam = Number.parseInt(searchParams.get('limit') || '100', 10);
    const limit = Number.isNaN(limitParam) ? 100 : limitParam;

    const players = await listPlayers({ active, search, limit });

    return NextResponse.json({
      success: true,
      data: {
        players,
      },
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Failed to load players';
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
