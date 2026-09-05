import { Link } from 'react-router-dom';

export default function Products({ products }) {
  return (
    <section id="sweets" className="section sweets">
      <div className="container">
        <div className="section-heading centered reveal">
          <p className="eyebrow">Our signature collection</p>
          <h2>
            Sweetness for <i>every</i> celebration.
          </h2>
          <p>Traditional flavours, thoughtfully made and beautifully presented.</p>
        </div>

        <div className="products">
          {products.map((product) => (
            <Link to={`/products/${product.id}`} aria-label={`View ${product.title}`}>
              <article className="product-card reveal" key={product.title}>
                <div className="product-image">
                  <img src={product.image} loading="lazy" alt={product.title} />
                  <span>{product.badge}</span>
                </div>
                <h3>{product.title}</h3>
                <p>{product.description}</p>
                <a href={product.href} target="_blank" rel="noreferrer">
                  Order now <span>→</span>
                </a>
              </article>
            </Link>
          ))}
        </div>

        <div className="product-footer">
          <p>
            Also made to order: <b>Chocolate Ladoo · Gond Ladoo · Coconut Cookie · Multigrain Cookie</b>
          </p>
          <Link className="button button-outline" to="/category/indian-sweets">
            View full menu <span>→</span>
          </Link>
        </div>
      </div>
    </section>
  );
}
