import { useEffect, useRef, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import ProductImageGallery from '../../components/ProductImageGallery/ProductImageGallery';
import ProductDescription from '../../components/ProductDescription/ProductDescription';
import QuantitySelector from '../../components/QuantitySelector/QuantitySelector';
import SocialShare from '../../components/SocialShare/SocialShare';
import CartFeedback from '../../components/CartFeedback';
import { useAddToCart } from '../../hooks/useAddToCart';
import { useCart } from '../../context/CartContext';
import Breadcrumbs from '../../components/Breadcrumbs';
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
  const { add, update, isSubmitting, feedback } = useAddToCart();
  const { items } = useCart();
  // `selected` is what the customer has chosen; the confirmed quantity always comes from the
  // cart context. dirtyRef marks that the customer touched the selector since the last sync, so
  // an unrelated cart refresh never resets a quantity they are editing.
  const [selected, setSelected] = useState(1);
  const dirtyRef = useRef(false);
  const pendingLabelRef = useRef('ADDING…');

  const cartItem = product ? items.find((item) => item.productId === product.id) : undefined;
  const cartQuantity = cartItem?.quantity ?? 0;

  useEffect(() => {
    dirtyRef.current = false; // a different product page starts clean
  }, [productId]);

  // Follow the server-confirmed quantity whenever the customer is not mid-edit.
  useEffect(() => {
    if (!dirtyRef.current) setSelected(cartQuantity > 0 ? cartQuantity : 1);
  }, [cartQuantity, productId]);

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
          slug: apiProduct.slug,
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

  // Never the raw UUID in the trail: the product's name (or slug) once known, a placeholder
  // while loading, and a generic label when the product can't be shown.
  const homeCrumb = { label: 'Home', to: '/' };
  const categoryCrumb = { label: 'Indian Sweets', to: '/category/indian-sweets' };

  if (isLoading) {
    return (
      <main className="container product-fallback">
        <Breadcrumbs items={[homeCrumb, categoryCrumb, { label: '…' }]} />
        <p role="status">Loading product...</p>
      </main>
    );
  }

  if (error) {
    return (
      <main className="container product-fallback">
        <Breadcrumbs items={[homeCrumb, categoryCrumb, { label: 'Product' }]} />
        <p role="alert">Unable to load this product. Please try again later.</p>
        <button onClick={() => navigate(-1)}>Go back</button>
      </main>
    );
  }

  if (!product) {
    return (
      <main className="container product-fallback">
        <Breadcrumbs items={[homeCrumb, categoryCrumb, { label: 'Product' }]} />
        <h2>Product Not Found</h2>
        <p>The product you are looking for does not exist.</p>
        <button onClick={() => navigate(-1)}>Go back</button>
      </main>
    );
  }

  const images = product.images && product.images.length ? product.images : [product.image];

  // CTA state is derived, never stored: not in cart -> add; selection matches the confirmed
  // quantity -> added (inert); otherwise -> update.
  const mode = !cartItem ? 'add' : selected === cartQuantity ? 'added' : 'update';

  const handleQuantityChange = (next) => {
    dirtyRef.current = true;
    setSelected(next);
  };

  // Only ids and the quantity go to the cart; the server decides prices and totals. Add vs
  // update is re-decided here from the item's CURRENT presence, so an item removed elsewhere is
  // re-added instead of updated against a stale cart item id.
  const handleCartAction = async () => {
    if (isSubmitting || mode === 'added') return;
    const current = items.find((item) => item.productId === product.id);
    pendingLabelRef.current = current ? 'UPDATING…' : 'ADDING…';
    const result = current ? await update(current.id, selected) : await add(product.id, selected);
    if (result) {
      // Success: the selection now mirrors the server's confirmed quantity.
      dirtyRef.current = false;
      const confirmed = result.items?.find((item) => item.productId === product.id)?.quantity;
      if (typeof confirmed === 'number') setSelected(confirmed);
    }
  };

  const handleBuyNow = () => {
    // Out of scope: checkout is not implemented.
    alert(`Buy now: ${product.title} — ${selected} (placeholder)`);
  };

  return (
    <main className="product-detail-shell">
      {/* Same wrapper as other pages so the trail aligns with the Cart/Profile/Category crumbs. */}
      <div className="container">
        <Breadcrumbs items={[homeCrumb, categoryCrumb, { label: product.title || product.slug }]} />
      </div>
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
            <QuantitySelector value={selected} onChange={handleQuantityChange} disabled={isSubmitting} />
            {cartItem && (
              <p className="in-cart-note" data-testid="in-cart-note">
                <span aria-hidden="true">✓ </span>In your cart: {cartItem.quantity}
              </p>
            )}

            <div className="actions">
              <button
                className="btn add-to-cart"
                onClick={handleCartAction}
                disabled={isSubmitting || mode === 'added'}
                aria-busy={isSubmitting}
              >
                {isSubmitting
                  ? pendingLabelRef.current
                  : mode === 'add'
                    ? 'ADD TO CART'
                    : mode === 'update'
                      ? 'UPDATE CART'
                      : 'ADDED TO CART'}
              </button>
              <button className="btn buy-now" onClick={handleBuyNow}>Buy Now</button>
            </div>
            <CartFeedback feedback={feedback} />

            <ProductDescription longDescription={product.longDescription} />

            <SocialShare />
          </div>
        </aside>
      </div>
    </main>
  );
}
