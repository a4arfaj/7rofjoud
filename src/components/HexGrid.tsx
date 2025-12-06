import HexCell from './HexCell';
import { HEX_SPACING } from '../constants';
import type { HexCellData } from '../utils/hex';
import { hexToPixel } from '../utils/hex';

type HexGridProps = {
  grid: HexCellData[];
  size: number;
  onCellClick: (id: string) => void;
  selectionMode?: 'fill' | 'beam';
};

function HexGrid({ grid, size, onCellClick, selectionMode = 'fill' }: HexGridProps) {
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
        {grid.map((cell) => (
          <HexCell
            key={cell.id}
            cell={cell}
            size={size}
            layoutSize={layoutSize}
            onClick={onCellClick}
            selectionMode={selectionMode}
          />
        ))}
      </g>
    </svg>
  );
}

export default HexGrid;

