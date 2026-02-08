'use client';

import { useState, useRef, useEffect } from 'react';
import { Send, Sparkles, Rocket, Loader2 } from 'lucide-react';
import dynamic from 'next/dynamic';

// Dynamic import to avoid SSR issues with Live2D
const Live2DCompanion = dynamic(() => import('@/components/Live2DCompanion'), {
  ssr: false,
  loading: () => <div className="fixed bottom-0 right-0 w-[300px] h-[400px]" />,
});

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

// Matrix rain characters
const matrixChars = '01アイウエオカキクケコサシスセソタチツテトナニヌネノハヒフヘホマミムメモヤユヨラリルレロワヲン';

function MatrixRain() {
  const columns = 20;
  
  return (
    <div className="matrix-bg">
      {Array.from({ length: columns }).map((_, i) => (
        <div
          key={i}
          className="matrix-column"
          style={{
            left: `${(i / columns) * 100}%`,
            animationDuration: `${10 + Math.random() * 10}s`,
            animationDelay: `${Math.random() * 5}s`,
          }}
        >
          {Array.from({ length: 30 }).map((_, j) => (
            <div key={j}>{matrixChars[Math.floor(Math.random() * matrixChars.length)]}</div>
          ))}
        </div>
      ))}
    </div>
  );
}

