import { NextRequest, NextResponse } from 'next/server';
import { timingSafeEqual } from 'node:crypto';
import { getAdminSecret } from '@/lib/config';
import { createAdminSessionToken, getAdminSessionCookieOptions } from '@/lib/auth/adminSession';

function secretsMatch(expected: string, actual: string): boolean {
  const expectedBuffer = Buffer.from(expected);
  const actualBuffer = Buffer.from(actual);

  if (expectedBuffer.length !== actualBuffer.length) {
    return false;
  }

  return timingSafeEqual(expectedBuffer, actualBuffer);
}

export async function POST(request: NextRequest) {
  const { password } = (await request.json()) as { password?: string };
  const adminSecret = getAdminSecret();

  if (!adminSecret) {
    return NextResponse.json({ error: 'Admin secret not configured' }, { status: 500 });
  }

  if (typeof password !== 'string' || !secretsMatch(adminSecret, password)) {
    return NextResponse.json({ error: 'Invalid admin secret' }, { status: 401 });
  }

  const response = NextResponse.json({
    success: true,
    data: {
      authenticated: true,
    },
  });

  response.cookies.set({
    ...getAdminSessionCookieOptions(),
    value: createAdminSessionToken(),
  });

  return response;
}

export async function DELETE() {
  const response = NextResponse.json({
    success: true,
    data: {
      authenticated: false,
    },
  });

  response.cookies.set({
    ...getAdminSessionCookieOptions(),
    value: '',
    maxAge: 0,
  });

  return response;
}
