import { createContext, useCallback, useContext, useEffect, useLayoutEffect, useMemo, useState } from 'react';
import { getTheme, getThemeOptions, isValidThemeId, resolveThemeId, themeToCssVars } from '../themes/themeConfig';
import { THEME_STORAGE_KEY, hasStoredThemeId, loadThemeId, saveThemeId } from '../themes/themeStorage';

const ThemeContext = createContext(null);

// Static for the app's lifetime, so consumers always receive the same array reference.
const availableThemes = Object.freeze(getThemeOptions());

// Writes the theme as CSS custom properties on <html>. Every theme defines the same variable
// names, so switching overwrites values in place and nothing stale is left behind.
function applyTheme(themeId) {
  if (typeof document === 'undefined') return;
  const root = document.documentElement;
  if (!root?.style) return;
  for (const [name, value] of Object.entries(themeToCssVars(themeId))) {
    root.style.setProperty(name, value);
  }
  root.dataset.theme = themeId;
}

// Browser SSR/test environments may have no DOM, so fall back to a no-op layout effect.
const useIsomorphicLayoutEffect = typeof document === 'undefined' ? useEffect : useLayoutEffect;

// `suggestion` ({ themeId, force }) is an optional campaign theme. It is NEVER persisted:
// - without `force` it applies only while the customer has no saved choice;
// - with `force` (a deliberate business override) it wins over a saved choice.
// Once the campaign ends (or stops being passed) the saved choice, or Classic Indian, returns.
function initialThemeId(suggestion) {
  const suggested = suggestion && isValidThemeId(suggestion.themeId) ? suggestion.themeId : null;
  if (suggested && suggestion.force === true) return suggested;
  if (suggested && !hasStoredThemeId()) return suggested;
  return loadThemeId();
}

export function ThemeProvider({ children, suggestion = null }) {
  // Lazy init: storage is read once, and an invalid/missing value resolves to Classic Indian.
  const [themeId, setThemeId] = useState(() => initialThemeId(suggestion));

  // Layout effect so the variables are in place before the browser paints (no flash on load).
  useIsomorphicLayoutEffect(() => {
    applyTheme(themeId);
  }, [themeId]);

  // Keep multiple open tabs in sync.
  useEffect(() => {
    if (typeof window === 'undefined') return undefined;
    const onStorage = (event) => {
      if (event.key === THEME_STORAGE_KEY) setThemeId(resolveThemeId(event.newValue));
    };
    window.addEventListener('storage', onStorage);
    return () => window.removeEventListener('storage', onStorage);
  }, []);

  // Stable identity; unknown ids are ignored (current theme kept). Returns whether it was applied.
  const setTheme = useCallback((nextId) => {
    if (!isValidThemeId(nextId)) return false;
    saveThemeId(nextId);
    setThemeId(nextId);
    return true;
  }, []);

  const value = useMemo(
    () => ({ currentTheme: getTheme(themeId), availableThemes, setTheme }),
    [themeId, setTheme]
  );

  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>;
}

// Kept in this file, like useAuth/useCart/useAddresses, rather than a separate hook module.
export function useTheme() {
  const ctx = useContext(ThemeContext);
  if (!ctx) throw new Error('useTheme must be used within ThemeProvider');
  return ctx;
}
