export default function Festivals({ festivalImage }) {
  return (
    <section id="festivals" className="section festivals">
      <div className="container festival-grid">
        <div className="festival-copy reveal">
          <p className="eyebrow light">Gift beautifully</p>
          <h2>
            Make every gathering <i>golden.</i>
          </h2>
          <p>
            Curated sweet boxes that arrive looking as wonderful as they taste. Thoughtful gifts for festivals,
            weddings, corporate moments and everything in between.
          </p>
          <ul>
            <li>Diwali gift hampers</li>
            <li>Raksha Bandhan special boxes</li>
            <li>Wedding sweet boxes</li>
            <li>Corporate gift hampers</li>
          </ul>
          <a className="button button-gold" href="#contact">
            Plan your gift box <span>→</span>
          </a>
        </div>

        <div className="festival-image reveal">
          <img src={festivalImage} loading="lazy" alt="Luxury Indian sweet gift hamper" />
          <div className="festival-card">
            <span>Festive favourites</span>
            <b>
              Gift boxes made<br />
              to be remembered.
            </b>
          </div>
        </div>
      </div>
    </section>
  );
}
