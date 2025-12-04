# Arabic Hex Game

An interactive hexagonal grid game featuring Arabic letters. Click cells to toggle colors between original (white), orange, and green. Connect paths from side-to-side (orange) or top-to-bottom (green) to win!

## Features

- 5x5 hexagonal honeycomb grid with Arabic letters
- Click cells to cycle through states: Original → Orange → Green → Original
- Win detection for connected paths
- Beautiful diagonal background zones
- Responsive design that scales with viewport

## Setup

```bash
npm install
npm run dev
```

## Build

```bash
npm run build
```

## Game Rules

- Click a cell once to make it **Orange**
- Click twice to make it **Green**
- Click three times to return to **Original** (White)
- **Green wins**: Connect green cells from top to bottom
- **Orange wins**: Connect orange cells from left to right

## Technologies

- React + TypeScript
- Vite
- Tailwind CSS v4
- Custom hexagonal grid mathematics
