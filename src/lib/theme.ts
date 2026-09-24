import type { Theme } from './types';

// Warm paper and ink, with consistent semantic colors in both themes.
export const PALETTES = {
  light: {
    bg: '#f0e6d2', paper: '#fdfbf7', text: '#3a3026', muted: '#7c6b5a',
    line: '#c4b5a0', accent: '#8a6546',
    danger: '#c0392b', success: '#2d8050',
    grid: 'rgba(58, 48, 38, 0.06)', hover: 'rgba(58, 48, 38, 0.08)',
    selected: 'rgba(58, 48, 38, 0.14)', backdrop: 'rgba(42, 37, 32, 0.45)',
    shadow: 'rgba(42, 37, 32, 0.14)'
  },
  dark: {
    bg: '#2a2520', paper: '#3a3530', text: '#e8e0d8', muted: '#b8ab9e',
    line: '#6a5a4a', accent: '#d6b38a',
    danger: '#ff8b7d', success: '#8fc7a0',
    grid: 'rgba(232, 224, 216, 0.05)', hover: 'rgba(232, 224, 216, 0.08)',
    selected: 'rgba(232, 224, 216, 0.14)', backdrop: 'rgba(20, 17, 14, 0.65)',
    shadow: 'rgba(20, 17, 14, 0.45)'
  }
} as const;

export function applyTheme(theme: Theme): void {
  for (const [name, color] of Object.entries(PALETTES[theme])) {
    document.documentElement.style.setProperty(`--${name}-color`, color);
  }
  document.documentElement.style.colorScheme = theme;
}
