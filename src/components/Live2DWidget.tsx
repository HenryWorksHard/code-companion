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

    // Forward mouse events to iframe
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

    // Timeout fallback
    const timeout = setTimeout(() => {
      if (status === 'loading') {
        setStatus('error');
      }
    }, 15000);

    return () => {
      window.removeEventListener('message', handleMessage);
      document.removeEventListener('mousemove', handleMouseMove);
      clearTimeout(timeout);
    };
  }, [status]);

  // If error, show fallback (SVG companion)
  if (status === 'error' && fallback) {
    return <>{fallback}</>;
  }

  return (
    <div
      className="fixed bottom-0 right-0 z-50 pointer-events-none"
      style={{ width: 350, height: 500 }}
    >
      <iframe
        ref={iframeRef}
        src="/live2d/viewer.html"
        className="w-full h-full border-0 pointer-events-auto"
        style={{
          background: 'transparent',
        }}
        allow="autoplay"
      />
    </div>
  );
}
