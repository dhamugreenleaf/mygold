/**
 * MyGold Mobile Design System - Spacing & Layout Tokens
 * 
 * Standardized 4pt/8pt grid scale for predictable, harmonious spacing across mobile screens.
 */

export const spacing = {
  none: 0,
  xxs: 2,
  xs: 4,
  sm: 8,
  md: 12,
  base: 16,
  lg: 20,
  xl: 24,
  '2xl': 32,
  '3xl': 40,
  '4xl': 48,
  '5xl': 64,
};

export const layout = {
  // Screen edge gutters
  screenPaddingHorizontal: 16,
  screenPaddingVertical: 20,
  headerHeight: 60,
  bottomTabBarHeight: 64,

  // Component containers
  cardPadding: 16,
  cardPaddingLarge: 20,
  modalPadding: 24,
  inputHeight: 52,
  buttonHeight: 50,
  buttonHeightSmall: 38,
};

export const borderRadius = {
  none: 0,
  xs: 6,
  sm: 8,
  md: 12,
  lg: 16,
  xl: 20,
  '2xl': 24,
  '3xl': 32,
  full: 9999,
};

export const iconSizes = {
  xs: 14,
  sm: 18,
  md: 22,
  lg: 26,
  xl: 32,
  '2xl': 44,
};

export default {
  spacing,
  layout,
  borderRadius,
  iconSizes,
};
