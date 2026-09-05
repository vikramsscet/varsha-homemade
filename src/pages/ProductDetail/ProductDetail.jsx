import React, { useMemo, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { products } from '../../data/products';
import ProductImageGallery from '../../components/ProductImageGallery/ProductImageGallery';
import ProductDescription from '../../components/ProductDescription/ProductDescription';
import QuantitySelector from '../../components/QuantitySelector/QuantitySelector';
import SocialShare from '../../components/SocialShare/SocialShare';
import '../../pages/ProductDetail/product-detail.css';

export default function ProductDetailPage() {
  const { productId } = useParams();
  const navigate = useNavigate();
  const product = useMemo(() => products.find((p) => Number(p.id) === Number(productId)), [productId]);
  const [quantity, setQuantity] = useState(1);

  if (!product) {
    return (
      <main className="container">
        <h2>Product Not Found</h2>
        <p>The product you are looking for does not exist.</p>
        <button onClick={() => navigate(-1)}>Go back</button>
      </main>
    );
  }

  const images = product.images && product.images.length ? product.images : [product.image];

  const handleAddToCart = () => {
    // Placeholder: integrate with cart when available
    console.log('Add to cart', { productId: product.id, quantity });
    alert(`${product.title} — ${quantity} added to cart (placeholder)`);
  };

  const handleBuyNow = () => {
    console.log('Buy now', { productId: product.id, quantity });
    alert(`Buy now: ${product.title} — ${quantity} (placeholder)`);
  };

  return (
    <main className="product-detail-shell">
      <div className="container product-detail-grid">
        <aside className="thumb-col" aria-hidden>
          {/* thumbnails column is rendered inside the gallery */}
        </aside>

        <section className="image-col">
          <ProductImageGallery images={images} />
        </section>

        <aside className="info-col">
          <div className="product-info">
            <h1>{product.title}</h1>
            <div className="price-row">
              <strong className="price">{product.price}</strong>
              <div className="price-per">{product.price} / {product.weight}</div>
            </div>

            <label className="quantity-label">Quantity *</label>
            <QuantitySelector initial={1} onChange={setQuantity} />

            <div className="actions">
              <button className="btn add-to-cart" onClick={handleAddToCart}>ADD TO CART</button>
              <button className="btn buy-now" onClick={handleBuyNow}>Buy Now</button>
            </div>

            <ProductDescription longDescription={product.longDescription} />

            <SocialShare />
          </div>
        </aside>
      </div>
    </main>
  );
}
