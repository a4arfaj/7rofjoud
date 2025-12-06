import React, { useEffect, useState, useRef } from 'react';
import type { BubbleData } from '../types';

interface BubblesProps {
  bubbles: BubbleData[];
  onPop: (id: string) => void;
}

interface AnimatedBubble extends BubbleData {
  currentY: number;
}

const Bubbles: React.FC<BubblesProps> = ({ bubbles, onPop }) => {
  const [animatedBubbles, setAnimatedBubbles] = useState<AnimatedBubble[]>([]);
  const requestRef = useRef<number | undefined>(undefined);

  useEffect(() => {
    const animate = () => {
      const now = Date.now();
      
      // Map incoming bubbles to animated state
      const nextBubbles = bubbles.map(b => {
        // Calculate position based on time
        const elapsed = now - b.spawnTime;
        
        let y = 110 - (elapsed * b.speed / 20); // Base movement up
        
        if (b.popped && b.popTime) {
          // If popped, calculate fall from the pop position
          const timeSincePop = now - b.popTime;
          const popElapsed = b.popTime - b.spawnTime;
          const popY = 110 - (popElapsed * b.speed / 20);
          
          // Fall logic: accelerate down
          // Simple physics: y = y0 + v*t + 0.5*g*t^2
          // We just add to y based on timeSincePop
          y = popY + (timeSincePop * 0.05); 
        }
        
        return { ...b, currentY: y };
      }).filter(b => {
         // Filter out bubbles that are way off screen
         if (b.popped && b.popTime && (now - b.popTime > 5000)) return false;
         if (!b.popped && b.currentY < -20) return false;
         return true;
      });

      setAnimatedBubbles(nextBubbles);
      requestRef.current = requestAnimationFrame(animate);
    };

    requestRef.current = requestAnimationFrame(animate);
    return () => {
      if (requestRef.current) cancelAnimationFrame(requestRef.current);
    };
  }, [bubbles]);

  return (
    <div className="absolute inset-0 overflow-hidden pointer-events-none z-40">
      {animatedBubbles.map(b => (
        <React.Fragment key={b.id}>
          {/* Bubble Graphic */}
          <div
            className="absolute flex items-center justify-center rounded-full cursor-pointer pointer-events-auto transition-transform"
            style={{
              left: `${b.x}%`,
              top: `${b.currentY}%`,
              width: `${b.size}px`,
              height: `${b.size}px`,
              transform: `translateX(${Math.sin(b.currentY * 0.1 + b.wobbleOffset) * 20}px) ${b.popped ? 'scale(0)' : 'scale(1)'}`,
              opacity: b.popped ? 0 : 0.8,
              background: 'radial-gradient(circle at 30% 30%, rgba(255,255,255,0.8), rgba(255,255,255,0.2) 20%, rgba(255,255,255,0.1) 60%, rgba(255,255,255,0.4) 100%)',
              boxShadow: 'inset 0 0 20px rgba(255,255,255,0.5), 0 0 10px rgba(255,255,255,0.2)',
              border: '1px solid rgba(255,255,255,0.6)',
              transition: 'opacity 0.2s, transform 0.2s'
            }}
            onClick={() => !b.popped && onPop(b.id)}
          >
            <div className="absolute top-[15%] left-[15%] w-[20%] h-[20%] rounded-full bg-white opacity-60 filter blur-[1px]" />
          </div>

          {/* Content - Text or Bee - separate element to handle "pop" visualization correctly (doesn't scale down) */}
          {/* We move it with the bubble */}
          <div
             className="absolute flex items-center justify-center pointer-events-none"
             style={{
              left: `${b.x}%`,
              top: `${b.currentY}%`,
              width: `${b.size}px`,
              height: `${b.size}px`,
              transform: `translateX(${Math.sin(b.currentY * 0.1 + b.wobbleOffset) * 20}px)`,
              opacity: b.popped && b.popTime ? Math.max(0, 1 - (Date.now() - b.popTime) / 5000) : 1,
              transition: 'opacity 0.1s'
             }}
          >
            {b.hasBee ? (
              /* Bee SVG */
              <svg 
                viewBox="0 0 100 100" 
                width={`${b.size * 0.6}px`} 
                height={`${b.size * 0.6}px`}
                className="wing-animated"
              >
                <style>
                  {`
                    @keyframes flutter-left {
                      0%, 100% { transform: rotate(-30deg); }
                      50% { transform: rotate(-10deg); }
                    }
                    @keyframes flutter-right {
                      0%, 100% { transform: rotate(30deg); }
                      50% { transform: rotate(10deg); }
                    }
                    .wing-animated .wing-left { transform-origin: 30px 40px; animation: flutter-left 0.08s infinite; }
                    .wing-animated .wing-right { transform-origin: 70px 40px; animation: flutter-right 0.08s infinite; }
                  `}
                </style>
                <g>
                  {/* Wings */}
                  <ellipse cx="30" cy="40" rx="20" ry="10" fill="rgba(200,200,255,0.7)" className="wing-left" />
                  <ellipse cx="70" cy="40" rx="20" ry="10" fill="rgba(200,200,255,0.7)" className="wing-right" />
                  
                  {/* Body */}
                  <ellipse cx="50" cy="50" rx="22" ry="32" fill="#FFD700" stroke="black" strokeWidth="2" />
                  
                  {/* Stripes */}
                  <path d="M32 40 Q50 32 68 40" stroke="black" strokeWidth="5" fill="none" />
                  <path d="M30 52 Q50 44 70 52" stroke="black" strokeWidth="5" fill="none" />
                  <path d="M35 64 Q50 56 65 64" stroke="black" strokeWidth="5" fill="none" />
                  
                  {/* Head */}
                  <circle cx="50" cy="22" r="12" fill="#FFD700" stroke="black" strokeWidth="2" />
                  
                  {/* Eyes */}
                  <circle cx="45" cy="20" r="4" fill="black" />
                  <circle cx="55" cy="20" r="4" fill="black" />
                  <circle cx="44" cy="18" r="1.5" fill="white" />
                  <circle cx="54" cy="18" r="1.5" fill="white" />
                  
                  {/* Antennae */}
                  <path d="M45 12 Q42 5 38 2" stroke="black" strokeWidth="2" fill="none" />
                  <path d="M55 12 Q58 5 62 2" stroke="black" strokeWidth="2" fill="none" />
                  <circle cx="38" cy="2" r="2" fill="black" />
                  <circle cx="62" cy="2" r="2" fill="black" />
                  
                  {/* Stinger */}
                  <path d="M50 82 L47 92 L53 92 Z" fill="#333" />
                </g>
              </svg>
            ) : (
              /* Text with white color and border */
              <span 
                className="font-bold truncate px-2 select-none"
                style={{ 
                  fontSize: `${b.size * 0.25}px`,
                  fontFamily: "'Cairo', 'Amiri', 'Noto Sans Arabic', serif",
                  color: 'white',
                  textShadow: `
                    -1px -1px 0 #000,
                    1px -1px 0 #000,
                    -1px 1px 0 #000,
                    1px 1px 0 #000,
                    0 0 3px #000
                  `,
                  WebkitTextStroke: '1px black',
                  paintOrder: 'stroke fill'
                }}
              >
                {b.name}
              </span>
            )}
          </div>
        </React.Fragment>
      ))}
    </div>
  );
};

export default Bubbles;
