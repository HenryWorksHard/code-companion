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
  if (!code) return '';
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

// Extract code from response
function extractCode(text: string): { message: string; code: string | null; shouldDeploy: boolean; projectName?: string } {
  const configMatch = text.match(/```DEPLOY_CONFIG\s*([\s\S]*?)```/);
  
  if (!configMatch) {
    return { message: text, code: null, shouldDeploy: false };
  }

  try {
    const config = JSON.parse(configMatch[1]);
    const message = text.replace(/```DEPLOY_CONFIG[\s\S]*?```/, '').trim();
    
    return {
      message: message || "Building your app now! 🚀",
      code: config.code,
      shouldDeploy: config.shouldDeploy,
      projectName: config.projectName,
    };
  } catch (e) {
    return { message: text, code: null, shouldDeploy: false };
  }
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
  const [liveCode, setLiveCode] = useState<string>('');
  const [isGeneratingCode, setIsGeneratingCode] = useState(false);
  const [previewFullscreen, setPreviewFullscreen] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const live2dRef = useRef<Live2DWidgetRef>(null);
  const previewIframeRef = useRef<HTMLIFrameElement>(null);
  const codeDisplayRef = useRef<HTMLPreElement>(null);

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

  // Auto-scroll code display
  useEffect(() => {
    if (codeDisplayRef.current) {
      codeDisplayRef.current.scrollTop = codeDisplayRef.current.scrollHeight;
    }
  }, [liveCode]);

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
    setLiveCode('');
    setIsGeneratingCode(false);

    try {
      // Use streaming
      const response = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          messages: [...messages, userMessage].map((m) => ({
            role: m.role,
            content: m.content,
          })),
          stream: true,
        }),
      });

      if (!response.ok) throw new Error('Failed to fetch');

      const reader = response.body?.getReader();
      if (!reader) throw new Error('No reader');

      const decoder = new TextDecoder();
      let fullContent = '';
      let currentCode = '';
      let inCodeBlock = false;

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        const chunk = decoder.decode(value);
        const lines = chunk.split('\n');

        for (const line of lines) {
          if (line.startsWith('data: ')) {
            const data = line.slice(6);
            if (data === '[DONE]') continue;

            try {
              const parsed = JSON.parse(data);
              if (parsed.content) {
                fullContent += parsed.content;

                // Check if we're entering a code block
                if (fullContent.includes('```DEPLOY_CONFIG') && !inCodeBlock) {
                  inCodeBlock = true;
                  setIsGeneratingCode(true);
                }

                // Extract code being written
                if (inCodeBlock) {
                  const codeMatch = fullContent.match(/```DEPLOY_CONFIG\s*\{[\s\S]*?"code"\s*:\s*"([\s\S]*?)(?:"|$)/);
                  if (codeMatch) {
                    // Unescape the code string
                    try {
                      currentCode = codeMatch[1]
                        .replace(/\\n/g, '\n')
                        .replace(/\\"/g, '"')
                        .replace(/\\t/g, '\t')
                        .replace(/\\\\/g, '\\');
                      setLiveCode(currentCode);
                      // Update preview as code comes in
                      if (currentCode.includes('<')) {
                        setPreviewCode(currentCode);
                      }
                    } catch (e) {
                      // Partial code, keep going
                    }
                  }
                }
              }
            } catch (e) {
              // Parse error, continue
            }
          }
        }
      }

      // Process final response
      const result = extractCode(fullContent);
      
      const assistantMessage: Message = {
        role: 'assistant',
        content: result.message,
        timestamp: new Date(),
      };

      setMessages((prev) => [...prev, assistantMessage]);
      speakMessage(result.message);

      if (result.code) {
        setPreviewCode(result.code);
        setLiveCode(result.code);
      }

      setIsGeneratingCode(false);

      // Handle deployment
      if (result.shouldDeploy && result.code) {
        setDeployment({ status: 'deploying' });
        
        const deployResponse = await fetch('/api/deploy', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            code: result.code,
            projectName: result.projectName || 'my-app',
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
      setIsGeneratingCode(false);
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

      {/* Header */}
      <header className="px-4 py-3 relative z-10">
        <div className="max-w-[1800px] mx-auto">
          <div className="card px-4 py-3 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-pink-400 to-purple-400 flex items-center justify-center shadow-lg pulse-glow">
                <Wand2 className="w-5 h-5 text-white" />
              </div>
              <div>
                <h1 className="font-bold text-lg">
                  <span className="bg-gradient-to-r from-pink-500 to-purple-500 bg-clip-text text-transparent">
                    Code Companion
                  </span>
                </h1>
                <p className="text-xs text-purple-400 flex items-center gap-1">
                  <Star className="w-3 h-3 fill-current" />
                  Build amazing things with AI magic~
                </p>
              </div>
            </div>
            <div className="flex items-center gap-2">
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
                {voiceEnabled ? <Volume2 className="w-4 h-4" /> : <VolumeX className="w-4 h-4" />}
              </button>
              
              {deployment.status === 'complete' && deployment.url && (
                <a
                  href={deployment.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="btn-kawaii flex items-center gap-2 text-sm px-3 py-2"
                >
                  <Rocket className="w-4 h-4" />
                  View Live ✨
                </a>
              )}
            </div>
          </div>
        </div>
      </header>

      {/* Main Content - Three Column Layout: Chat | Character + Code | Preview */}
      <div className="flex-1 flex relative z-10 px-4 gap-4 max-w-[1800px] mx-auto w-full">
        {/* Chat Area - Left */}
        <div className="w-[38%] flex flex-col min-w-0">
          <div className="flex-1 overflow-y-auto min-h-0 max-h-[calc(100vh-200px)]">
            <div className="py-4">
              <div className="space-y-3">
                {messages.map((message, index) => (
                  <div
                    key={index}
                    className={`flex gap-2 fade-in-up ${message.role === 'user' ? 'flex-row-reverse' : ''}`}
                    style={{ animationDelay: `${index * 0.1}s` }}
                  >
                    {/* Avatar */}
                    <div
                      className={`w-8 h-8 rounded-full flex items-center justify-center shrink-0 ${
                        message.role === 'assistant'
                          ? 'bg-gradient-to-br from-pink-300 to-purple-300'
                          : 'bg-gradient-to-br from-purple-400 to-pink-400'
                      }`}
                    >
                      <span className="text-sm">{message.role === 'assistant' ? '🌸' : '💜'}</span>
                    </div>
                    
                    {/* Message Bubble */}
                    <div className={`flex-1 min-w-0 ${message.role === 'user' ? 'text-right' : ''}`}>
                      <div
                        className={`inline-block max-w-[90%] px-4 py-2 text-sm leading-relaxed ${
                          message.role === 'assistant'
                            ? 'bubble-assistant text-left shadow-sm'
                            : 'bubble-user'
                        }`}
                      >
                        {formatMessage(message.content)}
                      </div>
                      <p className="text-[10px] text-purple-300 mt-1 px-1">
                        {message.timestamp.toLocaleTimeString([], {
                          hour: '2-digit',
                          minute: '2-digit',
                        })}
                      </p>
                    </div>
                  </div>
                ))}

                {/* Loading indicator */}
                {isLoading && !isGeneratingCode && (
                  <div className="flex gap-2 fade-in-up">
                    <div className="w-8 h-8 rounded-full bg-gradient-to-br from-pink-300 to-purple-300 flex items-center justify-center">
                      <span className="text-sm">🌸</span>
                    </div>
                    <div className="bubble-assistant px-4 py-3 shadow-sm">
                      <div className="flex items-center gap-2">
                        <div className="flex gap-1">
                          <div className="typing-dot" />
                          <div className="typing-dot" />
                          <div className="typing-dot" />
                        </div>
                        <span className="text-purple-400 ml-1 text-sm">Thinking...</span>
                      </div>
                    </div>
                  </div>
                )}

                {/* Coding indicator */}
                {isGeneratingCode && (
                  <div className="flex gap-2 fade-in-up">
                    <div className="w-8 h-8 rounded-full bg-gradient-to-br from-pink-300 to-purple-300 flex items-center justify-center">
                      <span className="text-sm">🌸</span>
                    </div>
                    <div className="bubble-assistant px-4 py-3 shadow-sm">
                      <div className="flex items-center gap-2">
                        <Loader2 className="w-3 h-3 animate-spin text-pink-500" />
                        <span className="text-purple-400 text-sm">Writing code...</span>
                        <Sparkles className="w-3 h-3 text-pink-400" />
                      </div>
                    </div>
                  </div>
                )}

                <div ref={messagesEndRef} />
              </div>
            </div>
          </div>

          {/* Input Area - Bottom of Chat */}
          <div className="pb-4">
            <form onSubmit={handleSubmit} className="relative">
              <div className="card p-2 flex gap-2 items-end">
                <textarea
                  value={input}
                  onChange={(e) => setInput(e.target.value)}
                  onKeyDown={handleKeyDown}
                  placeholder="Tell me what you want to build~ ✨"
                  className="flex-1 input-kawaii resize-none min-h-[44px] max-h-[120px] border-0 bg-transparent text-sm"
                  rows={1}
                  disabled={isLoading}
                  style={{ 
                    height: 'auto',
                    overflow: 'hidden'
                  }}
                  onInput={(e) => {
                    const target = e.target as HTMLTextAreaElement;
                    target.style.height = 'auto';
                    target.style.height = Math.min(target.scrollHeight, 120) + 'px';
                  }}
                />
                <button
                  type="submit"
                  disabled={!input.trim() || isLoading}
                  className="btn-kawaii p-2.5 rounded-xl flex items-center justify-center shrink-0"
                >
                  <Send className="w-4 h-4" />
                </button>
              </div>
            </form>
          </div>
        </div>

        {/* Character + Code Panel - Center */}
        <div className="w-[24%] relative flex items-center justify-center">
          {/* Code Panel Behind Character */}
          {(isGeneratingCode || liveCode) && (
            <div 
              className={`absolute inset-x-0 top-8 bottom-8 bg-gray-900/95 rounded-2xl border border-purple-500/30 shadow-2xl overflow-hidden transition-all duration-500 ${
                isGeneratingCode ? 'opacity-100' : 'opacity-70'
              }`}
              style={{
                boxShadow: isGeneratingCode ? '0 0 40px rgba(168, 85, 247, 0.3)' : 'none',
              }}
            >
              {/* Code Header */}
              <div className="px-3 py-2 bg-gray-800/80 border-b border-purple-500/20 flex items-center gap-2">
                <div className="flex gap-1.5">
                  <div className="w-2.5 h-2.5 rounded-full bg-red-400" />
                  <div className="w-2.5 h-2.5 rounded-full bg-yellow-400" />
                  <div className="w-2.5 h-2.5 rounded-full bg-green-400" />
                </div>
                <span className="text-[10px] text-purple-300 ml-2 flex items-center gap-1">
                  <Code className="w-3 h-3" />
                  index.html
                </span>
                {isGeneratingCode && (
                  <span className="ml-auto text-[10px] text-pink-400 flex items-center gap-1">
                    <span className="w-1.5 h-1.5 bg-pink-400 rounded-full animate-pulse" />
                    writing...
                  </span>
                )}
              </div>
              
              {/* Code Content */}
              <pre 
                ref={codeDisplayRef}
                className="p-3 text-[9px] leading-relaxed text-green-400 font-mono overflow-auto h-[calc(100%-36px)] scrollbar-thin scrollbar-thumb-purple-500/30"
              >
                <code>{liveCode || '// Starting code generation...'}</code>
              </pre>
            </div>
          )}
          
          {/* Character */}
          <Live2DWidget ref={live2dRef} fallback={<Live2DCompanion />} />
        </div>

        {/* Preview Panel - Right */}
        <div className="w-[38%] py-4 flex flex-col min-w-0">
          <div className="card flex-1 flex flex-col overflow-hidden">
            <div className="px-3 py-2 border-b border-pink-100 flex items-center justify-between bg-gradient-to-r from-pink-50 to-purple-50">
              <div className="flex items-center gap-2">
                <Eye className="w-4 h-4 text-purple-400" />
                <span className="text-sm font-medium text-purple-600">Live Preview</span>
                {isGeneratingCode && (
                  <span className="text-[10px] text-pink-400 flex items-center gap-1 ml-2">
                    <span className="w-1.5 h-1.5 bg-pink-400 rounded-full animate-pulse" />
                    updating...
                  </span>
                )}
              </div>
              <div className="flex items-center gap-1">
                {previewCode && (
                  <button
                    onClick={() => setPreviewFullscreen(true)}
                    className="p-1.5 hover:bg-white rounded-lg transition-colors"
                    title="Fullscreen"
                  >
                    <Maximize2 className="w-4 h-4 text-purple-400" />
                  </button>
                )}
              </div>
            </div>
            <div className="flex-1 bg-white relative">
              {previewCode ? (
                <iframe
                  ref={previewIframeRef}
                  className="w-full h-full border-0"
                  title="Code Preview"
                  sandbox="allow-scripts"
                />
              ) : (
                <div className="absolute inset-0 flex items-center justify-center text-purple-300">
                  <div className="text-center">
                    <Eye className="w-12 h-12 mx-auto mb-3 opacity-30" />
                    <p className="text-sm">Your preview will appear here~</p>
                    <p className="text-xs mt-1 opacity-70">Ask me to build something! ✨</p>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
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
                  onClick={() => setPreviewFullscreen(false)}
                  className="p-1.5 hover:bg-white rounded-lg transition-colors"
                  title="Close"
                >
                  <X className="w-4 h-4 text-purple-400" />
                </button>
              </div>
            </div>
            <div className="flex-1 bg-white">
              <iframe
                srcDoc={generatePreviewHtml(previewCode)}
                className="w-full h-full border-0"
                title="Code Preview Fullscreen"
                sandbox="allow-scripts"
              />
            </div>
          </div>
        </div>
      )}

      {/* Footer */}
      <div className="px-4 py-2 relative z-10">
        <p className="text-center text-[10px] text-purple-300 flex items-center justify-center gap-2">
          <Heart className="w-2.5 h-2.5 fill-pink-300 text-pink-300" />
          Made with love • Powered by AI
          <Heart className="w-2.5 h-2.5 fill-pink-300 text-pink-300" />
        </p>
      </div>
    </div>
  );
}
