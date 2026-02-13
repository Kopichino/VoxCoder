import { NextRequest, NextResponse } from 'next/server';
import { getDb } from '@/lib/db';
import { getCurrentUser } from '@/lib/auth';

const GROQ_API_KEY = process.env.GROQ_API_KEY || '';
const GROQ_URL = 'https://api.groq.com/openai/v1/chat/completions';

interface AnalysisResult {
  question_name: string;
  topic: string;
  data_structure: string;
  difficulty: string;
}

async function analyzeCodeWithAI(code: string): Promise<AnalysisResult | null> {
  if (!GROQ_API_KEY) {
    // Fallback: basic heuristic analysis
    return heuristicAnalysis(code);
  }

  try {
    const res = await fetch(GROQ_URL, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${GROQ_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'llama-3.1-8b-instant',
        messages: [
          {
            role: 'system',
            content: `You are a code analyzer. Given Python code, identify:
1. question_name: A short descriptive name for the problem being solved (e.g. "Two Sum", "Prime Numbers", "Fibonacci Sequence", "Binary Search", "Reverse Linked List"). If it's just practice code or a simple script, give it a descriptive name.
2. topic: The main algorithmic topic. Pick ONE from: Arrays, Strings, Linked Lists, Trees, Graphs, Dynamic Programming, Sorting, Searching, Recursion, Math, Greedy, Backtracking, Hashing, Stack, Queue, Matrix, Bit Manipulation, Other
3. data_structure: The primary data structure used. Pick ONE from: Array, HashMap, Stack, Queue, LinkedList, Tree, Graph, Heap, Set, String, Matrix, None
4. difficulty: Pick ONE from: Easy, Medium, Hard

Respond with ONLY valid JSON in this exact format, no other text:
{"question_name": "...", "topic": "...", "data_structure": "...", "difficulty": "..."}`,
          },
          {
            role: 'user',
            content: `Analyze this Python code:\n\n${code}`,
          },
        ],
        temperature: 0.1,
        max_tokens: 200,
      }),
    });

    const data = await res.json();
    const content = data.choices?.[0]?.message?.content?.trim();
    if (!content) return heuristicAnalysis(code);

    // Parse JSON - handle potential markdown wrapping
    let jsonStr = content;
    if (jsonStr.startsWith('```')) {
      jsonStr = jsonStr.replace(/```json?\n?/g, '').replace(/```/g, '').trim();
    }

    const result = JSON.parse(jsonStr) as AnalysisResult;
    return result;
  } catch (err) {
    console.error('AI analysis failed, using heuristics:', err);
    return heuristicAnalysis(code);
  }
}

