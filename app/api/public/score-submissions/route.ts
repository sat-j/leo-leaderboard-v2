import { NextRequest, NextResponse } from 'next/server';
import {
  submitPublicScore,
  type PublicSubmissionError,
} from '@/lib/services/publicScoreSubmissions';
import type { MatchInput } from '@/lib/validation/matches';

function isPublicSubmissionError(error: unknown): error is PublicSubmissionError {
  return (
    typeof error === 'object' &&
    error !== null &&
    'status' in error &&
    'code' in error &&
    'message' in error
  );
}

export async function POST(request: NextRequest) {
  try {
    const payload = (await request.json()) as MatchInput;
    const result = await submitPublicScore(request, payload);

    return NextResponse.json({
      success: true,
      data: result,
    });
  } catch (error) {
    if (isPublicSubmissionError(error)) {
      return NextResponse.json(
        {
          success: false,
          error: {
            code: error.code,
            message: error.message,
            details: error.details ?? null,
          },
        },
        { status: error.status }
      );
    }

    const message = error instanceof Error ? error.message : 'Failed to submit score';
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
