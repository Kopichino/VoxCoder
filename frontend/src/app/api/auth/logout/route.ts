import { NextResponse } from 'next/server';
import { getTokenCookieOptions } from '@/lib/auth';

export async function POST() {
  const cookieOpts = getTokenCookieOptions();
  const response = NextResponse.json({ success: true });
  response.cookies.set({ ...cookieOpts, value: '', maxAge: 0 });
  return response;
}
