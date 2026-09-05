import CategoryHeader from '../../components/CategoryHeader/CategoryHeader';
import ProductGrid from '../../components/ProductGrid/ProductGrid';
import { products } from '../../data/products';

export default function IndianSweetsPage() {
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
              <div className="results-count">12 products</div>
              <div className="sort-box">
                <span>Sort by:</span>
                <button type="button">Recommended</button>
              </div>
            </div>
            <ProductGrid products={products} />
          </section>
        </div>
      </div>
    </main>
  );
}
