import React, { useEffect, useRef, useCallback } from 'react';
import { hexToPixel } from '../utils/hex';
import type { HexCellData } from '../utils/hex';

interface BeeProps {
  targetCell: HexCellData | null;
  onReachTarget: () => void;
  onFinish: () => void;
  hexSize: number;
  grid: HexCellData[];
}

const Bee: React.FC<BeeProps> = ({ targetCell, onReachTarget, onFinish, hexSize, grid }) => {
  const posRef = useRef({ x: -200, y: 200 }); // Start off-screen left
  const stateRef = useRef<'flying-in' | 'hovering' | 'leaving'>('flying-in');
  const rotationRef = useRef(0);
  const startTimeRef = useRef(Date.now());
  const requestRef = useRef<number>();
  const hasCalledReachTarget = useRef(false);
  const [, forceUpdate] = React.useReducer(x => x + 1, 0);

  // Calculate viewBox bounds for coordinate conversion
  const layoutSize = hexSize * 1.0;
  const gridCenters = grid.map(c => hexToPixel(c, layoutSize));
  const xs = gridCenters.map(p => p.x);
  const ys = gridCenters.map(p => p.y);
  const minX = xs.length > 0 ? Math.min(...xs) : 0;
  const maxX = xs.length > 0 ? Math.max(...xs) : 0;
  const minY = ys.length > 0 ? Math.min(...ys) : 0;
  const maxY = ys.length > 0 ? Math.max(...ys) : 0;
  const padding = hexSize * 1.6;
  const viewBoxWidth = (maxX - minX) + padding * 2;
  const viewBoxHeight = (maxY - minY) + padding * 2;
  const viewBoxMinX = minX - padding;
  const viewBoxMinY = minY - padding;

  // Reset when target changes
  useEffect(() => {
    if (targetCell) {
      // Start from off-screen left (in SVG coordinates)
      posRef.current = { x: viewBoxMinX - 100, y: viewBoxMinY + viewBoxHeight / 2 };
      stateRef.current = 'flying-in';
      rotationRef.current = 0;
      startTimeRef.current = Date.now();
      hasCalledReachTarget.current = false;
    }
  }, [targetCell, viewBoxMinX, viewBoxMinY, viewBoxHeight]);

  const animate = useCallback(() => {
    if (!targetCell) {
      requestRef.current = requestAnimationFrame(animate);
      return;
    }

    const targetPixel = hexToPixel(targetCell, layoutSize);
    const targetX = targetPixel.x;
    const targetY = targetPixel.y;

    const now = Date.now();
    const elapsed = now - startTimeRef.current;
    const pos = posRef.current;
    const state = stateRef.current;

    if (state === 'flying-in') {
      const dx = targetX - pos.x;
      const dy = targetY - pos.y;
      const dist = Math.sqrt(dx * dx + dy * dy);

      if (dist < 10) {
        stateRef.current = 'hovering';
        posRef.current = { x: targetX, y: targetY };
        startTimeRef.current = now;
      } else {
        const speed = 1.2; // Slower movement
        const angle = Math.atan2(dy, dx);
        posRef.current = {
          x: pos.x + Math.cos(angle) * speed,
          y: pos.y + Math.sin(angle) * speed
        };
        rotationRef.current = angle * (180 / Math.PI) + 90;
      }
    } else if (state === 'hovering') {
      // Wait 1 second after landing before removing color
      if (elapsed >= 1000 && !hasCalledReachTarget.current) {
        hasCalledReachTarget.current = true;
        onReachTarget();
      }
      
      if (elapsed > 3000) {
        stateRef.current = 'leaving';
        startTimeRef.current = now;
      } else {
        // Bobbing motion (wings stopped - no movement)
        posRef.current = {
          x: targetX + Math.sin(elapsed * 0.005) * 8,
          y: targetY + Math.cos(elapsed * 0.005) * 8
        };
      }
    } else if (state === 'leaving') {
      // Fly away to top-right (in SVG coordinates)
      const exitX = viewBoxMinX + viewBoxWidth + 200;
      const exitY = viewBoxMinY - 100;
      const dx = exitX - pos.x;
      const dy = exitY - pos.y;
      const dist = Math.sqrt(dx * dx + dy * dy);

      if (dist < 20 || elapsed > 5000) {
        onFinish();
        return;
      } else {
        const speed = 5;
        const angle = Math.atan2(dy, dx);
        posRef.current = {
          x: pos.x + Math.cos(angle) * speed,
          y: pos.y + Math.sin(angle) * speed
        };
        rotationRef.current = angle * (180 / Math.PI) + 90;
      }
    }

    forceUpdate();
    requestRef.current = requestAnimationFrame(animate);
  }, [targetCell, layoutSize, onReachTarget, onFinish, viewBoxMinX, viewBoxMinY, viewBoxWidth, viewBoxHeight]);

  // Start animation loop
  useEffect(() => {
    requestRef.current = requestAnimationFrame(animate);
    return () => {
      if (requestRef.current) {
        cancelAnimationFrame(requestRef.current);
      }
    };
  }, [animate]);

  if (!targetCell) return null;

  // Convert SVG coordinates to percentage
  const percentX = ((posRef.current.x - viewBoxMinX) / viewBoxWidth) * 100;
  const percentY = ((posRef.current.y - viewBoxMinY) / viewBoxHeight) * 100;
  
  // Wings only animate when flying (not when hovering)
  const isHovering = stateRef.current === 'hovering';
  const wingLeftClass = isHovering ? '' : 'wing-left';
  const wingRightClass = isHovering ? '' : 'wing-right';

  return (
    <div
      className="absolute pointer-events-none"
      style={{
        left: `${percentX}%`,
        top: `${percentY}%`,
        transform: `translate(-50%, -50%) rotate(${rotationRef.current}deg)`,
        width: '60px',
        height: '60px',
        zIndex: 100,
      }}
    >
      <svg viewBox="0 0 100 100" width="100%" height="100%">
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
            .wing-left { transform-origin: 30px 40px; animation: flutter-left 0.08s infinite; }
            .wing-right { transform-origin: 70px 40px; animation: flutter-right 0.08s infinite; }
          `}
        </style>
        <g>
          {/* Wings - only animate when not hovering */}
          <ellipse cx="30" cy="40" rx="20" ry="10" fill="rgba(200,200,255,0.7)" className={wingLeftClass} style={isHovering ? { transform: 'rotate(-20deg)', transformOrigin: '30px 40px' } : undefined} />
          <ellipse cx="70" cy="40" rx="20" ry="10" fill="rgba(200,200,255,0.7)" className={wingRightClass} style={isHovering ? { transform: 'rotate(20deg)', transformOrigin: '70px 40px' } : undefined} />
          
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
    </div>
  );
};

export default Bee;
