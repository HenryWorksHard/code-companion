import { NextResponse } from 'next/server';
import OpenAI from 'openai';

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

const SYSTEM_PROMPT = `You are Code Companion, a friendly AI assistant that helps users build and deploy web applications. Your personality is enthusiastic, encouraging, and helpful.

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
  "code": {
    "page.tsx": "// the full page.tsx code here"
  }
}
\`\`\`

The code you generate should be:
- A single page.tsx file (React component with 'use client' at the top)
- Use Tailwind CSS for styling (use classes like bg-zinc-900, text-white, etc.)
- Be modern, clean, and responsive
- Work standalone without external dependencies
- Include proper TypeScript typing
- Be visually appealing with good spacing and layout

IMPORTANT FOR CODE GENERATION:
- Always start with 'use client';
- Export default function ComponentName()
- Use only Tailwind CSS classes
- Make it responsive (use md: lg: prefixes)
- Use good color schemes (zinc, slate for dark themes; or appropriate brand colors)
- Include hover states and transitions
- Add proper padding and margins

If the user hasn't given enough detail yet, just respond conversationally without the DEPLOY_CONFIG block.

Example flow:
User: "I want a landing page for my coffee shop"
You: "A coffee shop landing page! ☕ What's the name of your shop, and what vibe are you going for - cozy and rustic, modern and sleek, or something else?"
User: "It's called Bean There, and I want it modern and minimal"
You: "Love it! Last question - what's the main thing you want visitors to do? Book a table, see the menu, find your location, or something else?"
User: "Show the menu and location"
You: "Perfect! Building your modern, minimal landing page for Bean There now... [followed by DEPLOY_CONFIG block]"`;

interface ChatMessage {
  role: 'user' | 'assistant';
  content: string;
}

function extractDeployConfig(text: string): { message: string; shouldDeploy: boolean; code?: Record<string, string>; projectName?: string } {
  const configMatch = text.match(/```DEPLOY_CONFIG\s*([\s\S]*?)```/);
  
  if (!configMatch) {
    return { message: text, shouldDeploy: false };
  }

  try {
    const config = JSON.parse(configMatch[1]);
    const message = text.replace(/```DEPLOY_CONFIG[\s\S]*?```/, '').trim();
    
    return {
      message: message || "Building your app now! 🚀",
      shouldDeploy: config.shouldDeploy,
      code: config.code,
      projectName: config.projectName,
    };
  } catch (e) {
    console.error('Failed to parse deploy config:', e);
    return { message: text, shouldDeploy: false };
  }
}

export async function POST(req: Request) {
  try {
    const { messages } = await req.json() as { messages: ChatMessage[] };

    if (!process.env.OPENAI_API_KEY) {
      return NextResponse.json(
        { error: 'API key not configured' },
        { status: 500 }
      );
    }

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

    const result = extractDeployConfig(content);

    return NextResponse.json(result);
  } catch (error) {
    console.error('Chat error:', error);
    return NextResponse.json(
      { error: 'Failed to process request' },
      { status: 500 }
    );
  }
}
