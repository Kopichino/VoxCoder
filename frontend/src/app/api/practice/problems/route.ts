import { NextRequest, NextResponse } from 'next/server';
import { getCurrentUser } from '@/lib/auth';

const FLASK_API = process.env.NEXT_PUBLIC_FLASK_URL || 'http://localhost:5000';

export async function GET(req: NextRequest) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { searchParams } = new URL(req.url);
  const slug = searchParams.get('slug');
  const q = searchParams.get('q');

  try {
    if (slug) {
      // Fetch a specific problem
      const res = await fetch(`${FLASK_API}/api/leetcode/problem?slug=${encodeURIComponent(slug)}`);
      const data = await res.json();
      return NextResponse.json(data, { status: res.status });
    } else {
      // Search problems
      const res = await fetch(`${FLASK_API}/api/leetcode/search?q=${encodeURIComponent(q || '')}`);
      const data = await res.json();
      return NextResponse.json(data, { status: res.status });
    }
  } catch {
    return NextResponse.json({ error: 'Failed to connect to practice server' }, { status: 503 });
  }
}
