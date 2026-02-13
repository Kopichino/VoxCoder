import { NextRequest, NextResponse } from 'next/server';
import { getDb } from '@/lib/db';
import { getCurrentUser } from '@/lib/auth';

interface RouteParams {
  params: Promise<{ id: string }>;
}

export async function GET(_req: NextRequest, { params }: RouteParams) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { id } = await params;
  const db = getDb();
  const project = db.prepare(
    'SELECT * FROM projects WHERE id = ? AND user_id = ?'
  ).get(id, user.id);

  if (!project) {
    return NextResponse.json({ error: 'Project not found' }, { status: 404 });
  }

  return NextResponse.json({ project });
}

export async function PUT(req: NextRequest, { params }: RouteParams) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { id } = await params;
  const { title, code, description } = await req.json();
  const db = getDb();

  // Verify ownership
  const existing = db.prepare('SELECT id FROM projects WHERE id = ? AND user_id = ?').get(id, user.id);
  if (!existing) {
    return NextResponse.json({ error: 'Project not found' }, { status: 404 });
  }

  const updates: string[] = [];
  const values: (string | number)[] = [];

  if (title !== undefined) { updates.push('title = ?'); values.push(title); }
  if (code !== undefined) { updates.push('code = ?'); values.push(code); }
  if (description !== undefined) { updates.push('description = ?'); values.push(description); }
  updates.push('updated_at = CURRENT_TIMESTAMP');

  values.push(Number(id));

  db.prepare(`UPDATE projects SET ${updates.join(', ')} WHERE id = ?`).run(...values);

  const project = db.prepare('SELECT * FROM projects WHERE id = ?').get(id);
  return NextResponse.json({ project });
}

export async function DELETE(_req: NextRequest, { params }: RouteParams) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { id } = await params;
  const db = getDb();

  const existing = db.prepare('SELECT id FROM projects WHERE id = ? AND user_id = ?').get(id, user.id);
  if (!existing) {
    return NextResponse.json({ error: 'Project not found' }, { status: 404 });
  }

  db.prepare('DELETE FROM projects WHERE id = ?').run(id);
  return NextResponse.json({ success: true });
}
