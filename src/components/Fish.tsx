import { useEffect, useState, useRef } from 'react';
import type { HexCellData, Point } from '../utils/hex';
import { hexToPixel, getHexCorners } from '../utils/hex';

type FishProps = {
  cluster: HexCellData[];
  zones: Array<{ bounds: { minX: number; maxX: number; minY: number; maxY: number }; corners: Point[] }>;
  size: number;
  layoutSize: number;
  maskId: string;
};

function Fish({ cluster, zones, size, layoutSize, maskId }: FishProps) {
  const [position, setPosition] = useState<Point>({ x: 0, y: 0 });
  const [angle, setAngle] = useState(0); // Direction in degrees (0 = right, 90 = down, 180 = left, 270 = up)
  const [speed] = useState(0.8 + Math.random() * 0.4); // pixels per frame
  const animationFrameRef = useRef<number | undefined>(undefined);
  const lastUpdateRef = useRef<number>(Date.now());
  const stateRef = useRef<{ position: Point; angle: number }>({ position: { x: 0, y: 0 }, angle: 0 });

  // Calculate water cell boundaries - memoize in ref
  const waterBoundsRef = useRef<Array<{
    minX: number;
    maxX: number;
    minY: number;
    maxY: number;
    center: Point;
    corners: Point[];
  }>>([]);

  useEffect(() => {
    const cellBounds = cluster.map((cell) => {
      const { x, y } = hexToPixel(cell, layoutSize);
      const corners = getHexCorners({ x, y }, size);
      const xs = corners.map((p) => p.x);
      const ys = corners.map((p) => p.y);
      return {
        minX: Math.min(...xs),
        maxX: Math.max(...xs),
        minY: Math.min(...ys),
        maxY: Math.max(...ys),
        center: { x, y },
        corners,
      };
    });
    const zoneBounds = zones.map((zone) => ({
      ...zone.bounds,
      center: {
        x: (zone.bounds.minX + zone.bounds.maxX) / 2,
        y: (zone.bounds.minY + zone.bounds.maxY) / 2,
      },
      corners: zone.corners,
    }));
    waterBoundsRef.current = [...cellBounds, ...zoneBounds];
  }, [cluster, zones, layoutSize, size]);

  // Check if point is inside any water cell or zone
  const isPointInWater = (p: Point): boolean => {
    return waterBoundsRef.current.some((bound) => {
      const { corners } = bound;
      // Simple point-in-polygon test
      let inside = false;
      for (let i = 0, j = corners.length - 1; i < corners.length; j = i++) {
        const xi = corners[i].x;
        const yi = corners[i].y;
        const xj = corners[j].x;
        const yj = corners[j].y;
        const intersect =
          yi > p.y !== yj > p.y && p.x < ((xj - xi) * (p.y - yi)) / (yj - yi) + xi;
        if (intersect) inside = !inside;
      }
      return inside;
    });
  };

  // Get distance to nearest boundary
  const getDistanceToBoundary = (p: Point, dir: number): number => {
    const rad = (dir * Math.PI) / 180;
    const step = 2;
    let dist = 0;
    let testPoint = { ...p };
    while (isPointInWater(testPoint) && dist < size * 3) {
      testPoint = {
        x: testPoint.x + Math.cos(rad) * step,
        y: testPoint.y + Math.sin(rad) * step,
      };
      dist += step;
    }
    return dist;
  };

  // Find best direction with most space
  const findBestDirection = (currentPos: Point, currentAngle: number): number => {
    const directions = [
      currentAngle, // Continue forward
      currentAngle + 45,
      currentAngle - 45,
      currentAngle + 90,
      currentAngle - 90,
      currentAngle + 135,
      currentAngle - 135,
      currentAngle + 180, // Turn around
    ].map((a) => ((a % 360) + 360) % 360);

    let bestDir = currentAngle;
    let maxDist = 0;

    for (const dir of directions) {
      const dist = getDistanceToBoundary(currentPos, dir);
      if (dist > maxDist) {
        maxDist = dist;
        bestDir = dir;
      }
    }

    // Smooth rotation - don't turn more than 45 degrees at once
    let angleDiff = bestDir - currentAngle;
    if (angleDiff > 180) angleDiff -= 360;
    if (angleDiff < -180) angleDiff += 360;
    const maxTurn = 3; // degrees per frame
    if (Math.abs(angleDiff) > maxTurn) {
      bestDir = currentAngle + Math.sign(angleDiff) * maxTurn;
    }

    return ((bestDir % 360) + 360) % 360;
  };

  // Initialize position - prefer zones if available
  useEffect(() => {
    if (waterBoundsRef.current.length === 0) return;
    // Prefer spawning in zones, otherwise use first cell
    const zoneBound = waterBoundsRef.current.find((_, idx) => idx >= cluster.length);
    const spawnBound = zoneBound || waterBoundsRef.current[0];
    const initPos = {
      x: spawnBound.center.x,
      y: spawnBound.center.y,
    };
    setPosition(initPos);
    setAngle(0); // Start facing right
    stateRef.current = { position: initPos, angle: 0 };
  }, [cluster, zones]);

  // Animation loop
  useEffect(() => {
    const animate = () => {
      const now = Date.now();
      const deltaTime = Math.min((now - lastUpdateRef.current) / 16.67, 2); // Cap at 2 frames
      lastUpdateRef.current = now;

      const prevPos = stateRef.current.position;
      const prevAngle = stateRef.current.angle;

      // Check if near boundary
      const distToBoundary = getDistanceToBoundary(prevPos, prevAngle);
      const threshold = size * 0.3;

      let newAngle = prevAngle;
      if (distToBoundary < threshold) {
        // Find new direction
        newAngle = findBestDirection(prevPos, prevAngle);
      }

      // Move forward in current direction
      const rad = (newAngle * Math.PI) / 180;
      const newPos = {
        x: prevPos.x + Math.cos(rad) * speed * deltaTime,
        y: prevPos.y + Math.sin(rad) * speed * deltaTime,
      };

      // Clamp to water bounds
      if (!isPointInWater(newPos)) {
        // If new position is outside, try to find valid position
        const validPos = { ...prevPos };
        let validAngle = newAngle;
        for (let attempt = 0; attempt < 8; attempt++) {
          const testAngle = (newAngle + attempt * 45) % 360;
          const testRad = (testAngle * Math.PI) / 180;
          const testPos = {
            x: prevPos.x + Math.cos(testRad) * speed * deltaTime * 0.5,
            y: prevPos.y + Math.sin(testRad) * speed * deltaTime * 0.5,
          };
          if (isPointInWater(testPos)) {
            validPos.x = testPos.x;
            validPos.y = testPos.y;
            validAngle = testAngle;
            break;
          }
        }
        stateRef.current = { position: validPos, angle: validAngle };
        setPosition(validPos);
        setAngle(validAngle);
      } else {
        stateRef.current = { position: newPos, angle: newAngle };
        setPosition(newPos);
        setAngle(newAngle);
      }

      animationFrameRef.current = requestAnimationFrame(animate);
    };

    if (waterBoundsRef.current.length > 0) {
      animationFrameRef.current = requestAnimationFrame(animate);
    }
    return () => {
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current);
      }
    };
  }, [speed, size, cluster.length]);

  return (
    <g mask={`url(#${maskId})`}>
      <g
        transform={`translate(${position.x}, ${position.y}) rotate(${angle}) scale(1.3)`}
        style={{ transformOrigin: 'center' }}
      >
        <g className="water-fish-body">
          <path
            d="M0 -8 C 14 -13, 22 -8, 27 0 C 22 8, 14 13, 0 8 Z"
            fill="url(#fishGradient)"
            stroke="#ffffff"
            strokeWidth="1.8"
            opacity={0.95}
          />
          <path d="M0 0 L -12 8 L -12 -8 Z" fill="#01579b" stroke="#ffffff" strokeWidth="1.2" opacity={0.95} />
          <circle cx="16" cy="-2" r="2.2" fill="#ffffff" opacity={0.95} />
          <circle cx="17.5" cy="-2" r="0.8" fill="#01579b" opacity={0.95} />
        </g>
      </g>
    </g>
  );
}

export default Fish;

