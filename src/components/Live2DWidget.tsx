'use client';

import { useEffect, useState, useRef, useImperativeHandle, forwardRef } from 'react';

interface Live2DWidgetProps {
  fallback?: React.ReactNode;
}

export interface Live2DWidgetRef {
  speak: (text: string) => void;
  stopSpeaking: () => void;
}

const Live2DWidget = forwardRef<Live2DWidgetRef, Live2DWidgetProps>(({ fallback }, ref) => {
  const [status, setStatus] = useState<'loading' | 'loaded' | 'error'>('loading');
  const [isSpeaking, setIsSpeaking] = useState(false);
  const iframeRef = useRef<HTMLIFrameElement>(null);

  // Expose speak methods to parent
  useImperativeHandle(ref, () => ({
    speak: (text: string) => {
      if (iframeRef.current?.contentWindow) {
        iframeRef.current.contentWindow.postMessage({
          type: 'speak',
          text: text,
        }, '*');
      }
    },
    stopSpeaking: () => {
      if (iframeRef.current?.contentWindow) {
        iframeRef.current.contentWindow.postMessage({
          type: 'stop-speaking',
        }, '*');
      }
    },
  }));

  useEffect(() => {
    const handleMessage = (e: MessageEvent) => {
      if (e.data?.type === 'live2d-loaded') {
        setStatus('loaded');
      } else if (e.data?.type === 'live2d-error') {
        console.error('Live2D error from iframe:', e.data.error);
        setStatus('error');
      } else if (e.data?.type === 'speech-start') {
        setIsSpeaking(true);
      } else if (e.data?.type === 'speech-end' || e.data?.type === 'speech-error') {
        setIsSpeaking(false);
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
      className="absolute bottom-0 left-1/2 -translate-x-1/2 z-50 pointer-events-none transition-opacity duration-500"
      style={{ 
        width: 350,
        height: 650,
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
      
      {/* Speaking indicator */}
      {isSpeaking && (
        <div className="absolute bottom-4 left-1/2 -translate-x-1/2 px-3 py-1 bg-pink-100 rounded-full text-xs text-pink-500 pointer-events-none flex items-center gap-2 z-20">
          <span className="w-2 h-2 bg-pink-400 rounded-full animate-pulse" />
          Speaking...
        </div>
      )}
    </div>
  );
});

Live2DWidget.displayName = 'Live2DWidget';

export default Live2DWidget;
