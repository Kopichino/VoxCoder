import { NextRequest, NextResponse } from 'next/server';
import { getCurrentUser } from '@/lib/auth';

const GROQ_API_KEY = process.env.GROQ_API_KEY || '';
const GROQ_URL = 'https://api.groq.com/openai/v1/chat/completions';

const HINT_PROMPTS: Record<number, string> = {
  1: `You are a friendly coding mentor. The student is working on a coding problem and needs a GENTLE NUDGE in the right direction.

RULES (EXTREMELY STRICT):
- Give only a brief, encouraging hint about what category of approach to consider
- Do NOT mention specific algorithm names yet
- Do NOT provide any code, pseudocode, or code-like syntax
- Do NOT use variable names or function names
- Keep it to 2-3 sentences maximum
- Think of it as a warm-up hint

Example good hint: "Think about what happens when you compare each element with every other element. Is there a way to remember what you've already seen?"`,

  2: `You are a coding mentor giving a MID-LEVEL HINT. The student already got the gentle nudge and needs more direction.

RULES (EXTREMELY STRICT):
- Name the algorithm or technique that would work well here
- Explain the KEY INSIGHT that makes this approach work
- Do NOT provide any code, pseudocode, or code-like syntax whatsoever
- Do NOT write anything that looks like programming (no if/else, no loops written out, no variable assignments)
- Keep it to 3-5 sentences
- Focus on the "aha moment"

Example good hint: "This is a classic problem that can be solved using a Hash Map. The key insight is that for each number, you already know exactly what number you're looking for to complete the pair. So instead of searching for it, you can store numbers as you go."`,

  3: `You are a coding mentor giving a DETAILED WALKTHROUGH of the approach. The student needs the full logic explained step by step.

RULES (EXTREMELY STRICT):
- Walk through the algorithm step by step in plain English
- Explain the data structures needed and WHY
- You may use numbered steps
- Do NOT provide any code, pseudocode, or code-like syntax whatsoever
- Do NOT write anything resembling code (no variable assignments, no if/else syntax, no function calls)
- Do NOT use backticks or code blocks
- Think of explaining it like you would to a friend over coffee
- Keep it to 5-8 sentences

Example good hint: "Here's the full approach: Start by creating an empty dictionary. Walk through each number in the array one by one. For each number, calculate what its complement would be (target minus current number). Check if that complement already exists as a key in your dictionary. If it does, you've found your pair! If it doesn't, store the current number as a key with its index as the value. This way, you only need to go through the array once."`,
};

export async function POST(req: NextRequest) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { problem_title, problem_description, hint_level, user_code } = await req.json();

  if (!problem_title || !hint_level) {
    return NextResponse.json({ error: 'Missing problem_title or hint_level' }, { status: 400 });
  }

  const level = Math.min(Math.max(hint_level, 1), 3);
  const systemPrompt = HINT_PROMPTS[level];

  if (!GROQ_API_KEY) {
    // Fallback hints when no API key
    const fallbackHints: Record<number, string> = {
      1: `Think about the most straightforward approach first. What's the simplest way you could solve "${problem_title}"? Consider what data structure might help you organize the information.`,
      2: `For "${problem_title}", consider using a hash-based approach or sorting. The key insight is often about reducing redundant work — can you avoid checking the same thing twice?`,
      3: `To solve "${problem_title}" step by step: First, think about what information you need to track. Then, consider iterating through the input once while maintaining some state. Finally, determine your answer based on what you've accumulated. Think about edge cases like empty inputs or single elements.`,
    };
    return NextResponse.json({ hint: fallbackHints[level], level });
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
          { role: 'system', content: systemPrompt },
          {
            role: 'user',
            content: `Problem: ${problem_title}\n\nDescription: ${problem_description || 'Not provided'}\n\n${user_code ? `The student has written some code but is stuck. They need a hint, not a solution.` : 'The student hasn\'t started coding yet.'}`,
          },
        ],
        temperature: 0.7,
        max_tokens: 400,
      }),
    });

    const data = await res.json();
    const hint = data.choices?.[0]?.message?.content?.trim();

    if (!hint) {
      return NextResponse.json({ error: 'Failed to generate hint' }, { status: 500 });
    }

    return NextResponse.json({ hint, level });
  } catch (err) {
    console.error('Hint generation failed:', err);
    return NextResponse.json({ error: 'Hint generation failed' }, { status: 500 });
  }
}
