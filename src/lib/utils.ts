import type { Lang, Theme } from './types';

let textMeasurer: HTMLSpanElement | null = null;

export function getTextWidth(text: string): number {
  if (typeof document === 'undefined') {
    return text.length * 12;
  }
  if (!textMeasurer) {
    textMeasurer = document.createElement('span');
    textMeasurer.style.cssText =
      'position:absolute;visibility:hidden;white-space:nowrap;font-family:var(--font-main);font-size:1.1rem;';
    document.body.appendChild(textMeasurer);
  }
  textMeasurer.textContent = text;
  return textMeasurer.offsetWidth + 4;
}

export function detectSystemLanguage(): Lang {
  const lang = navigator.language || (navigator as unknown as { userLanguage?: string }).userLanguage || 'en';
  const lower = lang.toLowerCase();
  if (
    lower.startsWith('zh') ||
    lower === 'zh-cn' ||
    lower === 'zh-tw' ||
    lower === 'zh-hk' ||
    lower === 'zh-mo'
  ) {
    return 'zh';
  }
  return 'en';
}

export function detectSystemTheme(): Theme {
  if (window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches) {
    return 'dark';
  }
  return 'light';
}

export function isMobileDevice(): boolean {
  return 'ontouchstart' in window || navigator.maxTouchPoints > 0;
}

export function formatNumberDisplay(num: number): string {
  const str = num.toFixed(2);
  if (str.length > 7) {
    return `${str.substring(0, 7)}…`;
  }
  return str;
}

export function getCurrentTimeFormatted(): string {
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, '0');
  const day = String(now.getDate()).padStart(2, '0');
  const hour = String(now.getHours()).padStart(2, '0');
  const minute = String(now.getMinutes()).padStart(2, '0');
  return `${year}-${month}-${day} ${hour}:${minute}`;
}
