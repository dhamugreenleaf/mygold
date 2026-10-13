/**
 * MyGold Mobile Design System - Color Tokens
 * 
 * Preserves the exact dual-theme aesthetic from the web application:
 * 1. Obsidian Vault (Dark Mode) - Deep Navy / Obsidian with Lustrous Gold Accents
 * 2. Ivory Navy (Light Mode) - Clean Ivory and Warm Off-White with Amber Gold Accents
 */

export const goldPalette = {
  gold1: '#FCE192', // Light champagne gold highlight
  gold2: '#E8B331', // Pure metallic primary gold
  gold3: '#C2821A', // Rich amber gold
  gold4: '#8C550A', // Deep bronze / antique gold
  goldMuted: 'rgba(232, 179, 49, 0.15)',
  goldGlow: 'rgba(232, 179, 49, 0.35)',
};

/**
 * Luxury Gradient Presets matching the web design system
 */
export const gradientPresets = {
  // Website's .bg-gold-metallic (135deg, #FDE68A 0%, #F59E0B 50%, #B45309 100%)
  goldMetallic: ['#FDE68A', '#F59E0B', '#B45309'],
  // Website's .bg-gold-metallic-hover
  goldMetallicHover: ['#FEF3C7', '#FBBF24', '#D97706'],
  // Website's amber shield badge / avatar gradient (from amber-400 to amber-600)
  goldBadge: ['#FBBF24', '#D97706', '#B45309'],
  // Website's radial ambient top gold glow
  ambientGlow: ['rgba(245, 158, 11, 0.14)', 'rgba(217, 119, 6, 0.03)', 'transparent'],
  // Silver metallic gradient for silver asset highlights
  silverMetallic: ['#F1F5F9', '#CBD5E1', '#94A3B8'],
};

export const darkColors = {
  // Mode identifier
  isDark: true,

  // Backgrounds
  background: '#080B12',       // Obsidian Deep Navy
  backgroundCard: '#161B26',   // Raised Card
  backgroundCardGlass: 'rgba(22, 27, 38, 0.85)',
  backgroundSubtle: '#11141A', // Input / Ticker / Inset background
  backgroundElevated: '#1E2536',

  // Borders
  border: 'rgba(255, 191, 0, 0.2)',
  borderGlow: 'rgba(255, 191, 0, 0.6)',
  borderSubtle: 'rgba(255, 255, 255, 0.08)',

  // Typography
  textPrimary: '#FFFFFF',
  textSecondary: '#CBD5E1',
  textMuted: '#A3A3A3',
  textGold: '#E8B331',

  // Gold Accents
  gold: goldPalette.gold2,
  ...goldPalette,

  // Financial / Gain / Loss Metrics
  profit: '#10B981',
  profitBg: 'rgba(16, 185, 129, 0.12)',
  profitBorder: 'rgba(16, 185, 129, 0.25)',

  loss: '#F43F5E',
  lossBg: 'rgba(244, 63, 94, 0.12)',
  lossBorder: 'rgba(244, 63, 94, 0.25)',

  // Live Bullion Ticker
  tickerBg: '#151515',
  tickerBorder: '#3A321C',
  tickerGold: '#D4AF37',
  tickerTextPrimary: '#F5F5F4',
  tickerTextSecondary: '#A8A29E',
  tickerLiveDot: '#4ADE80',

  // Utility & Status
  white: '#FFFFFF',
  black: '#000000',
  transparent: 'transparent',
  overlay: 'rgba(0, 0, 0, 0.7)',
  toastBg: '#111726',
};

export const lightColors = {
  // Mode identifier
  isDark: false,

  // Backgrounds
  background: '#F8F6F1',       // Premium Warm Ivory
  backgroundCard: '#FFFFFF',   // Pure White Card
  backgroundCardGlass: 'rgba(255, 255, 255, 0.95)',
  backgroundSubtle: '#F3F1EC', // Soft Cream Inset / Input
  backgroundElevated: '#FFFFFF',

  // Borders
  border: '#E5E0D6',
  borderGlow: 'rgba(217, 154, 0, 0.45)',
  borderSubtle: '#D7DCE3',

  // Typography
  textPrimary: '#172033',      // Deep Royal Navy
  textSecondary: '#5F6878',
  textMuted: '#7B8494',
  textGold: '#D97706',

  // Gold Accents
  gold: '#D97706',
  gold1: '#FDE68A',
  gold2: '#F59E0B',
  gold3: '#D97706',
  gold4: '#B45309',
  goldMuted: 'rgba(217, 119, 6, 0.12)',
  goldGlow: 'rgba(217, 119, 6, 0.3)',

  // Financial / Gain / Loss Metrics
  profit: '#059669',
  profitBg: 'rgba(5, 150, 105, 0.1)',
  profitBorder: 'rgba(5, 150, 105, 0.25)',

  loss: '#E11D48',
  lossBg: 'rgba(225, 29, 72, 0.1)',
  lossBorder: 'rgba(225, 29, 72, 0.25)',

  // Live Bullion Ticker
  tickerBg: '#FFFFFF',
  tickerBorder: '#E5E0D6',
  tickerGold: '#9A6500',
  tickerTextPrimary: '#172033',
  tickerTextSecondary: '#7B8494',
  tickerLiveDot: '#16A34A',

  // Utility & Status
  white: '#FFFFFF',
  black: '#000000',
  transparent: 'transparent',
  overlay: 'rgba(15, 23, 42, 0.5)',
  toastBg: '#FFFFFF',
};

export default {
  goldPalette,
  dark: darkColors,
  light: lightColors,
};
