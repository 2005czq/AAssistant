import type { AppState, Ledger } from './types';
import { checkKeys, object, parseLedger } from './ledger';

export const STORAGE_KEY = 'aassistant_data';
export const PREFERENCES_KEY = 'aassistant_preferences';
const STORAGE_VERSION = 3;
type Preferences = Pick<AppState, 'currentLang' | 'currentTheme' | 'animations'>;

export function saveLedger({ name, members, bills }: Ledger): boolean {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify({ version: STORAGE_VERSION, name, members, bills }));
    return true;
  } catch {
    return false;
  }
}

export function loadLedger(): { ledger: Ledger | null; failed: boolean } {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw === null) return { ledger: null, failed: false };
    const data = object(JSON.parse(raw), 'storage');
    if (data.version !== STORAGE_VERSION) throw new Error('Unsupported saved ledger');
    checkKeys(data, ['version', 'name', 'members', 'bills'], 'storage');
    const ledger = parseLedger({ name: data.name, members: data.members, bills: data.bills });
    return { ledger, failed: false };
  } catch {
    return { ledger: null, failed: true };
  }
}

export function savePreferences({ currentLang, currentTheme, animations }: Preferences): boolean {
  try {
    localStorage.setItem(PREFERENCES_KEY, JSON.stringify({ currentLang, currentTheme, animations }));
    return true;
  } catch {
    return false;
  }
}

export function loadPreferences(): { preferences: Preferences | null; failed: boolean } {
  try {
    const raw = localStorage.getItem(PREFERENCES_KEY);
    if (raw === null) return { preferences: null, failed: false };
    const data = object(JSON.parse(raw), 'preferences');
    checkKeys(data, ['currentLang', 'currentTheme', 'animations'], 'preferences');
    if (!['en', 'zh'].includes(data.currentLang as string) || !['light', 'dark'].includes(data.currentTheme as string)) {
      throw new Error('Invalid saved preferences');
    }
    const animations = typeof data.animations === 'boolean' ? data.animations : true;
    const preferences: Preferences = {
      currentLang: data.currentLang as AppState['currentLang'],
      currentTheme: data.currentTheme as AppState['currentTheme'],
      animations
    };
    return { preferences, failed: false };
  } catch {
    return { preferences: null, failed: true };
  }
}
