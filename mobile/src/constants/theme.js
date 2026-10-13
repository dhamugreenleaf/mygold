import { darkColors, lightColors, goldPalette, gradientPresets } from './colors';
import { typography, fontFamilies, fontSizes, fontWeights } from './typography';
import { spacing, layout, borderRadius, iconSizes } from './spacing';

export { gradientPresets };

/**
 * MyGold Mobile Design System - Theme Objects
 * 
 * Provides unified, structured theme objects for both Obsidian Vault (Dark)
 * and Ivory Navy (Light) themes, easily consumable via Context or direct import.
 */

export const darkTheme = {
  isDark: true,
  mode: 'dark',
  colors: darkColors,
  goldPalette,
  gradients: gradientPresets,
  typography,
  fontFamilies,
  fontSizes,
  fontWeights,
  spacing,
  layout,
  borderRadius,
  iconSizes,
  shadows: {
    card: {
      shadowColor: '#000000',
      shadowOffset: { width: 0, height: 4 },
      shadowOpacity: 0.35,
      shadowRadius: 12,
      elevation: 5,
    },
    goldGlow: {
      shadowColor: '#E8B331',
      shadowOffset: { width: 0, height: 0 },
      shadowOpacity: 0.3,
      shadowRadius: 10,
      elevation: 6,
    },
    button: {
      shadowColor: '#E8B331',
      shadowOffset: { width: 0, height: 4 },
      shadowOpacity: 0.25,
      shadowRadius: 8,
      elevation: 4,
    },
  },
};

export const lightTheme = {
  isDark: false,
  mode: 'light',
  colors: lightColors,
  goldPalette,
  typography,
  fontFamilies,
  fontSizes,
  fontWeights,
  spacing,
  layout,
  borderRadius,
  iconSizes,
  shadows: {
    card: {
      shadowColor: '#172033',
      shadowOffset: { width: 0, height: 2 },
      shadowOpacity: 0.06,
      shadowRadius: 10,
      elevation: 3,
    },
    goldGlow: {
      shadowColor: '#D97706',
      shadowOffset: { width: 0, height: 0 },
      shadowOpacity: 0.2,
      shadowRadius: 8,
      elevation: 4,
    },
    button: {
      shadowColor: '#D97706',
      shadowOffset: { width: 0, height: 3 },
      shadowOpacity: 0.2,
      shadowRadius: 6,
      elevation: 3,
    },
  },
};

export const getTheme = (isDark = true) => (isDark ? darkTheme : lightTheme);

export default {
  dark: darkTheme,
  light: lightTheme,
  getTheme,
};
