export const ARABIC_LETTERS = [
  'أ', 'ب', 'ت', 'ث', 'ج', 'ح', 'خ', 'د', 'ذ', 'ر', 'ز', 'س', 'ش', 'ص', 'ض', 'ط', 'ظ', 'ع', 'غ',
  'ف', 'ق', 'ك', 'ل', 'م', 'ن', 'هـ', 'و', 'ي'
];

export const GRID_SIZE = 5; // 5 rows x 5 columns = 25 cells

export const HEX_SIZE = 65; // Radius of a single hex in pixels
export const HEX_SPACING = 1.0; // Spacing between hex centers (1.0 = touching)
export const HONEYCOMB_HORIZONTAL_POSITION = 0; // Horizontal position offset of honeycomb (as % of container width)
// Controls the horizontal position of the honeycomb grid
// 0 = centered, positive = move right, negative = move left, no limitation on values

// Orange Zone Inner Edge Controls
export const ORANGE_INNER_EDGE_LENGTH = 2.7; // Vertical span of orange zone inner edge (as % of grid height)
// Controls how tall the inner vertical edge is
// 100 = inner edge spans full grid height, 50 = half grid height, etc.
export const ORANGE_INNER_EDGE_WIDTH = 60; // Horizontal depth of orange zones (as % of container width)
// Controls how far orange zones extend from the sides toward the center
// Higher values = zones extend further toward honeycomb
export const ORANGE_INNER_EDGE_POSITION = 50; // Horizontal offset of inner edge (as % of grid width)
// Moves the inner edge left/right. Positive = toward center, Negative = toward edge
// 0 = aligned with grid edge, no limitation on values
export const ORANGE_OUTER_EDGE_LENGTH = 120; // Vertical length of orange zone outer edge (as % of grid height)
// Controls the length of the outer vertical edge (left/right edge) of orange zones
// 100 = full grid height, 50 = half grid height, no limitation on values
export const ORANGE_OUTER_EDGE_OFFSET = 5.78; // Horizontal offset of orange zones from grid (as % of grid width)
// Controls how far orange zones extend outward from the grid edges
// This replaces the old 2.5vw value, now as percentage of grid container

// Green Zone Inner Edge Controls  
export const GREEN_INNER_EDGE_LENGTH = 20; // Horizontal span of green zone inner edge (as % of grid width)
// Controls how wide the inner horizontal edge is
// 100 = inner edge spans full grid width, 50 = half grid width, etc.
export const GREEN_INNER_EDGE_WIDTH = 90; // Vertical depth of green zones (as % from top/bottom)
// Controls how far green zones extend from top/bottom toward the center
// Higher values = zones extend further toward honeycomb
export const GREEN_INNER_EDGE_POSITION = 76; // Vertical offset of inner edge (as % of grid height)
// Moves the inner edge up/down. Positive = toward center, Negative = toward edge
// 0 = aligned with grid edge, no limitation on values
export const GREEN_OUTER_EDGE_LENGTH = 130.9; // Horizontal length of green zone outer edge (as % of grid width)
// Controls the length of the outer horizontal edge (top/bottom edge) of green zones
// 100 = full grid width, 50 = half grid width, no limitation on values
export const GREEN_OUTER_EDGE_OFFSET = -4.000000; // Vertical offset of green zones from grid (as % of grid height)
// Controls how far green zones extend outward from the grid edges
// This replaces the old 2.5vh value, now as percentage of grid container

// Water Zone Controls (fire/ice theme) — independent from green defaults
// Adjust these to reposition/resize the blue triangles without affecting green
export const WATER_INNER_EDGE_LENGTH = 20;   // % of grid width
export const WATER_INNER_EDGE_WIDTH = 90;    // % depth from top/bottom
export const WATER_INNER_EDGE_POSITION = 76; // % vertical offset of inner edge
export const WATER_OUTER_EDGE_LENGTH = 130.9; // % horizontal length of outer edge
export const WATER_OUTER_EDGE_OFFSET = -4.0;  // % vertical offset of outer edge
export const WATER_POSITION_OFFSET_X = 31;     // % horizontal shift of water zones container
export const WATER_POSITION_OFFSET_Y = 0;     // % vertical shift of water zones container
export const WATER_LOWER_EDGE_POSITION = 80;   // % extra offset applied only to the lower water triangle

