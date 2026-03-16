import { NextRequest, NextResponse } from 'next/server';
import { isAdminRequest } from '@/lib/auth/adminSession';
import { getErrorMessage } from '@/lib/errors';
import { updatePlayer } from '@/lib/repositories/players';

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ playerId: string }> }
) {
  if (!isAdminRequest(request)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const { playerId } = await params;
    const payload = (await request.json()) as {
      displayName?: string;
      level?: string;
      isActive?: boolean;
    };

    if (payload.displayName !== undefined && !payload.displayName.trim()) {
      return NextResponse.json(
        {
          success: false,
          error: {
            code: 'VALIDATION_FAILED',
            message: 'displayName cannot be empty',
          },
        },
        { status: 400 }
      );
    }

    const player = await updatePlayer(playerId, payload);

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
