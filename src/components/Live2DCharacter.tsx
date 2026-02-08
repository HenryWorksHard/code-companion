'use client';

import { useEffect, useRef, useState } from 'react';

interface Live2DCharacterProps {
  modelPath: string;
  width?: number;
  height?: number;
  position?: { x: number; y: number };
  scale?: number;
  fallback?: React.ReactNode;
}

export default function Live2DCharacter({
  modelPath,
  width = 300,
  height = 400,
  position = { x: 0, y: 0 },
  scale = 0.25,
  fallback,
}: Live2DCharacterProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const appRef = useRef<any>(null);
  const modelRef = useRef<any>(null);
  const [isLoaded, setIsLoaded] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [useFallback, setUseFallback] = useState(false);

  useEffect(() => {
    if (!canvasRef.current || appRef.current) return;

    let mounted = true;

    const initLive2D = async () => {
      try {
        // Dynamically import to avoid SSR issues
        const PIXI = await import('pixi.js');
        const { Live2DModel } = await import('pixi-live2d-display/cubism4');

        // Register PIXI globally (required by pixi-live2d-display)
        (window as any).PIXI = PIXI;

        if (!mounted || !canvasRef.current) return;

        // Create PIXI Application (v7 style)
        const app = new PIXI.Application({
          view: canvasRef.current as HTMLCanvasElement,
          width,
          height,
          backgroundAlpha: 0,
          resolution: window.devicePixelRatio || 1,
          autoDensity: true,
        });

        if (!mounted) {
          app.destroy();
          return;
        }

        appRef.current = app;

        // Load the Live2D model
        const model = await Live2DModel.from(modelPath, {
          autoInteract: false,
        });

        if (!mounted) {
          app.destroy();
          return;
        }

        modelRef.current = model;

        // Position and scale the model
        model.anchor.set(0.5, 0.5);
        model.position.set(width / 2, height / 2);
        model.scale.set(scale);

        // Add to stage
        app.stage.addChild(model as any);

        // Enable mouse tracking
        const onMouseMove = (e: MouseEvent) => {
          if (!containerRef.current || !model.internalModel) return;
          const rect = containerRef.current.getBoundingClientRect();
          model.focus(e.clientX - rect.left, e.clientY - rect.top);
        };

        window.addEventListener('mousemove', onMouseMove);
        (model as any)._mouseCleanup = () => {
          window.removeEventListener('mousemove', onMouseMove);
        };

        setIsLoaded(true);
      } catch (err) {
        console.error('Failed to load Live2D model:', err);
        if (mounted) {
          setError(err instanceof Error ? err.message : 'Failed to load model');
          setUseFallback(true);
        }
      }
    };

    initLive2D();

    return () => {
      mounted = false;
      if (modelRef.current?._mouseCleanup) {
        modelRef.current._mouseCleanup();
      }
      if (appRef.current) {
        try {
          appRef.current.destroy(true, { children: true });
        } catch (e) {
          // Ignore cleanup errors
        }
        appRef.current = null;
      }
    };
  }, [modelPath, width, height, scale]);

  const handleClick = () => {
    if (modelRef.current) {
      try {
        modelRef.current.expression();
      } catch (e) {
        // Ignore expression errors
      }
    }
  };

  // Show fallback if there's an error
  if (useFallback && fallback) {
    return <>{fallback}</>;
  }

  return (
    <div
      ref={containerRef}
      className="fixed z-50 pointer-events-auto cursor-pointer"
      style={{
        bottom: position.y,
        right: position.x,
        width,
        height,
      }}
      onClick={handleClick}
    >
      {error && !fallback && (
        <div className="absolute inset-0 flex items-center justify-center text-red-400 text-xs bg-black/50 rounded-lg p-2 text-center">
          Live2D error:<br/>{error}
        </div>
      )}
      {!isLoaded && !error && (
        <div className="absolute inset-0 flex items-center justify-center">
          <div className="w-8 h-8 border-2 border-cyan-400 border-t-transparent rounded-full animate-spin" />
        </div>
      )}
      <canvas
        ref={canvasRef}
        className={`${isLoaded ? 'opacity-100' : 'opacity-0'} transition-opacity duration-500`}
        style={{ 
          width, 
          height,
          filter: 'drop-shadow(0 0 20px rgba(255, 0, 255, 0.3))',
        }}
      />
    </div>
  );
}
