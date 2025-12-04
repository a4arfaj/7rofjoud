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
  if (cell.state === 1) fillColor = '#f9a826';
  else if (cell.state === 2) fillColor = '#3ecf5e';

  return (
    <g onClick={() => onClick(cell.id)} className="cursor-pointer">
      <polygon
        points={points}
        fill={fillColor}
        stroke="#000000"
        strokeWidth={5}
        className="transition-[fill] duration-200"
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
