import { Platform } from 'react-native';

/**
 * MyGold Mobile Design System - Typography Tokens
 * 
 * Font families match the web application with robust platform fallbacks:
 * - Heading: Cinzel, Playfair Display
 * - Body: Plus Jakarta Sans, System Sans-Serif
 * - Numerals & Metrics: Outfit, Plus Jakarta Sans
 */

export const fontFamilies = {
  // Brand / Heading fonts (Cinzel / Playfair Display)
  heading: Platform.select({
    ios: 'Cinzel',
    android: 'Cinzel',
    default: 'serif',
  }),
  cinzel: Platform.select({
    ios: 'Cinzel',
    android: 'Cinzel',
    default: 'serif',
  }),
  playfair: Platform.select({
    ios: 'Playfair Display',
    android: 'Playfair Display',
    default: 'serif',
  }),

  // Primary body & UI font (Plus Jakarta Sans)
  body: Platform.select({
    ios: 'Plus Jakarta Sans',
    android: 'Plus Jakarta Sans',
    default: 'sans-serif',
  }),
  sans: Platform.select({
    ios: 'System',
    android: 'Roboto',
    default: 'sans-serif',
  }),

  // Numerals / Badges font (Outfit)
  numbers: Platform.select({
    ios: 'Outfit',
    android: 'Outfit',
    default: 'sans-serif',
  }),
};

export const fontSizes = {
  xs: 11,
  sm: 13,
  base: 15,
  md: 16,
  lg: 18,
  xl: 20,
  '2xl': 24,
  '3xl': 28,
  '4xl': 34,
  '5xl': 40,
};

export const fontWeights = {
  light: '300',
  regular: '400',
  medium: '500',
  semiBold: '600',
  bold: '700',
  extraBold: '800',
  black: '900',
};

export const lineHeights = {
  tight: 1.15,
  normal: 1.35,
  relaxed: 1.5,
  loose: 1.7,
};

export const typography = {
  // Headings
  h1: {
    fontFamily: fontFamilies.heading,
    fontSize: fontSizes['4xl'],
    fontWeight: fontWeights.bold,
    letterSpacing: 0.5,
  },
  h2: {
    fontFamily: fontFamilies.heading,
    fontSize: fontSizes['3xl'],
    fontWeight: fontWeights.bold,
    letterSpacing: 0.4,
  },
  h3: {
    fontFamily: fontFamilies.heading,
    fontSize: fontSizes['2xl'],
    fontWeight: fontWeights.semiBold,
    letterSpacing: 0.3,
  },
  h4: {
    fontFamily: fontFamilies.heading,
    fontSize: fontSizes.xl,
    fontWeight: fontWeights.semiBold,
    letterSpacing: 0.2,
  },

  // Bullion & Valuation Figures
  valuationLarge: {
    fontFamily: fontFamilies.numbers,
    fontSize: fontSizes['4xl'],
    fontWeight: fontWeights.extraBold,
    letterSpacing: -0.5,
  },
  valuationMedium: {
    fontFamily: fontFamilies.numbers,
    fontSize: fontSizes['2xl'],
    fontWeight: fontWeights.bold,
    letterSpacing: -0.3,
  },
  valuationSmall: {
    fontFamily: fontFamilies.numbers,
    fontSize: fontSizes.lg,
    fontWeight: fontWeights.semiBold,
  },

  // Body Text
  bodyLarge: {
    fontFamily: fontFamilies.body,
    fontSize: fontSizes.md,
    fontWeight: fontWeights.regular,
    lineHeight: 22,
  },
  bodyMedium: {
    fontFamily: fontFamilies.body,
    fontSize: fontSizes.base,
    fontWeight: fontWeights.regular,
    lineHeight: 20,
  },
  bodySmall: {
    fontFamily: fontFamilies.body,
    fontSize: fontSizes.sm,
    fontWeight: fontWeights.regular,
    lineHeight: 18,
  },

  // Labels & Badges
  label: {
    fontFamily: fontFamilies.body,
    fontSize: fontSizes.xs,
    fontWeight: fontWeights.bold,
    textTransform: 'uppercase',
    letterSpacing: 0.8,
  },
  badge: {
    fontFamily: fontFamilies.numbers,
    fontSize: fontSizes.xs,
    fontWeight: fontWeights.bold,
    letterSpacing: 0.5,
  },
  caption: {
    fontFamily: fontFamilies.body,
    fontSize: fontSizes.xs,
    fontWeight: fontWeights.medium,
    lineHeight: 14,
  },

  // Interactive
  button: {
    fontFamily: fontFamilies.body,
    fontSize: fontSizes.base,
    fontWeight: fontWeights.bold,
    letterSpacing: 0.3,
  },
};

export default {
  fontFamilies,
  fontSizes,
  fontWeights,
  lineHeights,
  typography,
};
