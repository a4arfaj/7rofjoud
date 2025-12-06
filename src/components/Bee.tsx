import React, { useEffect, useState, useRef } from 'react';
import { hexToPixel } from '../utils/hex';
import type { HexCellData } from '../utils/hex';

interface BeeProps {
  targetCell: HexCellData | null;
  startPos: { x: number; y: number };
  onReachTarget: () => void;
  onFinish: () => void;
  hexSize: number;
  grid: HexCellData[];
}

const Bee: React.FC<BeeProps> = ({ targetCell, startPos, onReachTarget, onFinish, hexSize, grid }) => {
  const [pos, setPos] = useState(startPos);
  const [state, setState] = useState<'flying-in' | 'hovering' | 'leaving'>('flying-in');
  const [rotation, setRotation] = useState(0);
  const requestRef = useRef<number | undefined>(undefined);
  const startTimeRef = useRef(Date.now());
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!targetCell) {
      // Reset position when target is cleared
      setPos(startPos);
      setState('flying-in');
      setRotation(0);
      startTimeRef.current = Date.now();
      return;
    }

    // Reset state when target changes
    setPos(startPos);
    setState('flying-in');
    setRotation(0);
    startTimeRef.current = Date.now();

    const layoutSize = hexSize * 1.0; // Match HEX_SPACING from HexGrid
    const targetPixel = hexToPixel(targetCell, layoutSize);
    // Get hex center - hexToPixel gives us the center already
    const targetX = targetPixel.x;
    const targetY = targetPixel.y;

    const animate = () => {
      const now = Date.now();
      const elapsed = now - startTimeRef.current;

      if (state === 'flying-in') {
        // Move towards target
        const dx = targetX - pos.x;
        const dy = targetY - pos.y;
        const dist = Math.sqrt(dx * dx + dy * dy);
        
          if (dist < 5) {
            setState('hovering');
            onReachTarget();
            startTimeRef.current = now; // Reset timer for hovering
          } else {
            // Move logic
            const speed = 2; // Slower speed (was 4)
            const angle = Math.atan2(dy, dx);
            setPos({
              x: pos.x + Math.cos(angle) * speed,
              y: pos.y + Math.sin(angle) * speed
            });
            setRotation(angle * (180 / Math.PI) + 90); // +90 to align bee head
          }
        } else if (state === 'hovering') {
          // Hover motion
          if (elapsed > 3000) { // Hover for 3 seconds
            setState('leaving');
            startTimeRef.current = now; // Reset timer for leaving
          } else {
          // Bobbing motion
          setPos({
            x: targetX + Math.sin(elapsed * 0.01) * 5,
            y: targetY + Math.cos(elapsed * 0.01) * 5
          });
        }
      } else if (state === 'leaving') {
        // Fly away (e.g., to top right)
        const exitX = 1000; // Off screen
        const exitY = -500;
        const dx = exitX - pos.x;
        const dy = exitY - pos.y;
        const dist = Math.sqrt(dx * dx + dy * dy);

        if (dist < 10 || elapsed > 3000) {
          onFinish();
        } else {
           const speed = 6;
           const angle = Math.atan2(dy, dx);
           setPos({
             x: pos.x + Math.cos(angle) * speed,
             y: pos.y + Math.sin(angle) * speed
           });
           setRotation(angle * (180 / Math.PI) + 90);
        }
      }

      requestRef.current = requestAnimationFrame(animate);
    };

    requestRef.current = requestAnimationFrame(animate);
    return () => {
      if (requestRef.current) cancelAnimationFrame(requestRef.current);
    };
  }, [targetCell, hexSize, grid, onReachTarget, onFinish]);

  if (!targetCell) return null;

  // Use percentage-based positioning relative to container
  // The SVG is centered in its container, so we need to calculate the position
  // relative to the container's center
  const layoutSize = hexSize * 1.0;
  const gridCenters = grid ? grid.map(c => hexToPixel(c, layoutSize)) : [];
  const xs = gridCenters.map(p => p.x);
  const ys = gridCenters.map(p => p.y);
  const minX = xs.length > 0 ? Math.min(...xs) : 0;
  const maxX = xs.length > 0 ? Math.max(...xs) : 0;
  const minY = ys.length > 0 ? Math.min(...ys) : 0;
  const maxY = ys.length > 0 ? Math.max(...ys) : 0;
  const padding = hexSize * 1.6;
  const viewBoxWidth = (maxX - minX) + padding * 2;
  const viewBoxHeight = (maxY - minY) + padding * 2;
  
  // Convert SVG coordinates to percentage of viewBox
  const percentX = ((pos.x - (minX - padding)) / viewBoxWidth) * 100;
  const percentY = ((pos.y - (minY - padding)) / viewBoxHeight) * 100;

  return (
    <div
      ref={containerRef}
      className="absolute pointer-events-none z-50"
      style={{
        left: `${percentX}%`,
        top: `${percentY}%`,
        transform: `translate(-50%, -50%) rotate(${rotation}deg)`,
        width: '60px',
        height: '60px',
      }}
    >
      {/* Simple Bee SVG */}
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
            .wing-left { transform-origin: 30px 40px; animation: flutter-left 0.1s infinite; }
            .wing-right { transform-origin: 70px 40px; animation: flutter-right 0.1s infinite; }
          `}
        </style>
        <g>
          {/* Wings */}
          <ellipse cx="30" cy="40" rx="20" ry="10" fill="rgba(255,255,255,0.8)" className="wing-left" />
          <ellipse cx="70" cy="40" rx="20" ry="10" fill="rgba(255,255,255,0.8)" className="wing-right" />
          
          {/* Body */}
          <ellipse cx="50" cy="50" rx="25" ry="35" fill="#FFD700" stroke="black" strokeWidth="2" />
          
          {/* Stripes */}
          <path d="M30 40 Q50 30 70 40" stroke="black" strokeWidth="4" fill="none" />
          <path d="M28 55 Q50 45 72 55" stroke="black" strokeWidth="4" fill="none" />
          <path d="M35 70 Q50 60 65 70" stroke="black" strokeWidth="4" fill="none" />
          
          {/* Eyes */}
          <circle cx="40" cy="30" r="3" fill="black" />
          <circle cx="60" cy="30" r="3" fill="black" />
          
          {/* Stinger */}
          <path d="M50 85 L45 95 L55 95 Z" fill="black" />
        </g>
      </svg>
    </div>
  );
};

export default Bee;

