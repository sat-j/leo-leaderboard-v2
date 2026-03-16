import { NextRequest, NextResponse } from 'next/server';
import { isAdminRequest } from '@/lib/auth/adminSession';
import { getErrorMessage } from '@/lib/errors';
import { deleteMatch, updateMatch } from '@/lib/repositories/matches';
import { validateMatchUpdateInput } from '@/lib/validation/matches';

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ matchId: string }> }
) {
  if (!isAdminRequest(request)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const { matchId } = await params;
    const payload = await request.json();
    const issues = validateMatchUpdateInput(payload);

    if (issues.length > 0) {
      return NextResponse.json(
        {
          success: false,
          error: {
            code: 'VALIDATION_FAILED',
            message: 'Validation failed',
          },
          details: issues,
        },
        { status: 400 }
      );
    }

    const result = await updateMatch(matchId, payload);

    return NextResponse.json({
      success: true,
      data: result,
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

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ matchId: string }> }
) {
  if (!isAdminRequest(request)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const { matchId } = await params;
    const result = await deleteMatch(matchId);

    return NextResponse.json({
      success: true,
      data: result,
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
