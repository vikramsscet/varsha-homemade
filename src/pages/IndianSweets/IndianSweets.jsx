import { useEffect, useState } from 'react';
import CategoryHeader from '../../components/CategoryHeader/CategoryHeader';
import ProductGrid from '../../components/ProductGrid/ProductGrid';

export default function IndianSweetsPage() {
  const [products, setProducts] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    async function loadProducts() {
      try {
        const response = await fetch(
          `${import.meta.env.VITE_API_BASE_URL}/products?page=1&limit=20&isAvailable=true&isPublished=true`,
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
            price: product.price,
            weight: product.packageSize,
            image: primaryImage?.url,
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
    <main className="category-page-shell">
      <div className="container category-page">
        <CategoryHeader />

        <div className="category-layout">
          <aside className="category-sidebar">
            <div className="filter-block">
              <h2>Browse by</h2>
              <ul>
                <li className="active">Indian Sweets</li>
              </ul>
            </div>

            <div className="filter-block">
              <h2>Filter by</h2>
              <div className="price-filter">
                <div className="price-header">
                  <span>Price</span>
                </div>
                <div className="range-values">
                  <span>₹250</span>
                  <span>₹600</span>
                </div>
                <div className="range-slider">
                  <span className="thumb thumb-min"></span>
                  <span className="track"></span>
                  <span className="thumb thumb-max"></span>
                </div>
              </div>
            </div>
          </aside>

          <section className="category-content" aria-label="Indian sweets products">
            <div className="toolbar">
              <div className="results-count">{products.length} products</div>
              <div className="sort-box">
                <span>Sort by:</span>
                <button type="button">Recommended</button>
              </div>
            </div>
            {isLoading ? (
              <div className="product-grid" role="status">Loading products...</div>
            ) : error ? (
              <div className="product-grid" role="alert">Products could not be loaded. Please try again later.</div>
            ) : (
              <ProductGrid products={products} />
            )}
          </section>
        </div>
      </div>
    </main>
  );
}
