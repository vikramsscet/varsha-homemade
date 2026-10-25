import { Link, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

export default function Header({ navLinks, logo, menuOpen, onToggleMenu, onCloseMenu }) {
  const location = useLocation();
  const { isAuthenticated, signOut } = useAuth();

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
          {isAuthenticated ? (
            <button type="button" className="auth-link" onClick={() => { signOut(); onCloseMenu(); }}>Sign out</button>
          ) : (
            <Link to="/login" onClick={onCloseMenu}>Sign in</Link>
          )}
        </div>
      </nav>
    </header>
  );
}
