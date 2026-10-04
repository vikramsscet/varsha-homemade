import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import ProductImageGallery from '../../components/ProductImageGallery/ProductImageGallery';
import ProductDescription from '../../components/ProductDescription/ProductDescription';
import QuantitySelector from '../../components/QuantitySelector/QuantitySelector';
import SocialShare from '../../components/SocialShare/SocialShare';
import '../../pages/ProductDetail/product-detail.css';

function getDescriptionText(node) {
  if (!node) return '';
  if (Array.isArray(node)) return node.map(getDescriptionText).join('');
  if (node.type === 'text') return node.text ?? '';
  if (node.type === 'hardBreak') return '\n';
  return (node.content ?? []).map(getDescriptionText).join('');
}

function mapDescription(description) {
  const text = typeof description === 'string'
    ? description
    : (description?.content ?? []).map(getDescriptionText).join('\n\n');

  return text
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;');
}

export default function ProductDetailPage() {
  const { productId } = useParams();
  const navigate = useNavigate();
  const [product, setProduct] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);
  const [quantity, setQuantity] = useState(1);

  useEffect(() => {
    const controller = new AbortController();

    async function loadProduct() {
      setProduct(null);
      setError(null);
      setIsLoading(true);

      try {
        const response = await fetch(
          `${import.meta.env.VITE_API_BASE_URL}/products/${productId}`,
          { headers: { accept: '*/*' }, signal: controller.signal }
        );

        if (response.status === 404) return;
        if (!response.ok) {
          throw new Error(`Product request failed (${response.status})`);
        }

        const apiProduct = await response.json();
        const primaryImage = apiProduct.images?.find((image) => image.isPrimary === true);
        const images = (apiProduct.images ?? []).map((image) => image.url).filter(Boolean);

        setProduct({
          id: apiProduct.id,
          title: apiProduct.title,
          price: `₹${apiProduct.price.toFixed(2)}`,
          weight: apiProduct.packageSize,
          image: primaryImage?.url,
          images,
          longDescription: mapDescription(apiProduct.description),
        });
      } catch (requestError) {
        if (requestError.name !== 'AbortError') {
          setError(requestError);
        }
      } finally {
        if (!controller.signal.aborted) {
          setIsLoading(false);
        }
      }
    }

    loadProduct();
    return () => controller.abort();
  }, [productId]);

  if (isLoading) {
    return <main className="container"><p role="status">Loading product...</p></main>;
  }

  if (error) {
    return (
      <main className="container">
        <p role="alert">Unable to load this product. Please try again later.</p>
        <button onClick={() => navigate(-1)}>Go back</button>
      </main>
    );
  }

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
