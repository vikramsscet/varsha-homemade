import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';

const API_BASE_URL = import.meta.env.CMS_API_BASE_URL;

export default function Products() {
  const [products, setProducts] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    async function loadProducts() {
      try {
        const response = await fetch(
          `${API_BASE_URL}/products?page=1&limit=20&isAvailable=true&isPublished=true&isFeatured=true`,
          { headers: { accept: '*/*' } }
        );

        if (!response.ok) {
          throw new Error(`Product request failed (${response.status})`);
        }

        const result = await response.json();
        setProducts((result.data ?? []).map((product) => {
          const primaryImage = product.images?.find((image) => image.isPrimary === true);

          return {
            id: product.id,
            title: product.title,
            image: primaryImage?.url,
            badge: 'Classic',
            description: product.subtitle,
            href: `https://www.varsha-homemade.com/product-page/${product.slug}`,
          };
        }));
      } catch (requestError) {
        setError(requestError);
      } finally {
        setIsLoading(false);
      }
    }

    loadProducts();
  }, []);

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
          {isLoading ? (
            <p role="status">Loading products...</p>
          ) : error ? (
            <p role="alert">Products could not be loaded. Please try again later.</p>
          ) : (
            products.map((product) => (
              <Link key={product.id} to={`/products/${product.id}`} aria-label={`View ${product.title}`}>
                <article className="product-card reveal">
                  <div className="product-image">
                    {product.image && <img src={product.image} loading="lazy" alt={product.title} />}
                    <span>{product.badge}</span>
                  </div>
                  <h3>{product.title}</h3>
                  <p>{product.description}</p>
                  <a href={product.href} target="_blank" rel="noreferrer">
                    Order now <span>→</span>
                  </a>
                </article>
              </Link>
            ))
          )}
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
