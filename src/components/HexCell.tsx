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
  orangeColor?: string;
  greenColor?: string;
  themeId?: string;
  clipId?: string;
  hideOutline?: boolean;
};

function HexCell({ cell, size, layoutSize, onClick, selectionMode = 'fill', renderBeam = true, orangeColor = '#f9a826', greenColor = '#3ecf5e', themeId, clipId, hideOutline = false }: HexCellProps) {
  const effectiveLayoutSize = layoutSize || size;
  const { x, y } = hexToPixel(cell, effectiveLayoutSize);
  const corners = getHexCorners({ x, y }, size);
  const points = corners.map((p) => `${p.x},${p.y}`).join(' ');

  const isSelected = cell.state === 1;
  const isFireTheme = themeId === 'fireice';
  const isFireCell = isFireTheme && cell.state === 2;
  const isWaterCell = isFireTheme && cell.state === 3;

  let fillColor = '#ffffff';
  if (isSelected && selectionMode === 'fill') {
    fillColor = SELECTION_START_COLOR; // Start color from constants
  } else if (cell.state === 2) {
    fillColor = orangeColor; // Dynamic Orange
  } else if (cell.state === 3) {
    fillColor = greenColor; // Dynamic Green
  }

  const polygonFill = isFireCell
    ? 'url(#fireGradient)'
    : isWaterCell
      ? 'url(#waterGradient)'
      : fillColor;

  const strokeColor = isFireCell ? '#ffcc80' : isWaterCell ? '#bbdefb' : '#000000';
  const filterUrl = isFireCell ? 'url(#fireDistortion)' : isWaterCell ? 'url(#waterDistortion)' : undefined;

  const polygonClass = [
    isSelected && selectionMode === 'fill' ? 'glowing-yellow' : 'transition-[fill] duration-200',
    isFireCell ? 'fire-cell' : '',
    isWaterCell ? 'water-cell' : ''
  ].filter(Boolean).join(' ');

  const textColor = isFireCell || isWaterCell ? '#fefefe' : '#2255cc';

  const bubbleOffsets = [
    { dx: -size * 0.18, dy: size * 0.24, r: size * 0.12, delay: '0s' },
    { dx: size * 0.1, dy: size * 0.18, r: size * 0.08, delay: '0.7s' },
    { dx: size * 0.02, dy: size * -0.02, r: size * 0.06, delay: '1.4s' },
  ];
  const clipUrl = clipId ? `url(#${clipId})` : undefined;

  return (
    <g 
      onClick={() => onClick(cell.id)} 
      className={`cursor-pointer ${isFireCell ? 'fire-cell-group' : ''} ${isWaterCell ? 'water-cell-group' : ''}`}
    >
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
        fill={polygonFill}
        stroke="none"
        className={polygonClass}
        filter={filterUrl}
        clipPath={clipUrl}
      />
      {isFireCell && (
        <>
          <polygon
            points={points}
            fill="none"
            stroke="rgba(255, 214, 102, 0.5)"
            strokeWidth={10}
            className="fire-rim"
            pointerEvents="none"
          />
          <g clipPath={clipUrl}>
            <g
              className="fire-flame"
              transform={`translate(${x}, ${y}) scale(1)`}
              pointerEvents="none"
            >
              <path
                d={`M ${-size * 0.08} ${size * 0.28}
                   Q ${-size * 0.22} ${size * 0.02} ${-size * 0.05} ${-size * 0.42}
                   Q ${size * 0.08} ${-size * 0.14} ${size * 0.16} ${size * 0.18}
                   Q ${size * 0.12} ${size * 0.42} 0 ${size * 0.48} Z`}
                fill="url(#fireFlameGradient)"
                className="fire-flame-shape"
              />
            </g>
          </g>
        </>
      )}
      {isWaterCell && (
        <g clipPath={clipUrl}>
          {bubbleOffsets.map((b, idx) => (
            <circle
              key={`${cell.id}-bubble-${idx}`}
              cx={x + b.dx}
              cy={y + b.dy}
              r={b.r}
              className="water-bubble"
              style={{ animationDelay: b.delay }}
              pointerEvents="none"
            />
          ))}
        </g>
      )}
      {/* Top outline always above effects */}
      {!hideOutline && (
        <polygon
          points={points}
          fill="none"
          stroke="#000000"
          strokeWidth={5}
          pointerEvents="none"
        />
      )}
      <text
        x={x}
        y={y}
        textAnchor="middle"
        dy=".35em"
        fontSize={size * 0.9}
        fill={textColor}
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
