'use client';

import { useEffect, useState } from 'react';

interface Live2DWidgetProps {
  fallback?: React.ReactNode;
}

export default function Live2DWidget({ fallback }: Live2DWidgetProps) {
  const [status, setStatus] = useState<'loading' | 'loaded' | 'error'>('loading');

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

    // Timeout fallback
    const timeout = setTimeout(() => {
      if (status === 'loading') {
        setStatus('error');
      }
    }, 15000);

    return () => {
      window.removeEventListener('message', handleMessage);
      clearTimeout(timeout);
    };
  }, [status]);

  if (status === 'error' && fallback) {
    return <>{fallback}</>;
  }

  return (
    <div
      className="fixed bottom-0 right-4 z-50 pointer-events-auto"
      style={{ width: 350, height: 450 }}
    >
      {status === 'loading' && (
        <div className="absolute inset-0 flex items-center justify-center">
          <div className="w-8 h-8 border-2 border-cyan-400 border-t-transparent rounded-full animate-spin" />
        </div>
      )}
      <iframe
        src="/live2d/viewer.html"
        className={`w-full h-full border-0 ${status === 'loaded' ? 'opacity-100' : 'opacity-0'}`}
        style={{
          background: 'transparent',
          pointerEvents: status === 'loaded' ? 'auto' : 'none',
          transition: 'opacity 0.5s',
        }}
        allow="autoplay"
      />
    </div>
  );
}
