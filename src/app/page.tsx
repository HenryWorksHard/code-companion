'use client';

import { useState, useRef, useEffect } from 'react';
import { Send, Bot, User, Sparkles, Rocket, Code, Loader2 } from 'lucide-react';
import AnimeCompanion from '@/components/AnimeCompanion';

interface Message {
  role: 'user' | 'assistant';
  content: string;
  timestamp: Date;
}

interface DeploymentStatus {
  status: 'idle' | 'generating' | 'deploying' | 'complete' | 'error';
  url?: string;
  error?: string;
}

export default function Home() {
  const [messages, setMessages] = useState<Message[]>([
    {
      role: 'assistant',
      content: "Hey there! 👋 I'm your Code Companion. Tell me about the app or website you want to build, and I'll create it for you!\n\nJust describe what you're imagining - it can be a landing page, a simple tool, a portfolio, anything! I'll ask a few questions to make sure I get it right, then build and deploy it for you.",
      timestamp: new Date(),
    },
  ]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [deployment, setDeployment] = useState<DeploymentStatus>({ status: 'idle' });
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!input.trim() || isLoading) return;

    const userMessage: Message = {
      role: 'user',
      content: input.trim(),
      timestamp: new Date(),
    };

    setMessages((prev) => [...prev, userMessage]);
    setInput('');
    setIsLoading(true);

    try {
      const response = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          messages: [...messages, userMessage].map((m) => ({
            role: m.role,
            content: m.content,
          })),
        }),
      });

      const data = await response.json();

      if (data.error) {
        throw new Error(data.error);
      }

      const assistantMessage: Message = {
        role: 'assistant',
        content: data.message,
        timestamp: new Date(),
      };

      setMessages((prev) => [...prev, assistantMessage]);

      // Check if we should deploy
      if (data.shouldDeploy && data.code) {
        setDeployment({ status: 'deploying' });
        
        const deployResponse = await fetch('/api/deploy', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            code: data.code,
            projectName: data.projectName || 'my-app',
          }),
        });

        const deployData = await deployResponse.json();

        if (deployData.error) {
          setDeployment({ status: 'error', error: deployData.error });
        } else {
          setDeployment({ status: 'complete', url: deployData.url });
          
          // Add deployment success message
          setMessages((prev) => [
            ...prev,
            {
              role: 'assistant',
              content: `🚀 **Your app is live!**\n\n[${deployData.url}](${deployData.url})\n\nClick the link above to see your creation! Let me know if you'd like any changes.`,
              timestamp: new Date(),
            },
          ]);
        }
      }
    } catch (error) {
      console.error('Error:', error);
      setMessages((prev) => [
        ...prev,
        {
          role: 'assistant',
          content: "Oops! Something went wrong. Let's try that again - what would you like to build?",
          timestamp: new Date(),
        },
      ]);
    } finally {
      setIsLoading(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSubmit(e);
    }
  };

  const formatMessage = (content: string) => {
    // Simple markdown-like formatting
    return content
      .split('\n')
      .map((line, i) => {
        // Bold
        line = line.replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>');
        // Links
        line = line.replace(/\[(.*?)\]\((.*?)\)/g, '<a href="$2" target="_blank" class="text-yellow-400 hover:underline">$1</a>');
        return <p key={i} className="mb-2" dangerouslySetInnerHTML={{ __html: line }} />;
      });
  };

  return (
    <div className="min-h-screen bg-zinc-950 text-white flex flex-col">
      {/* Anime Companion */}
      <AnimeCompanion />
      
      {/* Header */}
      <header className="border-b border-zinc-800 px-6 py-4">
        <div className="max-w-4xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-gradient-to-br from-yellow-400 to-orange-500 rounded-xl flex items-center justify-center">
              <Code className="w-5 h-5 text-zinc-900" />
            </div>
            <div>
              <h1 className="font-bold text-lg">Code Companion</h1>
              <p className="text-xs text-zinc-500">Build apps with AI</p>
            </div>
          </div>
          {deployment.status === 'complete' && deployment.url && (
            <a
              href={deployment.url}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-2 px-4 py-2 bg-green-500/20 text-green-400 rounded-lg hover:bg-green-500/30 transition-colors"
            >
              <Rocket className="w-4 h-4" />
              View Live App
            </a>
          )}
        </div>
      </header>

      {/* Chat Area */}
      <main className="flex-1 overflow-y-auto">
        <div className="max-w-4xl mx-auto px-6 py-8">
          <div className="space-y-6">
            {messages.map((message, index) => (
              <div
                key={index}
                className={`flex gap-4 ${message.role === 'user' ? 'flex-row-reverse' : ''}`}
              >
                <div
                  className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 ${
                    message.role === 'assistant'
                      ? 'bg-gradient-to-br from-yellow-400 to-orange-500'
                      : 'bg-zinc-800'
                  }`}
                >
                  {message.role === 'assistant' ? (
                    <Bot className="w-5 h-5 text-zinc-900" />
                  ) : (
                    <User className="w-5 h-5 text-zinc-400" />
                  )}
                </div>
                <div
                  className={`flex-1 ${
                    message.role === 'user' ? 'text-right' : ''
                  }`}
                >
                  <div
                    className={`inline-block max-w-[85%] px-4 py-3 rounded-2xl ${
                      message.role === 'assistant'
                        ? 'bg-zinc-900 text-left'
                        : 'bg-yellow-500 text-zinc-900'
                    }`}
                  >
                    <div className="text-sm leading-relaxed">
                      {formatMessage(message.content)}
                    </div>
                  </div>
                  <p className="text-xs text-zinc-600 mt-1">
                    {message.timestamp.toLocaleTimeString([], {
                      hour: '2-digit',
                      minute: '2-digit',
                    })}
                  </p>
                </div>
              </div>
            ))}

            {isLoading && (
              <div className="flex gap-4">
                <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-yellow-400 to-orange-500 flex items-center justify-center">
                  <Bot className="w-5 h-5 text-zinc-900" />
                </div>
                <div className="bg-zinc-900 px-4 py-3 rounded-2xl">
                  <div className="flex items-center gap-2 text-zinc-400">
                    <Loader2 className="w-4 h-4 animate-spin" />
                    <span className="text-sm">
                      {deployment.status === 'deploying'
                        ? 'Deploying your app...'
                        : 'Thinking...'}
                    </span>
                  </div>
                </div>
              </div>
            )}

            <div ref={messagesEndRef} />
          </div>
        </div>
      </main>

      {/* Input Area */}
      <footer className="border-t border-zinc-800 px-6 py-4">
        <div className="max-w-4xl mx-auto">
          <form onSubmit={handleSubmit} className="flex gap-3">
            <div className="flex-1 relative">
              <textarea
                ref={inputRef}
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={handleKeyDown}
                placeholder="Describe the app you want to build..."
                className="w-full bg-zinc-900 border border-zinc-800 rounded-xl px-4 py-3 pr-12 text-sm resize-none focus:outline-none focus:border-yellow-500/50 placeholder:text-zinc-600"
                rows={1}
                disabled={isLoading}
              />
              <button
                type="submit"
                disabled={!input.trim() || isLoading}
                className="absolute right-2 top-1/2 -translate-y-1/2 p-2 bg-yellow-500 text-zinc-900 rounded-lg hover:bg-yellow-400 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <Send className="w-4 h-4" />
              </button>
            </div>
          </form>
          <p className="text-xs text-zinc-600 text-center mt-3">
            <Sparkles className="w-3 h-3 inline mr-1" />
            Powered by Claude AI • Apps deploy to Vercel
          </p>
        </div>
      </footer>
    </div>
  );
}
