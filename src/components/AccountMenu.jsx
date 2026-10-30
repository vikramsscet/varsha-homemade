import { useEffect, useRef, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { getInitials } from '../services/profileFormat';

export default function AccountMenu({ onOpen }) {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const [open, setOpen] = useState(false);
  const [imageFailed, setImageFailed] = useState(false);
  const rootRef = useRef(null);
  const triggerRef = useRef(null);
  const itemRefs = useRef([]);

  const close = (restoreFocus = false) => {
    setOpen(false);
    if (restoreFocus) triggerRef.current?.focus();
  };

  useEffect(() => {
    if (!open) return undefined;
    itemRefs.current[0]?.focus();
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
  }, [open]);

  useEffect(() => setImageFailed(false), [user?.profileImageUrl]);

  const onMenuKeyDown = (e) => {
    const items = itemRefs.current.filter(Boolean);
    const index = items.indexOf(document.activeElement);
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      items[(index + 1) % items.length].focus();
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      items[(index - 1 + items.length) % items.length].focus();
    } else if (e.key === 'Tab') {
      setOpen(false);
    }
  };

  const handleSignOut = () => {
    close();
    logout();
    navigate('/login', { replace: true });
  };

  if (!user) return null;

  return (
    <div className="account-menu" ref={rootRef}>
      <button
        ref={triggerRef}
        type="button"
        className="account-trigger"
        aria-label="User account menu"
        aria-haspopup="menu"
        aria-expanded={open}
        onClick={() => {
          if (!open) onOpen?.();
          setOpen((v) => !v);
        }}
      >
        {user.profileImageUrl && !imageFailed ? (
          <img src={user.profileImageUrl} alt="" referrerPolicy="no-referrer" onError={() => setImageFailed(true)} />
        ) : (
          <span className="account-initials" aria-hidden="true">{getInitials(user)}</span>
        )}
      </button>

      {open && (
        <div className="account-dropdown" role="menu" aria-label="User account" onKeyDown={onMenuKeyDown}>
          <Link
            ref={(el) => (itemRefs.current[0] = el)}
            role="menuitem"
            className="account-item"
            to="/profile"
            onClick={() => close()}
          >
            <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><circle cx="12" cy="8" r="4" /><path d="M4 21c0-4 3.6-7 8-7s8 3 8 7" /></svg>
            Profile
          </Link>
          <button ref={(el) => (itemRefs.current[1] = el)} role="menuitem" type="button" className="account-item" onClick={handleSignOut}>
            <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" /><path d="M16 17l5-5-5-5" /><path d="M21 12H9" /></svg>
            Sign Out
          </button>
        </div>
      )}
    </div>
  );
}
