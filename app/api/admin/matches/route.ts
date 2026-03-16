import { NextRequest, NextResponse } from 'next/server';
import { isAdminRequest } from '@/lib/auth/adminSession';
import { createMatch, listRecentMatches } from '@/lib/repositories/matches';
import { validateMatchInput } from '@/lib/validation/matches';

export async function GET(request: NextRequest) {
  if (!isAdminRequest(request)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const { searchParams } = new URL(request.url);
    const limitParam = parseInt(searchParams.get('limit') || '25', 10);
    const limit = Number.isNaN(limitParam) ? 25 : Math.min(Math.max(limitParam, 1), 100);

    const matches = await listRecentMatches(limit);

    return NextResponse.json({
      success: true,
      data: {
        matches,
      },
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Failed to load matches';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  if (!isAdminRequest(request)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const payload = await request.json();
    const issues = validateMatchInput(payload);

    if (issues.length > 0) {
      return NextResponse.json(
        {
          error: 'Validation failed',
          details: issues,
        },
        { status: 400 }
      );
    }

    const result = await createMatch(payload);

    return NextResponse.json({
      success: true,
      data: result,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Failed to create match';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