function heuristicAnalysis(code: string): AnalysisResult {
  const lower = code.toLowerCase();

  // Detect topic
  let topic = 'Other';
  let questionName = 'Code Practice';
  let dataStructure = 'None';
  let difficulty = 'Medium';

  if (lower.includes('sort') || lower.includes('bubble') || lower.includes('merge') || lower.includes('quick')) {
    topic = 'Sorting'; questionName = 'Sorting Algorithm'; dataStructure = 'Array';
  } else if (lower.includes('binary search') || lower.includes('bisect')) {
    topic = 'Searching'; questionName = 'Binary Search'; dataStructure = 'Array';
  } else if (lower.includes('fibonacci') || lower.includes('fib(')) {
    topic = 'Dynamic Programming'; questionName = 'Fibonacci Sequence'; dataStructure = 'Array';
  } else if (lower.includes('prime') || lower.includes('sieve')) {
    topic = 'Math'; questionName = 'Prime Numbers'; dataStructure = 'Array';
  } else if (lower.includes('factorial')) {
    topic = 'Recursion'; questionName = 'Factorial'; dataStructure = 'None';
  } else if (lower.includes('linked') || lower.includes('listnode') || lower.includes('node.next')) {
    topic = 'Linked Lists'; questionName = 'Linked List Operations'; dataStructure = 'LinkedList';
  } else if (lower.includes('tree') || lower.includes('treenode') || lower.includes('inorder') || lower.includes('preorder')) {
    topic = 'Trees'; questionName = 'Tree Traversal'; dataStructure = 'Tree';
  } else if (lower.includes('graph') || lower.includes('bfs') || lower.includes('dfs') || lower.includes('adjacency')) {
    topic = 'Graphs'; questionName = 'Graph Traversal'; dataStructure = 'Graph';
  } else if (lower.includes('stack') || lower.includes('lifo')) {
    topic = 'Stack'; questionName = 'Stack Operations'; dataStructure = 'Stack';
  } else if (lower.includes('queue') || lower.includes('fifo') || lower.includes('deque')) {
    topic = 'Queue'; questionName = 'Queue Operations'; dataStructure = 'Queue';
  } else if (lower.includes('dict') || lower.includes('hashmap') || lower.includes('{}')) {
    topic = 'Hashing'; questionName = 'Hash Map Problem'; dataStructure = 'HashMap';
  } else if (lower.includes('matrix') || lower.includes('grid')) {
    topic = 'Matrix'; questionName = 'Matrix Operations'; dataStructure = 'Matrix';
  } else if (lower.includes('string') || lower.includes('palindrome') || lower.includes('substring') || lower.includes('anagram')) {
    topic = 'Strings'; questionName = 'String Manipulation'; dataStructure = 'String';
  } else if (lower.includes('list') || lower.includes('array') || lower.includes('[]')) {
    topic = 'Arrays'; questionName = 'Array Problem'; dataStructure = 'Array';
  } else if (lower.includes('def ') && lower.includes('return')) {
    topic = 'Recursion'; questionName = 'Function Practice';
  }

  // Detect difficulty based on complexity
  const lines = code.split('\n').filter(l => l.trim() && !l.trim().startsWith('#'));
  const nestedLoops = (code.match(/for .+ in .+:\s*\n\s+for /g) || []).length;
  if (lines.length > 50 || nestedLoops > 1) difficulty = 'Hard';
  else if (lines.length > 20 || nestedLoops === 1) difficulty = 'Medium';
  else difficulty = 'Easy';

  return { question_name: questionName, topic, data_structure: dataStructure, difficulty };
}

export async function POST(req: NextRequest) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { code, project_id } = await req.json();

  if (!code || code.trim().length < 10 || code.trim() === '# Start coding here...') {
    return NextResponse.json({ error: 'Code too short to analyze' }, { status: 400 });
  }

  const analysis = await analyzeCodeWithAI(code);
  if (!analysis) {
    return NextResponse.json({ error: 'Analysis failed' }, { status: 500 });
  }

  const db = getDb();

  // Check if we already logged this project recently (avoid duplicates on rapid saves)
  if (project_id) {
    const recent = db.prepare(
      `SELECT id FROM submissions WHERE user_id = ? AND project_id = ? AND solved_at > datetime('now', '-5 minutes')`
    ).get(user.id, project_id) as { id: number } | undefined;

    if (recent) {
      // Update existing recent submission instead of creating new one
      db.prepare(
        'UPDATE submissions SET question_name = ?, topic = ?, data_structure = ?, difficulty = ? WHERE id = ?'
      ).run(analysis.question_name, analysis.topic, analysis.data_structure, analysis.difficulty, recent.id);

      return NextResponse.json({ analysis, action: 'updated' });
    }
  }

  // Insert new submission
  db.prepare(
    'INSERT INTO submissions (user_id, project_id, question_name, topic, data_structure, difficulty) VALUES (?, ?, ?, ?, ?, ?)'
  ).run(user.id, project_id || null, analysis.question_name, analysis.topic, analysis.data_structure, analysis.difficulty);

  return NextResponse.json({ analysis, action: 'created' });
}
