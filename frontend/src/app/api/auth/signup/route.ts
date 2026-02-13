import { NextRequest, NextResponse } from 'next/server';
import { getDb } from '@/lib/db';
import { hashPassword, createToken, getTokenCookieOptions } from '@/lib/auth';

export async function POST(req: NextRequest) {
  try {
    const { name, email, password } = await req.json();

    if (!name || !email || !password) {
      return NextResponse.json({ error: 'All fields are required' }, { status: 400 });
    }

    if (password.length < 6) {
      return NextResponse.json({ error: 'Password must be at least 6 characters' }, { status: 400 });
    }

    const db = getDb();

    // Check if user already exists
    const existing = db.prepare('SELECT id FROM users WHERE email = ?').get(email);
    if (existing) {
      return NextResponse.json({ error: 'Email already registered' }, { status: 409 });
    }

    const hashed = hashPassword(password);

    // Generate random avatar color
    const colors = ['#6C63FF', '#ED64A6', '#38B2AC', '#ECC94B', '#FC8181', '#9F7AEA', '#4FD1C5'];
    const avatarColor = colors[Math.floor(Math.random() * colors.length)];

    const result = db.prepare(
      'INSERT INTO users (name, email, password, avatar_color) VALUES (?, ?, ?, ?)'
    ).run(name, email, hashed, avatarColor);

    const user = { id: result.lastInsertRowid as number, name, email };
    const token = createToken(user);

    const cookieOpts = getTokenCookieOptions();
    const response = NextResponse.json({ user }, { status: 201 });
    response.cookies.set({ ...cookieOpts, value: token });

    return response;
  } catch (error) {
    console.error('Signup error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
