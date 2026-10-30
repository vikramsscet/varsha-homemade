import { Link, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import AccountMenu from './AccountMenu';
import CartLink from './CartLink';

export default function Header({ navLinks, logo, menuOpen, onToggleMenu, onCloseMenu }) {
  const location = useLocation();
  const { status } = useAuth();

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

        <div className={`nav-links ${menuOpen ? 'open' : ''}`}>
          {navLinks.map((link) => (
            <Link key={link.href} to={{ pathname: '/', hash: link.href }} onClick={onCloseMenu}>{link.label}</Link>
          ))}
          {status === 'unauthenticated' && <Link to="/login" onClick={onCloseMenu}>Sign in</Link>}
        </div>

        <div className="nav-actions">
          <CartLink onClick={onCloseMenu} />
          {status === 'authenticated' && <AccountMenu />}
        </div>

        <button
          className="menu-toggle"
          aria-label="Open menu"
          aria-expanded={menuOpen}
          onClick={onToggleMenu}
        >
          <i></i><i></i><i></i>
        </button>
      </nav>
    </header>
  );
}
