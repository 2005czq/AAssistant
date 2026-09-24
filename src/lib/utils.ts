import type { Lang, Theme } from './types';
const segmenter = new Intl.Segmenter(undefined, { granularity: 'grapheme' });

/** One extended grapheme is one visible editing unit, including ZWJ emoji. */
export function graphemes(text: string): string[] {
  return Array.from(segmenter.segment(text), ({ segment }) => segment);
}

/** Western characters count as half; every other grapheme counts as one. */
export function limitTextLength(text: string, maximum: number): string {
  let length = 0;
  let end = 0;
  for (const { segment: character } of segmenter.segment(text)) {
    length += /^[\u0000-\u00ff\p{Script=Latin}]\p{Mark}*$/u.test(character) ? .5 : 1;
    if (length > maximum) break;
    end += character.length;
  }
  return text.slice(0, end);
}

export function detectSystemLanguage(): Lang {
  return navigator.language.toLowerCase().startsWith('zh') ? 'zh' : 'en';
}

export function detectSystemTheme(): Theme {
  return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
}

export function getCurrentTimeFormatted(now = new Date()): string {
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, '0');
  const day = String(now.getDate()).padStart(2, '0');
  const hour = String(now.getHours()).padStart(2, '0');
  const minute = String(now.getMinutes()).padStart(2, '0');
  return `${year}-${month}-${day} ${hour}:${minute}`;
}
