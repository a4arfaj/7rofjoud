export const ARABIC_LETTERS = [
  'أ', 'ب', 'ت', 'ث', 'ج', 'ح', 'خ', 'د', 'ذ', 'ر', 'ز', 'س', 'ش', 'ص', 'ض', 'ط', 'ظ', 'ع', 'غ',
  'ف', 'ق', 'ك', 'ل', 'م', 'ن', 'هـ', 'و', 'ي'
];

export const GRID_SIZE = 5; // 5 rows x 5 columns = 25 cells

export const HEX_SIZE = 55; // Radius of a single hex in pixels
export const HEX_SPACING = 1.0; // Spacing between hex centers (1.0 = touching)

// Background zone distances from center (as percentages)
// Lower values = zones extend more toward center
// Higher values = zones stay closer to edges
export const ORANGE_ZONE_DISTANCE = 60; // How far orange zones extend INTO the container (0-50)
// NOTE: When viewport width < 430px, this is automatically set to 20
// 0 = stops at container edge
// Higher values = extends further into container, closer to honeycomb
export const GREEN_ZONE_DISTANCE = 80; // Distance from center for green top/bottom zones (0-50, where 50 = center)

// Background zone width/depth (as percentages)
export const ORANGE_ZONE_WIDTH = 20; // Vertical coverage of orange zones (0-50, controls how much height they cover)
// Orange zones cover from ORANGE_ZONE_WIDTH% to (100 - ORANGE_ZONE_WIDTH)%
// Lower values = wider coverage (zones cover more vertical space)
// Higher values = narrower coverage (zones cover less vertical space)

// Inner edge length control
export const ORANGE_INNER_EDGE_LENGTH = 50; // Length/height of the inner vertical edge (0-100)
// NOTE: When viewport width < 430px, this is automatically set to 5
// Controls how tall the inner edge of orange zones is (centered vertically)
// 50 = inner edge spans from 25% to 75% of height
// Lower values = shorter inner edge (e.g., 30 = spans from 35% to 65%)
// Higher values = taller inner edge (e.g., 70 = spans from 15% to 85%)

