import { NextRequest, NextResponse } from 'next/server';
import { getCurrentUser } from '@/lib/auth';

const GROQ_API_KEY = process.env.GROQ_API_KEY || '';
const GROQ_URL = 'https://api.groq.com/openai/v1/chat/completions';

export async function POST(req: NextRequest) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { code, context } = await req.json();

  if (!code) {
    return NextResponse.json({ error: 'No code provided' }, { status: 400 });
  }

  if (!GROQ_API_KEY) {
    return NextResponse.json({
      explanation: `This code appears to be performing some operations. Without AI analysis, I can tell you it has ${code.split('\n').length} lines. For detailed explanations, please configure the GROQ_API_KEY.`,
    });
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
            content: `You are a friendly coding tutor. Explain the following code in simple, clear English.

Rules:
- Use plain language, like explaining to a smart friend who is learning to code
- Break it down line by line or block by block
- Explain WHAT it does, WHY it does it, and any patterns or techniques used
- Mention time/space complexity if relevant
- Use bullet points for clarity
- Do NOT rewrite or improve the code — just explain it
- Keep it concise but thorough (aim for 4-8 bullet points)`,
          },
          {
            role: 'user',
            content: context
              ? `Here is the selected code:\n\`\`\`\n${code}\n\`\`\`\n\nIt appears in this broader context:\n\`\`\`\n${context}\n\`\`\``
              : `Explain this code:\n\`\`\`\n${code}\n\`\`\``,
          },
        ],
        temperature: 0.5,
        max_tokens: 600,
      }),
    });

    const data = await res.json();
    const explanation = data.choices?.[0]?.message?.content?.trim();

    if (!explanation) {
      return NextResponse.json({ error: 'Failed to generate explanation' }, { status: 500 });
    }

    return NextResponse.json({ explanation });
  } catch (err) {
    console.error('Explanation failed:', err);
    return NextResponse.json({ error: 'Failed to generate explanation' }, { status: 500 });
  }
}
