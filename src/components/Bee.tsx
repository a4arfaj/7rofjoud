import { useEffect, useRef, useCallback, useReducer } from 'react';
import { hexToPixel } from '../utils/hex';
import type { HexCellData } from '../utils/hex';

interface BeeProps {
  targetCell: HexCellData | null;
  onReachTarget: () => void;
  onFinish: () => void;
  hexSize: number;
  grid: HexCellData[];
  startTime?: number; // Firebase timestamp for sync across all clients
}

const Bee: React.FC<BeeProps> = ({ targetCell, onReachTarget, onFinish, hexSize, grid, startTime }) => {
  const posRef = useRef({ x: -200, y: 200 }); // Start off-screen left
  const stateRef = useRef<'flying-in' | 'landed' | 'leaving'>('flying-in');
  const rotationRef = useRef(0);
  // Use startTime from Firebase for sync, fallback to local time
  const startTimeRef = useRef(startTime || Date.now());
  const landedTimeRef = useRef<number | null>(null);
  const requestRef = useRef<number | undefined>(undefined);
  const hasCalledReachTarget = useRef(false);
  const [, forceUpdate] = useReducer((x: number) => x + 1, 0);

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
      // Use startTime from Firebase for sync across all clients
      startTimeRef.current = startTime || Date.now();
      landedTimeRef.current = null;
      hasCalledReachTarget.current = false;
    }
  }, [targetCell, viewBoxMinX, viewBoxMinY, viewBoxHeight, startTime]);

  const animate = useCallback(() => {
    if (!targetCell) {
      requestRef.current = requestAnimationFrame(animate);
      return;
    }

    const targetPixel = hexToPixel(targetCell, layoutSize);
    const targetX = targetPixel.x;
    const targetY = targetPixel.y;

    const now = Date.now();
    const pos = posRef.current;
    const state = stateRef.current;

    if (state === 'flying-in') {
      // Calculate position based on time elapsed since Firebase startTime
      // This ensures all clients see the bee at the same position
      const flyElapsed = now - startTimeRef.current;
      const flySpeed = 80; // pixels per second
      const totalDistance = Math.sqrt(
        Math.pow(targetX - (viewBoxMinX - 100), 2) + 
        Math.pow(targetY - (viewBoxMinY + viewBoxHeight / 2), 2)
      );
      const flyDuration = (totalDistance / flySpeed) * 1000; // ms to reach target
      const progress = Math.min(flyElapsed / flyDuration, 1);
      
      const startX = viewBoxMinX - 100;
      const startY = viewBoxMinY + viewBoxHeight / 2;
      
      if (progress >= 1) {
        stateRef.current = 'landed';
        posRef.current = { x: targetX, y: targetY };
        rotationRef.current = 0;
        landedTimeRef.current = now;
      } else {
        posRef.current = {
          x: startX + (targetX - startX) * progress,
          y: startY + (targetY - startY) * progress
        };
        const dx = targetX - pos.x;
        const dy = targetY - pos.y;
        const angle = Math.atan2(dy, dx);
        rotationRef.current = angle * (180 / Math.PI) + 90;
      }
    } else if (state === 'landed') {
      const landedElapsed = landedTimeRef.current ? now - landedTimeRef.current : 0;
      
      // After 1 second, remove color
      if (landedElapsed >= 1000 && !hasCalledReachTarget.current) {
        hasCalledReachTarget.current = true;
        onReachTarget();
      }
      
      // After 2 seconds total, fly away
      if (landedElapsed >= 2000) {
        stateRef.current = 'leaving';
        landedTimeRef.current = now; // reuse for leaving start time
      }
      // Stay still when landed (no bobbing)
    } else if (state === 'leaving') {
      // Fly away to top-right (in SVG coordinates)
      const exitX = viewBoxMinX + viewBoxWidth + 200;
      const exitY = viewBoxMinY - 100;
      const leaveElapsed = landedTimeRef.current ? now - landedTimeRef.current : 0;

      if (leaveElapsed > 3000) {
        onFinish();
        return;
      } else {
        const speed = 5;
        const dx = exitX - pos.x;
        const dy = exitY - pos.y;
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
  
  // Wings only animate when flying (not when landed)
  const isFlying = stateRef.current === 'flying-in' || stateRef.current === 'leaving';
  const wingClass = isFlying ? 'wing-animated' : '';

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
            .wing-animated.wing-left { transform-origin: 30px 40px; animation: flutter-left 0.08s infinite; }
            .wing-animated.wing-right { transform-origin: 70px 40px; animation: flutter-right 0.08s infinite; }
          `}
        </style>
        <g>
          {/* Wings */}
          <ellipse cx="30" cy="40" rx="20" ry="10" fill="rgba(200,200,255,0.7)" className={`wing-left ${wingClass}`} />
          <ellipse cx="70" cy="40" rx="20" ry="10" fill="rgba(200,200,255,0.7)" className={`wing-right ${wingClass}`} />
          
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