// Water Zone Bubble Controls (fire/ice theme)
export const WATER_ZONE_BUBBLE_OFFSET_X = -23; // % horizontal offset for all bubbles (positive = right, negative = left)
// Adjusts the horizontal position of all bubbles in water zones
export const WATER_ZONE_BUBBLE_OFFSET_Y = -167; // % vertical offset for all bubbles (positive = down, negative = up)
// Adjusts the vertical position of all bubbles in water zones
export const WATER_ZONE_BUBBLE_START_TOP = 15; // % from top/bottom where bubbles start (top triangle uses bottom, bottom triangle uses top)
// Controls the starting position of bubbles in water zones
// Higher values = bubbles start further from the edge
export const WATER_ZONE_BUBBLE_ANIMATION_DURATION = 5; // Duration of bubble rise animation in seconds
// Controls how fast bubbles rise through the water zones
// Lower values = faster animation, Higher values = slower animation
export const WATER_ZONE_BUBBLE_POSITIONS = [
  { left: 3, size: 41, delay: 0 },    // left: % from left, size: px, delay: seconds
  { left: 27, size: 19, delay: 0.9 },
  { left: 14, size: 36, delay: 2.2 },
  { left: 59, size: 28, delay: 1.7 },
  { left: 42, size: 23, delay: 3.3 },
  { left: 8, size: 39, delay: 2.8 },
  { left: 73, size: 31, delay: 4.1 },
  { left: 21, size: 26, delay: 3.6 },
  { left: 51, size: 34, delay: 5.2 },
  { left: 35, size: 20, delay: 4.7 },
  { left: 66, size: 37, delay: 6.4 },
  { left: 17, size: 29, delay: 5.9 },
  { left: 48, size: 22, delay: 7.1 },
  { left: 31, size: 40, delay: 6.8 },
  { left: 79, size: 25, delay: 8.3 },
  { left: 11, size: 33, delay: 7.7 },
  { left: 54, size: 50, delay: 8.1 },
  { left: 38, size: 30, delay: 7.6 },
  { left: 69, size: 24, delay: 9.2 },
  { left: 25, size: 38, delay: 8.5 },
];
// Array of bubble configurations for water zones
// Each bubble has: left position (% from left edge), size (px), and delay (seconds)
// Add or remove bubbles by modifying this array

// Selection Mode Coloring Controls
export const SELECTION_START_COLOR = '#fff9e6'; // Start color for fill mode selection animation
// Very light yellow/white color that the selection animation starts from
export const SELECTION_END_COLOR = '#ffd700'; // End color for fill mode selection animation
// Full yellow/gold color that the selection animation transitions to
export const SELECTION_ANIMATION_SPEED = 1.5; // Speed of fill mode selection animation in seconds
// Controls how fast the color transition happens in fill mode
// Lower values = faster animation, Higher values = slower animation

export const BEAM_COLOR = '#ffd700'; // Color for beam mode selection border
// Color of the animated border in beam mode
export const BEAM_ANIMATION_SPEED = 1.2; // Speed of beam mode animation in seconds
// Controls how fast the beam spins around the cell border
// Lower values = faster spin, Higher values = slower spin

// Frame Controls - Edit size and position here
export const FRAME_BORDER_WIDTH = 10; // Frame border thickness in pixels
export const FRAME_BORDER_COLOR = 'rgba(75, 51, 206, 0.95)'; // Frame border color
export const FRAME_BORDER_RADIUS = 10; // Frame corner radius in pixels
export const FRAME_PADDING_HORIZONTAL = 32; // Extra width added to frame (as % of container)
export const FRAME_PADDING_VERTICAL = 22; // Extra height added to frame (as % of container)
export const FRAME_POSITION_OFFSET_X = 0; // Horizontal position adjustment (positive = right, negative = left, as % of container)
export const FRAME_POSITION_OFFSET_Y = 0; // Vertical position adjustment (positive = down, negative = up, as % of container)

export const COLOR_THEMES = [
  { id: 'classical', name: 'معهود', orange: '#f4841f', green: '#3fa653' },
  { id: 'royal', name: 'ملكي', orange: '#ffd740', green: '#7c4dff' }, // Gold & Purple
  { id: 'fireice', name: 'نار وماء', orange: '#ff5252', green: '#448aff' }, // Red & Blue
  { id: 'nature', name: 'طبيعة', orange: '#ffab91', green: '#009688' } // Coral & Teal
];

