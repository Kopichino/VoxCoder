import { NextRequest, NextResponse } from 'next/server';
import { getDb } from '@/lib/db';
import { verifyPassword, createToken, getTokenCookieOptions } from '@/lib/auth';

interface UserRow {
  id: number;
  name: string;
  email: string;
  password: string;
}

export async function POST(req: NextRequest) {
  try {
    const { email, password } = await req.json();

    if (!email || !password) {
      return NextResponse.json({ error: 'Email and password are required' }, { status: 400 });
    }

    const db = getDb();
    const user = db.prepare('SELECT id, name, email, password FROM users WHERE email = ?').get(email) as UserRow | undefined;

    if (!user || !verifyPassword(password, user.password)) {
      return NextResponse.json({ error: 'Invalid email or password' }, { status: 401 });
    }

    const payload = { id: user.id, name: user.name, email: user.email };
    const token = createToken(payload);

    const cookieOpts = getTokenCookieOptions();
    const response = NextResponse.json({ user: payload });
    response.cookies.set({ ...cookieOpts, value: token });

    return response;
  } catch (error) {
    console.error('Login error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
