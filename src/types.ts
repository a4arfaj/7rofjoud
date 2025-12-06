export interface BubbleData {
  id: string;
  name: string;
  x: number;
  size: number;
  speed: number;
  wobbleOffset: number;
  spawnTime: number;
  popped?: boolean;
  popTime?: number;
}

export interface Player {
  name: string;
  team: 'green' | 'orange';
}

export interface BuzzerState {
  active: boolean;
  playerName: string | null;
  timestamp: number;
}

