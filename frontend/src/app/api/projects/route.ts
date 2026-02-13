import { NextRequest, NextResponse } from 'next/server';
import { getDb } from '@/lib/db';
import { getCurrentUser } from '@/lib/auth';

export async function GET() {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const db = getDb();
  const projects = db.prepare(
    'SELECT id, title, description, code, language, created_at, updated_at FROM projects WHERE user_id = ? ORDER BY updated_at DESC'
  ).all(user.id);

  return NextResponse.json({ projects });
}

export async function POST(req: NextRequest) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { title, description, language } = await req.json();

  if (!title) {
    return NextResponse.json({ error: 'Title is required' }, { status: 400 });
  }

  const db = getDb();
  const result = db.prepare(
    'INSERT INTO projects (user_id, title, description, language) VALUES (?, ?, ?, ?)'
  ).run(user.id, title, description || '', language || 'python');

  const project = db.prepare('SELECT * FROM projects WHERE id = ?').get(result.lastInsertRowid);

  return NextResponse.json({ project }, { status: 201 });
}
