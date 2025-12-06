import HexCell from './HexCell';
import { HEX_SPACING } from '../constants';
import type { HexCellData } from '../utils/hex';
import { hexToPixel, getHexCorners } from '../utils/hex';

type HexGridProps = {
  grid: HexCellData[];
  size: number;
  onCellClick: (id: string) => void;
  selectionMode?: 'fill' | 'beam';
  orangeColor?: string;
  greenColor?: string;
};

function HexGrid({ grid, size, onCellClick, selectionMode = 'fill', orangeColor, greenColor }: HexGridProps) {
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

  return (
    <svg
      viewBox={viewBox}
      className="w-full h-full"
      preserveAspectRatio="xMidYMid meet"
    >
      <g id="hex-grid">
        {/* Render all cells first (without beams) */}
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
          />
        ))}
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

