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

