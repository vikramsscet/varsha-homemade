// Persists only the theme id (a non-sensitive UI preference). Storage can be unavailable
// or throw (private mode, blocked cookies), so every access is guarded.
import { DEFAULT_THEME_ID, isValidThemeId } from './themeConfig';

export const THEME_STORAGE_KEY = 'varsha.theme';

function getStorage() {
  try {
    return typeof window !== 'undefined' ? window.localStorage : null;
  } catch {
    return null;
  }
}

export function loadThemeId() {
  try {
    const stored = getStorage()?.getItem(THEME_STORAGE_KEY);
    return isValidThemeId(stored) ? stored : DEFAULT_THEME_ID;
  } catch {
    return DEFAULT_THEME_ID;
  }
}

export function saveThemeId(id) {
  if (!isValidThemeId(id)) return false;
  try {
    const storage = getStorage();
    if (!storage) return false;
    storage.setItem(THEME_STORAGE_KEY, id);
    return true;
  } catch {
    return false;
  }
}

export function clearThemeId() {
  try {
    getStorage()?.removeItem(THEME_STORAGE_KEY);
  } catch {
    /* ignore */
  }
}
