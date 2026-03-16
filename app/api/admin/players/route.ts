import { NextRequest, NextResponse } from 'next/server';
import { isAdminRequest } from '@/lib/auth/adminSession';
import { getErrorMessage } from '@/lib/errors';
import { createPlayer, listPlayers } from '@/lib/repositories/players';

function parseActiveFilter(rawValue: string | null) {
  if (rawValue === null) {
    return undefined;
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
  if (!isAdminRequest(request)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const { searchParams } = new URL(request.url);
    const search = searchParams.get('search')?.trim() || undefined;
    const active = parseActiveFilter(searchParams.get('active'));
    const limitParam = Number.parseInt(searchParams.get('limit') || '100', 10);
    const limit = Number.isNaN(limitParam) ? 100 : Math.min(Math.max(limitParam, 1), 250);

    const players = await listPlayers({ search, active, limit });

    return NextResponse.json({
      success: true,
      data: {
        players,
      },
    });
  } catch (error) {
    return NextResponse.json(
      {
        success: false,
        error: {
          code: 'INTERNAL_ERROR',
          message: getErrorMessage(error),
        },
      },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  if (!isAdminRequest(request)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const payload = (await request.json()) as {
      displayName?: string;
      level?: string;
      isActive?: boolean;
    };

    if (!payload.displayName?.trim()) {
      return NextResponse.json(
        {
          success: false,
          error: {
            code: 'VALIDATION_FAILED',
            message: 'displayName is required',
          },
        },
        { status: 400 }
      );
    }

    const player = await createPlayer({
      displayName: payload.displayName,
      level: payload.level ?? 'INT',
      isActive: payload.isActive ?? true,
    });

    return NextResponse.json({
      success: true,
      data: {
        player,
      },
    });
  } catch (error) {
    return NextResponse.json(
      {
        success: false,
        error: {
          code: 'INTERNAL_ERROR',
          message: getErrorMessage(error),
        },
      },
      { status: 500 }
    );
  }
}
