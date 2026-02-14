import { NextRequest, NextResponse } from 'next/server';

const FLASK_API = process.env.NEXT_PUBLIC_FLASK_URL || 'http://localhost:5000';

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();

    const res = await fetch(`${FLASK_API}/api/debug_practice`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    });

    const data = await res.json();
    return NextResponse.json(data, { status: res.status });
  } catch {
    return NextResponse.json(
      { error: 'Failed to connect to debug service' },
      { status: 500 }
    );
  }
}
