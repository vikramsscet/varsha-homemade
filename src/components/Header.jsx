import { Link, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

export default function Header({ navLinks, logo, menuOpen, onToggleMenu, onCloseMenu }) {
  const location = useLocation();
  const { status, user, logout } = useAuth();

  const handleBrandClick = () => {
    onCloseMenu();
    if (location.pathname === '/') {
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }
  };
  return (
    <header className="site-header" id="home">
      <nav className="nav container" aria-label="Main navigation">
        <Link className="brand header-brand" to="/" aria-label="Varsha Homemade home" onClick={handleBrandClick}>
          <img src={logo} alt="Varsha's Homemade logo" />
        </Link>

        <button
          className="menu-toggle"
          aria-label="Open menu"
          aria-expanded={menuOpen}
          onClick={onToggleMenu}
        >
          <i></i><i></i><i></i>
        </button>

        <div className={`nav-links ${menuOpen ? 'open' : ''}`}>
          {navLinks.map((link) => (
            <a key={link.href} href={link.href} onClick={onCloseMenu}>{link.label}</a>
          ))}
          {status === 'authenticated' && user && (
            <>
              <span className="auth-user">
                {user.profileImageUrl ? (
                  <img className="auth-avatar" src={user.profileImageUrl} alt="" referrerPolicy="no-referrer" />
                ) : (
                  <span className="auth-avatar auth-avatar-fallback" aria-hidden="true">
                    {(user.displayName || user.email).charAt(0).toUpperCase()}
                  </span>
                )}
                <span>{user.displayName || user.email}</span>
              </span>
              <button type="button" className="auth-link" onClick={() => { logout(); onCloseMenu(); }}>Sign out</button>
            </>
          )}
          {status === 'unauthenticated' && <Link to="/login" onClick={onCloseMenu}>Sign in</Link>}
        </div>
      </nav>
    </header>
  );
}
