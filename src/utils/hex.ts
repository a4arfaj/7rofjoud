import { GRID_SIZE } from '../constants';

export interface HexCoord {
  col: number;
  row: number;
}

export interface HexCellData extends HexCoord {
  letter: string;
  id: string;
  state: 0 | 1 | 2 | 3; // 0: Original, 1: Glowing Yellow (selection), 2: Orange, 3: Green
}

export interface Point {
  x: number;
  y: number;
}

export function generateHexGrid(letters: string[]): HexCellData[] {
  const hexes: HexCellData[] = [];
  const shuffled = shuffleArray(letters);
  let letterIndex = 0;

  // Generate 5 rows, each with 5 cells in honeycomb offset pattern
  for (let row = 0; row < GRID_SIZE; row++) {
    for (let col = 0; col < GRID_SIZE; col++) {
      hexes.push({
        col,
        row,
        id: `${col},${row}`,
        letter: shuffled[letterIndex % shuffled.length] ?? '',
        state: 0,
      });
      letterIndex += 1;
    }
  }
  return hexes;
}

function shuffleArray<T>(input: T[]): T[] {
  const arr = [...input];
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
  return arr;
}

export function hexToPixel(hex: HexCoord, size: number): Point {
  // Pointy-topped hexagon with odd-row offset
  // For pointy-topped: width = sqrt(3) * size, height = 2 * size
  const hexWidth = size * Math.sqrt(3);
  const hexHeight = size * 1.5; // Vertical interlocking spacing

  // Offset: odd rows shift right by half a hex width
  const offsetX = hex.row % 2 === 1 ? hexWidth * 0.5 : 0;

  const x = hex.col * hexWidth + offsetX;
  const y = hex.row * hexHeight;
  return { x, y };
}

export function getHexCorners(center: Point, size: number): Point[] {
  const corners: Point[] = [];
  for (let i = 0; i < 6; i++) {
    // Pointy-topped: start at 30 degrees (point facing up)
    const angle_deg = 60 * i + 30;
    const angle_rad = (Math.PI / 180) * angle_deg;
    corners.push({
      x: center.x + size * Math.cos(angle_rad),
      y: center.y + size * Math.sin(angle_rad),
    });
  }
  return corners;
}

export function getNeighbors(hex: HexCoord): HexCoord[] {
  const { col, row } = hex;
  const isOddRow = row % 2 === 1;

  // For flat-topped with odd-row offset:
  // Even rows: neighbors at col-1 and col on diagonal
  // Odd rows: neighbors at col and col+1 on diagonal
  if (isOddRow) {
    return [
      { col: col - 1, row },       // left
      { col: col + 1, row },       // right
      { col, row: row - 1 },       // top-left
      { col: col + 1, row: row - 1 }, // top-right
      { col, row: row + 1 },       // bottom-left
      { col: col + 1, row: row + 1 }, // bottom-right
    ];
  } else {
    return [
      { col: col - 1, row },       // left
      { col: col + 1, row },       // right
      { col: col - 1, row: row - 1 }, // top-left
      { col, row: row - 1 },       // top-right
      { col: col - 1, row: row + 1 }, // bottom-left
      { col, row: row + 1 },       // bottom-right
    ];
  }
}

export function checkWin(
  grid: HexCellData[], 
  playerState: 2 | 3, // 2: Orange, 3: Green
  startCondition: (h: HexCoord) => boolean,
  endCondition: (h: HexCoord) => boolean
): boolean {
  // Filter grid for cells belonging to player
  const playerCells = grid.filter(h => h.state === playerState);
  const playerIds = new Set(playerCells.map(h => h.id));

  // Build graph
  const adj = new Map<string, string[]>();
  playerCells.forEach(cell => {
    const neighbors = getNeighbors(cell);
    neighbors.forEach(n => {
      const nId = `${n.col},${n.row}`;
      if (playerIds.has(nId)) {
        if (!adj.has(cell.id)) adj.set(cell.id, []);
        adj.get(cell.id)!.push(nId);
      }
    });
  });

  // Find start nodes
  const startNodes = playerCells.filter(startCondition);
  // Find end nodes (target set)
  const endNodeIds = new Set(playerCells.filter(endCondition).map(h => h.id));

  // BFS
  const queue = [...startNodes.map(n => n.id)];
  const visited = new Set(queue);

  while (queue.length > 0) {
    const curr = queue.shift()!;
    if (endNodeIds.has(curr)) return true;

    const neighbors = adj.get(curr) || [];
    for (const n of neighbors) {
      if (!visited.has(n)) {
        visited.add(n);
        queue.push(n);
      }
    }
  }

  return false;
}

// Green: Connect top (row 0) to bottom (row 4)
export const isGreenStart = (h: HexCoord) => h.row === 0;
export const isGreenEnd = (h: HexCoord) => h.row === GRID_SIZE - 1;

// Orange: Connect left (col 0) to right (col 4)
export const isOrangeStart = (h: HexCoord) => h.col === 0;
export const isOrangeEnd = (h: HexCoord) => h.col === GRID_SIZE - 1;
