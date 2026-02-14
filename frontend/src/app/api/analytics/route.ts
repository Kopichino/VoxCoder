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

interface XpRow {
  total_xp: number;
  level: number;
  current_streak: number;
  longest_streak: number;
  last_active_date: string;
}

// ─── XP Rules ──────────────────────────────────────────
const XP_PER_DIFFICULTY: Record<string, number> = {
  Easy: 10,
  Medium: 25,
  Hard: 50,
};
const STREAK_BONUS = 5;

function getLevelForXP(xp: number): number {
  // Level thresholds: 0, 50, 150, 300, 500, 750, 1050, 1400, 1800, 2250, ...
  // Formula: level n requires n*(n+1)*25/2 cumulative XP
  let level = 1;
  let threshold = 50;
  while (xp >= threshold) {
    level++;
    threshold += level * 25;
  }
  return level;
}

function getXPForLevel(level: number): { current: number; next: number } {
  let prev = 0;
  let threshold = 50;
  for (let l = 1; l < level; l++) {
    prev = threshold;
    threshold += (l + 1) * 25;
  }
  return { current: prev, next: threshold };
}

const LEVEL_BADGES: Record<number, string> = {
  1: '🌱 Seedling',
  2: '🌿 Sprout',
  3: '🪴 Sapling',
  4: '🌲 Tree',
  5: '⭐ Rising Star',
  6: '🌟 Star',
  7: '💫 Supernova',
  8: '🔥 Blazing',
  9: '🏆 Champion',
  10: '👑 Legend',
};

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

  // ─── Gamification: XP & Level ──────────────────────────
  // Ensure user_xp row exists
  const existingXp = db.prepare('SELECT * FROM user_xp WHERE user_id = ?').get(user.id) as XpRow | undefined;
  
  if (!existingXp) {
    db.prepare('INSERT INTO user_xp (user_id, total_xp, level, current_streak, longest_streak, last_active_date) VALUES (?, 0, 1, 0, 0, ?)').run(user.id, '');
  }

  // Recalculate XP from submissions + practice
  let totalXP = 0;
  const submissions = db.prepare('SELECT difficulty FROM submissions WHERE user_id = ?').all(user.id) as DiffRow[];
  for (const sub of submissions) {
    totalXP += XP_PER_DIFFICULTY[sub.difficulty] || 10;
  }
  // Add streak bonus
  totalXP += streak * STREAK_BONUS;

  const level = getLevelForXP(totalXP);
  const xpRange = getXPForLevel(level);
  const longestStreak = Math.max(streak, existingXp?.longest_streak || 0);

  // Update user_xp
  db.prepare(
    'UPDATE user_xp SET total_xp = ?, level = ?, current_streak = ?, longest_streak = ?, last_active_date = ? WHERE user_id = ?'
  ).run(totalXP, level, streak, longestStreak, today.toISOString().split('T')[0], user.id);

  const badge = LEVEL_BADGES[Math.min(level, 10)] || '👑 Legend';

  return NextResponse.json({
    totalSolved: totalRow.count,
    totalProjects: projectCount.count,
    streak,
    byTopic,
    byDataStructure,
    byDifficulty,
    dailyActivity,
    // Gamification data
    gamification: {
      xp: totalXP,
      level,
      badge,
      streak,
      longestStreak,
      xpForCurrentLevel: xpRange.current,
      xpForNextLevel: xpRange.next,
      xpProgress: totalXP - xpRange.current,
      xpNeeded: xpRange.next - xpRange.current,
    },
  });
}
