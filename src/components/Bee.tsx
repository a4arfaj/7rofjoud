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
  onStateChange?: (isFlying: boolean) => void; // Callback when bee state changes
  onPositionUpdate?: (position: { x: number; y: number; rotation: number; state: 'flying-in' | 'landed' | 'leaving' }) => void; // Callback to report bee position/state
  syncedState?: { x: number; y: number; rotation: number; state: 'flying-in' | 'landed' | 'leaving' } | null; // Synced state from Firebase (for clients)
  isCreator?: boolean; // Whether this is the host
}

const Bee: React.FC<BeeProps> = ({ targetCell, onReachTarget, onFinish, hexSize, grid, startTime, onStateChange, onPositionUpdate, syncedState, isCreator = false }) => {
  const posRef = useRef({ x: -200, y: 200 }); // Start off-screen left
  const stateRef = useRef<'flying-in' | 'landed' | 'leaving'>('flying-in');
  const rotationRef = useRef(0);
  const leavingDirectionRef = useRef<number | null>(null); // Lock rotation direction when leaving
  // Use startTime from Firebase for sync, fallback to local time
  const startTimeRef = useRef(startTime || Date.now());
  const landedTimeRef = useRef<number | null>(null);
  const requestRef = useRef<number | undefined>(undefined);
  const hasCalledReachTarget = useRef(false);
  const [, forceUpdate] = useReducer((x: number) => x + 1, 0);
  const prevStateRef = useRef<'flying-in' | 'landed' | 'leaving' | null>(null);

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

  // Start position for the current flight segment
  const flightStartPosRef = useRef({ x: viewBoxMinX - 100, y: viewBoxMinY + viewBoxHeight / 2 });

  // Reset when target changes
  useEffect(() => {
    if (targetCell) {
      // If we were already flying/landed, start from current position to avoid jump
      if (posRef.current.x !== -200) {
        flightStartPosRef.current = { ...posRef.current };
      } else {
        // First flight, start from off-screen
        flightStartPosRef.current = { x: viewBoxMinX - 100, y: viewBoxMinY + viewBoxHeight / 2 };
      }

      stateRef.current = 'flying-in';
      rotationRef.current = 0;
      leavingDirectionRef.current = null;
      // Use startTime from Firebase for sync across all clients
      startTimeRef.current = startTime || Date.now();
      landedTimeRef.current = null;
      hasCalledReachTarget.current = false;
      // Notify state change: bee starting to fly
      if (onStateChange) {
        onStateChange(true);
        prevStateRef.current = 'flying-in';
      }
    } else if (!targetCell && prevStateRef.current !== null) {
      // Bee removed, stop sound
      if (onStateChange) {
        onStateChange(false);
        prevStateRef.current = null;
      }
    }
  }, [targetCell, startTime, viewBoxMinX, viewBoxMinY, viewBoxHeight, onStateChange]);

  // Watch syncedState changes for clients and notify state changes
  useEffect(() => {
    if (syncedState && !isCreator && onStateChange) {
      const isFlying = syncedState.state === 'flying-in' || syncedState.state === 'leaving';
      const wasFlying = prevStateRef.current === 'flying-in' || prevStateRef.current === 'leaving' || prevStateRef.current === null;
      
      // Only notify if state actually changed
      if (isFlying !== wasFlying) {
        onStateChange(isFlying);
        prevStateRef.current = syncedState.state;
      } else if (prevStateRef.current !== syncedState.state) {
        // Update prevState even if flying status didn't change
        prevStateRef.current = syncedState.state;
      }
    } else if (!syncedState && !isCreator && prevStateRef.current !== null && onStateChange) {
      // Bee state cleared
      onStateChange(false);
      prevStateRef.current = null;
    }
  }, [syncedState, isCreator, onStateChange]);

  const animate = useCallback(() => {
    if (!targetCell) {
      requestRef.current = requestAnimationFrame(animate);
      return;
    }

    // If synced state is provided (client), use it directly instead of calculating
    if (syncedState && !isCreator) {
      posRef.current = { x: syncedState.x, y: syncedState.y };
      rotationRef.current = syncedState.rotation;
      stateRef.current = syncedState.state;
      
      // If bee has been leaving for more than 3 seconds, it should be finished
      // But we rely on Firebase clearing beeState, so we just render what we get
      forceUpdate();
      requestRef.current = requestAnimationFrame(animate);
      return;
    }
    
    // If no targetCell and we're the host, bee should be gone
    if (!targetCell && isCreator) {
      // This shouldn't happen, but if it does, ensure we stop
      requestRef.current = requestAnimationFrame(animate);
      return;
    }

    // Host calculates position locally
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
      
      // Use the stored start position for this flight segment
      const startX = flightStartPosRef.current.x;
      const startY = flightStartPosRef.current.y;

      const totalDistance = Math.sqrt(
        Math.pow(targetX - startX, 2) + 
        Math.pow(targetY - startY, 2)
      );
      const flyDuration = (totalDistance / flySpeed) * 1000; // ms to reach target
      const progress = flyDuration > 0 ? Math.min(flyElapsed / flyDuration, 1) : 1;
      
      if (progress >= 1) {
        stateRef.current = 'landed';
        posRef.current = { x: targetX, y: targetY };
        // Keep the rotation from the flight (don't reset to 0 to avoid visual glitch)
        // rotationRef.current stays as calculated during flight
        landedTimeRef.current = now;
        // Notify state change: bee landed (not flying)
        if (onStateChange && prevStateRef.current !== 'landed') {
          onStateChange(false);
          prevStateRef.current = 'landed';
        }
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
      
      // Stay still when landed - rotation stays at 0 (no rotation changes)
      // After 2 seconds total, fly away
      if (landedElapsed >= 2000) {
        stateRef.current = 'leaving';
        landedTimeRef.current = now; // reuse for leaving start time
        // Calculate and lock exit direction immediately (toward top-right corner)
        // This prevents recalculation every frame which causes the stuck bug
        const exitX = viewBoxMinX + viewBoxWidth + 200;
        const exitY = viewBoxMinY - 100;
        const dx = exitX - pos.x;
        const dy = exitY - pos.y;
        const exitAngle = Math.atan2(dy, dx) * (180 / Math.PI) + 90;
        leavingDirectionRef.current = exitAngle; // Lock the direction
        rotationRef.current = exitAngle;
        // Notify state change: bee leaving (flying again)
        if (onStateChange && prevStateRef.current !== 'leaving') {
          onStateChange(true);
          prevStateRef.current = 'leaving';
        }
      }
    } else if (state === 'leaving') {
      const leaveElapsed = landedTimeRef.current ? now - landedTimeRef.current : 0;

      if (leaveElapsed > 3000) {
        // Notify state change: bee finished (not flying) - do this BEFORE onFinish
        if (onStateChange && prevStateRef.current !== null) {
          onStateChange(false);
          prevStateRef.current = null;
        }
        // Call onFinish to despawn the bee
        onFinish();
        // Stop animation loop
        return;
      } else {
        // Use locked direction instead of recalculating every frame
        // This prevents the bee from getting stuck at the corner
        if (leavingDirectionRef.current === null) {
          // Fallback: calculate direction if somehow not set
          const exitX = viewBoxMinX + viewBoxWidth + 200;
          const exitY = viewBoxMinY - 100;
          const dx = exitX - pos.x;
          const dy = exitY - pos.y;
          leavingDirectionRef.current = Math.atan2(dy, dx) * (180 / Math.PI) + 90;
        }
        
        const speed = 5;
        rotationRef.current = leavingDirectionRef.current; // Keep rotation locked
        
        // Move in the locked direction (no recalculation = no stuck bug)
        const angleRad = (leavingDirectionRef.current - 90) * Math.PI / 180;
        posRef.current = {
          x: pos.x + Math.cos(angleRad) * speed,
          y: pos.y + Math.sin(angleRad) * speed
        };
      }
    }

    forceUpdate();
    
    // Report position update to parent (host only) for Firebase sync
    if (isCreator && onPositionUpdate) {
      onPositionUpdate({
        x: posRef.current.x,
        y: posRef.current.y,
        rotation: rotationRef.current,
        state: stateRef.current
      });
    }
    
    requestRef.current = requestAnimationFrame(animate);
  }, [targetCell, layoutSize, onReachTarget, onFinish, viewBoxMinX, viewBoxMinY, viewBoxWidth, viewBoxHeight, syncedState, isCreator, onPositionUpdate]);

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
