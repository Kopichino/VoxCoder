import { NextRequest, NextResponse } from 'next/server';
import { getDb } from '@/lib/db';
import { getCurrentUser } from '@/lib/auth';

export async function GET() {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const db = getDb();

  const submissions = db.prepare(
    'SELECT * FROM submissions WHERE user_id = ? ORDER BY solved_at DESC'
  ).all(user.id);

  return NextResponse.json({ submissions });
}

export async function POST(req: NextRequest) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { project_id, topic, data_structure, difficulty, question_name } = await req.json();

  if (!topic) {
    return NextResponse.json({ error: 'Topic is required' }, { status: 400 });
  }

  const db = getDb();
  const result = db.prepare(
    'INSERT INTO submissions (user_id, project_id, question_name, topic, data_structure, difficulty) VALUES (?, ?, ?, ?, ?, ?)'
  ).run(user.id, project_id || null, question_name || '', topic, data_structure || 'None', difficulty || 'Medium');

  return NextResponse.json({
    submission: { id: result.lastInsertRowid },
  }, { status: 201 });
}
