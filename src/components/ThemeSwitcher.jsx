import { useEffect, useRef, useState } from 'react';
import { useTheme } from '../context/ThemeContext';

// Header popover for choosing a theme. Mirrors AccountMenu's behaviour (outside click, Escape,
// arrow keys). Purely client-side: the choice is applied and persisted by ThemeContext.
export default function ThemeSwitcher() {
  const { currentTheme, availableThemes, setTheme } = useTheme();
  const [open, setOpen] = useState(false);
  const rootRef = useRef(null);
  const triggerRef = useRef(null);
  const itemRefs = useRef([]);

  const close = (restoreFocus = false) => {
    setOpen(false);
    if (restoreFocus) triggerRef.current?.focus();
  };

  useEffect(() => {
    if (!open) return undefined;
    // Land on the selected theme so arrow keys start from where the user is.
    const selected = Math.max(0, availableThemes.findIndex((t) => t.id === currentTheme.id));
    itemRefs.current[selected]?.focus();
    const onPointerDown = (e) => {
      if (!rootRef.current?.contains(e.target)) setOpen(false);
    };
    const onKeyDown = (e) => {
      if (e.key === 'Escape') close(true);
    };
    document.addEventListener('mousedown', onPointerDown);
    document.addEventListener('touchstart', onPointerDown);
    document.addEventListener('keydown', onKeyDown);
    return () => {
      document.removeEventListener('mousedown', onPointerDown);
      document.removeEventListener('touchstart', onPointerDown);
      document.removeEventListener('keydown', onKeyDown);
    };
    // Only re-run when opening/closing, not when the theme changes underneath an open menu.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  const onMenuKeyDown = (e) => {
    const items = itemRefs.current.filter(Boolean);
    const index = items.indexOf(document.activeElement);
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      items[(index + 1) % items.length].focus();
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      items[(index - 1 + items.length) % items.length].focus();
    } else if (e.key === 'Home') {
      e.preventDefault();
      items[0].focus();
    } else if (e.key === 'End') {
      e.preventDefault();
      items[items.length - 1].focus();
    } else if (e.key === 'Tab') {
      setOpen(false);
    }
  };

  const choose = (id) => {
    setTheme(id);
    close(true);
  };

  return (
    <div className="theme-switcher" ref={rootRef}>
      <button
        ref={triggerRef}
        type="button"
        className="theme-trigger"
        aria-label="Change website theme"
        aria-haspopup="menu"
        aria-expanded={open}
        onClick={() => setOpen((v) => !v)}
      >
        <svg viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
          <path d="M12 3a9 9 0 1 0 0 18c1.1 0 1.8-.8 1.8-1.7 0-.5-.2-.9-.5-1.2-.3-.3-.5-.7-.5-1.2 0-.9.8-1.7 1.7-1.7H16a5 5 0 0 0 5-5c0-4-4-7.2-9-7.2z" />
          <circle cx="7.5" cy="11" r="1" />
          <circle cx="10.5" cy="7" r="1" />
          <circle cx="15.5" cy="7.5" r="1" />
        </svg>
      </button>

      {open && (
        <div className="theme-dropdown" role="menu" aria-label="Theme" onKeyDown={onMenuKeyDown}>
          <p className="theme-dropdown-title" aria-hidden="true">Appearance</p>
          {availableThemes.map((theme, i) => {
            const selected = theme.id === currentTheme.id;
            return (
              <button
                key={theme.id}
                ref={(el) => (itemRefs.current[i] = el)}
                type="button"
                role="menuitemradio"
                aria-checked={selected}
                className={`theme-option${selected ? ' is-selected' : ''}`}
                onClick={() => choose(theme.id)}
              >
                <span className="theme-swatches" aria-hidden="true">
                  {theme.swatches.map((color, n) => (
                    <i key={n} style={{ background: color }} />
                  ))}
                </span>
                <span className="theme-option-name">
                  <span className="theme-option-label">{theme.label}</span>
                  {theme.description && <small className="theme-option-desc">{theme.description}</small>}
                </span>
                {selected && (
                  <svg className="theme-check" viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M5 12l5 5 9-10" /></svg>
                )}
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}
