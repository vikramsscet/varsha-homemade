import { useEffect, useState } from 'react';
import { Routes, Route, useLocation } from 'react-router-dom';
import Header from './components/Header';
import Footer from './components/Footer';
import HomePage from './pages/Home/Home';
import IndianSweetsPage from './pages/IndianSweets/IndianSweets';
import ProductDetailPage from './pages/ProductDetail/ProductDetail';
import LoginPage from './pages/Login/Login';
import ProfilePage from './pages/Profile/Profile';
import CartPage from './pages/Cart/Cart';
import CheckoutPage from './pages/Checkout/Checkout';
import AddressesPage from './pages/Checkout/AddressesPage';
import RequireAuth from './components/RequireAuth';
import { navLinks, logoImage } from './data/siteData';

function ScrollToTop() {
  const location = useLocation();

  useEffect(() => {
    if (location.hash) {
      // Section links (e.g. /#about) clicked from any page: wait for the target page to render.
      const id = location.hash.slice(1);
      let tries = 0;
      const timer = setInterval(() => {
        const el = document.getElementById(id);
        if (el || ++tries > 20) {
          clearInterval(timer);
          el?.scrollIntoView({ behavior: 'smooth' });
        }
      }, 50);
      return () => clearInterval(timer);
    }
    window.scrollTo({ top: 0, behavior: 'smooth' });
    return undefined;
  }, [location.pathname, location.hash]);

  return null;
}

function App() {
  const [menuOpen, setMenuOpen] = useState(false);
  const [showTopButton, setShowTopButton] = useState(false);
  const [isLoaded, setIsLoaded] = useState(false);

  useEffect(() => {
    const timer = setTimeout(() => setIsLoaded(true), 180);
    const handleScroll = () => setShowTopButton(window.scrollY > 600);
    window.addEventListener('scroll', handleScroll);
    return () => {
      clearTimeout(timer);
      window.removeEventListener('scroll', handleScroll);
    };
  }, []);

  useEffect(() => {
    document.body.classList.toggle('menu-open', menuOpen);
    return () => document.body.classList.remove('menu-open');
  }, [menuOpen]);

  const onToggleMenu = () => setMenuOpen((value) => !value);
  const onCloseMenu = () => setMenuOpen(false);

  return (
    <>
      <div className={`loader ${isLoaded ? 'loaded' : ''}`} aria-label="Loading">
        <span></span><span></span><span></span>
      </div>

      <Header
        navLinks={navLinks}
        logo={logoImage}
        menuOpen={menuOpen}
        onToggleMenu={onToggleMenu}
        onCloseMenu={onCloseMenu}
      />
      <ScrollToTop />
      <Routes>
        <Route path="/" element={<HomePage />} />
        <Route path="/category/indian-sweets" element={<IndianSweetsPage />} />
        <Route path="/products/:productId" element={<ProductDetailPage />} />
        <Route path="/login" element={<LoginPage />} />
        <Route path="/cart" element={<CartPage />} />
        <Route path="/checkout" element={<CheckoutPage />} />
        <Route element={<RequireAuth />}>
          <Route path="/profile" element={<ProfilePage />} />
          <Route path="/addresses" element={<AddressesPage />} />
        </Route>
      </Routes>
      <Footer logo={logoImage} />

      <a className="floating-whatsapp whatsapp-link" href="https://wa.me/c/918319510666" target="_blank" rel="noreferrer" aria-label="Chat on WhatsApp">
        <b>◔</b><span>Chat on WhatsApp</span>
      </a>
      <button
        className={`to-top ${showTopButton ? 'show' : ''}`}
        aria-label="Scroll to top"
        onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })}
      >
        ↑
      </button>
    </>
  );
}

export default App;
