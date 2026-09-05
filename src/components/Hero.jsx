export default function Hero({ heroImage }) {
  return (
    <section className="hero">
      <div className="hero-pattern"></div>
      <div className="container hero-grid">
        <div className="hero-copy reveal">
          <p className="eyebrow">Handcrafted in small batches</p>
          <h1>
            Authentic homemade sweets, <i>crafted with love.</i>
          </h1>
          <p className="hero-text">
            Freshly prepared with premium ingredients for festivals, celebrations,
            gifting, and every little moment worth sharing.
          </p>
          <div className="hero-actions">
            <a className="button whatsapp-link" href="https://wa.me/c/918319510666" target="_blank" rel="noreferrer">
              Chat on WhatsApp <span>↗</span>
            </a>
            <a className="text-link" href="#sweets">
              Explore our sweets <span>↓</span>
            </a>
          </div>
          <div className="hero-details">
            <div>
              <b>100%</b>
              <span>Homemade</span>
            </div>
            <div>
              <b>Made</b>
              <span>Fresh to order</span>
            </div>
          </div>
        </div>

        <div className="hero-visual reveal">
          <div className="hero-image">
            <img src={heroImage} alt="Indian sweets arranged in a premium gift box" fetchpriority="high" />
            <div className="seal">
              <span>Since</span>
              <b>2022</b>
              <span>With love</span>
            </div>
          </div>
          <div className="hero-note">
            <span>✦</span> From our kitchen <br />
            to your celebrations
          </div>
        </div>
      </div>
    </section>
  );
}
