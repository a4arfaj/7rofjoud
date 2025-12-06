import { getHexCorners, hexToPixel } from '../utils/hex';
import type { HexCellData } from '../utils/hex';
import { SELECTION_START_COLOR, SELECTION_END_COLOR, BEAM_COLOR } from '../constants';

type HexCellProps = {
  cell: HexCellData;
  size: number;
  layoutSize?: number;
  onClick: (id: string) => void;
  selectionMode?: 'fill' | 'beam';
  renderBeam?: boolean;
};

function HexCell({ cell, size, layoutSize, onClick, selectionMode = 'fill', renderBeam = true }: HexCellProps) {
  const effectiveLayoutSize = layoutSize || size;
  const { x, y } = hexToPixel(cell, effectiveLayoutSize);
  const corners = getHexCorners({ x, y }, size);
  const points = corners.map((p) => `${p.x},${p.y}`).join(' ');

  const isSelected = cell.state === 1;

  let fillColor = '#ffffff';
  if (isSelected && selectionMode === 'fill') {
    fillColor = SELECTION_START_COLOR; // Start color from constants
  } else if (cell.state === 2) {
    fillColor = '#f9a826'; // Orange
  } else if (cell.state === 3) {
    fillColor = '#3ecf5e'; // Green
  }

  return (
    <g onClick={() => onClick(cell.id)} className="cursor-pointer">
      {isSelected && selectionMode === 'fill' && (
        <>
          {/* Glow effect layer */}
          <polygon
            points={points}
            fill={SELECTION_END_COLOR}
            stroke="none"
            className="glowing-yellow-glow"
            opacity="0.6"
          />
        </>
      )}
      <polygon
        points={points}
        fill={fillColor}
        stroke="#000000"
        strokeWidth={5}
        className={isSelected && selectionMode === 'fill' ? 'glowing-yellow' : 'transition-[fill] duration-200'}
      />
      <text
        x={x}
        y={y}
        textAnchor="middle"
        dy=".35em"
        fontSize={size * 0.9}
        fill="#2255cc"
        fontWeight="900"
        style={{
          fontFamily: "'Cairo', 'Amiri', 'Noto Sans Arabic', serif",
          userSelect: 'none',
          WebkitUserSelect: 'none',
          MozUserSelect: 'none',
          msUserSelect: 'none',
          pointerEvents: 'none',
        }}
        pointerEvents="none"
      >
        {cell.letter}
      </text>
      {/* Beam rendered last to ensure it's above everything in this cell */}
      {isSelected && selectionMode === 'beam' && renderBeam && (
        <polygon
          points={points}
          fill="none"
          stroke={BEAM_COLOR}
          strokeWidth={6}
          strokeLinecap="round"
          className="selection-beam"
          style={{ pointerEvents: 'none' }}
        />
      )}
    </g>
  );
}

export default HexCell;
