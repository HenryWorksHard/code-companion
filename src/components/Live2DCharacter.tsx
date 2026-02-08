'use client';

import { useEffect, useRef, useState } from 'react';
import * as PIXI from 'pixi.js';
import { Live2DModel } from 'pixi-live2d-display';

// Register the Live2D model with PIXI
if (typeof window !== 'undefined') {
  (window as any).PIXI = PIXI;
}

interface Live2DCharacterProps {
  modelPath: string; // Path to .model.json or .model3.json
  width?: number;
  height?: number;
  position?: { x: number; y: number };
  scale?: number;
}

export default function Live2DCharacter({
  modelPath,
  width = 300,
  height = 400,
  position = { x: 0, y: 0 },
  scale = 0.25,
}: Live2DCharacterProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const appRef = useRef<PIXI.Application | null>(null);
  const modelRef = useRef<any>(null);
  const [isLoaded, setIsLoaded] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!canvasRef.current || appRef.current) return;

    const initLive2D = async () => {
      try {
        // Create PIXI Application
        const app = new PIXI.Application({
          view: canvasRef.current!,
          width,
          height,
          backgroundAlpha: 0,
          resolution: window.devicePixelRatio || 1,
          autoDensity: true,
        });
        appRef.current = app;

        // Load the Live2D model
        const model = await Live2DModel.from(modelPath, {
          autoInteract: false, // We'll handle interaction ourselves
        });
        modelRef.current = model;

        // Position and scale the model
        model.anchor.set(0.5, 0.5);
        model.position.set(width / 2, height / 2);
        model.scale.set(scale);

        // Add to stage (cast to any for pixi version compatibility)
        app.stage.addChild(model as any);

        // Enable mouse tracking
        setupMouseTracking(model);

        setIsLoaded(true);
      } catch (err) {
        console.error('Failed to load Live2D model:', err);
        setError(err instanceof Error ? err.message : 'Failed to load model');
      }
    };

    initLive2D();

    return () => {
      if (appRef.current) {
        appRef.current.destroy(true, { children: true });
        appRef.current = null;
      }
    };
  }, [modelPath, width, height, scale]);

  const setupMouseTracking = (model: any) => {
    const onMouseMove = (e: MouseEvent) => {
      if (!canvasRef.current || !model.internalModel) return;

      const rect = canvasRef.current.getBoundingClientRect();
      
      // Calculate mouse position relative to canvas center
      const centerX = rect.left + rect.width / 2;
      const centerY = rect.top + rect.height / 2;
      
      // Normalize to -1 to 1 range
      const x = (e.clientX - centerX) / (window.innerWidth / 2);
      const y = (e.clientY - centerY) / (window.innerHeight / 2);

      // Focus on the mouse position (this makes eyes/head follow)
      model.focus(e.clientX - rect.left, e.clientY - rect.top);
    };

    window.addEventListener('mousemove', onMouseMove);

    // Store cleanup function
    (model as any)._mouseCleanup = () => {
      window.removeEventListener('mousemove', onMouseMove);
    };
  };

  // Cleanup mouse tracking on unmount
  useEffect(() => {
    return () => {
      if (modelRef.current?._mouseCleanup) {
        modelRef.current._mouseCleanup();
      }
    };
  }, []);

  // Tap interaction - trigger random motion
  const handleClick = () => {
    if (modelRef.current) {
      // Try to play a random motion
      const motionGroups = modelRef.current.internalModel?.motionManager?.definitions;
      if (motionGroups) {
        const groups = Object.keys(motionGroups);
        if (groups.length > 0) {
          const randomGroup = groups[Math.floor(Math.random() * groups.length)];
          modelRef.current.motion(randomGroup);
        }
      }
      // Also trigger expression if available
      modelRef.current.expression();
    }
  };

  return (
    <div
      className="fixed z-50 pointer-events-auto cursor-pointer"
      style={{
        bottom: position.y,
        right: position.x,
        width,
        height,
      }}
      onClick={handleClick}
    >
      {error && (
        <div className="absolute inset-0 flex items-center justify-center text-red-400 text-xs bg-black/50 rounded-lg p-2">
          Model load error: {error}
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
