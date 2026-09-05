import { useEffect, useState } from 'react';
import { Routes, Route, useLocation } from 'react-router-dom';
import Header from './components/Header';
import Footer from './components/Footer';
import HomePage from './pages/Home/Home';
import IndianSweetsPage from './pages/IndianSweets/IndianSweets';
import { navLinks, logoImage } from './data/siteData';

function ScrollToTop() {
  const location = useLocation();

  useEffect(() => {
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }, [location.pathname]);

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
