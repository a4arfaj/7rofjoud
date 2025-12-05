import { getHexCorners, hexToPixel } from '../utils/hex';
import type { HexCellData } from '../utils/hex';

type HexCellProps = {
  cell: HexCellData;
  size: number;
  layoutSize?: number;
  onClick: (id: string) => void;
};

function HexCell({ cell, size, layoutSize, onClick }: HexCellProps) {
  const effectiveLayoutSize = layoutSize || size;
  const { x, y } = hexToPixel(cell, effectiveLayoutSize);
  const corners = getHexCorners({ x, y }, size);
  const points = corners.map((p) => `${p.x},${p.y}`).join(' ');

  let fillColor = '#ffffff';
  if (cell.state === 1) {
    fillColor = '#fff9e6'; // Start with white-ish yellow for animation
  } else if (cell.state === 2) {
    fillColor = '#f9a826'; // Orange
  } else if (cell.state === 3) {
    fillColor = '#3ecf5e'; // Green
  }

  return (
    <g onClick={() => onClick(cell.id)} className="cursor-pointer">
      {cell.state === 1 && (
        <>
          {/* Glow effect layer */}
          <polygon
            points={points}
            fill="#ffd700"
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
        className={cell.state === 1 ? 'glowing-yellow' : 'transition-[fill] duration-200'}
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
    </g>
  );
}

export default HexCell;
