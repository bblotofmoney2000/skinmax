export const COLORS = {
  // Skin/Earth tones - Warm, luxurious, dermatological
  taupe: {
    50: "#FCFAF7",
    100: "#F9F7F2", // Main Background
    200: "#F2EBE5", // Secondary Background / Cards
    300: "#E6DCCA", // Borders
    400: "#D4C5B5", // Muted elements
    500: "#C2AFA0", // Icons / Accents
    600: "#A69080", // Primary Action
    700: "#8C7666", // Titles
    800: "#5D4C40", // Text
    900: "#453830", // Dark Text
    950: "#2D241F", // Contrast
  },
  accent: {
    gold: "#D4B996", // Luxury accent
    warm: "#E6BEAE", // Skin accent
    soft: "#F5E6E0",
  },
  status: {
    success: "#95A899",
    warning: "#D4B08C",
    error: "#CC9C98",
  },
  white: "#FFFFFF",
  transparent: "transparent",
} as const;

export default {
  light: {
    text: COLORS.taupe[900],
    background: COLORS.taupe[100],
    tint: COLORS.taupe[600],
    tabIconDefault: COLORS.taupe[400],
    tabIconSelected: COLORS.taupe[600],
  },
  dark: {
    text: COLORS.taupe[100],
    background: COLORS.taupe[950],
    tint: COLORS.accent.gold,
    tabIconDefault: COLORS.taupe[600],
    tabIconSelected: COLORS.accent.gold,
  },
};
