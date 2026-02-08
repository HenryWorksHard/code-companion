'use client';

import { useEffect, useState, useRef } from 'react';

interface Live2DWidgetProps {
  fallback?: React.ReactNode;
}

export default function Live2DWidget({ fallback }: Live2DWidgetProps) {
  const [status, setStatus] = useState<'loading' | 'loaded' | 'error'>('loading');
  const iframeRef = useRef<HTMLIFrameElement>(null);

  useEffect(() => {
    const handleMessage = (e: MessageEvent) => {
      if (e.data?.type === 'live2d-loaded') {
        setStatus('loaded');
      } else if (e.data?.type === 'live2d-error') {
        console.error('Live2D error from iframe:', e.data.error);
        setStatus('error');
      }
    };

    window.addEventListener('message', handleMessage);

    // Forward mouse events to iframe for eye tracking
    const handleMouseMove = (e: MouseEvent) => {
      if (iframeRef.current?.contentWindow) {
        iframeRef.current.contentWindow.postMessage({
          type: 'mousemove',
          x: e.clientX,
          y: e.clientY,
        }, '*');
      }
    };
    
    document.addEventListener('mousemove', handleMouseMove);

    // Timeout fallback if Live2D doesn't load
    const timeout = setTimeout(() => {
      if (status === 'loading') {
        setStatus('error');
      }
    }, 20000);

    return () => {
      window.removeEventListener('message', handleMessage);
      document.removeEventListener('mousemove', handleMouseMove);
      clearTimeout(timeout);
    };
  }, [status]);

  // If error after timeout, show SVG fallback
  if (status === 'error' && fallback) {
    return <>{fallback}</>;
  }

  return (
    <div
      className="fixed bottom-0 right-0 z-50 pointer-events-none transition-opacity duration-500"
      style={{ 
        width: 400, 
        height: 750,
        opacity: status === 'loaded' ? 1 : 0.7,
      }}
    >
      {/* Subtle glow effect behind character */}
      <div 
        className="absolute inset-0 pointer-events-none"
        style={{
          background: 'radial-gradient(ellipse at center bottom, rgba(255,182,203,0.15) 0%, transparent 70%)',
          filter: 'blur(20px)',
        }}
      />
      
      <iframe
        ref={iframeRef}
        src="/live2d/viewer.html"
        className="w-full h-full border-0 pointer-events-auto relative z-10"
        style={{
          background: 'transparent',
        }}
        allow="autoplay"
        title="Live2D Character"
      />
      
      {/* Click hint - shows briefly then fades */}
      {status === 'loaded' && (
        <div className="absolute bottom-2 left-1/2 -translate-x-1/2 text-xs text-pink-400 opacity-0 animate-pulse pointer-events-none"
          style={{
            animation: 'fade-hint 5s ease-in-out forwards',
          }}
        >
          Click me! 💖
        </div>
      )}
      
      <style jsx>{`
        @keyframes fade-hint {
          0% { opacity: 0; }
          20% { opacity: 0.8; }
          80% { opacity: 0.8; }
          100% { opacity: 0; }
        }
      `}</style>
    </div>
  );
}