export default function Home() {
  const [messages, setMessages] = useState<Message[]>([
    {
      role: 'assistant',
      content: ">> SYSTEM ONLINE <<\n\nHey there, coder! 💾 I'm your Y2K Code Companion.\n\nTell me what you want to build and I'll compile it into reality. Websites, apps, landing pages — just describe your vision!",
      timestamp: new Date(),
    },
  ]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [deployment, setDeployment] = useState<DeploymentStatus>({ status: 'idle' });
  const messagesEndRef = useRef<HTMLDivElement>(null);

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
          
          setMessages((prev) => [
            ...prev,
            {
              role: 'assistant',
              content: `>> DEPLOYMENT COMPLETE <<\n\n🚀 Your creation is LIVE!\n\n${deployData.url}\n\nClick the link to see it in action!`,
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
          content: ">> ERROR << System malfunction! Let's try that again — what would you like to build?",
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
    return content.split('\n').map((line, i) => {
      const isHeader = line.startsWith('>>');
      const isLink = line.startsWith('http');
      
      if (isHeader) {
        return <p key={i} className="text-cyan-400 font-bold neon-cyan mb-2">{line}</p>;
      }
      if (isLink) {
        return (
          <a
            key={i}
            href={line}
            target="_blank"
            rel="noopener noreferrer"
            className="text-magenta-400 hover:underline block mb-2"
            style={{ color: '#ff00ff', textShadow: '0 0 5px #ff00ff' }}
          >
            {line}
          </a>
        );
      }
      return <p key={i} className="mb-1">{line}</p>;
    });
  };

  return (
    <div className="min-h-screen bg-[#0a0a0f] text-white flex flex-col relative overflow-hidden">
      {/* Matrix Background */}
      <MatrixRain />
      
      {/* CRT Overlay */}
      <div className="crt-overlay" />
      
      {/* Live2D Companion */}
      <Live2DCompanion />

      {/* Header */}
      <header className="border-b border-cyan-500/30 px-6 py-4 relative z-10">
        <div className="max-w-4xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 bg-black border-2 border-cyan-400 rounded-lg flex items-center justify-center relative">
              <span className="text-2xl">💾</span>
              <div className="absolute inset-0 border border-cyan-400/50 rounded-lg animate-pulse" />
            </div>
            <div>
              <h1 className="font-bold text-xl tracking-wider">
                <span className="neon-cyan">CODE</span>
                <span className="text-white">_</span>
                <span className="neon-magenta" style={{ color: '#ff00ff' }}>COMPANION</span>
              </h1>
              <p className="text-xs text-cyan-400/70 font-mono">v2.0.0.0 // BUILD.DEPLOY.REPEAT</p>
            </div>
          </div>
          {deployment.status === 'complete' && deployment.url && (
            <a
              href={deployment.url}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-2 px-4 py-2 bg-black border border-lime-400 text-lime-400 rounded hover:bg-lime-400/10 transition-colors font-mono text-sm"
              style={{ textShadow: '0 0 5px #00ff00' }}
            >
              <Rocket className="w-4 h-4" />
              VIEW_LIVE
            </a>
          )}
        </div>
      </header>

      {/* Chat Area */}
      <main className="flex-1 overflow-y-auto relative z-10">
        <div className="max-w-4xl mx-auto px-6 py-8 pb-32">
          <div className="space-y-6">
            {messages.map((message, index) => (
              <div
                key={index}
                className={`flex gap-4 ${message.role === 'user' ? 'flex-row-reverse' : ''}`}
              >
                <div
                  className={`w-10 h-10 border-2 rounded flex items-center justify-center shrink-0 ${
                    message.role === 'assistant'
                      ? 'border-cyan-400 bg-cyan-400/10'
                      : 'border-magenta-400 bg-magenta-400/10'
                  }`}
                  style={{ borderColor: message.role === 'user' ? '#ff00ff' : '#00ffff' }}
                >
                  <span className="text-lg">{message.role === 'assistant' ? '🤖' : '👤'}</span>
                </div>
                <div
                  className={`flex-1 ${message.role === 'user' ? 'text-right' : ''}`}
                >
                  <div
                    className={`inline-block max-w-[85%] px-4 py-3 rounded-lg font-mono text-sm ${
                      message.role === 'assistant'
                        ? 'bg-black/80 border border-cyan-500/30 text-left'
                        : 'bg-black/80 border border-magenta-500/30'
                    }`}
                    style={{ borderColor: message.role === 'user' ? 'rgba(255,0,255,0.3)' : 'rgba(0,255,255,0.3)' }}
                  >
                    <div className="leading-relaxed">
                      {formatMessage(message.content)}
                    </div>
                  </div>
                  <p className="text-xs text-cyan-400/50 mt-1 font-mono">
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
                <div className="w-10 h-10 border-2 border-cyan-400 bg-cyan-400/10 rounded flex items-center justify-center">
                  <span className="text-lg">🤖</span>
                </div>
                <div className="bg-black/80 border border-cyan-500/30 px-4 py-3 rounded-lg">
                  <div className="flex items-center gap-2 text-cyan-400 font-mono text-sm">
                    <Loader2 className="w-4 h-4 animate-spin" />
                    <span>
                      {deployment.status === 'deploying'
                        ? '>> DEPLOYING...'
                        : '>> COMPILING...'}
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
      <footer className="fixed bottom-0 left-0 right-0 border-t border-cyan-500/30 bg-[#0a0a0f]/95 backdrop-blur px-6 py-4 z-20">
        <div className="max-w-4xl mx-auto">
          <form onSubmit={handleSubmit} className="flex gap-3">
            <div className="flex-1 relative">
              <div className="absolute left-3 top-1/2 -translate-y-1/2 text-cyan-400 font-mono text-sm">
                {'>'}
              </div>
              <textarea
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={handleKeyDown}
                placeholder="describe your creation..."
                className="w-full bg-black border border-cyan-500/30 rounded-lg pl-8 pr-12 py-3 text-sm font-mono resize-none focus:outline-none focus:border-cyan-400 placeholder:text-cyan-400/30 text-cyan-100"
                rows={1}
                disabled={isLoading}
              />
              <button
                type="submit"
                disabled={!input.trim() || isLoading}
                className="absolute right-2 top-1/2 -translate-y-1/2 p-2 bg-cyan-400 text-black rounded hover:bg-cyan-300 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <Send className="w-4 h-4" />
              </button>
            </div>
          </form>
          <p className="text-xs text-cyan-400/50 text-center mt-3 font-mono">
            <Sparkles className="w-3 h-3 inline mr-1" />
            POWERED BY AI // DEPLOYED TO VERCEL // ©2000 FUTURE_TECH
          </p>
        </div>
      </footer>
    </div>
  );
}
