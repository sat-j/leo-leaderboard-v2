import { NextRequest, NextResponse } from 'next/server';
import { getErrorMessage } from '@/lib/errors';
import { getPlayerAnalyticsBySlug } from '@/lib/repositories/playerStats';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ slug: string }> }
) {
  try {
    const { slug } = await params;
    const { searchParams } = new URL(request.url);
    const date = searchParams.get('date') ?? undefined;
    const data = await getPlayerAnalyticsBySlug(slug, date);

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
