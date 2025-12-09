import HexCell from './HexCell';
import Fish from './Fish';
import { HEX_SPACING, GRID_SIZE } from '../constants';
import type { HexCellData, Point } from '../utils/hex';
import { hexToPixel, getHexCorners, getNeighbors } from '../utils/hex';

type HexGridProps = {
  grid: HexCellData[];
  size: number;
  onCellClick: (id: string) => void;
  selectionMode?: 'fill' | 'beam';
  orangeColor?: string;
  greenColor?: string;
  themeId?: string;
};

function HexGrid({ grid, size, onCellClick, selectionMode = 'fill', orangeColor, greenColor, themeId }: HexGridProps) {
  if (grid.length === 0) {
    return null;
  }
  const layoutSize = size * HEX_SPACING;
  const centers = grid.map((cell) => hexToPixel(cell, layoutSize));
  const xs = centers.map((p) => p.x);
  const ys = centers.map((p) => p.y);

  const minX = Math.min(...xs);
  const maxX = Math.max(...xs);
  const minY = Math.min(...ys);
  const maxY = Math.max(...ys);

  const padding = size * 1.6;
  const viewBox = `${minX - padding} ${minY - padding} ${(maxX - minX) + padding * 2} ${(maxY - minY) + padding * 2}`;

  // Precompute connected water clusters for fish (only in fire/ice theme)
  // Includes water cells (state 3) and green zones (blue zones)
  const waterClusters: Array<{ cells: HexCellData[]; zones: Array<{ bounds: { minX: number; maxX: number; minY: number; maxY: number }; corners: Point[] }> }> = [];
  if (themeId === 'fireice') {
    const waterCells = grid.filter((c) => c.state === 3);
    const byId = new Map(waterCells.map((c) => [c.id, c]));
    const visited = new Set<string>();

    // Treat green zones (blue zones) as water: simple triangles above and below the grid
    const gridWidth = maxX - minX;
    const padX = size * 1.5;
    const padY = size * 1.2;
    const zoneWidth = gridWidth + padX * 2;
    const zoneHeight = size * 2.0;
    const zoneLeft = minX - padX;
    const centerX = (minX + maxX) / 2;

    // Top zone (triangle)
    const topZoneBounds = {
      minX: zoneLeft,
      maxX: zoneLeft + zoneWidth,
      minY: minY - zoneHeight - padY,
      maxY: minY - padY,
    };
    const topZoneCorners: Point[] = [
      { x: topZoneBounds.minX, y: topZoneBounds.maxY },
      { x: topZoneBounds.maxX, y: topZoneBounds.maxY },
      { x: centerX, y: topZoneBounds.minY },
    ];

    // Bottom zone (triangle)
    const bottomZoneBounds = {
      minX: zoneLeft,
      maxX: zoneLeft + zoneWidth,
      minY: maxY + padY,
      maxY: maxY + padY + zoneHeight,
    };
    const bottomZoneCorners: Point[] = [
      { x: topZoneBounds.minX, y: bottomZoneBounds.minY },
      { x: topZoneBounds.maxX, y: bottomZoneBounds.minY },
      { x: centerX, y: bottomZoneBounds.maxY },
    ];

    // Find cells connected to zones (cells in top or bottom row)
    const topRowCells = waterCells.filter((c) => c.row === 0);
    const bottomRowCells = waterCells.filter((c) => c.row === GRID_SIZE - 1);

    // Create clusters: each zone + its connected cells
    if (topRowCells.length > 0) {
      const cluster: HexCellData[] = [];
      const queue = [...topRowCells];
      const clusterVisited = new Set<string>();

      while (queue.length) {
        const curr = queue.shift()!;
        if (clusterVisited.has(curr.id)) continue;
        clusterVisited.add(curr.id);
        cluster.push(curr);
        visited.add(curr.id);

        getNeighbors(curr).forEach((n) => {
          const nId = `${n.col},${n.row}`;
          const nCell = byId.get(nId);
          if (nCell && !clusterVisited.has(nId) && !visited.has(nId)) {
            queue.push(nCell);
          }
        });
      }

      if (cluster.length > 0) {
        waterClusters.push({
          cells: cluster,
          zones: [{ bounds: topZoneBounds, corners: topZoneCorners }],
        });
      }
    } else {
      // Zone with no connected cells - still spawn fish
      waterClusters.push({
        cells: [],
        zones: [{ bounds: topZoneBounds, corners: topZoneCorners }],
      });
    }

    if (bottomRowCells.length > 0) {
      const cluster: HexCellData[] = [];
      const queue = [...bottomRowCells];
      const clusterVisited = new Set<string>();

      while (queue.length) {
        const curr = queue.shift()!;
        if (clusterVisited.has(curr.id)) continue;
        clusterVisited.add(curr.id);
        cluster.push(curr);
        visited.add(curr.id);

        getNeighbors(curr).forEach((n) => {
          const nId = `${n.col},${n.row}`;
          const nCell = byId.get(nId);
          if (nCell && !clusterVisited.has(nId) && !visited.has(nId)) {
            queue.push(nCell);
          }
        });
      }

      if (cluster.length > 0) {
        waterClusters.push({
          cells: cluster,
          zones: [{ bounds: bottomZoneBounds, corners: bottomZoneCorners }],
        });
      }
    } else {
      // Zone with no connected cells - still spawn fish
      waterClusters.push({
        cells: [],
        zones: [{ bounds: bottomZoneBounds, corners: bottomZoneCorners }],
      });
    }

    // Remaining unvisited water cell clusters (not connected to zones)
    for (const cell of waterCells) {
      if (visited.has(cell.id)) continue;
      const queue = [cell];
      const cluster: HexCellData[] = [];
      visited.add(cell.id);
      while (queue.length) {
        const curr = queue.shift()!;
        cluster.push(curr);
        getNeighbors(curr).forEach((n) => {
          const nId = `${n.col},${n.row}`;
          const nCell = byId.get(nId);
          if (nCell && !visited.has(nId)) {
            visited.add(nId);
            queue.push(nCell);
          }
        });
      }
      if (cluster.length >= 2) {
        waterClusters.push({ cells: cluster, zones: [] });
      }
    }
  }

  // Precompute polygon points for clip paths
  const clipPaths = grid.map((cell) => {
    const { x, y } = hexToPixel(cell, layoutSize);
    const corners = getHexCorners({ x, y }, size);
    const points = corners.map((p) => `${p.x},${p.y}`).join(' ');
    return { id: cell.id, points };
  });

  return (
    <svg
      viewBox={viewBox}
      className="w-full h-full"
      preserveAspectRatio="xMidYMid meet"
    >
      <defs>
        {/* Fire look */}
        <linearGradient id="fireGradient" x1="0%" y1="0%" x2="0%" y2="100%">
          <stop offset="0%" stopColor="#fff59d">
            <animate attributeName="stop-color" values="#fff59d;#ffe082;#fff59d" dur="2s" repeatCount="indefinite" />
          </stop>
          <stop offset="55%" stopColor="#ff9800">
            <animate attributeName="stop-color" values="#ffb74d;#ff8a65;#ffb74d" dur="1.6s" repeatCount="indefinite" />
          </stop>
          <stop offset="100%" stopColor="#e65100" />
        </linearGradient>
        <filter id="fireDistortion" x="-25%" y="-25%" width="150%" height="150%">
          <feTurbulence type="fractalNoise" baseFrequency="0.03 0.1" numOctaves="3" seed="7">
            <animate attributeName="baseFrequency" dur="1.8s" values="0.02 0.08;0.05 0.12;0.02 0.08" repeatCount="indefinite" />
          </feTurbulence>
          <feDisplacementMap in="SourceGraphic" scale="8" xChannelSelector="R" yChannelSelector="G" />
        </filter>

        {/* Water look */}
        <linearGradient id="waterGradient" x1="0%" y1="0%" x2="0%" y2="100%">
          <stop offset="0%" stopColor="#bbdefb" />
          <stop offset="65%" stopColor="#64b5f6">
            <animate attributeName="stop-color" values="#64b5f6;#42a5f5;#64b5f6" dur="3.4s" repeatCount="indefinite" />
          </stop>
          <stop offset="100%" stopColor="#0d47a1" />
        </linearGradient>
        <filter id="waterDistortion" x="-30%" y="-30%" width="160%" height="160%">
          <feTurbulence type="fractalNoise" baseFrequency="0.01 0.04" numOctaves="2" seed="11">
            <animate attributeName="baseFrequency" dur="6s" values="0.01 0.04;0.015 0.05;0.01 0.04" repeatCount="indefinite" />
          </feTurbulence>
          <feDisplacementMap in="SourceGraphic" scale="12" />
        </filter>

        {/* Fire inner flame gradient */}
        <linearGradient id="fireFlameGradient" x1="0%" y1="0%" x2="0%" y2="100%">
          <stop offset="0%" stopColor="#fff9c4" />
          <stop offset="60%" stopColor="#ffb74d" />
          <stop offset="100%" stopColor="#e65100" />
        </linearGradient>

        {/* Fish body gradient */}
        <linearGradient id="fishGradient" x1="0%" y1="0%" x2="100%" y2="0%">
          <stop offset="0%" stopColor="#4dd0e1" />
          <stop offset="50%" stopColor="#0288d1" />
          <stop offset="100%" stopColor="#01579b" />
        </linearGradient>

        {/* Per-cell clips to keep effects inside hexes */}
        {clipPaths.map((c) => (
          <clipPath id={`hex-clip-${c.id}`} key={`clip-${c.id}`}>
            <polygon points={c.points} />
          </clipPath>
        ))}

        {/* Fish masks per cluster: union of water hex polygons and zones to keep fish inside water */}
        {themeId === 'fireice' &&
          waterClusters.map((cluster, idx) => {
            const boxes = cluster.cells.map((cell) => {
              const { x, y } = hexToPixel(cell, layoutSize);
              const corners = getHexCorners({ x, y }, size);
              const xs = corners.map((p: Point) => p.x);
              const ys = corners.map((p: Point) => p.y);
              return {
                minX: Math.min(...xs),
                maxX: Math.max(...xs),
                minY: Math.min(...ys),
                maxY: Math.max(...ys),
              };
            });
            const zoneBoxes = cluster.zones.map((z) => z.bounds);
            const allBoxes = [...boxes, ...zoneBoxes];

            if (allBoxes.length === 0) return null;

            const minX = Math.min(...allBoxes.map((b) => b.minX)) - size * 2;
            const maxX = Math.max(...allBoxes.map((b) => b.maxX)) + size * 2;
            const minY = Math.min(...allBoxes.map((b) => b.minY)) - size * 2;
            const maxY = Math.max(...allBoxes.map((b) => b.maxY)) + size * 2;
            return (
              <mask id={`fish-mask-${idx}`} key={`fish-mask-${idx}`} maskUnits="userSpaceOnUse" x={minX} y={minY} width={maxX - minX} height={maxY - minY}>
                <rect x={minX} y={minY} width={maxX - minX} height={maxY - minY} fill="black" />
                {cluster.cells.map((cell) => {
                  const clip = clipPaths.find((c) => c.id === cell.id);
                  if (!clip) return null;
                  return <polygon key={`fish-mask-poly-${cell.id}`} points={clip.points} fill="white" />;
                })}
                {cluster.zones.map((zone, zIdx) => (
                  <polygon key={`fish-mask-zone-${idx}-${zIdx}`} points={zone.corners.map((p) => `${p.x},${p.y}`).join(' ')} fill="white" />
                ))}
              </mask>
            );
          })}

      </defs>
      <g id="hex-grid">
        {/* Render all cells first (without beams and outlines) */}
        {grid.map((cell) => (
          <HexCell
            key={cell.id}
            cell={cell}
            size={size}
            layoutSize={layoutSize}
            onClick={onCellClick}
            selectionMode={selectionMode}
            renderBeam={false}
            orangeColor={orangeColor}
            greenColor={greenColor}
            themeId={themeId}
            clipId={`hex-clip-${cell.id}`}
            hideOutline={true}
          />
        ))}
      </g>
      {/* Fish layer for connected water clusters - rendered after cells but before outlines */}
      {themeId === 'fireice' && waterClusters.length > 0 && (
        <g id="water-fish-layer" style={{ pointerEvents: 'none' }}>
          {waterClusters.map((cluster, idx) => (
            <Fish
              key={`fish-${idx}`}
              cluster={cluster.cells}
              zones={cluster.zones}
              size={size}
              layoutSize={layoutSize}
              maskId={`fish-mask-${idx}`}
            />
          ))}
        </g>
      )}
      {/* Render all outlines on top of everything */}
      <g id="outline-layer">
        {grid.map((cell) => {
          const { x, y } = hexToPixel(cell, layoutSize);
          const corners = getHexCorners({ x, y }, size);
          const points = corners.map((p) => `${p.x},${p.y}`).join(' ');
          return (
            <polygon
              key={`outline-${cell.id}`}
              points={points}
              fill="none"
              stroke="#000000"
              strokeWidth={5}
              pointerEvents="none"
            />
          );
        })}
      </g>
      {/* Render all beams in a separate layer on top */}
      {selectionMode === 'beam' && (
        <g id="beam-layer">
          {grid
            .filter(cell => cell.state === 1)
            .map((cell) => {
              const { x, y } = hexToPixel(cell, layoutSize);
              const corners = getHexCorners({ x, y }, size);
              const points = corners.map((p) => `${p.x},${p.y}`).join(' ');
              return (
                <polygon
                  key={`beam-${cell.id}`}
                  points={points}
                  fill="none"
                  stroke="#ffd700"
                  strokeWidth={6}
                  strokeLinecap="round"
                  className="selection-beam"
                  style={{ pointerEvents: 'none' }}
                />
              );
            })}
        </g>
      )}
    </svg>
  );
}

export default HexGrid;

