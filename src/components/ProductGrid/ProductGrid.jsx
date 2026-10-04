import { useEffect, useState } from 'react';
import ProductCard from '../ProductCard/ProductCard';

export default function ProductGrid() {
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
            price: `₹${product.price.toFixed(2)}`,
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

  if (isLoading) {
    return <div className="product-grid" role="status">Loading products...</div>;
  }

  if (error) {
    return <div className="product-grid" role="alert">Products could not be loaded. Please try again later.</div>;
  }

  return (
    <div className="product-grid">
      {products.map((product) => (
        <ProductCard
          key={product.id}
          id={product.id}
          title={product.title}
          price={product.price}
          weight={product.weight}
          image={product.image}
          stock={product.stock}
        />
      ))}
    </div>
  );
}
