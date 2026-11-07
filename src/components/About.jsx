import { brandConfig } from '../branding/brandConfig';

export default function About() {
  return (
    <section id="about" className="section about">
      <div className="container about-grid">
        <div className="about-image reveal">
          <img
            src={brandConfig.assets.aboutImage}
            loading="lazy"
            alt="Homemade festive sweet preparation"
          />
          <div className="image-caption">
            A little sweetness,<br />
            <em>a lot of heart.</em>
          </div>
        </div>

        <div className="about-copy reveal">
          <p className="eyebrow">Our story</p>
          <h2>
            Made the way <i>home</i> makes it.
          </h2>
          <p>
            {brandConfig.name} brings the comfort of authentic Indian sweets to your celebrations.
            Every delicacy is prepared in a clean, hygienic kitchen using carefully selected ingredients
            and recipes passed down through generations.
          </p>
          <p>
            We believe in quality over quantity, freshness over mass production, and sweets that make
            every occasion feel truly special.
          </p>
          <div className="promise-list">
            <span>✓ Homemade recipes</span>
            <span>✓ Premium ingredients</span>
            <span>✓ Hygienic kitchen</span>
            <span>✓ Freshly prepared</span>
            <span>✓ Perfect for gifting</span>
            <span>✓ Made with love</span>
          </div>
          <a href="#contact" className="text-link">
            Discover our story <span>→</span>
          </a>
        </div>
      </div>
    </section>
  );
}
