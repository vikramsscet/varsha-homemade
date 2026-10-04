import ProductCard from '../ProductCard/ProductCard';

export default function ProductGrid({ products }) {
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
