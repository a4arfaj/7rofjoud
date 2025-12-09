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
  const [speed] = useState(0.45 + Math.random() * 0.25); // pixels per frame (slower to avoid popping)
  const animationFrameRef = useRef<number | undefined>(undefined);
  const lastUpdateRef = useRef<number>(Date.now());
  const stateRef = useRef<{ position: Point; angle: number }>({ position: { x: 0, y: 0 }, angle: 0 });
  const wanderAngleRef = useRef<number>(0); // Random wander offset
  const nextWanderChangeRef = useRef<number>(Date.now());
  const targetRef = useRef<Point | null>(null);
  const nextTargetChangeRef = useRef<number>(Date.now());

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

  const randomPointInTriangle = (a: Point, b: Point, c: Point): Point => {
    let u = Math.random();
    let v = Math.random();
    if (u + v > 1) {
      u = 1 - u;
      v = 1 - v;
    }
    return {
      x: a.x + u * (b.x - a.x) + v * (c.x - a.x),
      y: a.y + u * (b.y - a.y) + v * (c.y - a.y),
    };
  };

  const pickRandomZonePoint = (): Point | null => {
    if (!zones.length) return null;
    const z = zones[Math.floor(Math.random() * zones.length)];
    if (z.corners.length >= 3) {
      return randomPointInTriangle(z.corners[0], z.corners[1], z.corners[2]);
    }
    return {
      x: (z.bounds.minX + z.bounds.maxX) / 2,
      y: (z.bounds.minY + z.bounds.maxY) / 2,
    };
  };

  // Pick a random point inside any water area (zones or cells)
  const pickRandomWaterPoint = (): Point | null => {
    const bounds = waterBoundsRef.current;
    if (!bounds.length) return null;
    
    // Try to find a valid point
    for (let i = 0; i < 20; i++) {
      const b = bounds[Math.floor(Math.random() * bounds.length)];
      // For triangular zones, use triangle sampling
      if (b.corners.length === 3) {
        const pt = randomPointInTriangle(b.corners[0], b.corners[1], b.corners[2]);
        if (isPointInWater(pt)) return pt;
      } else {
        // For hex cells, sample within bounding box
        const candidate = {
          x: b.minX + Math.random() * (b.maxX - b.minX),
          y: b.minY + Math.random() * (b.maxY - b.minY),
        };
        if (isPointInWater(candidate)) return candidate;
      }
    }
    // Fallback to center of first bound
    return bounds[0].center;
  };

  // Initialize position - prefer zones if available
  useEffect(() => {
    if (waterBoundsRef.current.length === 0) return;
    const zonePoint = pickRandomZonePoint();
    const initAngle = Math.random() * 360; // Random starting direction
    
    if (zonePoint) {
      setPosition(zonePoint);
      setAngle(initAngle);
      stateRef.current = { position: zonePoint, angle: initAngle };
      wanderAngleRef.current = (Math.random() - 0.5) * 40;
      targetRef.current = pickRandomWaterPoint();
      nextTargetChangeRef.current = Date.now() + 2000 + Math.random() * 3000;
      return;
    }

    const spawnBound = waterBoundsRef.current[0];
    const initPos = {
      x: spawnBound.center.x,
      y: spawnBound.center.y,
    };
    setPosition(initPos);
    setAngle(initAngle);
    stateRef.current = { position: initPos, angle: initAngle };
    wanderAngleRef.current = (Math.random() - 0.5) * 40;
    targetRef.current = pickRandomWaterPoint();
    nextTargetChangeRef.current = Date.now() + 2000 + Math.random() * 3000;
  }, [cluster, zones]);

  // Animation loop
  useEffect(() => {
    const animate = () => {
      const now = Date.now();
      const deltaTime = Math.min((now - lastUpdateRef.current) / 16.67, 1); // Cap at ~1 frame to avoid big jumps
      lastUpdateRef.current = now;

      const prevPos = stateRef.current.position;
      const prevAngle = stateRef.current.angle;

      // Periodically update wander angle for natural swimming
      if (now > nextWanderChangeRef.current) {
        wanderAngleRef.current = (Math.random() - 0.5) * 40; // ±20 degrees wander
        nextWanderChangeRef.current = now + 800 + Math.random() * 1200;
      }

      // Periodically pick new target to swim towards
      if (!targetRef.current || now > nextTargetChangeRef.current) {
        targetRef.current = pickRandomWaterPoint();
        nextTargetChangeRef.current = now + 3000 + Math.random() * 4000;
      }

      // Check distance to boundary in current direction
      const distToBoundary = getDistanceToBoundary(prevPos, prevAngle);
      const boundaryThreshold = size * 0.8;

      let desiredAngle = prevAngle;

      if (distToBoundary < boundaryThreshold) {
        // Near boundary - find best escape direction
        desiredAngle = findBestDirection(prevPos, prevAngle);
      } else if (targetRef.current) {
        // Swim towards target with wander offset
        const dx = targetRef.current.x - prevPos.x;
        const dy = targetRef.current.y - prevPos.y;
        const angleToTarget = (Math.atan2(dy, dx) * 180) / Math.PI;
        desiredAngle = angleToTarget + wanderAngleRef.current;

        // If close to target, pick new one sooner
        const distToTarget = Math.sqrt(dx * dx + dy * dy);
        if (distToTarget < size * 1.5) {
          targetRef.current = pickRandomWaterPoint();
          nextTargetChangeRef.current = now + 2000 + Math.random() * 3000;
        }
      }

      // Smooth rotation - fish turns gradually, not instantly
      let angleDiff = desiredAngle - prevAngle;
      if (angleDiff > 180) angleDiff -= 360;
      if (angleDiff < -180) angleDiff += 360;
      
      const maxTurn = 1.8 * deltaTime; // degrees per frame
      let newAngle = prevAngle;
      if (Math.abs(angleDiff) > maxTurn) {
        newAngle = prevAngle + Math.sign(angleDiff) * maxTurn;
      } else {
        newAngle = desiredAngle;
      }
      newAngle = ((newAngle % 360) + 360) % 360;

      // Move forward in current direction
      const rad = (newAngle * Math.PI) / 180;
      const newPos = {
        x: prevPos.x + Math.cos(rad) * speed * deltaTime,
        y: prevPos.y + Math.sin(rad) * speed * deltaTime,
      };

      // Clamp to water bounds
      if (!isPointInWater(newPos)) {
        // If new position is outside, try an escape step toward safest direction
        const escapeDir = findBestDirection(prevPos, prevAngle);
        const escapeRad = (escapeDir * Math.PI) / 180;
        const escapePos = {
          x: prevPos.x + Math.cos(escapeRad) * speed * deltaTime * 0.3,
          y: prevPos.y + Math.sin(escapeRad) * speed * deltaTime * 0.3,
        };

        if (isPointInWater(escapePos)) {
          stateRef.current = { position: escapePos, angle: escapeDir };
          setPosition(escapePos);
          setAngle(escapeDir);
        } else {
          // Stay in place and turn away if we still can't find space
          stateRef.current = { position: prevPos, angle: escapeDir };
          setPosition(prevPos);
          setAngle(escapeDir);
        }
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

