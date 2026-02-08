'use client';

import { useState, useEffect, useRef } from 'react';

interface Position {
  x: number;
  y: number;
}

export default function AnimeCompanion() {
  const [mousePos, setMousePos] = useState<Position>({ x: 0, y: 0 });
  const [eyeOffset, setEyeOffset] = useState<Position>({ x: 0, y: 0 });
  const [isBlinking, setIsBlinking] = useState(false);
  const [expression, setExpression] = useState<'neutral' | 'happy' | 'thinking'>('neutral');
  const [bobOffset, setBobOffset] = useState(0);
  const [position, setPosition] = useState<Position>({ x: 0, y: 0 });
  const companionRef = useRef<HTMLDivElement>(null);

  // Track mouse position
  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      setMousePos({ x: e.clientX, y: e.clientY });
    };

    window.addEventListener('mousemove', handleMouseMove);
    return () => window.removeEventListener('mousemove', handleMouseMove);
  }, []);

  // Calculate eye offset based on mouse position
  useEffect(() => {
    if (!companionRef.current) return;

    const rect = companionRef.current.getBoundingClientRect();
    const centerX = rect.left + rect.width / 2;
    const centerY = rect.top + rect.height / 2;

    const deltaX = mousePos.x - centerX;
    const deltaY = mousePos.y - centerY;

    const distance = Math.sqrt(deltaX * deltaX + deltaY * deltaY);
    const maxOffset = 4;

    if (distance > 0) {
      const normalizedX = (deltaX / distance) * Math.min(distance / 50, 1) * maxOffset;
      const normalizedY = (deltaY / distance) * Math.min(distance / 50, 1) * maxOffset;
      setEyeOffset({ x: normalizedX, y: normalizedY });
    }
  }, [mousePos]);

  // Blinking animation
  useEffect(() => {
    const blinkInterval = setInterval(() => {
      if (Math.random() > 0.7) {
        setIsBlinking(true);
        setTimeout(() => setIsBlinking(false), 150);
      }
    }, 2000);

    return () => clearInterval(blinkInterval);
  }, []);

  // Floating/bobbing animation
  useEffect(() => {
    let frame: number;
    let startTime: number;

    const animate = (time: number) => {
      if (!startTime) startTime = time;
      const elapsed = time - startTime;
      setBobOffset(Math.sin(elapsed / 1000) * 5);
      frame = requestAnimationFrame(animate);
    };

    frame = requestAnimationFrame(animate);
    return () => cancelAnimationFrame(frame);
  }, []);

  // Random position changes
  useEffect(() => {
    const moveInterval = setInterval(() => {
      if (Math.random() > 0.8) {
        setPosition({
          x: (Math.random() - 0.5) * 20,
          y: (Math.random() - 0.5) * 10,
        });
      }
    }, 3000);

    return () => clearInterval(moveInterval);
  }, []);

  // Expression changes based on activity
  useEffect(() => {
    const expressionInterval = setInterval(() => {
      const rand = Math.random();
      if (rand > 0.9) {
        setExpression('happy');
        setTimeout(() => setExpression('neutral'), 2000);
      } else if (rand > 0.8) {
        setExpression('thinking');
        setTimeout(() => setExpression('neutral'), 1500);
      }
    }, 4000);

    return () => clearInterval(expressionInterval);
  }, []);

  return (
    <div
      ref={companionRef}
      className="fixed bottom-6 right-6 z-50 select-none pointer-events-none"
      style={{
        transform: `translate(${position.x}px, ${position.y + bobOffset}px)`,
        transition: 'transform 0.5s ease-out',
      }}
    >
      <div className="relative w-32 h-40">
        {/* Speech bubble */}
        <div className="absolute -top-12 -left-16 bg-zinc-800 border border-zinc-700 rounded-xl px-3 py-2 text-xs text-zinc-300 whitespace-nowrap opacity-0 hover:opacity-100 transition-opacity">
          {expression === 'happy' && "Let's build something! ✨"}
          {expression === 'thinking' && "Hmm... 🤔"}
          {expression === 'neutral' && "Hi there! 👋"}
        </div>

        {/* SVG Character */}
        <svg
          viewBox="0 0 120 150"
          className="w-full h-full drop-shadow-lg"
        >
          {/* Hair back */}
          <ellipse cx="60" cy="55" rx="42" ry="45" fill="#1a1a2e" />
          
          {/* Face */}
          <ellipse cx="60" cy="60" rx="35" ry="38" fill="#ffeaa7" />
          
          {/* Hair front */}
          <path
            d="M25 45 Q30 20 60 15 Q90 20 95 45 Q93 35 85 30 Q75 25 60 25 Q45 25 35 30 Q27 35 25 45"
            fill="#1a1a2e"
          />
          
          {/* Hair bangs */}
          <path
            d="M30 50 Q35 35 45 40 Q50 30 60 35 Q70 30 75 40 Q85 35 90 50"
            fill="#1a1a2e"
          />
          
          {/* Left eye white */}
          <ellipse
            cx="45"
            cy="58"
            rx={isBlinking ? 8 : 8}
            ry={isBlinking ? 1 : 10}
            fill="white"
            className="transition-all duration-100"
          />
          
          {/* Right eye white */}
          <ellipse
            cx="75"
            cy="58"
            rx={isBlinking ? 8 : 8}
            ry={isBlinking ? 1 : 10}
            fill="white"
            className="transition-all duration-100"
          />
          
          {/* Left pupil */}
          {!isBlinking && (
            <ellipse
              cx={45 + eyeOffset.x}
              cy={58 + eyeOffset.y}
              rx="4"
              ry="5"
              fill="#2d3436"
              className="transition-all duration-75"
            />
          )}
          
          {/* Right pupil */}
          {!isBlinking && (
            <ellipse
              cx={75 + eyeOffset.x}
              cy={58 + eyeOffset.y}
              rx="4"
              ry="5"
              fill="#2d3436"
              className="transition-all duration-75"
            />
          )}
          
          {/* Eye shine */}
          {!isBlinking && (
            <>
              <circle cx={43 + eyeOffset.x} cy={56 + eyeOffset.y} r="1.5" fill="white" />
              <circle cx={73 + eyeOffset.x} cy={56 + eyeOffset.y} r="1.5" fill="white" />
            </>
          )}
          
          {/* Blush */}
          <ellipse cx="35" cy="70" rx="6" ry="3" fill="#fab1a0" opacity="0.6" />
          <ellipse cx="85" cy="70" rx="6" ry="3" fill="#fab1a0" opacity="0.6" />
          
          {/* Mouth */}
          {expression === 'happy' ? (
            <path
              d="M50 78 Q60 85 70 78"
              fill="none"
              stroke="#2d3436"
              strokeWidth="2"
              strokeLinecap="round"
            />
          ) : expression === 'thinking' ? (
            <ellipse cx="62" cy="80" rx="4" ry="3" fill="#2d3436" />
          ) : (
            <path
              d="M52 80 Q60 82 68 80"
              fill="none"
              stroke="#2d3436"
              strokeWidth="2"
              strokeLinecap="round"
            />
          )}
          
          {/* Body/shoulders hint */}
          <path
            d="M35 95 Q60 100 85 95 Q95 105 95 120 L25 120 Q25 105 35 95"
            fill="#eab308"
          />
          
          {/* Collar detail */}
          <path
            d="M45 98 L60 108 L75 98"
            fill="none"
            stroke="#ca8a04"
            strokeWidth="2"
          />
        </svg>

        {/* Sparkle effects when happy */}
        {expression === 'happy' && (
          <>
            <div className="absolute top-4 left-2 text-yellow-400 animate-ping">✦</div>
            <div className="absolute top-8 right-0 text-yellow-400 animate-ping delay-100">✦</div>
          </>
        )}
      </div>
    </div>
  );
}
