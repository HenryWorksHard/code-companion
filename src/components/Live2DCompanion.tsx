'use client';

import { useState, useEffect, useRef } from 'react';

interface Position {
  x: number;
  y: number;
}

export default function Live2DCompanion() {
  const [mousePos, setMousePos] = useState<Position>({ x: 0, y: 0 });
  const [eyePos, setEyePos] = useState<Position>({ x: 0, y: 0 });
  const [headTilt, setHeadTilt] = useState(0);
  const [bodyTilt, setBodyTilt] = useState(0);
  const [isBlinking, setIsBlinking] = useState(false);
  const [mouthOpen, setMouthOpen] = useState(0);
  const [breathOffset, setBreathOffset] = useState(0);
  const [hairSwing, setHairSwing] = useState(0);
  const containerRef = useRef<HTMLDivElement>(null);

  // Track mouse position
  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      setMousePos({ x: e.clientX, y: e.clientY });
    };
    window.addEventListener('mousemove', handleMouseMove);
    return () => window.removeEventListener('mousemove', handleMouseMove);
  }, []);

  // Calculate eye/head position based on mouse
  useEffect(() => {
    if (!containerRef.current) return;
    
    const rect = containerRef.current.getBoundingClientRect();
    const centerX = rect.left + rect.width / 2;
    const centerY = rect.top + rect.height / 2;
    
    const deltaX = (mousePos.x - centerX) / window.innerWidth;
    const deltaY = (mousePos.y - centerY) / window.innerHeight;
    
    // Eye movement (more responsive)
    setEyePos({
      x: deltaX * 8,
      y: deltaY * 5,
    });
    
    // Head tilt (subtle)
    setHeadTilt(deltaX * 5);
    
    // Body tilt (very subtle)
    setBodyTilt(deltaX * 2);
  }, [mousePos]);

  // Blinking animation
  useEffect(() => {
    const blink = () => {
      setIsBlinking(true);
      setTimeout(() => setIsBlinking(false), 100);
    };
    
    const interval = setInterval(() => {
      if (Math.random() > 0.7) blink();
    }, 2500);
    
    return () => clearInterval(interval);
  }, []);

  // Breathing animation
  useEffect(() => {
    let frame: number;
    let start: number;
    
    const animate = (time: number) => {
      if (!start) start = time;
      const elapsed = (time - start) / 1000;
      setBreathOffset(Math.sin(elapsed * 1.5) * 3);
      setHairSwing(Math.sin(elapsed * 2) * 2);
      frame = requestAnimationFrame(animate);
    };
    
    frame = requestAnimationFrame(animate);
    return () => cancelAnimationFrame(frame);
  }, []);

  // Random mouth movement (like talking)
  useEffect(() => {
    const talk = () => {
      if (Math.random() > 0.8) {
        setMouthOpen(Math.random() * 0.5);
        setTimeout(() => setMouthOpen(0), 150);
      }
    };
    
    const interval = setInterval(talk, 300);
    return () => clearInterval(interval);
  }, []);

  return (
    <div 
      ref={containerRef}
      className="fixed bottom-0 right-4 z-50 pointer-events-none select-none"
      style={{ width: 280, height: 400 }}
    >
      <svg
        viewBox="0 0 280 400"
        className="w-full h-full drop-shadow-2xl"
        style={{
          filter: 'drop-shadow(0 0 20px rgba(255,0,255,0.3))',
        }}
      >
        {/* Body layer - with breathing */}
        <g 
          transform={`translate(140, ${280 + breathOffset}) rotate(${bodyTilt})`}
          style={{ transformOrigin: '140px 280px', transition: 'transform 0.1s ease-out' }}
        >
          {/* Neck */}
          <ellipse cx="0" cy="-40" rx="18" ry="25" fill="#fce4d6" />
          
          {/* Shoulders/Body */}
          <path
            d="M-70 0 Q-80 -30 -50 -50 Q-20 -60 0 -55 Q20 -60 50 -50 Q80 -30 70 0 Q60 40 0 50 Q-60 40 -70 0"
            fill="#1a1a2e"
          />
          
          {/* Clothing detail - crop top style */}
          <path
            d="M-45 -40 Q-30 -50 0 -48 Q30 -50 45 -40 Q50 -20 45 0 Q30 15 0 18 Q-30 15 -45 0 Q-50 -20 -45 -40"
            fill="#ff00ff"
            opacity="0.9"
          />
          
          {/* Clothing highlight */}
          <path
            d="M-35 -35 Q-20 -42 0 -40 Q15 -42 25 -38"
            fill="none"
            stroke="#ff66ff"
            strokeWidth="2"
          />
          
          {/* Cleavage hint */}
          <path
            d="M-5 -35 Q0 -25 5 -35"
            fill="none"
            stroke="#e8d4c8"
            strokeWidth="1"
          />
        </g>

        {/* Head layer - with head tilt */}
        <g 
          transform={`translate(140, ${160 + breathOffset * 0.5}) rotate(${headTilt})`}
          style={{ transformOrigin: '140px 160px', transition: 'transform 0.1s ease-out' }}
        >
          {/* Hair back */}
          <ellipse cx="0" cy="10" rx="65" ry="70" fill="#1a0a2e" />
          
          {/* Face */}
          <ellipse cx="0" cy="5" rx="50" ry="55" fill="#fce4d6" />
          
          {/* Hair front */}
          <path
            d="M-55 -20 Q-50 -60 0 -65 Q50 -60 55 -20"
            fill="#1a0a2e"
          />
          
          {/* Bangs with swing */}
          <g transform={`translate(${hairSwing}, 0)`}>
            <path
              d="M-45 -10 Q-40 -40 -25 -35 Q-15 -45 0 -40 Q15 -45 25 -35 Q40 -40 45 -10"
              fill="#2a1a3e"
            />
            {/* Side hair strands */}
            <path
              d="M-55 0 Q-60 30 -55 70 Q-52 90 -48 100"
              fill="#1a0a2e"
            />
            <path
              d="M55 0 Q60 30 55 70 Q52 90 48 100"
              fill="#1a0a2e"
            />
          </g>
          
          {/* Eyebrows */}
          <path
            d="M-30 -15 Q-20 -20 -10 -17"
            fill="none"
            stroke="#1a0a2e"
            strokeWidth="2"
            strokeLinecap="round"
          />
          <path
            d="M10 -17 Q20 -20 30 -15"
            fill="none"
            stroke="#1a0a2e"
            strokeWidth="2"
            strokeLinecap="round"
          />
          
          {/* Eyes container - moves with gaze */}
          <g transform={`translate(${eyePos.x}, ${eyePos.y})`} style={{ transition: 'transform 0.05s ease-out' }}>
            {/* Left eye */}
            <ellipse 
              cx="-22" 
              cy="5" 
              rx="14" 
              ry={isBlinking ? 2 : 12} 
              fill="white"
              style={{ transition: 'ry 0.05s ease' }}
            />
            {!isBlinking && (
              <>
                <ellipse cx="-22" cy="6" rx="8" ry="9" fill="#6a0dad" />
                <ellipse cx="-22" cy="6" rx="5" ry="6" fill="#1a0a2e" />
                <circle cx="-25" cy="3" r="3" fill="white" opacity="0.9" />
                <circle cx="-19" cy="8" r="1.5" fill="white" opacity="0.5" />
              </>
            )}
            
            {/* Right eye */}
            <ellipse 
              cx="22" 
              cy="5" 
              rx="14" 
              ry={isBlinking ? 2 : 12} 
              fill="white"
              style={{ transition: 'ry 0.05s ease' }}
            />
            {!isBlinking && (
              <>
                <ellipse cx="22" cy="6" rx="8" ry="9" fill="#6a0dad" />
                <ellipse cx="22" cy="6" rx="5" ry="6" fill="#1a0a2e" />
                <circle cx="19" cy="3" r="3" fill="white" opacity="0.9" />
                <circle cx="25" cy="8" r="1.5" fill="white" opacity="0.5" />
              </>
            )}
          </g>
          
          {/* Blush */}
          <ellipse cx="-35" cy="20" rx="10" ry="5" fill="#ffb6c1" opacity="0.5" />
          <ellipse cx="35" cy="20" rx="10" ry="5" fill="#ffb6c1" opacity="0.5" />
          
          {/* Nose */}
          <path
            d="M0 15 L2 25 L-2 25"
            fill="none"
            stroke="#e8c4b8"
            strokeWidth="1.5"
            strokeLinecap="round"
          />
          
          {/* Mouth */}
          <g transform={`translate(0, ${35 + mouthOpen * 5})`}>
            <path
              d={mouthOpen > 0.2 
                ? "M-10 0 Q0 8 10 0 Q5 12 0 12 Q-5 12 -10 0"
                : "M-8 0 Q0 5 8 0"
              }
              fill={mouthOpen > 0.2 ? "#2a1a2e" : "none"}
              stroke="#d4a4a4"
              strokeWidth="2"
              strokeLinecap="round"
            />
            {mouthOpen > 0.2 && (
              <ellipse cx="0" cy="5" rx="4" ry="2" fill="#ff6b8a" />
            )}
          </g>
          
          {/* Sparkle effects */}
          <g className="animate-pulse">
            <text x="-55" y="-30" fontSize="12" fill="#ff00ff">✦</text>
            <text x="50" y="-20" fontSize="10" fill="#00ffff">✦</text>
          </g>
        </g>
        
        {/* Floating particles */}
        <circle cx="50" cy="100" r="2" fill="#ff00ff" opacity="0.5" className="animate-ping" />
        <circle cx="230" cy="150" r="2" fill="#00ffff" opacity="0.5" className="animate-ping" style={{ animationDelay: '0.5s' }} />
        <circle cx="80" cy="300" r="2" fill="#ff00ff" opacity="0.5" className="animate-ping" style={{ animationDelay: '1s' }} />
      </svg>
    </div>
  );
}
