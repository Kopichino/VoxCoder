import { NextResponse } from 'next/server';
import { getDb } from '@/lib/db';
import { getCurrentUser } from '@/lib/auth';

interface TopicRow {
  topic: string;
  count: number;
}

interface DsRow {
  data_structure: string;
  count: number;
}

interface DailyRow {
  date: string;
  count: number;
}

interface DiffRow {
  difficulty: string;
  count: number;
}

export async function GET() {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const db = getDb();

  // Total solved
  const totalRow = db.prepare(
    'SELECT COUNT(*) as count FROM submissions WHERE user_id = ?'
  ).get(user.id) as { count: number };

  // By topic
  const byTopic = db.prepare(
    'SELECT topic, COUNT(*) as count FROM submissions WHERE user_id = ? GROUP BY topic ORDER BY count DESC'
  ).all(user.id) as TopicRow[];

  // By data structure
  const byDataStructure = db.prepare(
    'SELECT data_structure, COUNT(*) as count FROM submissions WHERE user_id = ? GROUP BY data_structure ORDER BY count DESC'
  ).all(user.id) as DsRow[];

  // By difficulty
  const byDifficulty = db.prepare(
    'SELECT difficulty, COUNT(*) as count FROM submissions WHERE user_id = ? GROUP BY difficulty'
  ).all(user.id) as DiffRow[];

  // Activity over last 30 days
  const dailyActivity = db.prepare(`
    SELECT DATE(solved_at) as date, COUNT(*) as count 
    FROM submissions 
    WHERE user_id = ? AND solved_at >= DATE('now', '-30 days')
    GROUP BY DATE(solved_at)
    ORDER BY date
  `).all(user.id) as DailyRow[];

  // Current streak
  let streak = 0;
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  for (let i = 0; i < 365; i++) {
    const checkDate = new Date(today);
    checkDate.setDate(checkDate.getDate() - i);
    const dateStr = checkDate.toISOString().split('T')[0];
    const found = dailyActivity.find(d => d.date === dateStr);
    if (found) {
      streak++;
    } else if (i > 0) {
      break;
    }
  }

  // Total projects
  const projectCount = db.prepare(
    'SELECT COUNT(*) as count FROM projects WHERE user_id = ?'
  ).get(user.id) as { count: number };

  return NextResponse.json({
    totalSolved: totalRow.count,
    totalProjects: projectCount.count,
    streak,
    byTopic,
    byDataStructure,
    byDifficulty,
    dailyActivity,
  });
}
