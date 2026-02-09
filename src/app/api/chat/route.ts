import { NextResponse } from 'next/server';
import OpenAI from 'openai';

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

const SYSTEM_PROMPT = `You are Kui-chan, Code Companion's cute coding assistant. You help users build and deploy web applications with an enthusiastic, encouraging personality.

Your job is to:
1. Understand what the user wants to build
2. Ask 2-3 clarifying questions to get the details right (colors, features, content)
3. Generate the code when you have enough information

IMPORTANT RULES:
- Be conversational and friendly, use emojis sparingly
- Ask questions one at a time, not all at once
- Keep responses concise (2-3 sentences max for questions)
- When the user gives enough detail, generate the app

When you're ready to generate code, your response MUST include a special JSON block at the end:

\`\`\`DEPLOY_CONFIG
{
  "shouldDeploy": true,
  "projectName": "descriptive-name",
  "code": "// the full HTML code here as a string"
}
\`\`\`

The code you generate should be:
- Complete HTML with embedded Tailwind CSS (via CDN script tag)
- Modern, clean, and responsive
- Work standalone without external dependencies
- Be visually appealing with good spacing and layout

IMPORTANT FOR CODE GENERATION:
- Use <!DOCTYPE html> and include <script src="https://cdn.tailwindcss.com"></script>
- Make it responsive (use md: lg: prefixes)
- Use good color schemes
- Include hover states and transitions
- Add proper padding and margins

If the user hasn't given enough detail yet, just respond conversationally without the DEPLOY_CONFIG block.`;

interface ChatMessage {
  role: 'user' | 'assistant';
  content: string;
}

export async function POST(req: Request) {
  try {
    const { messages, stream: shouldStream } = await req.json() as { messages: ChatMessage[]; stream?: boolean };

    if (!process.env.OPENAI_API_KEY) {
      return NextResponse.json(
        { error: 'API key not configured' },
        { status: 500 }
      );
    }

    // Streaming response
    if (shouldStream) {
      const response = await openai.chat.completions.create({
        model: 'gpt-4o',
        max_tokens: 8192,
        stream: true,
        messages: [
          { role: 'system', content: SYSTEM_PROMPT },
          ...messages.map((m) => ({
            role: m.role as 'user' | 'assistant',
            content: m.content,
          })),
        ],
      });

      const encoder = new TextEncoder();
      const stream = new ReadableStream({
        async start(controller) {
          for await (const chunk of response) {
            const content = chunk.choices[0]?.delta?.content || '';
            if (content) {
              controller.enqueue(encoder.encode(`data: ${JSON.stringify({ content })}\n\n`));
            }
          }
          controller.enqueue(encoder.encode('data: [DONE]\n\n'));
          controller.close();
        },
      });

      return new Response(stream, {
        headers: {
          'Content-Type': 'text/event-stream',
          'Cache-Control': 'no-cache',
          'Connection': 'keep-alive',
        },
      });
    }

    // Non-streaming response (fallback)
    const response = await openai.chat.completions.create({
      model: 'gpt-4o',
      max_tokens: 8192,
      messages: [
        { role: 'system', content: SYSTEM_PROMPT },
        ...messages.map((m) => ({
          role: m.role as 'user' | 'assistant',
          content: m.content,
        })),
      ],
    });

    const content = response.choices[0]?.message?.content;
    if (!content) {
      return NextResponse.json(
        { error: 'No response from AI' },
        { status: 500 }
      );
    }

    // Extract deploy config
    const configMatch = content.match(/```DEPLOY_CONFIG\s*([\s\S]*?)```/);
    
    if (!configMatch) {
      return NextResponse.json({ message: content, shouldDeploy: false });
    }

    try {
      const config = JSON.parse(configMatch[1]);
      const message = content.replace(/```DEPLOY_CONFIG[\s\S]*?```/, '').trim();
      
      return NextResponse.json({
        message: message || "Building your app now! 🚀",
        shouldDeploy: config.shouldDeploy,
        code: config.code,
        projectName: config.projectName,
      });
    } catch (e) {
      console.error('Failed to parse deploy config:', e);
      return NextResponse.json({ message: content, shouldDeploy: false });
    }
  } catch (error) {
    console.error('Chat error:', error);
    return NextResponse.json(
      { error: 'Failed to process request' },
      { status: 500 }
    );
  }
}
