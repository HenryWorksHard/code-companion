'use client';

import { useState, useRef, useEffect } from 'react';
import { Send, Sparkles, Rocket, Loader2, Heart, Star, Wand2, Volume2, VolumeX, Code, Eye, X, Maximize2, Minimize2 } from 'lucide-react';
import dynamic from 'next/dynamic';
import type { Live2DWidgetRef } from '@/components/Live2DWidget';

// Dynamic import to avoid SSR issues with Live2D
const Live2DCompanion = dynamic(() => import('@/components/Live2DCompanion'), {
  ssr: false,
  loading: () => <div className="fixed bottom-0 right-0 w-[350px] h-[500px]" />,
});

const Live2DWidget = dynamic(() => import('@/components/Live2DWidget'), {
  ssr: false,
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

// Floating shapes for background
const shapes = ['✨', '💖', '⭐', '🌸', '💫', '🎀', '✿', '♡'];

function KawaiiBackground() {
  const [particles, setParticles] = useState<Array<{id: number; shape: string; left: number; delay: number; duration: number}>>([]);

  useEffect(() => {
    const newParticles = Array.from({ length: 20 }, (_, i) => ({
      id: i,
      shape: shapes[Math.floor(Math.random() * shapes.length)],
      left: Math.random() * 100,
      delay: Math.random() * 10,
      duration: 15 + Math.random() * 10,
    }));
    setParticles(newParticles);
  }, []);

  return (
    <div className="kawaii-bg">
      {particles.map((p) => (
        <div
          key={p.id}
          className="floating-shape"
          style={{
            left: `${p.left}%`,
            animationDelay: `${p.delay}s`,
            animationDuration: `${p.duration}s`,
          }}
        >
          {p.shape}
        </div>
      ))}
    </div>
  );
}

// Clean text for speech (remove emojis and special chars)
function cleanTextForSpeech(text: string): string {
  return text
    .replace(/[\u{1F300}-\u{1F9FF}]|[\u{2600}-\u{26FF}]|[\u{2700}-\u{27BF}]|[\u{1F600}-\u{1F64F}]|[\u{1F680}-\u{1F6FF}]/gu, '')
    .replace(/[~*_`#]/g, '')
    .replace(/\n+/g, '. ')
    .trim();
}

// Generate preview HTML from code
function generatePreviewHtml(code: string): string {
  // If it's already full HTML, return as is
  if (code.includes('<!DOCTYPE') || code.includes('<html')) {
    return code;
  }
  
  // Wrap in basic HTML structure
  return `<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <script src="https://cdn.tailwindcss.com"></script>
  <style>
    body { font-family: system-ui, sans-serif; }
  </style>
</head>
<body>
  ${code}
</body>
</html>`;
}

export default function Home() {
  const [messages, setMessages] = useState<Message[]>([
    {
      role: 'assistant',
      content: "Hi there! ✨ I'm Kui-chan, your cute coding companion~\n\nTell me what you'd like to build and I'll help make it real! Websites, apps, landing pages — just describe your dream project! 💖",
      timestamp: new Date(),
    },
  ]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [deployment, setDeployment] = useState<DeploymentStatus>({ status: 'idle' });
  const [voiceEnabled, setVoiceEnabled] = useState(true);
  const [previewCode, setPreviewCode] = useState<string>('');
  const [showPreview, setShowPreview] = useState(false);
  const [previewFullscreen, setPreviewFullscreen] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const live2dRef = useRef<Live2DWidgetRef>(null);
  const previewIframeRef = useRef<HTMLIFrameElement>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  // Update preview iframe when code changes
  useEffect(() => {
    if (previewCode && previewIframeRef.current) {
      const iframe = previewIframeRef.current;
      const doc = iframe.contentDocument || iframe.contentWindow?.document;
      if (doc) {
        doc.open();
        doc.write(generatePreviewHtml(previewCode));
        doc.close();
      }
    }
  }, [previewCode]);

  // Speak the assistant's message
  const speakMessage = (text: string) => {
    if (voiceEnabled && live2dRef.current) {
      const cleanText = cleanTextForSpeech(text);
      if (cleanText) {
        live2dRef.current.speak(cleanText);
      }
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!input.trim() || isLoading) return;

    // Stop any ongoing speech
    if (live2dRef.current) {
      live2dRef.current.stopSpeaking();
    }

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
      
      // Speak the response
      speakMessage(data.message);

      // If there's code, show preview
      if (data.code) {
        setPreviewCode(data.code);
        setShowPreview(true);
      }

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
          
          const deployMessage = `Yay! Your creation is live! 🎉✨\n\n${deployData.url}\n\nClick the link to see your beautiful new site~ 💖`;
          
          setMessages((prev) => [
            ...prev,
            {
              role: 'assistant',
              content: deployMessage,
              timestamp: new Date(),
            },
          ]);
          
          // Speak the deploy success message
          speakMessage(deployMessage);
        }
      }
    } catch (error) {
      console.error('Error:', error);
      const errorMessage = "Oopsie! Something went wrong... 😢 Let's try that again! What would you like to build? 💪";
      setMessages((prev) => [
        ...prev,
        {
          role: 'assistant',
          content: errorMessage,
          timestamp: new Date(),
        },
      ]);
      speakMessage(errorMessage);
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

  const toggleVoice = () => {
    if (voiceEnabled && live2dRef.current) {
      live2dRef.current.stopSpeaking();
    }
    setVoiceEnabled(!voiceEnabled);
  };

  const formatMessage = (content: string) => {
    return content.split('\n').map((line, i) => {
      const isLink = line.startsWith('http');
      
      if (isLink) {
        return (
          <a
            key={i}
            href={line}
            target="_blank"
            rel="noopener noreferrer"
            className="text-pink-500 hover:text-pink-600 underline decoration-2 decoration-pink-300 underline-offset-2 transition-colors block my-2"
          >
            {line} 🔗
          </a>
        );
      }
      return line ? <p key={i} className="mb-1">{line}</p> : <br key={i} />;
    });
  };

  return (
    <div className="min-h-screen flex flex-col relative overflow-hidden">
      {/* Kawaii Background */}
      <KawaiiBackground />
      
      {/* Live2D Widget */}
      <Live2DWidget ref={live2dRef} fallback={<Live2DCompanion />} />

      {/* Header */}
      <header className="px-6 py-4 relative z-10">
        <div className={`mx-auto ${showPreview && !previewFullscreen ? 'max-w-6xl' : 'max-w-3xl'}`}>
          <div className="card px-6 py-4 flex items-center justify-between">
            <div className="flex items-center gap-4">
              <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-pink-400 to-purple-400 flex items-center justify-center shadow-lg pulse-glow">
                <Wand2 className="w-7 h-7 text-white" />
              </div>
              <div>
                <h1 className="font-bold text-2xl">
                  <span className="bg-gradient-to-r from-pink-500 to-purple-500 bg-clip-text text-transparent">
                    Code Companion
                  </span>
                </h1>
                <p className="text-sm text-purple-400 flex items-center gap-1">
                  <Star className="w-3 h-3 fill-current" />
                  Build amazing things with AI magic~
                </p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              {/* Preview Toggle */}
              {previewCode && (
                <button
                  onClick={() => setShowPreview(!showPreview)}
                  className={`p-2 rounded-xl transition-all flex items-center gap-1 ${
                    showPreview 
                      ? 'bg-purple-100 text-purple-500 hover:bg-purple-200' 
                      : 'bg-gray-100 text-gray-400 hover:bg-gray-200'
                  }`}
                  title={showPreview ? 'Hide preview' : 'Show preview'}
                >
                  <Eye className="w-5 h-5" />
                  <span className="text-xs hidden sm:inline">Preview</span>
                </button>
              )}
              
              {/* Voice Toggle */}
              <button
                onClick={toggleVoice}
                className={`p-2 rounded-xl transition-all ${
                  voiceEnabled 
                    ? 'bg-pink-100 text-pink-500 hover:bg-pink-200' 
                    : 'bg-gray-100 text-gray-400 hover:bg-gray-200'
                }`}
                title={voiceEnabled ? 'Voice on' : 'Voice off'}
              >
                {voiceEnabled ? <Volume2 className="w-5 h-5" /> : <VolumeX className="w-5 h-5" />}
              </button>
              
              {deployment.status === 'complete' && deployment.url && (
                <a
                  href={deployment.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="btn-kawaii flex items-center gap-2 text-sm"
                >
                  <Rocket className="w-4 h-4" />
                  View Live ✨
                </a>
              )}
            </div>
          </div>
        </div>
      </header>

      {/* Main Content - Split View */}
      <div className={`flex-1 flex relative z-10 ${showPreview && !previewFullscreen ? 'gap-4 px-6' : ''}`}>
        {/* Chat Area */}
        <main className={`flex-1 overflow-y-auto px-6 ${showPreview && !previewFullscreen ? 'max-w-[50%] px-0' : ''}`}>
          <div className={`mx-auto py-6 pb-40 ${showPreview && !previewFullscreen ? 'max-w-none' : 'max-w-3xl'}`}>
            <div className="space-y-4">
              {messages.map((message, index) => (
                <div
                  key={index}
                  className={`flex gap-3 fade-in-up ${message.role === 'user' ? 'flex-row-reverse' : ''}`}
                  style={{ animationDelay: `${index * 0.1}s` }}
                >
                  {/* Avatar */}
                  <div
                    className={`w-10 h-10 rounded-full flex items-center justify-center shrink-0 ${
                      message.role === 'assistant'
                        ? 'bg-gradient-to-br from-pink-300 to-purple-300'
                        : 'bg-gradient-to-br from-purple-400 to-pink-400'
                    }`}
                  >
                    <span className="text-lg">{message.role === 'assistant' ? '🌸' : '💜'}</span>
                  </div>
                  
                  {/* Message Bubble */}
                  <div className={`flex-1 ${message.role === 'user' ? 'text-right' : ''}`}>
                    <div
                      className={`inline-block max-w-[85%] px-5 py-3 text-[15px] leading-relaxed ${
                        message.role === 'assistant'
                          ? 'bubble-assistant text-left shadow-sm'
                          : 'bubble-user'
                      }`}
                    >
                      {formatMessage(message.content)}
                    </div>
                    <p className="text-xs text-purple-300 mt-1.5 px-1">
                      {message.timestamp.toLocaleTimeString([], {
                        hour: '2-digit',
                        minute: '2-digit',
                      })}
                    </p>
                  </div>
                </div>
              ))}

              {/* Loading indicator */}
              {isLoading && (
                <div className="flex gap-3 fade-in-up">
                  <div className="w-10 h-10 rounded-full bg-gradient-to-br from-pink-300 to-purple-300 flex items-center justify-center">
                    <span className="text-lg">🌸</span>
                  </div>
                  <div className="bubble-assistant px-5 py-4 shadow-sm">
                    <div className="flex items-center gap-2">
                      {deployment.status === 'deploying' ? (
                        <>
                          <Loader2 className="w-4 h-4 animate-spin text-pink-500" />
                          <span className="text-purple-400">Deploying your creation~</span>
                          <Sparkles className="w-4 h-4 text-pink-400" />
                        </>
                      ) : (
                        <>
                          <div className="flex gap-1">
                            <div className="typing-dot" />
                            <div className="typing-dot" />
                            <div className="typing-dot" />
                          </div>
                          <span className="text-purple-400 ml-2">Thinking...</span>
                        </>
                      )}
                    </div>
                  </div>
                </div>
              )}

              <div ref={messagesEndRef} />
            </div>
          </div>
        </main>

        {/* Preview Panel */}
        {showPreview && previewCode && !previewFullscreen && (
          <div className="w-[50%] py-6 pr-6">
            <div className="card h-full flex flex-col overflow-hidden">
              <div className="px-4 py-3 border-b border-pink-100 flex items-center justify-between bg-gradient-to-r from-pink-50 to-purple-50">
                <div className="flex items-center gap-2">
                  <Code className="w-4 h-4 text-purple-400" />
                  <span className="text-sm font-medium text-purple-600">Live Preview</span>
                </div>
                <div className="flex items-center gap-1">
                  <button
                    onClick={() => setPreviewFullscreen(true)}
                    className="p-1.5 hover:bg-white rounded-lg transition-colors"
                    title="Fullscreen"
                  >
                    <Maximize2 className="w-4 h-4 text-purple-400" />
                  </button>
                  <button
                    onClick={() => setShowPreview(false)}
                    className="p-1.5 hover:bg-white rounded-lg transition-colors"
                    title="Close preview"
                  >
                    <X className="w-4 h-4 text-purple-400" />
                  </button>
                </div>
              </div>
              <div className="flex-1 bg-white">
                <iframe
                  ref={previewIframeRef}
                  className="w-full h-full border-0"
                  title="Code Preview"
                  sandbox="allow-scripts"
                />
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Fullscreen Preview Modal */}
      {previewFullscreen && previewCode && (
        <div className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-8">
          <div className="bg-white rounded-2xl w-full h-full max-w-6xl flex flex-col overflow-hidden shadow-2xl">
            <div className="px-4 py-3 border-b border-pink-100 flex items-center justify-between bg-gradient-to-r from-pink-50 to-purple-50">
              <div className="flex items-center gap-2">
                <Code className="w-4 h-4 text-purple-400" />
                <span className="text-sm font-medium text-purple-600">Live Preview</span>
              </div>
              <div className="flex items-center gap-1">
                <button
                  onClick={() => setPreviewFullscreen(false)}
                  className="p-1.5 hover:bg-white rounded-lg transition-colors"
                  title="Exit fullscreen"
                >
                  <Minimize2 className="w-4 h-4 text-purple-400" />
                </button>
                <button
                  onClick={() => {
                    setPreviewFullscreen(false);
                    setShowPreview(false);
                  }}
                  className="p-1.5 hover:bg-white rounded-lg transition-colors"
                  title="Close preview"
                >
                  <X className="w-4 h-4 text-purple-400" />
                </button>
              </div>
            </div>
            <div className="flex-1 bg-white">
              <iframe
                ref={previewFullscreen ? previewIframeRef : undefined}
                srcDoc={generatePreviewHtml(previewCode)}
                className="w-full h-full border-0"
                title="Code Preview Fullscreen"
                sandbox="allow-scripts"
              />
            </div>
          </div>
        </div>
      )}

      {/* Input Area */}
      <footer className="fixed bottom-0 left-0 right-0 bg-gradient-to-t from-white via-white to-transparent px-6 py-6 z-20">
        <div className={`mx-auto ${showPreview && !previewFullscreen ? 'max-w-6xl' : 'max-w-3xl'}`}>
          <form onSubmit={handleSubmit} className="relative">
            <div className="card p-2 flex gap-2 items-end">
              <textarea
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={handleKeyDown}
                placeholder="Tell me what you want to build~ ✨"
                className="flex-1 input-kawaii resize-none min-h-[52px] max-h-[150px] border-0 bg-transparent"
                rows={1}
                disabled={isLoading}
                style={{ 
                  height: 'auto',
                  overflow: 'hidden'
                }}
                onInput={(e) => {
                  const target = e.target as HTMLTextAreaElement;
                  target.style.height = 'auto';
                  target.style.height = Math.min(target.scrollHeight, 150) + 'px';
                }}
              />
              <button
                type="submit"
                disabled={!input.trim() || isLoading}
                className="btn-kawaii p-3 rounded-xl flex items-center justify-center shrink-0"
              >
                <Send className="w-5 h-5" />
              </button>
            </div>
          </form>
          <p className="text-center text-xs text-purple-300 mt-3 flex items-center justify-center gap-2">
            <Heart className="w-3 h-3 fill-pink-300 text-pink-300" />
            Made with love • Powered by AI
            <Heart className="w-3 h-3 fill-pink-300 text-pink-300" />
          </p>
        </div>
      </footer>
    </div>
  );
}
